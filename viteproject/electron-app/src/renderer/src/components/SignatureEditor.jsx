import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  XMarkIcon,
  CheckIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { getDocument } from '../utils/pdf'
import SignatureInputModal from './SignatureInputModal'

const SCALE_STEP = 0.25
const MIN_SCALE = 0.25
const DEFAULT_SCALE = 0.75
const MAX_SCALE = 2.5

const SIGNATURE_FIELD_WIDTH = 150
const SIGNATURE_FIELD_HEIGHT = 60

function SignatureEditor({
  file,
  onClose,
  onSaveSignedDocument,
  onDownloadSuccess,
  existingSignatureFields = [],
  isEditing = false
}) {
  const scrollContainerRef = useRef(null)
  const canvasRefs = useRef([])
  const pdfInstanceRef = useRef(null)
  const renderTokenRef = useRef(0)
  const [pdf, setPdf] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [signatureFields, setSignatureFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [hoveredFieldId, setHoveredFieldId] = useState(null)
  const [delayedHoverFieldId, setDelayedHoverFieldId] = useState(null)
  const [isPlacingSignature, setIsPlacingSignature] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  // Signature input modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [pendingSignaturePosition, setPendingSignaturePosition] = useState(null)

  // Hover timeout for auto-hiding controls
  const hoverTimeoutRef = useRef(null)

  // Initialize with existing signature fields when editing
  useEffect(() => {
    if (isEditing && existingSignatureFields.length > 0) {
      console.log('Loading existing signature fields for editing:', existingSignatureFields)
      setSignatureFields(existingSignatureFields)
    }
  }, [isEditing, existingSignatureFields])

  const isPdf = (file?.extension || '').toLowerCase() === 'pdf'

  // Debug: Check if API is available
  useEffect(() => {
    console.log('SignatureEditor: Checking API availability...')
    console.log('window.api:', window.api)
    console.log('Available API methods:', window.api ? Object.keys(window.api) : 'None')
    console.log('window.electron:', window.electron)
    console.log('Context isolated?:', window.isSecureContext)

    if (window.api?.signDocument) {
      console.log('✅ signDocument API is available')
    } else {
      console.log('❌ signDocument API is NOT available')
      // Try to manually check for Electron context
      if (typeof window !== 'undefined' && window.process?.type) {
        console.log('Running in Electron, but API not exposed properly')
      } else {
        console.log('Not running in Electron context (probably browser dev mode)')
      }
    }
  }, [])

  // Cleanup hover timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // PDF loading logic (similar to PdfPreview)
  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      if (!file?.path) {
        setPdf(null)
        setPageCount(0)
        setError(null)
        setLoading(false)
        setScale(DEFAULT_SCALE)
        return
      }

      if (!isPdf) {
        setPdf(null)
        setPageCount(0)
        setError(null)
        setLoading(false)
        setScale(DEFAULT_SCALE)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const buffer = await window.api.readDocument(file.path)
        if (cancelled) return

        const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
        const loadingTask = getDocument({ data: uint8 })
        const pdfDoc = await loadingTask.promise

        if (cancelled) {
          await pdfDoc.destroy()
          return
        }

        if (pdfInstanceRef.current) {
          await pdfInstanceRef.current.destroy()
        }

        pdfInstanceRef.current = pdfDoc
        canvasRefs.current = []
        setPdf(pdfDoc)
        setPageCount(pdfDoc.numPages)
        setScale(DEFAULT_SCALE)
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0
        }
      } catch (err) {
        console.error('Failed to load PDF', err)
        if (!cancelled) setError(err.message || 'Unable to open PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
      if (pdfInstanceRef.current) {
        pdfInstanceRef.current.destroy()
        pdfInstanceRef.current = null
      }
      canvasRefs.current = []
    }
  }, [file?.path, isPdf])

  // PDF rendering logic (similar to PdfPreview)
  useEffect(() => {
    if (!pdf || !pageCount) return undefined

    const token = renderTokenRef.current + 1
    renderTokenRef.current = token

    const renderAllPages = async () => {
      const devicePixelRatio = window.devicePixelRatio || 1

      for (let index = 1; index <= pageCount; index += 1) {
        if (renderTokenRef.current !== token) break

        const canvas = canvasRefs.current[index - 1]
        if (!canvas) continue

        const page = await pdf.getPage(index)
        if (renderTokenRef.current !== token) {
          page.cleanup()
          break
        }

        const viewport = page.getViewport({ scale })
        const context = canvas.getContext('2d')

        const outputScale = devicePixelRatio
        const displayWidth = viewport.width
        const displayHeight = viewport.height
        const scaledWidth = Math.floor(displayWidth * outputScale)
        const scaledHeight = Math.floor(displayHeight * outputScale)

        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
          canvas.width = scaledWidth
          canvas.height = scaledHeight
        }

        const renderContext = {
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
        }

        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        await page.render(renderContext).promise
        page.cleanup()
      }
    }

    renderAllPages().catch((err) => {
      console.error('Failed to render pages', err)
      if (renderTokenRef.current === token) {
        setError('Unable to render pages')
      }
    })

    return () => {
      renderTokenRef.current += 1
    }
  }, [pdf, pageCount, scale])

  const generateFieldId = () => {
    return `signature-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const handleCanvasClick = (event, pageNumber) => {
    if (isPlacingSignature) {
      const canvas = event.currentTarget
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Convert screen coordinates to PDF coordinates
      const pdfX = ((x / rect.width) * canvas.width) / (window.devicePixelRatio || 1)
      const pdfY = ((y / rect.height) * canvas.height) / (window.devicePixelRatio || 1)

      // Store the position and open signature modal
      setPendingSignaturePosition({
        pageNumber,
        x: pdfX - SIGNATURE_FIELD_WIDTH / 2, // Center the field on click
        y: pdfY - SIGNATURE_FIELD_HEIGHT / 2,
        width: SIGNATURE_FIELD_WIDTH,
        height: SIGNATURE_FIELD_HEIGHT,
        clientX: x,
        clientY: y
      })

      setShowSignatureModal(true)
      setIsPlacingSignature(false)
    } else {
      // Clicking on empty area deselects signature fields
      setSelectedFieldId(null)
      setHoveredFieldId(null)
      setDelayedHoverFieldId(null)

      // Clear any active hover timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }

  const handleFieldDelete = (fieldId) => {
    setSignatureFields((prev) => prev.filter((field) => field.id !== fieldId))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
  }

  const handleSignatureCreated = (signature) => {
    if (!pendingSignaturePosition) return

    const newField = {
      id: generateFieldId(),
      ...pendingSignaturePosition,
      type: 'signature',
      signature: signature, // Store the actual signature data
      // Convert signature format for PDF processing
      signatureType: signature.type,
      signatureData: signature.data,
      signatureText: signature.text || '',
      signatureFont: signature.font || ''
    }

    setSignatureFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
    setPendingSignaturePosition(null)
    setShowSignatureModal(false)
  }

  const handleCloseSignatureModal = () => {
    setShowSignatureModal(false)
    setPendingSignaturePosition(null)
  }

  // Updated Sign Document button functionality - integrated with signature placement
  const handleSignDocument = () => {
    if (signatureFields.length === 0) {
      // If no signature fields exist, enter placement mode first
      setIsPlacingSignature(true)
      setSelectedFieldId(null)
      return
    }
    // If signature fields exist, proceed directly to signing
    handleFinishSigning()
  }

  const handleFinishSigning = async () => {
    try {
      setLoading(true)

      console.log('Creating signed document preview...')
      console.log('File path:', file?.path)
      console.log('Signature fields:', signatureFields)

      // Create a preview of the signed document without actually saving to device
      const signedDocumentPreview = {
        success: true,
        originalFile: file,
        signedFilePath: null, // No actual file saved yet
        signatureFields,
        signatureInfo: {
          signedAt: new Date().toISOString(),
          signer: 'Current User',
          fieldsCount: signatureFields.length,
          certificate: 'Self-Signed Certificate',
          algorithm: 'SHA-256 with RSA',
          status: isEditing
            ? 'Updated Preview - Ready for Download'
            : 'Preview - Ready for Download'
        },
        signedAt: new Date().toISOString(),
        isPreview: true, // Flag to indicate this is just a preview
        isEditing: isEditing, // Flag to indicate if this is an edit operation
        editingDocumentId: isEditing ? file.id : null // Include original document ID when editing
      }

      console.log('Signed document preview created:', signedDocumentPreview)

      // Send preview to dashboard to show in signed documents section
      if (onSaveSignedDocument) {
        onSaveSignedDocument(signedDocumentPreview)
      }

      setLoading(false)
      // Don't close automatically - let user see the preview and download if needed
    } catch (error) {
      console.error('Failed to create signed document preview:', error)
      setLoading(false)
    }
  }

  const handleDownloadSignedDocument = async () => {
    try {
      setLoading(true)

      console.log('Starting actual document signing and download...')

      // Check if the API is available
      if (!window.api || typeof window.api.signDocument !== 'function') {
        console.log('Download functionality is not available in demo mode')
        if (onDownloadSuccess) {
          onDownloadSuccess('Download functionality not available in demo mode', 'error')
        }
        setLoading(false)
        return
      }

      // Actually sign the document now
      const result = await window.api.signDocument({
        filePath: file.path,
        signatureFields
      })

      console.log('Signing result for download:', result)

      if (result && result.success) {
        // Now download the actually signed document
        const fileName = file.name.replace('.pdf', '_signed.pdf')
        const downloadResult = await window.api.downloadDocument({
          filePath: result.signedFilePath, // Use the actual signed file path
          fileName: fileName
        })

        if (downloadResult.success) {
          console.log(
            `✅ Document signed and downloaded successfully to: ${downloadResult.savedPath}`
          )
          if (onDownloadSuccess) {
            onDownloadSuccess('Signed document downloaded successfully!', 'success')
          }
        } else {
          console.error(`❌ Download failed: ${downloadResult.error || 'Unknown error'}`)
          if (onDownloadSuccess) {
            onDownloadSuccess(downloadResult.error || 'Download failed', 'error')
          }
        }
      } else {
        throw new Error(result?.error || 'Failed to sign document for download')
      }
    } catch (error) {
      console.error('Download failed:', error)
      if (onDownloadSuccess) {
        onDownloadSuccess('Download failed: ' + error.message, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateFieldPosition = (fieldId, newX, newY) => {
    setSignatureFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, x: newX, y: newY } : field))
    )
  }

  const updateFieldSize = (fieldId, newWidth, newHeight) => {
    setSignatureFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, width: newWidth, height: newHeight } : field
      )
    )
  }

  const handleResizeMouseDown = (e, field, handle) => {
    e.stopPropagation()
    setSelectedFieldId(field.id)
    setIsResizing(true)

    const canvas = canvasRefs.current[field.pageNumber - 1]
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / (canvas.width / (window.devicePixelRatio || 1))
    const scaleY = rect.height / (canvas.height / (window.devicePixelRatio || 1))

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = field.width
    const startHeight = field.height

    const handleMouseMove = (e) => {
      // Use requestAnimationFrame for smoother resize
      requestAnimationFrame(() => {
        const deltaX = (e.clientX - startX) / scaleX
        const deltaY = (e.clientY - startY) / scaleY

        let newWidth = startWidth
        let newHeight = startHeight

        if (handle.includes('right')) newWidth = Math.max(50, startWidth + deltaX)
        if (handle.includes('left')) newWidth = Math.max(50, startWidth - deltaX)
        if (handle.includes('bottom')) newHeight = Math.max(30, startHeight + deltaY)
        if (handle.includes('top')) newHeight = Math.max(30, startHeight - deltaY)

        updateFieldSize(field.id, newWidth, newHeight)
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleFieldMouseDown = (e, field) => {
    e.stopPropagation()
    setSelectedFieldId(field.id)
    setIsDragging(true)

    const canvas = canvasRefs.current[field.pageNumber - 1]
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / (canvas.width / (window.devicePixelRatio || 1))
    const scaleY = rect.height / (canvas.height / (window.devicePixelRatio || 1))

    // Calculate offset at the time of mousedown (not from state)
    const offsetX = e.clientX - rect.left - field.x * scaleX
    const offsetY = e.clientY - rect.top - field.y * scaleY

    const handleMouseMove = (e) => {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        const newX = (e.clientX - rect.left - offsetX) / scaleX
        const newY = (e.clientY - rect.top - offsetY) / scaleY
        updateFieldPosition(field.id, Math.max(0, newX), Math.max(0, newY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)
  }

  const renderSignatureField = (field, pageNumber) => {
    const canvas = canvasRefs.current[pageNumber - 1]
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / (canvas.width / (window.devicePixelRatio || 1))
    const scaleY = rect.height / (canvas.height / (window.devicePixelRatio || 1))

    const isSelected = field.id === selectedFieldId
    const isDelayedHover = field.id === delayedHoverFieldId
    const showBorders = isSelected || isDelayedHover
    const showControls = isSelected || isDelayedHover

    const style = {
      position: 'absolute',
      left: `${field.x * scaleX}px`,
      top: `${field.y * scaleY}px`,
      width: `${field.width * scaleX}px`,
      height: `${field.height * scaleY}px`,
      border: showBorders ? (isSelected ? '2px solid #6366f1' : '2px dashed #8b5cf6') : 'none',
      backgroundColor: showBorders
        ? isSelected
          ? 'rgba(99, 102, 241, 0.1)'
          : 'rgba(139, 92, 246, 0.1)'
        : 'transparent',
      borderRadius: '4px',
      cursor: isDragging ? 'grabbing' : isResizing ? 'auto' : showBorders ? 'grab' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: '500',
      color: showBorders ? '#6366f1' : 'transparent',
      userSelect: 'none',
      transition: 'all 0.2s ease-in-out'
    }

    return (
      <div
        key={field.id}
        style={style}
        onMouseDown={(e) => handleFieldMouseDown(e, field)}
        onMouseEnter={() => {
          // Clear any existing timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }
          setHoveredFieldId(field.id)

          // Set timeout to show controls after 2.5 seconds of hovering
          hoverTimeoutRef.current = setTimeout(() => {
            setDelayedHoverFieldId(field.id)
          }, 2500)
        }}
        onMouseLeave={() => {
          // Clear hover immediately
          setHoveredFieldId(null)

          // Clear the delayed hover timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }

          // Hide controls after a short delay
          hoverTimeoutRef.current = setTimeout(() => {
            setDelayedHoverFieldId(null)
          }, 500)
        }}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedFieldId(field.id)
        }}
        className="transition-all hover:shadow-lg"
      >
        {field.signature ? (
          // Show actual signature
          <img
            src={field.signature.data}
            alt={field.signature.name}
            className="w-full h-full object-contain p-1"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        ) : showBorders ? (
          // Show placeholder only when borders are visible
          <>
            <PencilSquareIcon className="w-4 h-4 mr-1" />
            Sign Here
          </>
        ) : null}
        {showControls && (
          <>
            {/* Delete button - only show when selected */}
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFieldDelete(field.id)
                }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            )}

            {/* Resize handles - show on hover or selection with smooth transition */}
            <div
              className={`absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full cursor-nw-resize border border-white shadow-sm transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseDown={(e) => handleResizeMouseDown(e, field, 'top-right')}
            />
            <div
              className={`absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full cursor-se-resize border border-white shadow-sm transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseDown={(e) => handleResizeMouseDown(e, field, 'bottom-right')}
            />
            <div
              className={`absolute bottom-0 left-0 w-2 h-2 bg-blue-500 rounded-full cursor-sw-resize border border-white shadow-sm transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseDown={(e) => handleResizeMouseDown(e, field, 'bottom-left')}
            />
            <div
              className={`absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full cursor-ne-resize border border-white shadow-sm transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
              onMouseDown={(e) => handleResizeMouseDown(e, field, 'top-left')}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="pointer-events-auto flex h-full max-h-[calc(100vh-6rem)] min-h-0 w-full flex-col">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/80 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {isEditing ? 'Edit Signatures' : 'Signature Editor'}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-100">
              {file?.name || 'No document selected'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
            className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
            disabled={!pdf || scale <= MIN_SCALE}
          >
            -
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-300">
            {(scale * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
            className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
            disabled={!pdf || scale >= MAX_SCALE}
          >
            +
          </button>
          <div className="mx-3 h-6 w-px bg-slate-800" />
          <span className="text-xs font-semibold text-slate-300">
            {signatureFields.length} signature field{signatureFields.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Streamlined Sign Document button */}
          <button
            onClick={handleSignDocument}
            className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
              isPlacingSignature
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                : signatureFields.length === 0
                  ? 'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-400'
                  : 'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-400'
            }`}
            disabled={!pdf || loading}
          >
            {isPlacingSignature ? (
              'Click to place signature'
            ) : signatureFields.length === 0 ? (
              <>
                <CheckIcon className="w-4 h-4 mr-1 inline" />
                {isEditing ? 'Update Document' : 'Sign Document'}
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-1 inline" />
                {isEditing ? 'Update Document' : 'Sign Document'}
              </>
            )}
          </button>

          {/* Add New Signature button - show in editing mode */}
          {isEditing && !isPlacingSignature && (
            <button
              onClick={() => {
                setIsPlacingSignature(true)
                setSelectedFieldId(null)
              }}
              className="rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-500"
              disabled={!pdf || loading}
            >
              <PlusIcon className="w-4 h-4 mr-1 inline" />
              Add Signature
            </button>
          )}

          {/* Download button - only show after signing */}
          {signatureFields.length > 0 && (
            <button
              onClick={handleDownloadSignedDocument}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-green-500"
              disabled={!pdf || loading}
            >
              <svg
                className="w-4 h-4 mr-1 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 flex-col bg-slate-950/80">
        {!file && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Choose a document to sign.
          </p>
        )}

        {file && !isPdf && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Signing is only available for PDF files right now.
          </p>
        )}

        {file && isPdf && loading && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            {signatureFields.length === 0 ? 'Loading document for signing…' : 'Signing document…'}
          </p>
        )}

        {error && (
          <p className="flex flex-1 items-center justify-center text-sm text-rose-400">{error}</p>
        )}

        {file && isPdf && !loading && !error && pageCount > 0 && (
          <div ref={scrollContainerRef} className="flex flex-1 overflow-auto px-6 py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 pb-12">
              {Array.from({ length: pageCount }, (_, index) => (
                <div key={`page-${index + 1}`} className="relative">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[index] = el ?? null
                    }}
                    className={`rounded-xl border border-slate-800/80 bg-black/75 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.9)] ${
                      isPlacingSignature ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                    onClick={(e) => handleCanvasClick(e, index + 1)}
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300 font-medium">
                    Page {index + 1}
                  </div>
                  {/* Render signature fields for this page */}
                  {signatureFields
                    .filter((field) => field.pageNumber === index + 1)
                    .map((field) => renderSignatureField(field, index + 1))}
                </div>
              ))}
            </div>
          </div>
        )}

        {isPlacingSignature && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-indigo-500/20 border border-indigo-400/60 rounded-xl px-4 py-2 text-sm text-indigo-200">
            Click anywhere on the document to place a signature field
          </div>
        )}

        {isEditing && !isPlacingSignature && signatureFields.length > 0 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-orange-500/20 border border-orange-400/60 rounded-xl px-4 py-2 text-sm text-orange-200">
            💡 Hover over signatures to edit • Click &quot;Add Signature&quot; to add more • Click
            &quot;Update Document&quot; to save changes
          </div>
        )}
      </div>

      {/* Signature Input Modal */}
      <SignatureInputModal
        isOpen={showSignatureModal}
        onClose={handleCloseSignatureModal}
        onSignatureCreated={handleSignatureCreated}
      />
    </div>
  )
}

SignatureEditor.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    path: PropTypes.string,
    extension: PropTypes.string
  }),
  onClose: PropTypes.func,
  onSaveSignedDocument: PropTypes.func,
  onDownloadSuccess: PropTypes.func,
  existingSignatureFields: PropTypes.arrayOf(PropTypes.object),
  isEditing: PropTypes.bool
}

export default SignatureEditor

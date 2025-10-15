import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DocumentIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  EyeIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import PdfPreview from './PdfPreview'
import SignatureEditor from './SignatureEditor'

const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return '—'
  }

  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const precision = value >= 10 || exponent === 0 ? 0 : 1

  return `${value.toFixed(precision)} ${units[exponent]}`
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp))
  } catch (error) {
    console.error('Failed to format timestamp', error)
    return '—'
  }
}

const normalizeDocument = (file) => {
  const extension = (file.extension || '').toLowerCase()

  return {
    id: file.id,
    name: file.name,
    path: file.path,
    extension,
    size: file.size,
    sizeLabel: formatFileSize(file.size),
    lastModified: file.lastModified,
    lastModifiedLabel: formatTimestamp(file.lastModified)
  }
}

const getFileIcon = (extension) => {
  const accent =
    extension === 'pdf'
      ? 'text-rose-400'
      : extension === 'docx'
        ? 'text-sky-300'
        : 'text-indigo-300'

  return (
    <DocumentIcon className={`h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4 ${accent}`} />
  )
}

const generateDocumentId = () => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [overlayDocument, setOverlayDocument] = useState(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isSigningMode, setIsSigningMode] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const uploadTileRef = useRef(null)

  useEffect(() => {
    if (!documents.length) {
      setActiveDocumentId(null)
      return
    }

    if (!activeDocumentId) {
      setActiveDocumentId(documents[0].id)
    }
  }, [documents, activeDocumentId])

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) ?? documents[0] ?? null,
    [documents, activeDocumentId]
  )

  // Filter documents into signed and unsigned
  const signedDocuments = useMemo(() => documents.filter((doc) => doc.isSigned), [documents])

  const openPreviewOverlay = (doc) => {
    if (!doc) return
    setOverlayDocument(doc)
    setIsOverlayOpen(true)
  }

  const closePreviewOverlay = () => {
    setIsOverlayOpen(false)
    setOverlayDocument(null)
    setIsSigningMode(false)
  }

  const openSigningMode = (doc) => {
    if (!doc) return
    setOverlayDocument(doc)
    setIsOverlayOpen(true)
    setIsSigningMode(true)
  }

  useEffect(() => {
    if (!isSourceMenuOpen) return

    const handleClickOutside = (event) => {
      if (!uploadTileRef.current?.contains(event.target)) {
        setIsSourceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSourceMenuOpen])

  useEffect(() => {
    if (!toast) return

    const timeout = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(timeout)
  }, [toast])

  const triggerToast = (message) => {
    if (!message) return
    setToast({ id: Date.now(), message })
  }

  const dismissToast = () => {
    setToast(null)
  }

  const mergeDocuments = (incomingDocs) => {
    if (!incomingDocs?.length) {
      return { docToPreview: null, newCount: 0 }
    }

    let docToPreview = null
    let newDocsCount = 0

    setDocuments((prev) => {
      const existingByPath = new Map(prev.map((doc) => [doc.path, doc]))
      const merged = [...prev]

      incomingDocs.forEach((doc) => {
        const existing = existingByPath.get(doc.path)
        if (existing) {
          docToPreview = docToPreview ?? existing
        } else {
          merged.push(doc)
          existingByPath.set(doc.path, doc)
          docToPreview = docToPreview ?? doc
          newDocsCount += 1
        }
      })

      return merged
    })

    if (!docToPreview) {
      docToPreview = incomingDocs[0]
    }

    return { docToPreview, newCount: newDocsCount }
  }

  const handleDocumentSelection = async () => {
    if (!window?.api?.openDocuments) {
      console.warn('Document picker is not available.')
      return
    }

    try {
      const result = await window.api.openDocuments()
      if (!result || result.canceled || !result.files?.length) {
        return
      }

      const normalized = result.files.map(normalizeDocument)
      const { docToPreview, newCount } = mergeDocuments(normalized)

      if (docToPreview) {
        setActiveDocumentId(docToPreview.id)
        if (newCount > 0) {
          triggerToast(
            newCount === 1
              ? 'Your file has been successfully uploaded.'
              : `${newCount} files were uploaded successfully.`
          )
        } else {
          triggerToast('Your file has been successfully uploaded.')
        }
      }
    } catch (error) {
      console.error('Unable to select documents', error)
      triggerToast('Something went wrong while uploading. Please try again.')
    }
  }

  const handleUpload = () => {
    handleDocumentSelection()
  }

  const handleOpenDocument = () => {
    handleDocumentSelection()
  }

  const handleImportFromCloud = () => {
    console.info('Cloud import integrations are coming soon.')
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragActive) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragActive(false)
    }
  }

  const handleDropUpload = (event) => {
    event.preventDefault()
    setIsDragActive(false)
    setIsSourceMenuOpen(false)

    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file?.path)
    if (!files.length) {
      return
    }

    const normalized = files.map((file) =>
      normalizeDocument({
        id: generateDocumentId(),
        name: file.name,
        path: file.path,
        size: file.size,
        lastModified: file.lastModified,
        extension: (file.name.split('.').pop() || '').toLowerCase()
      })
    )

    const { docToPreview, newCount } = mergeDocuments(normalized)

    if (docToPreview) {
      setActiveDocumentId(docToPreview.id)
      if (newCount > 0) {
        triggerToast(
          newCount === 1
            ? 'Your file has been successfully uploaded.'
            : `${newCount} files were uploaded successfully.`
        )
      } else {
        triggerToast('Your file has been successfully uploaded.')
      }
    }
  }

  const handleDropZoneKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsSourceMenuOpen((prev) => !prev)
    }
  }

  const toggleSourceMenu = () => {
    setIsSourceMenuOpen((prev) => !prev)
  }

  const handleSourceSelection = (callback) => (event) => {
    event.stopPropagation()
    setIsSourceMenuOpen(false)
    callback()
  }

  const handleThumbnailClick = (doc) => {
    setActiveDocumentId(doc.id)
  }

  const handlePreviewClick = () => {
    if (selectedDocument) {
      openPreviewOverlay(selectedDocument)
    }
  }

  const handleSignClick = () => {
    if (selectedDocument) {
      openSigningMode(selectedDocument)
    }
  }

  const handleEditSignClick = (doc) => {
    if (!doc) return
    // Open signing mode for editing existing signatures
    setOverlayDocument(doc)
    setIsOverlayOpen(true)
    setIsSigningMode(true)
  }

  const handleSaveSignedDocument = (signedDocumentData) => {
    console.info('Signed document preview created:', signedDocumentData)

    if (signedDocumentData.isEditing && signedDocumentData.editingDocumentId) {
      // Update existing document when editing
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id === signedDocumentData.editingDocumentId) {
            return {
              ...doc,
              signatureFields: signedDocumentData.signatureFields,
              signatureInfo: signedDocumentData.signatureInfo,
              signedAt: signedDocumentData.signedAt,
              lastModified: new Date().toISOString()
            }
          }
          return doc
        })
      )

      triggerToast(
        `✏️ Document signatures updated! "${signedDocumentData.originalFile.name}" is ready for download.`
      )
    } else {
      // Create a new document entry for the signed document preview
      const signedDocument = {
        id: Date.now(), // Generate new ID
        name: signedDocumentData.originalFile.name.replace('.pdf', '_signed.pdf'),
        path: signedDocumentData.signedFilePath || signedDocumentData.originalFile.path, // Use original path for preview
        size: signedDocumentData.originalFile.size, // Estimate - actual size would be different
        type: 'application/pdf',
        extension: 'pdf',
        lastModified: new Date().toISOString(),
        isSigned: true,
        isPreview: signedDocumentData.isPreview || false,
        originalDocument: signedDocumentData.originalFile,
        signatureInfo: signedDocumentData.signatureInfo,
        signatureFields: signedDocumentData.signatureFields,
        signedAt: signedDocumentData.signedAt
      }

      // Add the signed document to the list
      setDocuments((prev) => [...prev, signedDocument])

      // Show different message based on whether it's a preview or actual save
      if (signedDocumentData.isPreview) {
        triggerToast(
          `📝 Document signed! "${signedDocument.name}" preview created. Click download to save to device.`
        )
      } else {
        triggerToast(
          `🎉 Document signed and saved to device! "${signedDocument.name}" is now available for download.`
        )
      }

      // Select the newly signed document
      setActiveDocumentId(signedDocument.id)
    }

    closePreviewOverlay()
  }

  const handleDownloadSuccess = (message, type = 'success') => {
    if (type === 'success') {
      triggerToast(`📁 ${message}`)
    } else {
      triggerToast(`❌ ${message}`)
    }
  }

  const handleDownloadDocument = async (doc) => {
    try {
      if (!window.api?.downloadDocument) {
        alert('Download functionality is not available')
        return
      }

      // Check if this is a signed document preview that needs actual signing
      if (doc.isSigned && doc.isPreview && doc.signatureFields) {
        console.log('Downloading signed document preview - performing actual signing first')

        // First, actually sign the document
        const signingResult = await window.api.signDocument({
          filePath: doc.originalDocument.path, // Use original document path
          signatureFields: doc.signatureFields
        })

        if (signingResult && signingResult.success) {
          // Now download the actually signed document
          const downloadResult = await window.api.downloadDocument({
            filePath: signingResult.signedFilePath, // Use the signed file path
            fileName: doc.name
          })

          if (downloadResult.success) {
            triggerToast(
              `📁 Signed document downloaded successfully to: ${downloadResult.savedPath}`
            )
          } else {
            alert(`Download failed: ${downloadResult.error || 'Unknown error'}`)
          }
        } else {
          alert(`Signing failed: ${signingResult?.error || 'Failed to sign document'}`)
        }
      } else {
        // Regular document download (unsigned or already signed file exists)
        const result = await window.api.downloadDocument({
          filePath: doc.path,
          fileName: doc.name
        })

        if (result.success) {
          triggerToast(`📁 Document downloaded successfully to: ${result.savedPath}`)
        } else {
          alert(`Download failed: ${result.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert(`Download failed: ${error.message}`)
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex h-full flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
          <header className="flex flex-none flex-col gap-0.5 rounded-lg border border-slate-800/70 bg-slate-900/70 px-4 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-5 sm:py-3 lg:px-6 lg:py-3.5">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            <div className="grid h-4 w-4 place-items-center rounded-sm border border-slate-800 bg-slate-900 sm:h-6 sm:w-6 sm:rounded-md md:h-8 md:w-8 md:rounded-lg lg:h-10 lg:w-10 lg:rounded-xl">
              <DocumentIcon className="h-2 w-2 text-indigo-300 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="hidden sm:block text-xs font-bold uppercase tracking-[0.3em] text-slate-500 md:text-sm">
                Workspace
              </p>
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl">
                WinSign Dashboard
              </h1>
              <p className="hidden md:block truncate text-sm text-slate-400 lg:text-base">
                Manage your digital signatures with clarity.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
            <div className="hidden items-center gap-1 rounded-sm border border-slate-800 bg-slate-900/70 px-1 py-0.5 text-[7px] text-slate-300 lg:flex lg:rounded-md lg:px-2 lg:py-1 lg:text-xs">
              <span className="h-0.5 w-0.5 rounded-full bg-emerald-400 lg:h-1.5 lg:w-1.5" />
              <span className="hidden xl:inline">Online</span>
            </div>
            <div className="grid h-4 w-4 place-items-center rounded-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-[8px] font-semibold text-white sm:h-5 sm:w-5 sm:rounded-md md:h-6 md:w-6 md:text-[10px] lg:h-8 lg:w-8 lg:rounded-lg lg:text-xs">
              U
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
          <section className="flex flex-none flex-col gap-3 rounded-lg border border-slate-800/70 bg-slate-900/70 px-4 py-4 shadow-sm sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="flex items-start gap-0.5 sm:gap-2 md:gap-3">
                <div className="grid h-4 w-4 place-items-center rounded-sm border border-slate-800 bg-slate-900 sm:h-5 sm:w-5 sm:rounded-md md:h-6 md:w-6 md:rounded-lg lg:h-8 lg:w-8 lg:rounded-xl">
                  <CloudArrowUpIcon className="h-2 w-2 text-indigo-300 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="hidden text-xs font-bold uppercase tracking-[0.3em] text-slate-500 sm:block md:text-sm">
                    Upload center
                  </p>
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl lg:text-3xl">
                    Upload a document
                  </h2>
                  <p className="hidden md:block text-xs leading-relaxed text-slate-400 lg:text-sm">
                    Choose where to import from or drop files right here.
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex shrink-0 items-center gap-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(0.25rem,0.5vh,0.375rem)] text-[clamp(0.5rem,1.5vw,0.75rem)] font-medium text-indigo-200">
                Drag-and-drop enabled
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  <div
                    ref={uploadTileRef}
                    className={`relative flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-3 py-3 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:h-36 sm:px-4 sm:py-4 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10 ${
                      isDragActive
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                    onClick={() => {
                      toggleSourceMenu()
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDropUpload}
                    onKeyDown={handleDropZoneKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-haspopup="menu"
                    aria-expanded={isSourceMenuOpen}
                    aria-label="Upload a document"
                  >
                    <CloudArrowUpIcon
                      className={`h-6 w-6 transition-all duration-200 sm:h-7 sm:w-7 ${
                        isDragActive
                          ? 'text-indigo-200 scale-110'
                          : 'text-indigo-400 group-hover:text-indigo-300'
                      }`}
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-50 sm:text-sm">
                        {isDragActive ? 'Release to upload' : 'Drop files or click'}
                      </p>
                      <p className="text-xs font-medium text-slate-300">PDF, DOCX, TXT</p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-md border border-indigo-400/70 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-200 transition-all duration-200 hover:border-indigo-300 hover:from-indigo-500/25 hover:to-purple-500/25 hover:text-white sm:px-2.5 sm:py-1">
                      <span className="hidden sm:inline">Click to Upload</span>
                      <span className="sm:hidden">Upload</span>
                      <ChevronDownIcon
                        className={`h-2.5 w-2.5 transition-all duration-200 ${
                          isSourceMenuOpen 
                            ? 'rotate-180 text-indigo-100' 
                            : 'text-indigo-200'
                        }`}
                      />
                    </div>
                  {isSourceMenuOpen && (
                    <div
                      className="absolute left-1/2 top-full z-10 mt-2 w-full max-w-xs -translate-x-1/2 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/95 text-left shadow-xl shadow-indigo-500/10 sm:mt-4 sm:rounded-2xl"
                      role="menu"
                    >
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleUpload)}
                        className="flex w-full items-center gap-1.5 px-2 py-2 text-[10px] font-medium text-slate-100 transition hover:bg-indigo-500/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm"
                        role="menuitem"
                      >
                        <FolderOpenIcon className="h-3 w-3 text-indigo-300 sm:h-5 sm:w-5" />
                        Upload from device
                      </button>
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleOpenDocument)}
                        className="flex w-full items-center gap-1.5 px-2 py-2 text-[10px] font-medium text-slate-100 transition hover:bg-indigo-500/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm"
                        role="menuitem"
                      >
                        <DocumentIcon className="h-3 w-3 text-indigo-300 sm:h-5 sm:w-5" />
                        Browse recent files
                      </button>
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleImportFromCloud)}
                        className="flex w-full items-center gap-1.5 px-2 py-2 text-[10px] font-medium text-slate-100 transition hover:bg-indigo-500/10 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm"
                        role="menuitem"
                        title="Connect to cloud storage providers (coming soon)"
                      >
                        <CloudArrowUpIcon className="h-3 w-3 text-indigo-300 sm:h-5 sm:w-5" />
                        Import from cloud
                      </button>
                    </div>
                  )}
                  </div>
                  <div className="flex-1">
                <div className="relative flex h-32 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-3 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/60 sm:h-36 sm:px-4 sm:py-4 overflow-hidden">
                  {selectedDocument ? (
                    <div className="flex h-full w-full flex-col justify-between gap-2 sm:gap-2.5">
                      <div className="flex flex-col gap-1 min-h-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 sm:text-sm">
                            Selected document
                          </p>
                          <h3 className="mt-0.5 truncate text-sm font-bold tracking-tight text-slate-50 sm:text-base md:text-lg">
                            {selectedDocument.name}
                          </h3>
                        </div>
                        <div className="hidden md:flex flex-wrap items-center gap-1 text-xs text-slate-400 md:gap-1.5">
                          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-medium text-slate-200 text-xs">
                            {selectedDocument.extension
                              ? selectedDocument.extension.toUpperCase()
                              : 'Unknown'}
                          </span>
                          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-medium text-slate-200 text-xs">
                            {selectedDocument.sizeLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={handlePreviewClick}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-400/70 bg-indigo-500/10 px-2 py-1.5 text-xs font-bold text-indigo-100 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-500/20 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
                        >
                          <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                        {selectedDocument.isSigned ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(selectedDocument)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-1.5 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:from-green-400 hover:to-emerald-400 hover:shadow-xl hover:shadow-green-500/20 sm:px-3 sm:py-2 sm:text-sm"
                          >
                            <svg
                              className="w-3 h-3 sm:w-4 sm:h-4"
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
                            <span className="hidden sm:inline">Download</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSignClick}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700/50 px-2 py-1.5 text-xs font-bold text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-600/50 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
                          >
                            <PencilSquareIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Sign</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-4">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-lg border border-slate-600/50 bg-gradient-to-br from-slate-700/50 to-slate-800/50 sm:h-16 sm:w-16">
                          <DocumentIcon className="h-6 w-6 text-slate-400 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 sm:text-sm">
                            Ready to Start
                          </p>
                          <h3 className="text-xs font-bold tracking-tight text-slate-50 sm:text-sm">
                            Upload & Sign Documents
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
                </div>
              </div>
            </div>
          </section>
          {signedDocuments.length > 0 && (
            <section className="flex flex-1 flex-col gap-3 overflow-hidden rounded-lg border border-green-800/50 bg-green-900/15 px-4 py-4 shadow-lg shadow-green-500/10 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-green-400 sm:text-sm">
                    Signed Documents
                  </p>
                  <h2 className="mt-1 text-sm font-bold tracking-tight text-slate-50 sm:text-base md:text-lg lg:text-xl">
                    Ready for download
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-300 sm:gap-3 sm:text-sm">
                    <span className="rounded-lg bg-green-500/20 px-3 py-1.5 font-bold text-green-200 shadow-sm border border-green-500/30 sm:px-4 sm:py-2">
                      {signedDocuments.length} signed
                    </span>
                    <span className="hidden lg:inline rounded-lg bg-slate-700/50 px-3 py-1.5 font-bold text-slate-200 shadow-sm border border-slate-600/50">Ready for use</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col rounded-xl border border-green-800/30 bg-slate-900/30 px-4 py-5 sm:px-5 sm:py-6">
                <ul className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                  {signedDocuments.map((doc) => {
                    const isActive = selectedDocument?.id === doc.id
                    return (
                      <li key={doc.id} className="h-full">
                        <button
                          type="button"
                          onClick={() => handleThumbnailClick(doc)}
                          className={`flex h-full w-full flex-col gap-3 rounded-lg border px-4 py-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:gap-4 sm:px-5 sm:py-5 ${
                            isActive
                              ? 'border-green-400/70 bg-green-500/15 shadow-lg shadow-green-500/20'
                              : 'border-green-800/40 bg-green-900/15 hover:border-green-400/50 hover:bg-green-900/25 hover:shadow-green-500/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="grid h-10 w-10 place-items-center rounded-lg border border-green-700/50 bg-green-800/30 transition-all duration-200 group-hover:border-green-600 group-hover:bg-green-700/40 sm:h-12 sm:w-12">
                              {getFileIcon(doc.extension)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <p className="truncate text-sm font-bold text-slate-50 sm:text-base">
                                  {doc.name}
                                </p>
                                <span className="inline-flex items-center rounded-md bg-green-500/20 px-2 py-1 text-xs font-bold text-green-200 ring-1 ring-green-500/40 sm:px-3 sm:text-sm">
                                  ✓
                                </span>
                              </div>
                              <div className="mt-1 space-y-1">
                                <p className="text-xs font-medium text-green-300 sm:text-sm">
                                  {doc.sizeLabel}
                                </p>
                                {doc.signedAt && (
                                  <p className="text-xs text-green-400 sm:text-sm">
                                    Signed {formatTimestamp(doc.signedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPreviewOverlay(doc)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-green-600/60 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-200 transition-all duration-200 hover:border-green-500 hover:bg-green-500/20 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
                                title="Preview signed document"
                              >
                                <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                Preview
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSignClick(doc)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-600/60 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-200 transition-all duration-200 hover:border-orange-500 hover:bg-orange-500/20 hover:text-white sm:px-4 sm:py-2 sm:text-sm"
                                title="Edit signatures"
                              >
                                <PencilSquareIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownloadDocument(doc)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:from-green-400 hover:to-emerald-400 hover:shadow-xl hover:shadow-green-500/30 sm:px-5 sm:py-2 sm:text-sm"
                                title="Download signed document"
                              >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-green-400 sm:gap-2 sm:text-[11px]">
                            {doc.signatureFields && (
                              <span>{doc.signatureFields.length} signature(s)</span>
                            )}
                            {doc.signatureInfo?.signedBy && (
                              <span className="hidden sm:inline">
                                By {doc.signatureInfo.signedBy}
                              </span>
                            )}
                            <span className="truncate" title={doc.path}>
                              {doc.path}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          )}
          <section className="hidden 2xl:grid h-[clamp(40px,4vh,50px)] grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-2 lg:p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-500 lg:text-[10px]">
                Total documents
              </p>
              <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 lg:mt-1.5 lg:text-lg">
                {documents.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-2 lg:p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-500 lg:text-[10px]">
                Signed today
              </p>
              <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 lg:mt-1.5 lg:text-lg">
                {signedDocuments.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-2 lg:p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-500 lg:text-[10px]">
                Pending signatures
              </p>
              <p className="mt-1 text-base font-semibold tracking-tight text-slate-100 lg:mt-1.5 lg:text-lg">
                0
              </p>
            </div>
          </section>
        </main>
      </div>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-3 sm:top-6 sm:px-4">
          <div className="pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-slate-800/80 bg-slate-950/95 px-4 py-3 shadow-[0_20px_60px_-35px_rgba(99,102,241,0.5)] sm:gap-3 sm:px-5 sm:py-4">
            <div>
              <p className="text-xs font-semibold text-slate-100 sm:text-sm">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="mt-0.5 rounded-full border border-slate-800/70 p-0.5 text-slate-400 transition hover:border-slate-700 hover:text-slate-200 sm:p-1"
            >
              <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="sr-only">Dismiss notification</span>
            </button>
          </div>
        </div>
      )}
      {isOverlayOpen && overlayDocument && (
        <div
          className="absolute inset-0 z-40 overflow-y-auto bg-slate-950/85 backdrop-blur-sm"
          role="presentation"
          onClick={closePreviewOverlay}
        >
          <div
            className="flex min-h-full items-center justify-center px-3 py-8 sm:px-6 sm:py-12"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-slate-950 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.95)]"
              role="dialog"
              aria-modal="true"
            >
              {isSigningMode ? (
                <SignatureEditor
                  file={overlayDocument}
                  onClose={closePreviewOverlay}
                  onSaveSignedDocument={handleSaveSignedDocument}
                  onDownloadSuccess={handleDownloadSuccess}
                  existingSignatureFields={overlayDocument?.signatureFields || []}
                  isEditing={overlayDocument?.isSigned || false}
                />
              ) : (
                <PdfPreview
                  file={overlayDocument}
                  onClose={closePreviewOverlay}
                  signatureFields={overlayDocument?.signatureFields || []}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DocumentIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import PdfPreview from './PdfPreview'

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

  return <DocumentIcon className={`h-6 w-6 ${accent}`} />
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

  const openPreviewOverlay = (doc) => {
    if (!doc) return
    setOverlayDocument(doc)
    setIsOverlayOpen(true)
  }

  const closePreviewOverlay = () => {
    setIsOverlayOpen(false)
    setOverlayDocument(null)
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
              ? 'Your file was uploaded successfully.'
              : `${newCount} files were uploaded successfully.`
          )
        } else {
          triggerToast('This file is already in your workspace.')
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
            ? 'Your file was uploaded successfully.'
            : `${newCount} files were uploaded successfully.`
        )
      } else {
        triggerToast('These files are already in your workspace.')
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
      console.info('Sign request initiated for', selectedDocument.name)
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="flex h-full w-full flex-col gap-5 px-5 pb-5 pt-5 sm:px-6 lg:gap-7 lg:px-12 xl:px-20 2xl:px-28">
        <header className="flex flex-none items-center justify-between rounded-3xl border border-slate-800/70 bg-slate-900/70 px-5 py-5 shadow-[0_22px_70px_-40px_rgba(15,23,42,0.9)] sm:px-6 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900">
              <DocumentIcon className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Workspace
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">WinSign Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage your digital signatures with clarity.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-300 md:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Online
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
              U
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-5 overflow-hidden lg:gap-6">
          <section className="flex flex-col gap-6 rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-6 shadow-[0_20px_65px_-38px_rgba(15,23,42,0.9)] sm:px-7 sm:py-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-800 bg-slate-900">
                  <CloudArrowUpIcon className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                    Upload center
                  </p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Upload a document</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Choose where to import from or drop files right here.
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-200 sm:flex">
                Drag-and-drop enabled
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                <div
                  ref={uploadTileRef}
                  className={`relative flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                    isDragActive
                      ? 'border-indigo-400/80 bg-indigo-500/10'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-indigo-400/60 hover:bg-slate-900'
                  }`}
                  onClick={toggleSourceMenu}
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
                  <div className="grid h-12 w-12 place-items-center rounded-xl border border-slate-800 bg-slate-900">
                    <CloudArrowUpIcon
                      className={`h-6 w-6 transition-colors ${
                        isDragActive
                          ? 'text-indigo-300'
                          : 'text-slate-500 group-hover:text-indigo-300'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {isDragActive
                        ? 'Release to upload your files'
                        : 'Drop files or click to choose'}
                    </p>
                    <p className="text-xs text-slate-400">Supports PDF, DOCX, and TXT formats.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition group-hover:border-indigo-400/60 group-hover:bg-indigo-500/10">
                    Choose source
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        isSourceMenuOpen ? 'rotate-180 text-indigo-300' : 'text-slate-500'
                      }`}
                    />
                  </div>
                  {isSourceMenuOpen && (
                    <div
                      className="absolute left-1/2 top-full z-10 mt-4 w-full max-w-xs -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 text-left shadow-xl shadow-indigo-500/10"
                      role="menu"
                    >
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleUpload)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-indigo-500/10"
                        role="menuitem"
                      >
                        <FolderOpenIcon className="h-5 w-5 text-indigo-300" />
                        Upload from device
                      </button>
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleOpenDocument)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-indigo-500/10"
                        role="menuitem"
                      >
                        <DocumentIcon className="h-5 w-5 text-indigo-300" />
                        Browse recent files
                      </button>
                      <button
                        type="button"
                        onClick={handleSourceSelection(handleImportFromCloud)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-indigo-500/10"
                        role="menuitem"
                        title="Connect to cloud storage providers (coming soon)"
                      >
                        <CloudArrowUpIcon className="h-5 w-5 text-indigo-300" />
                        Import from cloud
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950/70 px-6 py-5 shadow-inner shadow-black/20">
                {selectedDocument ? (
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                          Selected document
                        </p>
                        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-100">
                          {selectedDocument.name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePreviewClick}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/60 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/10"
                        >
                          <EyeIcon className="h-4 w-4" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={handleSignClick}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/80"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          Sign
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-900 px-3 py-1 font-medium text-slate-200">
                        {selectedDocument.extension
                          ? selectedDocument.extension.toUpperCase()
                          : 'Unknown'}
                      </span>
                      <span className="rounded-full bg-slate-900 px-3 py-1 font-medium text-slate-200">
                        {selectedDocument.sizeLabel}
                      </span>
                      {selectedDocument.lastModifiedLabel ? (
                        <span className="rounded-full bg-slate-900 px-3 py-1 font-medium text-slate-200">
                          Updated {selectedDocument.lastModifiedLabel}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-slate-500" title={selectedDocument.path}>
                      {selectedDocument.path}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-slate-400">
                    <p>No document selected yet.</p>
                    <p className="text-xs text-slate-500">
                      Upload a file or choose one from recent activity to access preview and
                      signing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="flex flex-1 flex-col gap-5 rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-6 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.9)] sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Documents
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent activity</h2>
              </div>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Upload a file above to populate your recent activity.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-900 px-3 py-1 font-medium text-indigo-300">
                      {documents.length} files
                    </span>
                    {selectedDocument?.lastModifiedLabel ? (
                      <span>Updated {selectedDocument.lastModifiedLabel}</span>
                    ) : (
                      <span>Updated recently</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-400"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add more
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col rounded-2xl border border-slate-800/60 bg-slate-950/50 px-4 py-5">
              {documents.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-xl border border-slate-800 bg-slate-900">
                    <DocumentIcon className="h-7 w-7 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                      No documents
                    </p>
                    <h3 className="mt-2 text-base font-medium text-slate-200">
                      Upload your first document to get started
                    </h3>
                  </div>
                </div>
              ) : (
                <ul className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {documents.map((doc) => {
                    const isActive = selectedDocument?.id === doc.id
                    return (
                      <li key={doc.id}>
                        <button
                          type="button"
                          onClick={() => handleThumbnailClick(doc)}
                          className={`flex w-full flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                            isActive
                              ? 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                              : 'border-slate-800 bg-slate-900/60 hover:border-indigo-400/50 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900">
                              {getFileIcon(doc.extension)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate text-sm font-semibold text-slate-100">
                                {doc.name}
                              </p>
                              <p className="text-[11px] text-slate-500">{doc.sizeLabel}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {doc.lastModifiedLabel ? (
                              <span>Updated {doc.lastModifiedLabel}</span>
                            ) : null}
                            <span className="truncate" title={doc.path}>
                              {doc.path}
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
          <section className="hidden grid-cols-1 gap-4 md:grid lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Total documents
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">
                {documents.length}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Signed today
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">0</p>
            </div>
            <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Pending signatures
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">0</p>
            </div>
          </section>
          <section className="mt-auto grid grid-cols-3 gap-3 rounded-3xl border border-slate-800/60 bg-slate-900/70 px-4 py-4 text-center text-xs font-medium text-slate-300 md:hidden">
            <div>
              <p className="uppercase tracking-[0.25em] text-[10px] text-slate-500">Docs</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{documents.length}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.25em] text-[10px] text-slate-500">Signed</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">0</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.25em] text-[10px] text-slate-500">Pending</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">0</p>
            </div>
          </section>
        </main>
      </div>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/95 px-5 py-4 shadow-[0_20px_60px_-35px_rgba(99,102,241,0.5)]">
            <div>
              <p className="text-sm font-semibold text-slate-100">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="mt-0.5 rounded-full border border-slate-800/70 p-1 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
            >
              <XMarkIcon className="h-4 w-4" />
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
            className="flex min-h-full items-center justify-center px-4 py-12 sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-slate-950 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.95)]"
              role="dialog"
              aria-modal="true"
            >
              <PdfPreview file={overlayDocument} onClose={closePreviewOverlay} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

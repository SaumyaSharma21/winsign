import { useEffect, useMemo, useState } from 'react'
import {
  DocumentIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  PlusIcon,
  EyeIcon
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

function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [overlayDocument, setOverlayDocument] = useState(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)

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
      let docToPreview = null

      setDocuments((prev) => {
        const existingByPath = new Map(prev.map((doc) => [doc.path, doc]))
        const merged = [...prev]

        normalized.forEach((doc) => {
          const existing = existingByPath.get(doc.path)
          if (existing) {
            docToPreview = docToPreview ?? existing
          } else {
            merged.push(doc)
            existingByPath.set(doc.path, doc)
            docToPreview = docToPreview ?? doc
          }
        })

        return merged
      })

      if (!docToPreview && normalized.length) {
        docToPreview = normalized[0]
      }

      if (docToPreview) {
        setActiveDocumentId(docToPreview.id)
        openPreviewOverlay(docToPreview)
      }
    } catch (error) {
      console.error('Unable to select documents', error)
    }
  }

  const handleUpload = () => {
    handleDocumentSelection()
  }

  const handleOpenDocument = () => {
    handleDocumentSelection()
  }

  const handleThumbnailClick = (doc) => {
    setActiveDocumentId(doc.id)
    openPreviewOverlay(doc)
  }

  const handlePreviewClick = () => {
    if (selectedDocument) {
      openPreviewOverlay(selectedDocument)
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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
            <button
              onClick={handleUpload}
              className="group flex min-h-[7.5rem] items-start justify-between rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-5 text-left transition-colors hover:border-indigo-400 hover:bg-slate-900/80 sm:px-7 sm:py-6"
            >
              <div className="max-w-sm pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Upload
                </p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Add a document</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Bring a new file into the workspace. Drag-and-drop is supported.
                </p>
                <span className="mt-3 inline-block text-xs font-medium text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100">
                  Supports PDF, DOCX, TXT
                </span>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                <CloudArrowUpIcon className="h-7 w-7 text-indigo-300" />
              </div>
            </button>
            <button
              onClick={handleOpenDocument}
              className="group flex min-h-[7.5rem] items-start justify-between rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-5 text-left transition-colors hover:border-indigo-400 hover:bg-slate-900/80 sm:px-7 sm:py-6"
            >
              <div className="max-w-sm pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                  Browse
                </p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">Open existing file</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Quickly locate a document already on your device or shared drive.
                </p>
                <span className="mt-3 inline-block text-xs font-medium text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100">
                  Recent locations remembered
                </span>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                <FolderOpenIcon className="h-7 w-7 text-indigo-300" />
              </div>
            </button>
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
                <button
                  onClick={handleUpload}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-400"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add new document
                </button>
              ) : (
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
              )}
            </div>
            <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-slate-800/60 bg-slate-950/50 p-0 md:flex-row">
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
                  <button
                    onClick={handleUpload}
                    className="rounded-lg border border-indigo-400/60 px-4 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/10"
                  >
                    Upload a document
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex h-full w-full flex-col border-b border-slate-800/60 md:w-[260px] md:border-b-0 md:border-r">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                          Your files
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-200">
                          Recent activity
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleUpload}
                        className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-white shadow-sm transition hover:bg-indigo-400"
                        aria-label="Add documents"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="flex-1 divide-y divide-slate-800/70 overflow-y-auto">
                      {documents.map((doc) => {
                        const isActive = selectedDocument?.id === doc.id
                        return (
                          <li key={doc.id}>
                            <button
                              type="button"
                              onClick={() => handleThumbnailClick(doc)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                                isActive
                                  ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/60'
                                  : 'hover:bg-slate-900/80'
                              }`}
                            >
                              <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900">
                                {getFileIcon(doc.extension)}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-medium text-slate-100">
                                  {doc.name}
                                </p>
                                <p className="text-[11px] text-slate-500">{doc.sizeLabel}</p>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="flex flex-1 flex-col">
                    {selectedDocument ? (
                      <div className="flex h-full flex-col">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-6 py-5">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                              Document
                            </p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-100">
                              {selectedDocument.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handlePreviewClick}
                              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/60 px-4 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/10"
                            >
                              <EyeIcon className="h-4 w-4" />
                              Preview
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
                            >
                              Sign
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-6 px-6 py-6 text-sm text-slate-300">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                                File type
                              </p>
                              <p className="mt-2 text-base font-semibold text-slate-100">
                                {selectedDocument.extension
                                  ? selectedDocument.extension.toUpperCase()
                                  : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                                File size
                              </p>
                              <p className="mt-2 text-base font-semibold text-slate-100">
                                {selectedDocument.sizeLabel}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                                Last modified
                              </p>
                              <p className="mt-2 text-base font-semibold text-slate-100">
                                {selectedDocument.lastModifiedLabel}
                              </p>
                            </div>
                            <div className="truncate">
                              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                                Location
                              </p>
                              <p className="mt-2 truncate text-base font-semibold text-slate-100">
                                {selectedDocument.path}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 px-5 py-4 text-xs text-slate-400">
                            <p>
                              Click a thumbnail on the left to open an overlay preview.
                              <span className="block">
                                PDF files render inside the app. Other formats are coming soon.
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-400">
                        <p>Select a document from the left to view details.</p>
                      </div>
                    )}
                  </div>
                </>
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
      {isOverlayOpen && overlayDocument && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm"
          role="presentation"
          onClick={closePreviewOverlay}
        >
          <div
            className="relative h-[min(90vh,680px)] w-[min(960px,92vw)] overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.95)]"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <PdfPreview file={overlayDocument} onClose={closePreviewOverlay} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

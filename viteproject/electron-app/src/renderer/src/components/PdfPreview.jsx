import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { getDocument } from '../utils/pdf'

const SCALE_STEP = 0.25
const MIN_SCALE = 0.25
const DEFAULT_SCALE = 0.75
const MAX_SCALE = 2.5

function PdfPreview({ file, onClose }) {
  const scrollContainerRef = useRef(null)
  const canvasRefs = useRef([])
  const pdfInstanceRef = useRef(null)
  const renderTokenRef = useRef(0)
  const [pdf, setPdf] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isPdf = (file?.extension || '').toLowerCase() === 'pdf'

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

  return (
    <div className="pointer-events-auto flex h-full max-h-[calc(100vh-6rem)] min-h-0 w-full flex-col">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/80 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-100">
            {file?.name || 'No document selected'}
          </h3>
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
            {pageCount ? `${pageCount} page${pageCount > 1 ? 's' : ''}` : 'No pages'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80"
        >
          Close
        </button>
      </div>

      <div className="relative flex flex-1 min-h-0 flex-col bg-slate-950/80">
        {!file && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Choose a document to preview.
          </p>
        )}

        {file && !isPdf && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Preview is only available for PDF files right now.
          </p>
        )}

        {file && isPdf && loading && (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Loading preview…
          </p>
        )}

        {error && (
          <p className="flex flex-1 items-center justify-center text-sm text-rose-400">{error}</p>
        )}

        {file && isPdf && !loading && !error && pageCount > 0 && (
          <div ref={scrollContainerRef} className="flex flex-1 overflow-auto px-6 py-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 pb-12">
              {Array.from({ length: pageCount }, (_, index) => (
                <canvas
                  key={`page-${index + 1}`}
                  ref={(el) => {
                    canvasRefs.current[index] = el ?? null
                  }}
                  className="rounded-xl border border-slate-800/80 bg-black/75 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.9)]"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

PdfPreview.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    path: PropTypes.string,
    extension: PropTypes.string
  }),
  onClose: PropTypes.func
}

export default PdfPreview

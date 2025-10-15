import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  XMarkIcon,
  PencilIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

const SignatureInputModal = ({ isOpen, onClose, onSignatureCreated }) => {
  const [activeTab, setActiveTab] = useState('draw') // 'draw', 'type', 'image'
  const [signatures, setSignatures] = useState([])
  const [selectedSignature, setSelectedSignature] = useState(null)

  // Drawing signature state
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)

  // Text signature state
  const [textSignature, setTextSignature] = useState('')
  const [selectedFont, setSelectedFont] = useState('Dancing Script')

  // Image signature state
  const [imageSignature, setImageSignature] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const fileInputRef = useRef(null)

  const fonts = ['Dancing Script', 'Great Vibes', 'Allura', 'Alex Brush', 'Pacifico', 'Satisfy']

  useEffect(() => {
    if (isOpen && activeTab === 'draw') {
      initializeCanvas()
    }
  }, [isOpen, activeTab])

  const initializeCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }

  const startDrawing = (e) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')

    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
  }

  const removeBackground = (imageDataUrl) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Process pixels to remove background
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i]
          const green = data[i + 1]
          const blue = data[i + 2]

          // Calculate brightness and check if it's a background color
          const brightness = (red + green + blue) / 3
          const isWhiteish =
            brightness > 200 &&
            Math.abs(red - green) < 30 &&
            Math.abs(green - blue) < 30 &&
            Math.abs(red - blue) < 30

          // Check for very light grays and off-whites
          const isLightBackground = brightness > 180 && red > 160 && green > 160 && blue > 160

          // Make background pixels transparent
          if (isWhiteish || isLightBackground) {
            data[i + 3] = 0 // Set alpha to 0 (transparent)
          } else {
            // Enhance contrast for signature pixels
            if (brightness < 100) {
              // Darken dark pixels (likely signature)
              data[i] = Math.max(0, red - 20)
              data[i + 1] = Math.max(0, green - 20)
              data[i + 2] = Math.max(0, blue - 20)
            }
          }
        }

        // Put the processed image data back
        ctx.putImageData(imageData, 0, 0)

        // Convert to PNG with transparency
        const processedDataUrl = canvas.toDataURL('image/png')
        resolve(processedDataUrl)
      }
      img.src = imageDataUrl
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setIsProcessingImage(true)
      const reader = new FileReader()
      reader.onload = async (event) => {
        const originalDataUrl = event.target.result
        setOriginalImage(originalDataUrl)

        try {
          // Process the image to remove background
          const processedImage = await removeBackground(originalDataUrl)
          setImageSignature(processedImage)
        } catch (error) {
          console.error('Error processing image:', error)
          // Fallback to original image if processing fails
          setImageSignature(originalDataUrl)
        } finally {
          setIsProcessingImage(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const createSignature = () => {
    let signatureData = null

    if (activeTab === 'draw' && hasDrawing) {
      const canvas = canvasRef.current
      signatureData = {
        type: 'draw',
        data: canvas.toDataURL(),
        name: `Drawn Signature ${Date.now()}`
      }
    } else if (activeTab === 'type' && textSignature.trim()) {
      // Create text signature as SVG
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="80" viewBox="0 0 300 80">
          <text x="10" y="50" font-family="${selectedFont}, cursive" font-size="32" fill="#1e293b">
            ${textSignature}
          </text>
        </svg>
      `
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)

      signatureData = {
        type: 'type',
        data: svgUrl,
        text: textSignature,
        font: selectedFont,
        name: `Text: ${textSignature}`
      }
    } else if (activeTab === 'image' && imageSignature) {
      signatureData = {
        type: 'image',
        data: imageSignature,
        name: `Image Signature ${Date.now()}`
      }
    }

    if (signatureData) {
      const newSignature = { ...signatureData, id: Date.now() }
      setSignatures((prev) => [...prev, newSignature])
      setSelectedSignature(newSignature)
    }
  }

  const useSignature = () => {
    if (selectedSignature) {
      onSignatureCreated(selectedSignature)
      onClose()
    }
  }

  const deleteSignature = (signatureId) => {
    setSignatures((prev) => prev.filter((sig) => sig.id !== signatureId))
    if (selectedSignature?.id === signatureId) {
      setSelectedSignature(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Create Signature</h2>
            <p className="text-sm text-slate-400">Choose how you want to create your signature</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-96">
          {/* Sidebar */}
          <div className="w-64 border-r border-slate-700 p-4">
            {/* Tabs */}
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('draw')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  activeTab === 'draw'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <PencilIcon className="h-5 w-5" />
                Draw
              </button>
              <button
                onClick={() => setActiveTab('type')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  activeTab === 'type'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5" />
                Type
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  activeTab === 'image'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <PhotoIcon className="h-5 w-5" />
                Image
              </button>
            </div>

            {/* Saved Signatures */}
            {signatures.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-slate-300">Saved Signatures</h3>
                <div className="space-y-2">
                  {signatures.map((signature) => (
                    <div
                      key={signature.id}
                      className={`group relative rounded-lg border p-2 transition-colors ${
                        selectedSignature?.id === signature.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedSignature(signature)}
                        className="w-full text-left"
                      >
                        <div className="mb-1 flex h-8 items-center justify-center rounded bg-white">
                          <img
                            src={signature.data}
                            alt={signature.name}
                            className="max-h-6 max-w-full object-contain"
                          />
                        </div>
                        <p className="truncate text-xs text-slate-400">{signature.name}</p>
                      </button>
                      <button
                        onClick={() => deleteSignature(signature.id)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {activeTab === 'draw' && (
              <div className="h-full">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-400">Draw your signature below</p>
                  <button
                    onClick={clearCanvas}
                    className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="h-48 w-full cursor-crosshair rounded-lg border-2 border-dashed border-slate-600 bg-white"
                />
              </div>
            )}

            {activeTab === 'type' && (
              <div className="h-full">
                <div className="mb-4">
                  <label className="mb-2 block text-sm text-slate-400">Your name</label>
                  <input
                    type="text"
                    value={textSignature}
                    onChange={(e) => setTextSignature(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm text-slate-400">Font style</label>
                  <select
                    value={selectedFont}
                    onChange={(e) => setSelectedFont(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                {textSignature && (
                  <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-white">
                    <span style={{ fontFamily: selectedFont }} className="text-3xl text-slate-800">
                      {textSignature}
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'image' && (
              <div className="h-full">
                <div className="mb-4">
                  <p className="mb-2 text-sm text-slate-400">
                    Upload signature image (background will be automatically removed)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-600 p-8 text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-center">
                      <PhotoIcon className="mx-auto h-12 w-12 mb-4" />
                      <p>
                        {isProcessingImage
                          ? 'Processing image...'
                          : 'Click to upload signature image'}
                      </p>
                      <p className="text-xs mt-1">
                        PNG, JPG up to 10MB • Background automatically removed
                      </p>
                    </div>
                  </button>
                </div>

                {isProcessingImage && (
                  <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-slate-100">
                    <div className="text-center">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-slate-600">Removing background...</p>
                    </div>
                  </div>
                )}

                {imageSignature && !isProcessingImage && (
                  <div className="space-y-3">
                    <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-600 bg-gray-200 bg-opacity-50 relative overflow-hidden">
                      {/* Checkered background to show transparency */}
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `
                          linear-gradient(45deg, #ccc 25%, transparent 25%), 
                          linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #ccc 75%), 
                          linear-gradient(-45deg, transparent 75%, #ccc 75%)
                        `,
                          backgroundSize: '10px 10px',
                          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
                        }}
                      ></div>
                      <img
                        src={imageSignature}
                        alt="Processed signature"
                        className="max-h-24 max-w-full object-contain relative z-10"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-green-400">✓ Background removed • Ready to use</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Upload different image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 p-6">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={createSignature}
              disabled={
                (activeTab === 'draw' && !hasDrawing) ||
                (activeTab === 'type' && !textSignature.trim()) ||
                (activeTab === 'image' && !imageSignature)
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Signature
            </button>
            <button
              onClick={useSignature}
              disabled={!selectedSignature}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckIcon className="h-4 w-4" />
              Use Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

SignatureInputModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSignatureCreated: PropTypes.func.isRequired
}

export default SignatureInputModal

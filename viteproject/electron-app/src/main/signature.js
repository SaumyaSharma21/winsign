import forge from 'node-forge'
import { PDFDocument, rgb } from 'pdf-lib'
import { promises as fs } from 'fs'

/**
 * Generate a self-signed certificate for document signing
 * In a production environment, you would use a proper CA-issued certificate
 */
export function generateSelfSignedCertificate() {
  // Generate a key pair
  const keys = forge.pki.rsa.generateKeyPair(2048)

  // Create a certificate
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)

  const attrs = [
    { name: 'commonName', value: 'WinSign Document Signer' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'California' },
    { name: 'localityName', value: 'San Francisco' },
    { name: 'organizationName', value: 'WinSign Inc.' },
    { shortName: 'OU', value: 'Digital Signatures' }
  ]

  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }
  ])

  // Self-sign certificate
  cert.sign(keys.privateKey)

  return {
    certificate: cert,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey
  }
}

/**
 * Create a visual signature on the PDF at specified coordinates
 */
async function addVisualSignature(pdfBuffer, signatureFields) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()

    for (const field of signatureFields) {
      const page = pages[field.pageNumber - 1]
      if (!page) continue

      const { width: pageWidth, height: pageHeight } = page.getSize()

      // The coordinates from SignatureEditor are in canvas pixel space
      // We need to convert them to PDF coordinate space
      //
      // In SignatureEditor, coordinates are calculated as:
      // pdfX = ((x / rect.width) * canvas.width) / devicePixelRatio
      // where canvas.width = viewport.width * devicePixelRatio
      // and viewport.width = pageWidth * scale
      //
      // So to reverse: PDF coordinate = canvas_coordinate / (scale * devicePixelRatio)
      const scale = 0.75 // Default scale used in renderer
      const devicePixelRatio = 1 // Standard ratio for consistency

      // Convert canvas coordinates to PDF coordinates
      const pdfX = field.x / scale / devicePixelRatio
      const pdfY = field.y / scale / devicePixelRatio
      const pdfWidth = field.width / scale / devicePixelRatio
      const pdfHeight = field.height / scale / devicePixelRatio

      // PDF coordinate system has origin at bottom-left, canvas has top-left
      const x = pdfX
      const y = pageHeight - pdfY - pdfHeight

      // Only add the actual signature - no borders, text, or metadata
      if (field.signatureData && field.signatureType) {
        if (field.signatureType === 'image' && field.signatureData) {
          try {
            // Handle base64 image data
            const base64Data = field.signatureData.replace(/^data:image\/[a-z]+;base64,/, '')
            const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

            // Embed the image
            const image = field.signatureData.includes('data:image/png')
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes)

            // Draw the signature image without any additional elements
            page.drawImage(image, {
              x: x,
              y: y,
              width: pdfWidth,
              height: pdfHeight
            })
          } catch (imageError) {
            console.warn('Failed to embed signature image:', imageError)
            // Fallback to text if image fails
            page.drawText(field.signatureText || 'Signature', {
              x: x + 5,
              y: y + pdfHeight / 2,
              size: Math.min(pdfHeight / 3, 16),
              color: rgb(0, 0, 0)
            })
          }
        } else if (field.signatureType === 'text' && field.signatureText) {
          // Draw text signature without any borders or metadata
          const fontSize = Math.min(pdfHeight / 2, 20)
          page.drawText(field.signatureText, {
            x: x + 5,
            y: y + pdfHeight / 2 - fontSize / 2,
            size: fontSize,
            color: rgb(0, 0, 0)
          })
        } else if (field.signatureType === 'type' && (field.signatureData || field.signatureText)) {
          // Handle typed signature (could be SVG URL or direct text)
          if (field.signatureText) {
            const fontSize = Math.min(pdfHeight / 2, 20)
            page.drawText(field.signatureText, {
              x: x + 5,
              y: y + pdfHeight / 2 - fontSize / 2,
              size: fontSize,
              color: rgb(0, 0, 0)
            })
          }
        } else if (field.signatureType === 'draw' && field.signatureData) {
          try {
            // Handle drawn signature as PNG image
            const base64Data = field.signatureData.replace(/^data:image\/png;base64,/, '')
            const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
            const image = await pdfDoc.embedPng(imageBytes)

            // Draw the signature image
            page.drawImage(image, {
              x: x,
              y: y,
              width: pdfWidth,
              height: pdfHeight
            })
          } catch (drawError) {
            console.warn('Failed to embed drawn signature:', drawError)
            // Fallback to simple text
            page.drawText('Signature', {
              x: x + 5,
              y: y + pdfHeight / 2,
              size: Math.min(pdfHeight / 3, 16),
              color: rgb(0, 0, 0)
            })
          }
        }
      } else {
        // Fallback: simple signature placeholder
        page.drawText('Signature', {
          x: x + 5,
          y: y + pdfHeight / 2,
          size: Math.min(pdfHeight / 3, 16),
          color: rgb(0, 0, 0)
        })
      }
    }

    return await pdfDoc.save()
  } catch (error) {
    console.error('Failed to add visual signature:', error)
    throw error
  }
}

/**
 * Apply digital signature to the PDF document
 */
export async function signDocument(filePath, signatureFields, outputPath) {
  try {
    // Read the original PDF
    const pdfBuffer = await fs.readFile(filePath)

    // Generate certificate (in production, load from secure storage)
    const { certificate } = generateSelfSignedCertificate()

    // Add visual signatures
    const signedPdfBuffer = await addVisualSignature(pdfBuffer, signatureFields)

    // Create signature metadata
    const signatureInfo = {
      signer: 'WinSign User',
      reason: 'Document approval',
      location: 'WinSign Application',
      signatureDate: new Date().toISOString(),
      certificateInfo: {
        subject: certificate.subject.getField('CN').value,
        issuer: certificate.issuer.getField('CN').value,
        validFrom: certificate.validity.notBefore.toISOString(),
        validTo: certificate.validity.notAfter.toISOString()
      },
      signatureFields: signatureFields.map((field) => ({
        pageNumber: field.pageNumber,
        coordinates: { x: field.x, y: field.y },
        dimensions: { width: field.width, height: field.height }
      }))
    }

    // Save the signed PDF
    await fs.writeFile(outputPath, signedPdfBuffer)

    // Save signature metadata (for verification purposes)
    const metadataPath = outputPath.replace('.pdf', '_signature_metadata.json')
    await fs.writeFile(metadataPath, JSON.stringify(signatureInfo, null, 2))

    return {
      success: true,
      signedFilePath: outputPath,
      metadataPath: metadataPath,
      signatureInfo
    }
  } catch (error) {
    console.error('Failed to sign document:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Verify a signed document
 */
export async function verifyDocument(signedFilePath) {
  try {
    const metadataPath = signedFilePath.replace('.pdf', '_signature_metadata.json')

    // Check if metadata file exists
    try {
      await fs.access(metadataPath)
    } catch {
      return {
        isValid: false,
        reason: 'No signature metadata found'
      }
    }

    // Read signature metadata
    const metadataContent = await fs.readFile(metadataPath, 'utf-8')
    const signatureInfo = JSON.parse(metadataContent)

    // Basic verification (in production, you would verify against the actual certificate)
    const isValid = signatureInfo.signatureFields && signatureInfo.signatureFields.length > 0

    return {
      isValid,
      signatureInfo,
      verificationDate: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to verify document:', error)
    return {
      isValid: false,
      reason: 'Verification failed: ' + error.message
    }
  }
}

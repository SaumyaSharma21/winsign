import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { basename, extname, join, parse } from 'path'
import { promises as fs } from 'fs'
import { randomUUID } from 'crypto'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { signDocument, verifyDocument } from './signature.js'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 630,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('documents:open', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select documents',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Supported documents', extensions: ['pdf', 'docx', 'txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePaths.length) {
        return { canceled: true, files: [] }
      }

      const files = await Promise.all(
        result.filePaths.map(async (filePath) => {
          const stats = await fs.stat(filePath)
          const extension = extname(filePath).replace('.', '').toLowerCase()

          return {
            id: randomUUID(),
            name: basename(filePath),
            path: filePath,
            size: stats.size,
            lastModified: stats.mtimeMs,
            extension
          }
        })
      )

      return { canceled: false, files }
    } catch (error) {
      console.error('[documents:open] failed', error)
      return { canceled: true, files: [], error: error.message }
    }
  })

  ipcMain.handle('documents:read', async (_event, filePath) => {
    try {
      const buffer = await fs.readFile(filePath)
      return buffer
    } catch (error) {
      console.error('[documents:read] failed', error)
      throw error
    }
  })

  ipcMain.handle('documents:sign', async (_event, { filePath, signatureFields }) => {
    try {
      console.log('[documents:sign] Starting signing process...')
      console.log('[documents:sign] File path:', filePath)
      console.log('[documents:sign] Signature fields:', signatureFields?.length, 'fields')

      // Generate output filename
      const parsedPath = parse(filePath)
      const outputFileName = `${parsedPath.name}_signed${parsedPath.ext}`
      const outputPath = join(parsedPath.dir, outputFileName)

      console.log('[documents:sign] Output path:', outputPath)

      // Sign the document
      const result = await signDocument(filePath, signatureFields, outputPath)

      console.log('[documents:sign] Signing result:', result)

      if (result.success) {
        return {
          success: true,
          signedFilePath: result.signedFilePath,
          signatureInfo: result.signatureInfo
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[documents:sign] failed', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  ipcMain.handle('documents:verify', async (_event, signedFilePath) => {
    try {
      const result = await verifyDocument(signedFilePath)
      return result
    } catch (error) {
      console.error('[documents:verify] failed', error)
      return {
        isValid: false,
        reason: 'Verification failed: ' + error.message
      }
    }
  })

  // Add download handler for signed documents
  ipcMain.handle('documents:download', async (_event, { filePath, fileName }) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Save Signed Document',
        defaultPath: fileName,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        // Copy the file to the selected location
        await fs.copyFile(filePath, result.filePath)
        return {
          success: true,
          savedPath: result.filePath
        }
      } else {
        return {
          success: false,
          error: 'Download cancelled'
        }
      }
    } catch (error) {
      console.error('[documents:download] failed', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  createWindow()

  console.log('✅ IPC handlers registered:', [
    'documents:open',
    'documents:read',
    'documents:sign',
    'documents:verify',
    'documents:download'
  ])

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  openDocuments: () => ipcRenderer.invoke('documents:open'),
  readDocument: (filePath) => ipcRenderer.invoke('documents:read', filePath),
  signDocument: (signData) => ipcRenderer.invoke('documents:sign', signData),
  verifyDocument: (filePath) => ipcRenderer.invoke('documents:verify', filePath),
  downloadDocument: (downloadData) => ipcRenderer.invoke('documents:download', downloadData)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

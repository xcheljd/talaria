// Electron main process entry point
// Loads the built Vite app (dist/start.html or dist/index.html) into a native window.

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';

// Shared download directory for all templates.
// If null, main will fall back to app.getPath('downloads').
let downloadBaseDir = null;

// Simple JSON persistence for downloadBaseDir under app.getPath('userData')
function getDownloadsConfigPath() {
  try {
    const userDataDir = app.getPath('userData');
    return path.join(userDataDir, 'downloads-config.json');
  } catch (e) {
    console.warn('Could not resolve userData path for downloads config:', e);
    return null;
  }
}

function loadDownloadConfig() {
  const configPath = getDownloadsConfigPath();
  if (!configPath) return;

  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data.downloadBaseDir === 'string' && data.downloadBaseDir) {
        downloadBaseDir = data.downloadBaseDir;
      }
    }
  } catch (e) {
    console.warn('Failed to load downloads-config.json:', e);
  }
}

function saveDownloadConfig() {
  const configPath = getDownloadsConfigPath();
  if (!configPath) return;

  try {
    const data = { downloadBaseDir };
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save downloads-config.json:', e);
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    title: 'Communication Template Generator',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const distDir = path.join(__dirname, '..', 'dist');
  const startHtml = path.join(distDir, 'start.html');
  const indexHtml = path.join(distDir, 'index.html');

  const entryFile = fs.existsSync(startHtml) ? startHtml : indexHtml;

  win.loadFile(entryFile).catch((err) => {
    console.error('Failed to load entry HTML file:', err);
  });

  // Handle downloads (EML/EMLTPL/ZIP batches) by writing directly to a
  // shared download folder. The folder is chosen via IPC from the renderer
  // (start.html) and stored in downloadBaseDir; if not set, we fall back to
  // the OS default Downloads directory.
  const ses = win.webContents.session;
  ses.on('will-download', (event, item /* DownloadItem */) => {
    const filename = item.getFilename();
    const baseDir = downloadBaseDir || app.getPath('downloads');
    const savePath = path.join(baseDir, filename);

    // Set the save path before the item starts, which bypasses the
    // Save As dialog and writes straight to disk.
    item.setSavePath(savePath);

    item.once('done', (e, state) => {
      if (state === 'completed') {
        console.log('Download completed:', savePath);
      } else {
        console.warn('Download failed:', filename, state);
      }
    });
  });
}

// IPC handlers for download directory selection
ipcMain.handle('downloads:getBaseDir', () => {
  return downloadBaseDir || app.getPath('downloads');
});

ipcMain.handle('downloads:chooseBaseDir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  const result = await dialog.showOpenDialog(win || null, {
    title: 'Choose folder for email downloads',
    defaultPath: downloadBaseDir || app.getPath('downloads'),
    properties: ['openDirectory', 'createDirectory'],
  });

  if (!result.canceled && result.filePaths && result.filePaths[0]) {
    downloadBaseDir = result.filePaths[0];
  } else if (!downloadBaseDir) {
    // If user cancels and we have no previous choice, fall back to Downloads
    downloadBaseDir = app.getPath('downloads');
  }

  // Persist the new value (or fallback) for future sessions
  saveDownloadConfig();

  return downloadBaseDir;
});

app.whenReady().then(() => {
  // Load persisted downloadBaseDir (if any) before creating windows
  loadDownloadConfig();

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

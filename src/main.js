const { app, BrowserWindow, ipcMain, nativeTheme, dialog, Menu, globalShortcut, Tray, clipboard, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const taskStorage = require('./taskStorage');
const DropboxClient = require('./dropboxClient');
const RamdiskManager = require('./ramdiskManager');
const DropboxStorage = require('./dropboxStorage');
const OAuthServer = require('./oauthServer');
const VectorDbClient = require('./vectorDbClient');

const execAsync = promisify(exec);

let mainWindow;
let currentGlobalHotkey = null;
let tray = null;
let isQuittingFromCtrlClick = false;
let dropboxClient = null;
let ramdiskManager = null;
let dropboxStorages = new Map(); // folderId -> DropboxStorage instance
let currentFolderId = null; // Track which folder is currently active
let currentFolderInfo = null; // Store current folder config
let vectorDbClient = null; // VectorDbClient instance for embeddings

async function createWindow() {
  // Hide the menu bar
  Menu.setApplicationMenu(null);

  // Load saved window bounds
  let windowBounds = { width: 1200, height: 800 };
  try {
    const config = await taskStorage.readConfig();
    if (config.windowBounds) {
      windowBounds = config.windowBounds;
    }
  } catch (error) {
    console.error('Error loading window bounds:', error);
  }

  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Save window bounds when moved or resized
  const saveBounds = async () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        await taskStorage.updateConfig({ windowBounds: bounds });
      }
    } catch (error) {
      console.error('Error saving window bounds:', error);
    }
  };

  // Debounce the save to avoid too many writes
  let saveBoundsTimeout = null;
  const debouncedSaveBounds = () => {
    if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(saveBounds, 500);
  };

  mainWindow.on('resize', debouncedSaveBounds);
  mainWindow.on('move', debouncedSaveBounds);

  // Prevent window from closing, minimize to tray instead
  mainWindow.on('close', (event) => {
    // Check if Ctrl key is pressed - if so, exit the app
    if (isCtrlKeyPressed && !isQuittingFromCtrlClick) {
      console.log('Ctrl+Click detected - exiting app');
      isQuittingFromCtrlClick = true; // Set flag to prevent re-entry

      // Destroy tray icon immediately
      if (tray && !tray.isDestroyed()) {
        tray.destroy();
      }

      // Save bounds and quit
      saveBounds().finally(() => {
        app.isQuitting = true;
        app.quit();
      });

      // Don't prevent default - let the window close
      return;
    }

    if (!app.isQuitting && !isQuittingFromCtrlClick) {
      event.preventDefault();
      console.log('Hiding window to tray');

      // Save bounds async without blocking
      saveBounds();

      // Hide the window
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow) {
      const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      mainWindow.webContents.send('theme-changed', theme);
    }
  });

}

function getTrayIconPath() {
  // Use white icon for dark system themes, black icon for light themes
  const iconName = nativeTheme.shouldUseDarkColors ? 'tasks-dark.png' : 'tasks.png';
  return path.join(__dirname, '../assets', iconName);
}

function updateTrayIcon() {
  if (tray && !tray.isDestroyed()) {
    const iconPath = getTrayIconPath();
    tray.setImage(iconPath);
    console.log('Tray icon updated for theme:', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  }
}

function createTray() {
  // Create tray icon with appropriate icon for current system theme
  const iconPath = getTrayIconPath();
  tray = new Tray(iconPath);

  // Set tooltip
  tray.setToolTip('Tasker - Task Management');

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Tasker',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();

          // Bring to front (Windows specific)
          mainWindow.setAlwaysOnTop(true);
          mainWindow.setAlwaysOnTop(false);
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  // Set context menu
  tray.setContextMenu(contextMenu);

  // Handle tray icon click (left click)
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();

        // Bring to front (Windows specific)
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);
      }
    }
  });

  console.log('System tray icon created');
}

async function initializeSettings() {
  try {
    // Load config
    const config = await taskStorage.readConfig();

    // Initialize embedded Vector DB only if Ollama is configured
    if (config.ollamaUrl && config.ollamaEmbeddingModel) {
      const vectorPath = path.join(app.getPath('userData'), 'vector-data');

      console.log('[VectorDB] Ollama configured, initializing embedded database...');
      console.log('[VectorDB] Ollama URL:', config.ollamaUrl);
      console.log('[VectorDB] Embedding Model:', config.ollamaEmbeddingModel);

      try {
        vectorDbClient = new VectorDbClient(vectorPath, config.ollamaUrl, config.ollamaEmbeddingModel);
        const initResult = await vectorDbClient.initialize();

        if (initResult.success) {
          console.log('[VectorDB] Embedded database initialized successfully');
          // Create collection
          await vectorDbClient.createCollection();
        } else {
          console.error('[VectorDB] Failed to initialize:', initResult.error);
        }
      } catch (error) {
        console.error('[VectorDB] Error during initialization:', error);
      }
    } else {
      console.log('[VectorDB] Ollama not configured. Embeddings disabled.');
      console.log('[VectorDB] Configure Ollama in Settings to enable embeddings.');
      vectorDbClient = null;
    }

    // Apply global hotkey
    const hotkey = config.globalHotkey || 'CommandOrControl+Alt+T';
    registerGlobalHotkey(hotkey);

    // Apply auto-launch setting (default to true)
    const autoLaunch = config.autoLaunch !== undefined ? config.autoLaunch : true;
    const startMinimized = config.startMinimized !== undefined ? config.startMinimized : true;

    // Only enable auto-launch for packaged apps
    // In development, electron.exe would launch without the app path
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: autoLaunch,
        openAsHidden: startMinimized,
        args: []
      });
      console.log(`Auto-launch initialized: ${autoLaunch ? 'enabled' : 'disabled'}`);
      console.log(`Start minimized: ${startMinimized ? 'enabled' : 'disabled'}`);
    } else {
      console.log('Auto-launch disabled in development mode');
      console.log('Auto-launch only works when app is built/packaged');
    }

    // If we should start minimized and the app was launched at login, hide the window
    if (startMinimized && app.getLoginItemSettings().wasOpenedAtLogin && mainWindow) {
      mainWindow.hide();
      console.log('Window hidden on startup');
    }

  } catch (error) {
    console.error('Error loading settings:', error);
    // Fallback to defaults
    registerGlobalHotkey('CommandOrControl+Alt+T');
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      args: []
    });
  }
}

function registerGlobalHotkey(accelerator) {
  try {
    // Unregister previous hotkey if exists
    if (currentGlobalHotkey) {
      globalShortcut.unregister(currentGlobalHotkey);
      console.log(`Unregistered previous hotkey: ${currentGlobalHotkey}`);
    }

    // Check if accelerator is already registered
    if (globalShortcut.isRegistered(accelerator)) {
      console.log(`Hotkey ${accelerator} is already registered, unregistering first...`);
      globalShortcut.unregister(accelerator);
    }

    // Register new hotkey
    const registered = globalShortcut.register(accelerator, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Global hotkey triggered!');

        // Restore window if minimized
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }

        // Show window if hidden
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }

        // Focus the window
        mainWindow.focus();

        // Bring to front (Windows specific)
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);

        // Wait a moment for window to be ready, then send message to renderer to focus task input
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('quick-add-task');
          }
        }, 100);
      }
    });

    if (registered) {
      currentGlobalHotkey = accelerator;
      console.log(`✓ Global hotkey registered successfully: ${accelerator}`);
    } else {
      console.error(`✗ Failed to register global hotkey: ${accelerator} (may be in use by another application)`);
    }
  } catch (error) {
    console.error('Error registering global hotkey:', error);
  }
}

// ========================================
// Singleton Instance Lock
// ========================================
// Only allow one instance of the app to run at a time
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit immediately
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // We got the lock, so set up handler for when someone tries to launch a second instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    console.log('Second instance launch detected, focusing existing window');

    if (mainWindow) {
      // Restore window if minimized
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      // Show window if hidden
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }

      // Focus the window
      mainWindow.focus();

      // Bring to front (Windows specific)
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize ramdisk manager
  ramdiskManager = new RamdiskManager();
  await ramdiskManager.initialize();

  createWindow();
  createTray();

  // Listen for system theme changes and update tray icon
  nativeTheme.on('updated', () => {
    console.log('System theme changed, updating tray icon');
    updateTrayIcon();
  });

  // Wait a bit for the window to be fully ready, then initialize settings
  setTimeout(() => {
    initializeSettings();
  }, 1000);
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed (keep running in tray)
  // The app will only quit when explicitly requested via the tray menu
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  console.log('[Main] before-quit event triggered');

  // Prevent immediate quit to allow cleanup
  event.preventDefault();

  try {
    // Unregister all global shortcuts before quitting
    globalShortcut.unregisterAll();

    // Clean up all DropboxStorage instances (stops watchers and cleans ramdisks)
    console.log(`[Main] Cleaning up ${dropboxStorages.size} DropboxStorage instances`);
    for (const [folderId, dropboxStorage] of dropboxStorages.entries()) {
      console.log(`[Main] Cleaning up DropboxStorage for folder ${folderId}`);
      await dropboxStorage.cleanup(folderId);
    }
    dropboxStorages.clear();

    // Clean up any remaining ramdisks
    if (ramdiskManager) {
      console.log('[Main] Cleaning up remaining ramdisks');
      await ramdiskManager.cleanupAll();
    }

    console.log('[Main] Cleanup complete, quitting app');
  } catch (error) {
    console.error('[Main] Error during cleanup:', error);
  } finally {
    // Now allow quit
    app.exit(0);
  }
});

// Handle quit event
app.on('quit', () => {
  // Destroy tray icon
  if (tray) {
    tray.destroy();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Clipboard IPC handlers
ipcMain.handle('clipboard:read-text', () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard:write-text', (_event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

// Shell IPC handlers
ipcMain.handle('shell:open-external', async (_event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-system-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

ipcMain.handle('update-global-hotkey', async (_event, accelerator) => {
  try {
    registerGlobalHotkey(accelerator);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-Launch IPC handlers

ipcMain.handle('set-auto-launch', async (_event, enabled, startMinimized) => {
  try {
    // Only allow auto-launch for packaged apps
    if (!app.isPackaged) {
      console.log('Auto-launch can only be set for packaged/built applications');
      return { success: false, error: 'Auto-launch only works for built applications. Please build the app first.' };
    }

    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: startMinimized || false,
      args: []
    });

    console.log(`Auto-launch ${enabled ? 'enabled' : 'disabled'}`);
    console.log(`Start minimized ${startMinimized ? 'enabled' : 'disabled'}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting auto-launch:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-auto-launch', async () => {
  try {
    const settings = app.getLoginItemSettings();
    return { success: true, enabled: settings.openAtLogin };
  } catch (error) {
    console.error('Error getting auto-launch:', error);
    return { success: false, error: error.message };
  }
});

// Window Control IPC handlers

ipcMain.handle('snap-window', async (_event, position) => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Window not found' };
    }

    const { screen } = require('electron');
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    const { x, y } = display.workArea;

    switch (position) {
      case 'left':
        // Snap to left half of screen
        mainWindow.setBounds({
          x: x,
          y: y,
          width: Math.floor(width / 2),
          height: height
        });
        break;

      case 'right':
        // Snap to right half of screen
        mainWindow.setBounds({
          x: x + Math.floor(width / 2),
          y: y,
          width: Math.floor(width / 2),
          height: height
        });
        break;

      case 'center':
        // Center window with default size
        const defaultWidth = 1200;
        const defaultHeight = 800;
        const centerX = x + Math.floor((width - defaultWidth) / 2);
        const centerY = y + Math.floor((height - defaultHeight) / 2);

        mainWindow.setBounds({
          x: centerX,
          y: centerY,
          width: defaultWidth,
          height: defaultHeight
        });
        break;

      default:
        return { success: false, error: 'Invalid position' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error snapping window:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hide-to-tray', async () => {
  try {
    if (mainWindow) {
      mainWindow.hide();
      return { success: true };
    }
    return { success: false, error: 'Window not found' };
  } catch (error) {
    console.error('Error hiding window:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('exit-app', async () => {
  try {
    app.isQuitting = true;
    app.quit();
    return { success: true };
  } catch (error) {
    console.error('Error exiting app:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-devtools', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error toggling DevTools:', error);
    return { success: false, error: error.message };
  }
});

// Track if Ctrl key is pressed
let isCtrlKeyPressed = false;

ipcMain.on('set-ctrl-key-state', (_event, isPressed) => {
  isCtrlKeyPressed = isPressed;
});

// ========================================
// Storage Helper Functions
// ========================================

/**
 * Get the appropriate storage instance for the current folder
 * Returns DropboxStorage for Dropbox folders, plain taskStorage otherwise
 */
function getStorage() {
  if (currentFolderId && dropboxStorages.has(currentFolderId)) {
    return dropboxStorages.get(currentFolderId).getTaskStorage();
  }
  return taskStorage;
}

/**
 * Initialize storage for a folder (either local or Dropbox)
 * If the folder is a Dropbox folder, this will create a DropboxStorage instance
 * and start file watching
 */
async function initializeFolderStorage(folderId, folderPath, storageType, dropboxPath) {
  if (storageType === 'dropbox' && dropboxPath) {
    console.log(`[DropboxStorage] Initializing Dropbox storage for folder ${folderId}`);

    // Create DropboxStorage instance, passing the taskStorage singleton
    const dropboxStorage = new DropboxStorage(dropboxClient, ramdiskManager, taskStorage);

    // Initialize and start watching
    await dropboxStorage.initialize(folderId, dropboxPath);

    // Store the instance
    dropboxStorages.set(folderId, dropboxStorage);

    console.log(`[DropboxStorage] Started watching folder ${folderId} at ${folderPath}`);
  } else {
    // Local folder - just initialize plain taskStorage
    await taskStorage.initialize(folderPath);
  }
}

/**
 * Stop watching and cleanup a Dropbox folder
 */
async function cleanupFolderStorage(folderId) {
  if (dropboxStorages.has(folderId)) {
    const dropboxStorage = dropboxStorages.get(folderId);
    await dropboxStorage.cleanup(folderId);
    dropboxStorages.delete(folderId);
    console.log(`[DropboxStorage] Cleaned up folder ${folderId}`);
  }
}

// ========================================
// Task Storage IPC handlers
// ========================================

ipcMain.handle('tasks:initialize', async (_event, customPath) => {
  try {
    const tasksPath = await taskStorage.initialize(customPath);
    return { success: true, path: tasksPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:get-path', () => {
  return taskStorage.getTasksPath();
});

ipcMain.handle('tasks:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Tasks Folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Set the current folder (called when user switches folders)
ipcMain.handle('tasks:set-current-folder', async (_event, folderInfo) => {
  try {
    const { id, path: folderPath, storageType, dropboxPath } = folderInfo;

    console.log(`[Main] Setting current folder: ${id} (${storageType})`);

    // Store current folder info
    currentFolderId = id;
    currentFolderInfo = folderInfo;

    // If this is a Dropbox folder and we don't have a storage instance yet, create one
    if (storageType === 'dropbox' && dropboxPath && !dropboxStorages.has(id)) {
      await initializeFolderStorage(id, folderPath, storageType, dropboxPath);
    } else if (storageType === 'local') {
      // Initialize plain taskStorage for local folders
      await taskStorage.initialize(folderPath);
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting current folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:load', async (_event, dirPath) => {
  try {
    const storage = getStorage();
    const basePath = dirPath || storage.getTasksPath();
    const tasks = await storage.loadTasks(basePath, true);
    return { success: true, tasks };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:create', async (_event, parentPath, text, body) => {
  try {
    const storage = getStorage();
    const task = await storage.createTask(parentPath, text, body);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:update', async (_event, taskPath, updates) => {
  try {
    const storage = getStorage();
    const task = await storage.updateTask(taskPath, updates);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:delete', async (_event, taskPath) => {
  try {
    const storage = getStorage();
    await storage.deleteTask(taskPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:move-to-parent', async (_event, taskPath, newParentTaskPath) => {
  try {
    const storage = getStorage();
    const newPath = await storage.moveTaskToParent(taskPath, newParentTaskPath);
    return { success: true, newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:move-to-sibling', async (_event, taskPath, targetTaskPath) => {
  try {
    const storage = getStorage();
    const newPath = await storage.moveTaskToSibling(taskPath, targetTaskPath);
    return { success: true, newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:move-to-folder', async (_event, taskPath, destinationFolderId, newParentTaskPath) => {
  try {
    const path = require('path');
    const fs = require('fs').promises;

    // Get config to find the destination folder path
    const config = await taskStorage.readConfig();
    const destFolder = config.taskFolders.find(f => f.id === destinationFolderId);

    if (!destFolder) {
      return { success: false, error: 'Destination folder not found' };
    }

    // Get the source and destination storage instances
    const sourceStorage = getStorage();
    const fileName = path.basename(taskPath);
    const oldParentPath = path.dirname(taskPath);

    // Determine destination path
    let destPath;
    if (newParentTaskPath) {
      // Moving to a parent task - create parent directory
      const parentDir = newParentTaskPath.replace('.md', '');
      await fs.mkdir(parentDir, { recursive: true });
      destPath = path.join(parentDir, fileName);
    } else {
      // Moving to root of destination folder
      destPath = path.join(destFolder.path, fileName);
    }

    // Move the task file
    await fs.rename(taskPath, destPath);

    // Move associated directory if it exists
    const oldTaskDir = taskPath.replace('.md', '');
    const newTaskDir = destPath.replace('.md', '');
    try {
      const oldDirStats = await fs.stat(oldTaskDir);
      if (oldDirStats.isDirectory()) {
        await fs.rename(oldTaskDir, newTaskDir);
      }
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    // Update source folder metadata
    const oldMetadata = await sourceStorage.readMetadata(oldParentPath);
    oldMetadata.order = oldMetadata.order.filter(f => f !== fileName);
    await sourceStorage.writeMetadata(oldParentPath, oldMetadata);

    // Update destination folder metadata
    const destDir = newParentTaskPath ? path.dirname(newParentTaskPath) : destFolder.path;

    // Read or create metadata for destination
    let destMetadata;
    try {
      destMetadata = await sourceStorage.readMetadata(destDir);
    } catch {
      destMetadata = { order: [], created: new Date().toISOString(), modified: new Date().toISOString() };
    }

    if (!destMetadata.order.includes(fileName)) {
      // Find the position of the first completed task
      let insertIndex = destMetadata.order.length; // Default: add at end

      for (let i = 0; i < destMetadata.order.length; i++) {
        const siblingFileName = destMetadata.order[i];
        const siblingPath = path.join(destDir, siblingFileName);

        try {
          const siblingTask = await sourceStorage.parseTaskFile(siblingPath);
          if (siblingTask.completed) {
            // Found first completed task, insert moved task before it
            insertIndex = i;
            break;
          }
        } catch (error) {
          // If we can't read a sibling task, skip it
          console.error(`Error reading sibling task ${siblingPath}:`, error);
        }
      }

      // Insert at the calculated position (bottom of incomplete, above completed)
      destMetadata.order.splice(insertIndex, 0, fileName);
      await sourceStorage.writeMetadata(destDir, destMetadata);
    }

    return { success: true, newPath: destPath };
  } catch (error) {
    console.error('[Move to folder] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:reorder', async (_event, dirPath, orderedFileNames) => {
  try {
    const storage = getStorage();
    await storage.reorderTasks(dirPath, orderedFileNames);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:search', async (_event, searchText) => {
  try {
    const storage = getStorage();
    const basePath = storage.getTasksPath();
    const results = await storage.searchTasks(basePath, searchText);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:clear-deleted', async () => {
  try {
    const storage = getStorage();
    await storage.clearDeletedItems();

    // Debug logging
    console.log('[Main] Clear deleted items complete. Checking for Dropbox sync...');
    console.log(`[Main] currentFolderId: ${currentFolderId}`);
    console.log(`[Main] currentFolderInfo:`, currentFolderInfo);
    console.log(`[Main] dropboxStorages.has(${currentFolderId}): ${dropboxStorages.has(currentFolderId)}`);

    // Manually trigger Dropbox sync if this is a Dropbox folder
    if (currentFolderId && currentFolderInfo && dropboxStorages.has(currentFolderId)) {
      console.log(`[Main] storageType: ${currentFolderInfo.storageType}, dropboxPath: ${currentFolderInfo.dropboxPath}`);
      if (currentFolderInfo.storageType === 'dropbox' && currentFolderInfo.dropboxPath) {
        console.log('[Main] Manually triggering Dropbox sync after clearing deleted items');
        const dropboxStorage = dropboxStorages.get(currentFolderId);
        await dropboxStorage.manualPush(currentFolderId, currentFolderInfo.dropboxPath);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:restore', async (_event, taskPath) => {
  try {
    const storage = getStorage();
    const restoredPath = await storage.restoreTask(taskPath);
    return { success: true, restoredPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:permanently-delete', async (_event, taskPath) => {
  try {
    const storage = getStorage();
    await storage.permanentlyDeleteTask(taskPath);

    // Manually trigger Dropbox sync if this is a Dropbox folder
    if (currentFolderId && currentFolderInfo && dropboxStorages.has(currentFolderId)) {
      if (currentFolderInfo.storageType === 'dropbox' && currentFolderInfo.dropboxPath) {
        console.log('[Main] Manually triggering Dropbox sync after permanently deleting task');
        const dropboxStorage = dropboxStorages.get(currentFolderId);
        await dropboxStorage.manualPush(currentFolderId, currentFolderInfo.dropboxPath);
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Config Storage IPC handlers

ipcMain.handle('config:read', async () => {
  try {
    const config = await taskStorage.readConfig();
    return { success: true, config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:write', async (_event, config) => {
  try {
    await taskStorage.writeConfig(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:update', async (_event, updates) => {
  try {
    const config = await taskStorage.updateConfig(updates);
    return { success: true, config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Ollama IPC handlers

async function detectOllama(url = 'http://localhost:11434') {
  try {
    // Test Ollama HTTP API
    const http = require('http');
    const https = require('https');
    const urlModule = require('url');

    return new Promise((resolve) => {
      const parsedUrl = urlModule.parse(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const apiUrl = `${url}/api/version`;

      const req = protocol.get(apiUrl, { timeout: 3000 }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const version = JSON.parse(data);
            console.log('Found Ollama via HTTP API:', version);
            resolve({
              success: true,
              path: url,
              version: version.version || 'unknown'
            });
          } catch (parseError) {
            resolve({ success: false, error: 'Failed to parse Ollama version response' });
          }
        });
      });

      req.on('error', (error) => {
        console.log('Ollama HTTP API not available:', error.message);
        resolve({
          success: false,
          error: 'Ollama not running. Please start Ollama service.'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Connection to Ollama timed out. Please ensure Ollama is running.'
        });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

ipcMain.handle('ollama:detect', async (_event, url) => {
  return await detectOllama(url);
});

ipcMain.handle('ollama:list-models', async (_event, ollamaUrl = 'http://localhost:11434') => {
  try {
    console.log('[Main] ollama:list-models called with URL:', ollamaUrl);

    // Use HTTP API instead of CLI
    const http = require('http');
    const https = require('https');
    const urlModule = require('url');

    return new Promise((resolve) => {
      const parsedUrl = urlModule.parse(ollamaUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const apiUrl = `${ollamaUrl}/api/tags`;

      console.log('[Main] Making HTTP request to:', apiUrl);

      const req = protocol.get(apiUrl, { timeout: 10000 }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('[Ollama] HTTP API response:', response);

            // Extract model names from the response
            // Response format: { "models": [{ "name": "model:tag", ... }, ...] }
            const models = response.models ? response.models.map(m => m.name) : [];

            console.log(`[Ollama] Found ${models.length} models:`, models);
            resolve({ success: true, models });
          } catch (parseError) {
            console.error('[Ollama] Failed to parse response:', parseError);
            resolve({ success: false, error: 'Failed to parse Ollama models response' });
          }
        });
      });

      req.on('error', (error) => {
        console.error('[Ollama] HTTP request error:', error);
        resolve({
          success: false,
          error: 'Cannot connect to Ollama. Please ensure Ollama is running.'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request to Ollama timed out' });
      });
    });
  } catch (error) {
    console.error('Error listing models:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ollama:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Ollama Executable',
    filters: [
      { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('ollama:chat', async (_event, ollamaPath, modelName, userPrompt, tasksContext) => {
  try {
    const command = ollamaPath && ollamaPath.includes(' ') ? `"${ollamaPath}"` : (ollamaPath || 'ollama');

    // Get current date and time
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Load config to get custom system prompt
    const config = await taskStorage.readConfig();
    const customPrompt = config.ollamaSystemPrompt || null;

    // Use custom prompt if available, otherwise use default
    const basePrompt = customPrompt || `SYSTEM ROLE — Task Engineering Prioritizer

Your role is to help a professional software engineer maintain clarity, momentum, and predictability across their work.
When interpreting, ranking, or retrieving tasks, optimize for:

Short-term deliverables that unblock progress or meet upcoming commitments

Medium-horizon work that supports planned features or reduces known risks

Long-term strategic items that prevent future surprises or technical drift

Early detection of slipping tasks, hidden dependencies, or mismatched expectations

Simplicity, accuracy, and actionable recommendations

Always prioritize tasks using the following principles:

Protect near-term commitments first.
Identify anything due soon, blocking others, or requested by collaborators.

Surface important-but-not-urgent items early.
Prevent surprises by highlighting tasks that could become risks if ignored.

Expose dependencies and sequencing.
Clarify what should happen now vs. next vs. later.

Favor clarity and reduction of cognitive load.
Turn vague or ambiguous items into crisp, actionable units of work.

Be proactively helpful.
If there's missing context, unclear scope, or signals of risk, gently call attention to it.

When answering queries or selecting context documents:

Focus on the tasks that most influence delivery, risk, quality, or momentum.

Return only the most relevant information, avoiding noise.

Do not invent details or make assumptions beyond what is given.

Offer concise reasoning when ranking or prioritizing items.

Your goal is to help the user stay organized, avoid last-minute surprises, and maintain smooth forward progress across all levels of work.`;

    // Build the system message with task context and date/time
    const systemMessage = `${basePrompt}

Current Date/Time: ${currentDateTime}

The user has the following tasks:

${tasksContext}

Please help the user with their task-related questions. Format your responses with:
- Short paragraphs (2-3 sentences max)
- Bullet points for lists (use • or - at start of line)
- **Bold** for emphasis on task names or important terms
- *Italic* for secondary emphasis
- Numbered lists when appropriate (1. 2. 3.)
- Clear line breaks between sections
- Be concise and actionable

Use markdown-style formatting: **bold**, *italic*, bullet points (•), numbered lists (1. 2. 3.).`;

    // Log the prompt being sent to LLM
    console.log('[Ollama] ========== LLM PROMPT ==========');
    console.log('[Ollama] User Query:', userPrompt);
    console.log('[Ollama] Tasks Context Length:', tasksContext.length, 'characters');
    console.log('[Ollama] Tasks Context Preview:', tasksContext.substring(0, 500) + (tasksContext.length > 500 ? '...' : ''));
    console.log('[Ollama] System Message Length:', systemMessage.length, 'characters');
    console.log('[Ollama] ------- FULL SYSTEM PROMPT -------');
    console.log(systemMessage);
    console.log('[Ollama] ====================================');

    // Create a temporary file with the prompt
    const tempFile = require('path').join(require('os').tmpdir(), `ollama-prompt-${Date.now()}.txt`);
    const promptContent = JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      stream: false
    });

    await fs.writeFile(tempFile, promptContent);

    // Call ollama API using curl
    const curlCommand = process.platform === 'win32'
      ? `curl -s http://localhost:11434/api/chat -d @"${tempFile}"`
      : `curl -s http://localhost:11434/api/chat -d @${tempFile}`;

    const { stdout, stderr } = await execAsync(curlCommand, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (stderr && stderr.trim()) {
      console.error('Ollama stderr:', stderr);
    }

    if (!stdout || stdout.trim() === '') {
      return {
        success: false,
        error: 'No response from Ollama. Make sure Ollama is running.'
      };
    }

    // Parse the response
    try {
      const response = JSON.parse(stdout);

      if (response.message && response.message.content) {
        return {
          success: true,
          response: response.message.content
        };
      } else {
        return {
          success: false,
          error: 'Invalid response format from Ollama'
        };
      }
    } catch (parseError) {
      console.error('Error parsing Ollama response:', parseError);
      return {
        success: false,
        error: 'Failed to parse Ollama response: ' + parseError.message
      };
    }
  } catch (error) {
    console.error('Error calling Ollama:', error);
    return {
      success: false,
      error: error.message || 'Unknown error calling Ollama'
    };
  }
});

// Git IPC handlers

async function detectGit() {
  // Try common locations for git
  const commonPaths = [
    'git', // Check PATH first
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    'C:\\Program Files (x86)\\Git\\bin\\git.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Git\\cmd\\git.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Git\\bin\\git.exe',
    '/usr/bin/git',
    '/usr/local/bin/git',
    '/opt/homebrew/bin/git'
  ];

  for (const gitPath of commonPaths) {
    try {
      // Try to run git --version
      let command;
      if (process.platform === 'win32' && gitPath.includes(':\\')) {
        // On Windows, use cmd.exe to execute Windows paths
        // Need to wrap entire command in quotes when path has spaces
        if (gitPath.includes(' ')) {
          command = `cmd.exe /c ""${gitPath}" --version"`;
        } else {
          command = `cmd.exe /c ${gitPath} --version`;
        }
      } else {
        command = gitPath.includes(' ') ? `"${gitPath}" --version` : `${gitPath} --version`;
      }

      console.log(`Trying git command: ${command}`);
      const { stdout } = await execAsync(command, { timeout: 5000 });

      if (stdout) {
        console.log(`Found git at: ${gitPath}`);
        return { success: true, path: gitPath, version: stdout.trim() };
      }
    } catch (error) {
      console.log(`Failed to detect git at ${gitPath}: ${error.message}`);
      // Continue to next path
      continue;
    }
  }

  return { success: false, error: 'Git not found. Please install Git or specify the path manually.' };
}

ipcMain.handle('git:detect', async () => {
  return await detectGit();
});

ipcMain.handle('git:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Git Executable',
    filters: [
      { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('git:init', async (_event, gitPath, folderPath) => {
  try {
    // Build the git init command
    let command;
    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      // On Windows, use cmd.exe to execute Windows paths
      if (gitPath.includes(' ')) {
        command = `cmd.exe /c ""${gitPath}" init "${folderPath}""`;
      } else {
        command = `cmd.exe /c ${gitPath} init "${folderPath}"`;
      }
    } else {
      command = gitPath.includes(' ') ? `"${gitPath}" init "${folderPath}"` : `${gitPath} init "${folderPath}"`;
    }

    console.log(`Running git init: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    console.log(`Git init output: ${stdout}`);
    if (stderr && stderr.trim()) {
      console.log(`Git init stderr: ${stderr}`);
    }

    return { success: true, output: stdout.trim() };
  } catch (error) {
    console.error('Error initializing git repository:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:add', async (_event, gitPath, folderPath, files = ['.']) => {
  try {
    // Wait for file operations to complete by checking git status
    // Poll until git sees changes or timeout after 2 seconds
    let statusOutput = '';
    const maxWaitTime = 2000; // 2 seconds max
    const pollInterval = 50; // Check every 50ms
    let elapsed = 0;

    // Build git status command with explicit work-tree and git-dir
    let statusCommand;
    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      if (gitPath.includes(' ')) {
        statusCommand = `cmd.exe /c ""${gitPath}" --git-dir="${folderPath}/.git" --work-tree="${folderPath}" status --short"`;
      } else {
        statusCommand = `cmd.exe /c ${gitPath} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" status --short`;
      }
    } else {
      const gitCmd = gitPath.includes(' ') ? `"${gitPath}"` : gitPath;
      statusCommand = `${gitCmd} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" status --short`;
    }

    // Poll until git sees changes
    while (elapsed < maxWaitTime) {
      try {
        const statusResult = await execAsync(statusCommand, { timeout: 5000 });
        statusOutput = statusResult.stdout.trim();

        if (statusOutput.length > 0) {
          // Git sees changes, we can proceed
          console.log(`Git detected changes after ${elapsed}ms:\n${statusOutput}`);
          break;
        }
      } catch (error) {
        console.error('Error checking git status:', error);
        break;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsed += pollInterval;
    }

    if (elapsed >= maxWaitTime && statusOutput.length === 0) {
      console.log('Warning: Git did not detect any changes after waiting 2 seconds');
      return { success: true, output: 'No changes detected' };
    }

    // files parameter can be an array of file paths or a single path
    // Default to '.' to add all changes
    const filesToAdd = Array.isArray(files) ? files.join(' ') : files;

    // Build the git add command with explicit work-tree and git-dir
    let command;
    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      // On Windows, use cmd.exe to execute Windows paths
      if (gitPath.includes(' ')) {
        command = `cmd.exe /c ""${gitPath}" --git-dir="${folderPath}/.git" --work-tree="${folderPath}" add ${filesToAdd}"`;
      } else {
        command = `cmd.exe /c ${gitPath} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" add ${filesToAdd}`;
      }
    } else {
      const gitCmd = gitPath.includes(' ') ? `"${gitPath}"` : gitPath;
      command = `${gitCmd} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" add ${filesToAdd}`;
    }

    console.log(`Running git add: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    if (stdout) console.log(`Git add output: ${stdout}`);
    if (stderr && stderr.trim()) {
      console.log(`Git add stderr: ${stderr}`);
    }

    return { success: true, output: stdout ? stdout.trim() : '' };
  } catch (error) {
    console.error('Error staging git changes:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:commit', async (_event, gitPath, folderPath, message) => {
  try {
    // Build the git commit command with explicit work-tree and git-dir
    let command;
    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      // On Windows, use cmd.exe to execute Windows paths
      // Escape quotes in commit message
      const escapedMessage = message.replace(/"/g, '\\"');
      if (gitPath.includes(' ')) {
        command = `cmd.exe /c ""${gitPath}" --git-dir="${folderPath}/.git" --work-tree="${folderPath}" commit -m "${escapedMessage}""`;
      } else {
        command = `cmd.exe /c ${gitPath} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" commit -m "${escapedMessage}"`;
      }
    } else {
      const gitCmd = gitPath.includes(' ') ? `"${gitPath}"` : gitPath;
      const escapedMessage = message.replace(/"/g, '\\"');
      command = `${gitCmd} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" commit -m "${escapedMessage}"`;
    }

    console.log(`Running git commit: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    console.log(`Git commit output: ${stdout}`);
    if (stderr && stderr.trim()) {
      console.log(`Git commit stderr: ${stderr}`);
    }

    return { success: true, output: stdout.trim() };
  } catch (error) {
    // Note: git commit returns exit code 1 when there's nothing to commit
    // This is not necessarily an error we want to report to the user
    // Check both error message and stdout for "nothing to commit"
    const errorText = (error.message || '') + (error.stdout || '');
    if (errorText.includes('nothing to commit') || errorText.includes('working tree clean')) {
      console.log('Git: Nothing to commit (working tree clean)');
      return { success: true, output: 'Nothing to commit' };
    }
    console.error('Error committing git changes:', error);
    return { success: false, error: error.message };
  }
});

// Folder Management IPC handlers

ipcMain.handle('folders:permanently-delete', async (_event, folderPath) => {
  try {
    // Recursively delete the folder and all its contents
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`Permanently deleted folder: ${folderPath}`);
    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:log', async (_event, gitPath, folderPath) => {
  try {
    // Build git log command with explicit work-tree and git-dir
    // Format: hash|author|date|message
    // Use --all to show commits from all branches (without --reflog to avoid duplicates)
    let command;
    const format = '--pretty=format:%H|%an|%aI|%s';

    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      // On Windows, use PowerShell with proper escaping
      // Use single quotes around the format string to prevent PowerShell variable expansion
      const psCommand = `& '${gitPath}' --git-dir='${folderPath}/.git' --work-tree='${folderPath}' log --all '--pretty=format:%H|%an|%aI|%s'`;
      command = `powershell.exe -NoProfile -Command "${psCommand}"`;
    } else {
      const gitCmd = gitPath.includes(' ') ? `"${gitPath}"` : gitPath;
      command = `${gitCmd} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" log --all ${format}`;
    }

    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    if (stderr && stderr.trim()) {
      console.log(`Git log stderr: ${stderr}`);
    }

    // Parse log output and deduplicate by hash
    const commits = [];
    const seenHashes = new Set();
    if (stdout && stdout.trim()) {
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const [hash, author, date, message] = line.split('|');
        // Only add if we haven't seen this commit hash before
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          commits.push({ hash, author, date, message });
        }
      }
    }

    return { success: true, commits };
  } catch (error) {
    console.error('Error getting git log:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git:reset', async (_event, gitPath, folderPath, commitHash) => {
  try {
    // Build git reset command with explicit work-tree and git-dir
    let command;

    if (process.platform === 'win32' && gitPath.includes(':\\')) {
      if (gitPath.includes(' ')) {
        command = `cmd.exe /c ""${gitPath}" --git-dir="${folderPath}/.git" --work-tree="${folderPath}" reset --hard ${commitHash}"`;
      } else {
        command = `cmd.exe /c ${gitPath} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" reset --hard ${commitHash}`;
      }
    } else {
      const gitCmd = gitPath.includes(' ') ? `"${gitPath}"` : gitPath;
      command = `${gitCmd} --git-dir="${folderPath}/.git" --work-tree="${folderPath}" reset --hard ${commitHash}`;
    }

    console.log(`Running git reset: ${command}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });

    console.log(`Git reset output: ${stdout}`);
    if (stderr && stderr.trim()) {
      console.log(`Git reset stderr: ${stderr}`);
    }

    return { success: true, output: stdout.trim() };
  } catch (error) {
    console.error('Error resetting git repository:', error);
    return { success: false, error: error.message };
  }
});

// ========================================
// Dropbox IPC handlers
// ========================================

// Set Dropbox access token
ipcMain.handle('dropbox:set-token', async (_event, accessToken) => {
  try {
    dropboxClient = new DropboxClient(accessToken);
    return { success: true };
  } catch (error) {
    console.error('Error setting Dropbox token:', error);
    return { success: false, error: error.message };
  }
});

// Validate Dropbox connection and get user info
ipcMain.handle('dropbox:validate', async () => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'No Dropbox token set' };
    }

    const result = await dropboxClient.validateToken();
    return result;
  } catch (error) {
    console.error('Error validating Dropbox token:', error);
    return { success: false, error: error.message };
  }
});

// List Dropbox folder contents
ipcMain.handle('dropbox:list-folder', async (_event, folderPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.listFolder(folderPath);
    return result;
  } catch (error) {
    console.error('Error listing Dropbox folder:', error);
    return { success: false, error: error.message };
  }
});

// Create Dropbox folder
ipcMain.handle('dropbox:create-folder', async (_event, folderPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.createFolder(folderPath);
    return result;
  } catch (error) {
    console.error('Error creating Dropbox folder:', error);
    return { success: false, error: error.message };
  }
});

// Download file from Dropbox
ipcMain.handle('dropbox:download-file', async (_event, dropboxPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.downloadFile(dropboxPath);
    return result;
  } catch (error) {
    console.error('Error downloading from Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// Upload file to Dropbox
ipcMain.handle('dropbox:upload-file', async (_event, dropboxPath, content) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.uploadFile(dropboxPath, content);
    return result;
  } catch (error) {
    console.error('Error uploading to Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// Download entire folder from Dropbox to ramdisk
ipcMain.handle('dropbox:sync-pull', async (_event, folderId, dropboxPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    if (!ramdiskManager) {
      return { success: false, error: 'Ramdisk manager not initialized' };
    }

    // Create ramdisk for this folder
    const ramdiskResult = await ramdiskManager.createRamdisk(folderId);
    if (!ramdiskResult.success) {
      return ramdiskResult;
    }

    // Download all files from Dropbox to ramdisk
    const syncResult = await dropboxClient.downloadFolderRecursive(dropboxPath, ramdiskResult.path);
    if (!syncResult.success) {
      return syncResult;
    }

    return {
      success: true,
      ramdiskPath: ramdiskResult.path,
      filesDownloaded: syncResult.filesDownloaded
    };
  } catch (error) {
    console.error('Error syncing from Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// Upload entire folder from ramdisk to Dropbox
ipcMain.handle('dropbox:sync-push', async (_event, folderId, dropboxPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    if (!ramdiskManager) {
      return { success: false, error: 'Ramdisk manager not initialized' };
    }

    const ramdiskPath = ramdiskManager.getRamdiskPath(folderId);
    if (!ramdiskPath) {
      return { success: false, error: 'Ramdisk not found for folder' };
    }

    // Upload all files from ramdisk to Dropbox
    const syncResult = await dropboxClient.uploadFolderRecursive(ramdiskPath, dropboxPath);
    return syncResult;
  } catch (error) {
    console.error('Error syncing to Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// Get ramdisk path for a folder
ipcMain.handle('dropbox:get-ramdisk-path', async (_event, folderId) => {
  try {
    if (!ramdiskManager) {
      return { success: false, error: 'Ramdisk manager not initialized' };
    }

    const ramdiskPath = ramdiskManager.getRamdiskPath(folderId);
    if (!ramdiskPath) {
      return { success: false, error: 'Ramdisk not found for folder' };
    }

    return { success: true, path: ramdiskPath };
  } catch (error) {
    console.error('Error getting ramdisk path:', error);
    return { success: false, error: error.message };
  }
});

// Delete Dropbox file or folder
ipcMain.handle('dropbox:delete', async (_event, dropboxPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.deleteFile(dropboxPath);
    return result;
  } catch (error) {
    console.error('Error deleting from Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// Move/rename file or folder in Dropbox
ipcMain.handle('dropbox:move', async (_event, fromPath, toPath) => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const result = await dropboxClient.moveFile(fromPath, toPath);
    return result;
  } catch (error) {
    console.error('Error moving in Dropbox:', error);
    return { success: false, error: error.message };
  }
});

// OAuth2 flow state
let oauthServer = null;
let oauthPKCE = null;

// Start OAuth2 flow
ipcMain.handle('dropbox:oauth-start', async (_event, clientId) => {
  try {
    console.log('[OAuth] Starting OAuth2 flow with clientId:', clientId);

    // Generate PKCE codes
    oauthPKCE = DropboxClient.generatePKCE();
    console.log('[OAuth] Generated PKCE codes');

    // Start OAuth callback server
    oauthServer = new OAuthServer();
    const redirectUri = oauthServer.getRedirectUri();
    console.log('[OAuth] OAuth callback server started on:', redirectUri);

    // Get authorization URL
    const authUrl = DropboxClient.getOAuth2AuthUrl(
      clientId,
      redirectUri,
      oauthPKCE.codeChallenge
    );
    console.log('[OAuth] Generated auth URL:', authUrl);

    // Start server and wait for callback
    const callbackPromise = oauthServer.start();

    // Open browser to authorization page
    await shell.openExternal(authUrl);
    console.log('[OAuth] Opened browser to auth URL');

    // Wait for callback (with timeout)
    const callbackResult = await Promise.race([
      callbackPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OAuth timeout (5 minutes)')), 300000)
      )
    ]);
    console.log('[OAuth] Received callback with code');

    // Exchange code for tokens
    console.log('[OAuth] Exchanging code for tokens...');
    const tokens = await DropboxClient.exchangeCodeForToken(
      callbackResult.code,
      clientId,
      redirectUri,
      oauthPKCE.codeVerifier
    );
    console.log('[OAuth] Successfully obtained tokens');

    // Create new Dropbox client with OAuth2
    dropboxClient = new DropboxClient(
      tokens.accessToken,
      tokens.refreshToken,
      clientId
    );
    console.log('[OAuth] Created new Dropbox client');

    // Clean up
    if (oauthServer) {
      oauthServer.stop();
      oauthServer = null;
    }
    oauthPKCE = null;

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    };
  } catch (error) {
    console.error('[OAuth] Error in OAuth flow:', error);
    console.error('[OAuth] Error stack:', error.stack);

    // Clean up on error
    if (oauthServer) {
      try {
        oauthServer.stop();
      } catch (stopError) {
        console.error('[OAuth] Error stopping server:', stopError);
      }
      oauthServer = null;
    }
    oauthPKCE = null;

    return { success: false, error: String(error.message || error) };
  }
});

// Set OAuth2 credentials (for loading from config)
ipcMain.handle('dropbox:set-oauth2', async (_event, accessToken, refreshToken, clientId) => {
  try {
    dropboxClient = new DropboxClient(accessToken, refreshToken, clientId);
    return { success: true };
  } catch (error) {
    console.error('Error setting OAuth2 credentials:', error);
    return { success: false, error: error.message };
  }
});

// Get current OAuth2 tokens (for saving to config)
ipcMain.handle('dropbox:get-tokens', async () => {
  try {
    if (!dropboxClient) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    const accessToken = await dropboxClient.getAccessToken();
    const refreshToken = dropboxClient.getRefreshToken();

    return {
      success: true,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Error getting tokens:', error);
    return { success: false, error: error.message };
  }
});

// ========================================
// Vector DB IPC handlers (Embedded ChromaDB)
// ========================================
// Note: Initialization happens automatically in initializeSettings()
// No connection testing needed - it's all local!

// Generate embeddings for text
ipcMain.handle('vectordb:generate-embeddings', async (_event, text) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    const result = await vectorDbClient.generateEmbeddings(text);
    return result;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return { success: false, error: error.message };
  }
});

// Store embeddings for a task
ipcMain.handle('vectordb:store-embeddings', async (_event, taskId, text, metadata) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    // Generate embeddings
    const embeddingsResult = await vectorDbClient.generateEmbeddings(text);
    if (!embeddingsResult.success) {
      return { success: false, error: 'Failed to generate embeddings: ' + embeddingsResult.error };
    }

    // Store embeddings
    const storeResult = await vectorDbClient.storeEmbeddings(taskId, embeddingsResult.embeddings, metadata);
    return storeResult;
  } catch (error) {
    console.error('Error storing embeddings:', error);
    return { success: false, error: error.message };
  }
});

// Update embeddings for a task
ipcMain.handle('vectordb:update-embeddings', async (_event, taskId, text, metadata) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    // Generate new embeddings
    const embeddingsResult = await vectorDbClient.generateEmbeddings(text);
    if (!embeddingsResult.success) {
      return { success: false, error: 'Failed to generate embeddings: ' + embeddingsResult.error };
    }

    // Update embeddings
    const updateResult = await vectorDbClient.updateEmbeddings(taskId, embeddingsResult.embeddings, metadata);
    return updateResult;
  } catch (error) {
    console.error('Error updating embeddings:', error);
    return { success: false, error: error.message };
  }
});

// Delete embeddings for a task
ipcMain.handle('vectordb:delete-embeddings', async (_event, taskId) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    const result = await vectorDbClient.deleteEmbeddings(taskId);
    return result;
  } catch (error) {
    console.error('Error deleting embeddings:', error);
    return { success: false, error: error.message };
  }
});

// Search for similar tasks
ipcMain.handle('vectordb:search', async (_event, query, limit) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    const result = await vectorDbClient.searchSimilar(query, limit);
    return result;
  } catch (error) {
    console.error('Error searching vector DB:', error);
    return { success: false, error: error.message };
  }
});

// Bulk store embeddings for multiple tasks
ipcMain.handle('vectordb:bulk-store', async (_event, tasks) => {
  try {
    if (!vectorDbClient) {
      return { success: false, error: 'Vector DB client not initialized' };
    }

    const result = await vectorDbClient.bulkStoreEmbeddings(tasks);
    return result;
  } catch (error) {
    console.error('Error bulk storing embeddings:', error);
    return { success: false, error: error.message };
  }
});

// Delete embeddings database and reinitialize with new settings
ipcMain.handle('vectordb:reinitialize', async (_event, ollamaUrl, embeddingModel) => {
  try {
    console.log('[VectorDB] Reinitializing with new settings...');
    console.log('[VectorDB] Ollama URL:', ollamaUrl);
    console.log('[VectorDB] Embedding Model:', embeddingModel);

    // Delete old embeddings database
    const vectorPath = path.join(app.getPath('userData'), 'vector-data');
    try {
      await fs.rm(vectorPath, { recursive: true, force: true });
      console.log('[VectorDB] Deleted old embeddings database');
    } catch (error) {
      console.log('[VectorDB] No existing database to delete');
    }

    // Reinitialize with new settings
    vectorDbClient = new VectorDbClient(vectorPath, ollamaUrl, embeddingModel);
    const initResult = await vectorDbClient.initialize();

    if (initResult.success) {
      console.log('[VectorDB] Reinitialized successfully');
      await vectorDbClient.createCollection();
      return { success: true };
    } else {
      console.error('[VectorDB] Failed to reinitialize:', initResult.error);
      return { success: false, error: initResult.error };
    }
  } catch (error) {
    console.error('[VectorDB] Error reinitializing:', error);
    return { success: false, error: error.message };
  }
});

// Get embeddings status (is it initialized?)
ipcMain.handle('vectordb:is-initialized', async () => {
  return { success: true, initialized: vectorDbClient !== null };
});

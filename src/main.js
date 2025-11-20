const { app, BrowserWindow, ipcMain, nativeTheme, dialog, Menu, globalShortcut, Tray, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const taskStorage = require('./taskStorage');

const execAsync = promisify(exec);

let mainWindow;
let currentGlobalHotkey = null;
let tray = null;
let isQuittingFromCtrlClick = false;

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

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, '../assets/tasks.png');
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

    // Apply global hotkey
    const hotkey = config.globalHotkey || 'CommandOrControl+Alt+T';
    registerGlobalHotkey(hotkey);

    // Apply auto-launch setting (default to true)
    const autoLaunch = config.autoLaunch !== undefined ? config.autoLaunch : true;
    const startMinimized = config.startMinimized !== undefined ? config.startMinimized : true;

    app.setLoginItemSettings({
      openAtLogin: autoLaunch,
      openAsHidden: startMinimized,
      args: []
    });
    console.log(`Auto-launch initialized: ${autoLaunch ? 'enabled' : 'disabled'}`);
    console.log(`Start minimized: ${startMinimized ? 'enabled' : 'disabled'}`);

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

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();

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

app.on('before-quit', () => {
  // Unregister all global shortcuts before quitting
  globalShortcut.unregisterAll();
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

// Track if Ctrl key is pressed
let isCtrlKeyPressed = false;

ipcMain.on('set-ctrl-key-state', (_event, isPressed) => {
  isCtrlKeyPressed = isPressed;
});

// Task Storage IPC handlers

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

ipcMain.handle('tasks:load', async (_event, dirPath) => {
  try {
    const basePath = dirPath || taskStorage.getTasksPath();
    const tasks = await taskStorage.loadTasks(basePath, true);
    return { success: true, tasks };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:create', async (_event, parentPath, text, body) => {
  try {
    const task = await taskStorage.createTask(parentPath, text, body);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:update', async (_event, taskPath, updates) => {
  try {
    const task = await taskStorage.updateTask(taskPath, updates);
    return { success: true, task };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:delete', async (_event, taskPath) => {
  try {
    await taskStorage.deleteTask(taskPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:move-to-parent', async (_event, taskPath, newParentTaskPath) => {
  try {
    const newPath = await taskStorage.moveTaskToParent(taskPath, newParentTaskPath);
    return { success: true, newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:move-to-sibling', async (_event, taskPath, targetTaskPath) => {
  try {
    const newPath = await taskStorage.moveTaskToSibling(taskPath, targetTaskPath);
    return { success: true, newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:reorder', async (_event, dirPath, orderedFileNames) => {
  try {
    await taskStorage.reorderTasks(dirPath, orderedFileNames);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:search', async (_event, searchText) => {
  try {
    const basePath = taskStorage.getTasksPath();
    const results = await taskStorage.searchTasks(basePath, searchText);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:clear-deleted', async () => {
  try {
    await taskStorage.clearDeletedItems();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:restore', async (_event, taskPath) => {
  try {
    const restoredPath = await taskStorage.restoreTask(taskPath);
    return { success: true, restoredPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tasks:permanently-delete', async (_event, taskPath) => {
  try {
    await taskStorage.permanentlyDeleteTask(taskPath);
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

async function detectOllama() {
  // Try common locations for ollama
  const commonPaths = [
    'ollama', // Check PATH first
    'C:\\Program Files\\Ollama\\ollama.exe',
    'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Programs\\Ollama\\ollama.exe',
    '/usr/local/bin/ollama',
    '/usr/bin/ollama',
    '/opt/homebrew/bin/ollama'
  ];

  for (const ollamaPath of commonPaths) {
    try {
      // Try to run ollama --version
      const command = ollamaPath.includes(' ') ? `"${ollamaPath}"` : ollamaPath;
      const { stdout } = await execAsync(`${command} --version`, { timeout: 5000 });

      if (stdout) {
        console.log(`Found ollama at: ${ollamaPath}`);
        return { success: true, path: ollamaPath, version: stdout.trim() };
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  return { success: false, error: 'Ollama not found. Please install Ollama or specify the path manually.' };
}

ipcMain.handle('ollama:detect', async () => {
  return await detectOllama();
});

ipcMain.handle('ollama:list-models', async (_event, ollamaPath) => {
  try {
    const command = ollamaPath && ollamaPath.includes(' ') ? `"${ollamaPath}"` : (ollamaPath || 'ollama');
    const { stdout } = await execAsync(`${command} list`, { timeout: 10000 });

    // Parse the output to extract model names
    const lines = stdout.trim().split('\n');
    const models = [];

    // Skip the header line and parse each model
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Extract model name (first column)
        const modelName = line.split(/\s+/)[0];
        if (modelName) {
          models.push(modelName);
        }
      }
    }

    return { success: true, models };
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

    // Build the system message with task context
    const systemMessage = `You are a helpful task management assistant.

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

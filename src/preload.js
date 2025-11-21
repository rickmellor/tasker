const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:read-text'),
    writeText: (text) => ipcRenderer.invoke('clipboard:write-text', text)
  },
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (_event, theme) => callback(theme));
  },

  // Global Hotkey
  updateGlobalHotkey: (accelerator) => ipcRenderer.invoke('update-global-hotkey', accelerator),
  onQuickAddTask: (callback) => {
    ipcRenderer.on('quick-add-task', () => callback());
  },

  // Auto-Launch
  setAutoLaunch: (enabled, startMinimized) => ipcRenderer.invoke('set-auto-launch', enabled, startMinimized),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),

  // Window Controls
  snapWindow: (position) => ipcRenderer.invoke('snap-window', position),
  hideToTray: () => ipcRenderer.invoke('hide-to-tray'),
  exitApp: () => ipcRenderer.invoke('exit-app'),
  setCtrlKeyState: (isPressed) => ipcRenderer.send('set-ctrl-key-state', isPressed),

  // Task Storage
  tasks: {
    initialize: (customPath) => ipcRenderer.invoke('tasks:initialize', customPath),
    getPath: () => ipcRenderer.invoke('tasks:get-path'),
    selectFolder: () => ipcRenderer.invoke('tasks:select-folder'),
    load: (dirPath) => ipcRenderer.invoke('tasks:load', dirPath),
    create: (parentPath, text, body) => ipcRenderer.invoke('tasks:create', parentPath, text, body),
    update: (taskPath, updates) => ipcRenderer.invoke('tasks:update', taskPath, updates),
    delete: (taskPath) => ipcRenderer.invoke('tasks:delete', taskPath),
    moveToParent: (taskPath, newParentTaskPath) => ipcRenderer.invoke('tasks:move-to-parent', taskPath, newParentTaskPath),
    moveToSibling: (taskPath, targetTaskPath) => ipcRenderer.invoke('tasks:move-to-sibling', taskPath, targetTaskPath),
    reorder: (dirPath, orderedFileNames) => ipcRenderer.invoke('tasks:reorder', dirPath, orderedFileNames),
    search: (searchText) => ipcRenderer.invoke('tasks:search', searchText),
    clearDeleted: () => ipcRenderer.invoke('tasks:clear-deleted'),
    restore: (taskPath) => ipcRenderer.invoke('tasks:restore', taskPath),
    permanentlyDelete: (taskPath) => ipcRenderer.invoke('tasks:permanently-delete', taskPath)
  },

  // Config Storage
  config: {
    read: () => ipcRenderer.invoke('config:read'),
    write: (config) => ipcRenderer.invoke('config:write', config),
    update: (updates) => ipcRenderer.invoke('config:update', updates)
  },

  // Ollama
  ollama: {
    detect: () => ipcRenderer.invoke('ollama:detect'),
    listModels: (ollamaPath) => ipcRenderer.invoke('ollama:list-models', ollamaPath),
    selectFile: () => ipcRenderer.invoke('ollama:select-file'),
    chat: (ollamaPath, modelName, userPrompt, tasksContext) => ipcRenderer.invoke('ollama:chat', ollamaPath, modelName, userPrompt, tasksContext)
  },

  // Git
  git: {
    detect: () => ipcRenderer.invoke('git:detect'),
    selectFile: () => ipcRenderer.invoke('git:select-file'),
    init: (gitPath, folderPath) => ipcRenderer.invoke('git:init', gitPath, folderPath),
    add: (gitPath, folderPath, files) => ipcRenderer.invoke('git:add', gitPath, folderPath, files),
    commit: (gitPath, folderPath, message) => ipcRenderer.invoke('git:commit', gitPath, folderPath, message),
    log: (gitPath, folderPath) => ipcRenderer.invoke('git:log', gitPath, folderPath),
    reset: (gitPath, folderPath, commitHash) => ipcRenderer.invoke('git:reset', gitPath, folderPath, commitHash)
  },

  // Folders
  folders: {
    permanentlyDelete: (folderPath) => ipcRenderer.invoke('folders:permanently-delete', folderPath)
  }
});

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
  quitApp: () => ipcRenderer.invoke('exit-app'), // Alias for exitApp
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),
  setCtrlKeyState: (isPressed) => ipcRenderer.send('set-ctrl-key-state', isPressed),

  // Task Storage
  tasks: {
    initialize: (customPath) => ipcRenderer.invoke('tasks:initialize', customPath),
    getPath: () => ipcRenderer.invoke('tasks:get-path'),
    selectFolder: () => ipcRenderer.invoke('tasks:select-folder'),
    setCurrentFolder: (folderInfo) => ipcRenderer.invoke('tasks:set-current-folder', folderInfo),
    load: (dirPath) => ipcRenderer.invoke('tasks:load', dirPath),
    create: (parentPath, text, body) => ipcRenderer.invoke('tasks:create', parentPath, text, body),
    update: (taskPath, updates) => ipcRenderer.invoke('tasks:update', taskPath, updates),
    delete: (taskPath) => ipcRenderer.invoke('tasks:delete', taskPath),
    moveToParent: (taskPath, newParentTaskPath) => ipcRenderer.invoke('tasks:move-to-parent', taskPath, newParentTaskPath),
    moveToSibling: (taskPath, targetTaskPath) => ipcRenderer.invoke('tasks:move-to-sibling', taskPath, targetTaskPath),
    moveToFolder: (taskPath, destinationFolderId, newParentTaskPath) => ipcRenderer.invoke('tasks:move-to-folder', taskPath, destinationFolderId, newParentTaskPath),
    reorder: (dirPath, orderedFileNames) => ipcRenderer.invoke('tasks:reorder', dirPath, orderedFileNames),
    search: (searchText) => ipcRenderer.invoke('tasks:search', searchText),
    clearDeleted: () => ipcRenderer.invoke('tasks:clear-deleted'),
    restore: (taskPath) => ipcRenderer.invoke('tasks:restore', taskPath),
    permanentlyDelete: (taskPath) => ipcRenderer.invoke('tasks:permanently-delete', taskPath)
  },

  // OKRs Storage
  okrs: {
    initialize: () => ipcRenderer.invoke('okrs:initialize'),
    getPath: () => ipcRenderer.invoke('okrs:get-path'),
    load: () => ipcRenderer.invoke('okrs:load'),
    create: (text, body) => ipcRenderer.invoke('okrs:create', text, body),
    update: (okrPath, updates) => ipcRenderer.invoke('okrs:update', okrPath, updates),
    delete: (okrPath) => ipcRenderer.invoke('okrs:delete', okrPath),
    reorder: (orderedFileNames) => ipcRenderer.invoke('okrs:reorder', orderedFileNames)
  },

  // Goals Storage
  goals: {
    initialize: () => ipcRenderer.invoke('goals:initialize'),
    getPath: () => ipcRenderer.invoke('goals:get-path'),
    load: () => ipcRenderer.invoke('goals:load'),
    create: (text, body) => ipcRenderer.invoke('goals:create', text, body),
    update: (goalPath, updates) => ipcRenderer.invoke('goals:update', goalPath, updates),
    delete: (goalPath) => ipcRenderer.invoke('goals:delete', goalPath),
    reorder: (orderedFileNames) => ipcRenderer.invoke('goals:reorder', orderedFileNames)
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

  // Vector DB
  vectordb: {
    testConnection: (url) => ipcRenderer.invoke('vectordb:test-connection', url)
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
  },

  // Dropbox
  dropbox: {
    setToken: (accessToken) => ipcRenderer.invoke('dropbox:set-token', accessToken),
    validate: () => ipcRenderer.invoke('dropbox:validate'),
    listFolder: (folderPath) => ipcRenderer.invoke('dropbox:list-folder', folderPath),
    createFolder: (folderPath) => ipcRenderer.invoke('dropbox:create-folder', folderPath),
    downloadFile: (dropboxPath) => ipcRenderer.invoke('dropbox:download-file', dropboxPath),
    uploadFile: (dropboxPath, content) => ipcRenderer.invoke('dropbox:upload-file', dropboxPath, content),
    syncPull: (folderId, dropboxPath) => ipcRenderer.invoke('dropbox:sync-pull', folderId, dropboxPath),
    syncPush: (folderId, dropboxPath) => ipcRenderer.invoke('dropbox:sync-push', folderId, dropboxPath),
    getRamdiskPath: (folderId) => ipcRenderer.invoke('dropbox:get-ramdisk-path', folderId),
    delete: (dropboxPath) => ipcRenderer.invoke('dropbox:delete', dropboxPath),
    move: (fromPath, toPath) => ipcRenderer.invoke('dropbox:move', fromPath, toPath),
    // OAuth2 methods
    oauthStart: (clientId) => ipcRenderer.invoke('dropbox:oauth-start', clientId),
    setOAuth2: (accessToken, refreshToken, clientId) => ipcRenderer.invoke('dropbox:set-oauth2', accessToken, refreshToken, clientId),
    getTokens: () => ipcRenderer.invoke('dropbox:get-tokens')
  },
  vectordb: {
    initialize: (vectorDbUrl, ollamaUrl, embeddingModel, collectionName) => ipcRenderer.invoke('vectordb:initialize', vectorDbUrl, ollamaUrl, embeddingModel, collectionName),
    testConnection: (vectorDbUrl) => ipcRenderer.invoke('vectordb:test-connection', vectorDbUrl),
    generateEmbeddings: (text) => ipcRenderer.invoke('vectordb:generate-embeddings', text),
    storeEmbeddings: (taskId, text, metadata) => ipcRenderer.invoke('vectordb:store-embeddings', taskId, text, metadata),
    updateEmbeddings: (taskId, text, metadata) => ipcRenderer.invoke('vectordb:update-embeddings', taskId, text, metadata),
    deleteEmbeddings: (taskId) => ipcRenderer.invoke('vectordb:delete-embeddings', taskId),
    search: (query, limit) => ipcRenderer.invoke('vectordb:search', query, limit),
    bulkStore: (tasks) => ipcRenderer.invoke('vectordb:bulk-store', tasks),
    reinitialize: (ollamaUrl, embeddingModel) => ipcRenderer.invoke('vectordb:reinitialize', ollamaUrl, embeddingModel),
    isInitialized: () => ipcRenderer.invoke('vectordb:is-initialized')
  }
});

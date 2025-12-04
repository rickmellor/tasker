// ========================================
// Application State
// ========================================
const state = {
  currentView: 'tasks',
  tasks: [],
  theme: 'auto',
  taskFolders: [], // Array of {id, name, path} objects
  currentFolderId: null, // Currently active folder ID
  folderErrors: new Map(), // Track folder load errors: folderId -> error message
  expandedTasks: new Set(), // Track which tasks are expanded
  draggedTask: null, // Track task being dragged
  draggedFolder: null, // Track folder being dragged
  editingTask: null, // Track task being edited in modal
  movingTask: null, // Track task being moved to another folder
  moveSelectedParent: null, // Track selected parent in move modal
  contextMenuTask: null, // Track task for context menu
  timelineZoom: 1.0, // Timeline zoom level (1.0 = 100%)
  timelineCommits: [], // Current commits being displayed on timeline
  activeFilters: new Set(['all']), // Track active filters
  sortOrder: 'default', // Track sort order: default, priority, due-date, created
  sidebarWidth: 200, // Sidebar width in pixels
  agentHeight: 300, // Agent section height in pixels
  windowBounds: null, // Window size and position
  globalHotkey: 'CommandOrControl+Alt+T', // Global hotkey for quick add (Electron accelerator format)
  autoLaunch: true, // Launch on Windows startup (default enabled)
  startMinimized: true, // Start minimized to tray (default enabled)
  ollamaPath: null, // Path to ollama executable
  ollamaModel: null, // Selected ollama model
  ollamaAvailable: false, // Whether ollama is detected and working
  vectorDbEnabled: false, // Whether vector DB is enabled
  vectorDbUrl: 'http://localhost:8000', // Vector DB endpoint URL
  vectorDbCollection: 'tasker_tasks', // Collection name for embeddings
  vectorDbConnected: false, // Whether vector DB is connected and available
  gitPath: null, // Path to git executable
  gitAvailable: false, // Whether git is detected and working
  dropboxClientId: null, // Dropbox OAuth2 Client ID
  dropboxAccessToken: null, // Dropbox access token
  dropboxRefreshToken: null, // Dropbox OAuth2 refresh token
  dropboxConnected: false, // Whether connected to Dropbox
  dropboxUserInfo: null, // Dropbox user info (name, email, accountId)
  agentQuickPrompts: [ // Quick prompts for AI agent
    { id: 1, label: 'High Priority Tasks', prompt: 'Show my 3 highest priority tasks' },
    { id: 2, label: 'Due in 3 Days', prompt: 'Show the work due in the next 3 days' },
    { id: 3, label: 'What to Work On', prompt: 'What should I work on now?' }
  ],
  taskStatuses: ['Pending', 'In Work', 'Blocked', 'Completed'], // Customizable task statuses
  ctrlKeyPressed: false, // Track Ctrl/Cmd key state for delete button styling
  taskViewMode: 'list', // Track task view mode: 'list' or 'kanban'
  selectedTaskPaths: [], // Track selected tasks for multi-select and keyboard navigation
  lastSelectedTaskPath: null // Track last selected task for shift-click range selection
};

// ========================================
// DOM Elements
// ========================================
const elements = {
  // Screens
  loginScreen: document.getElementById('login-screen'),
  mainScreen: document.getElementById('main-screen'),

  // Login
  loginForm: document.getElementById('login-form'),
  usernameInput: document.getElementById('username'),
  passwordInput: document.getElementById('password'),

  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  sidebarIconBtns: document.querySelectorAll('.sidebar-icon-btn'),
  logoutBtn: document.getElementById('logout-btn'),

  // Views
  views: {
    tasks: document.getElementById('tasks-view'),
    profile: document.getElementById('profile-view'),
    help: document.getElementById('help-view'),
    settings: document.getElementById('settings-view')
  },

  // Tasks
  taskInput: document.getElementById('taskInput'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  taskContainer: document.getElementById('taskContainer'),

  // View Toggle
  viewListBtn: document.getElementById('view-list-btn'),
  viewKanbanBtn: document.getElementById('view-kanban-btn'),
  kanbanBoard: document.getElementById('kanbanBoard'),

  // Profile
  profileUsername: document.getElementById('profile-username'),
  statTotal: document.getElementById('stat-total'),
  statCompleted: document.getElementById('stat-completed'),
  statPending: document.getElementById('stat-pending'),

  // Folder management
  sidebarFolders: document.getElementById('sidebar-folders'),
  addFolderSettingsBtn: document.getElementById('add-folder-settings-btn'),
  folderList: document.getElementById('folder-list'),

  // Prompt management
  addPromptBtn: document.getElementById('add-prompt-btn'),
  promptsList: document.getElementById('prompts-list'),

  // Status management
  addStatusBtn: document.getElementById('add-status-btn'),
  statusesList: document.getElementById('statuses-list'),

  // Add Folder Modal
  addFolderModal: document.getElementById('add-folder-modal'),
  storageTypeLocal: document.getElementById('storage-type-local'),
  storageTypeDropbox: document.getElementById('storage-type-dropbox'),
  localFolderSection: document.getElementById('local-folder-section'),
  dropboxFolderSection: document.getElementById('dropbox-folder-section'),
  folderPathInput: document.getElementById('folder-path-input'),
  dropboxPathInput: document.getElementById('dropbox-path-input'),
  folderNameInput: document.getElementById('folder-name-input'),
  browseFolderBtn: document.getElementById('browse-folder-btn'),
  browseDropboxBtn: document.getElementById('browse-dropbox-btn'),
  addFolderCancelBtn: document.getElementById('add-folder-cancel-btn'),
  addFolderSaveBtn: document.getElementById('add-folder-save-btn'),
  enableVersionControlCheckbox: document.getElementById('enable-version-control'),

  // Settings
  themeSelect: document.getElementById('theme-select'),
  clearDataBtn: document.getElementById('clear-data-btn'),
  clearDeletedBtn: document.getElementById('clear-deleted-btn'),
  settingsVersion: document.getElementById('settings-version'),
  settingsPlatform: document.getElementById('settings-platform'),
  globalHotkeyInput: document.getElementById('global-hotkey-input'),
  resetHotkeyBtn: document.getElementById('reset-hotkey-btn'),
  autoLaunchCheckbox: document.getElementById('auto-launch-checkbox'),
  startMinimizedCheckbox: document.getElementById('start-minimized-checkbox'),

  // Ollama
  ollamaPathInput: document.getElementById('ollama-path-input'),
  browseOllamaBtn: document.getElementById('browse-ollama-btn'),
  detectOllamaBtn: document.getElementById('detect-ollama-btn'),
  ollamaModelSelect: document.getElementById('ollama-model-select'),
  ollamaModelSection: document.getElementById('ollama-model-section'),
  refreshModelsBtn: document.getElementById('refresh-models-btn'),
  ollamaStatus: document.getElementById('ollama-status'),
  ollamaStatusIcon: document.getElementById('ollama-status-icon'),
  ollamaStatusText: document.getElementById('ollama-status-text'),

  // Vector DB
  vectorDbEnabled: document.getElementById('vector-db-enabled'),
  vectorDbConfig: document.getElementById('vector-db-config'),
  vectorDbUrl: document.getElementById('vector-db-url'),
  vectorDbCollection: document.getElementById('vector-db-collection'),
  testVectorDbBtn: document.getElementById('test-vector-db-btn'),
  vectorDbStatus: document.getElementById('vector-db-status'),
  vectorDbStatusIcon: document.getElementById('vector-db-status-icon'),
  vectorDbStatusText: document.getElementById('vector-db-status-text'),

  // Git
  gitPathInput: document.getElementById('git-path-input'),
  browseGitBtn: document.getElementById('browse-git-btn'),
  detectGitBtn: document.getElementById('detect-git-btn'),
  gitStatus: document.getElementById('git-status'),
  gitStatusIcon: document.getElementById('git-status-icon'),
  gitStatusText: document.getElementById('git-status-text'),

  // Dropbox
  dropboxClientIdInput: document.getElementById('dropbox-client-id-input'),
  oauthLoginBtn: document.getElementById('oauth-login-btn'),
  dropboxTokenInput: document.getElementById('dropbox-token-input'),
  testDropboxBtn: document.getElementById('test-dropbox-btn'),
  dropboxStatus: document.getElementById('dropbox-status'),
  dropboxStatusIcon: document.getElementById('dropbox-status-icon'),
  dropboxStatusText: document.getElementById('dropbox-status-text'),
  dropboxUserInfo: document.getElementById('dropbox-user-info'),
  dropboxUserName: document.getElementById('dropbox-user-name'),
  dropboxUserEmail: document.getElementById('dropbox-user-email'),
  disconnectDropboxBtn: document.getElementById('disconnect-dropbox-btn'),

  // Dropbox Browser Modal
  dropboxBrowserModal: document.getElementById('dropbox-browser-modal'),
  dropboxCurrentPath: document.getElementById('dropbox-current-path'),
  dropboxFolderList: document.getElementById('dropbox-folder-list'),
  dropboxUpBtn: document.getElementById('dropbox-up-btn'),
  dropboxRefreshBtn: document.getElementById('dropbox-refresh-btn'),
  dropboxNewFolderInput: document.getElementById('dropbox-new-folder-input'),
  dropboxCreateFolderBtn: document.getElementById('dropbox-create-folder-btn'),
  dropboxBrowserCancelBtn: document.getElementById('dropbox-browser-cancel-btn'),
  dropboxBrowserSelectBtn: document.getElementById('dropbox-browser-select-btn'),

  // Help
  helpGlobalHotkey: document.getElementById('help-global-hotkey'),

  // Modal
  taskModal: document.getElementById('task-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalDetails: document.getElementById('modal-details'),
  modalDetailsDisplay: document.getElementById('modal-details-display'),
  modalPriority: document.getElementById('modal-priority'),
  modalDueDate: document.getElementById('modal-due-date'),
  modalStatus: document.getElementById('modal-status'),
  modalCreated: document.getElementById('modal-created'),
  modalParent: document.getElementById('modal-parent'),
  modalParentContainer: document.getElementById('modal-parent-container'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSaveBtn: document.getElementById('modal-save-btn'),
  modalUndeleteBtn: document.getElementById('modal-undelete-btn'),
  modalMoveBtn: document.getElementById('modal-move-btn'),

  // Move Task Modal
  moveTaskModal: document.getElementById('move-task-modal'),
  moveFolderSelect: document.getElementById('move-folder-select'),
  moveTaskTree: document.getElementById('move-task-tree'),
  moveCancelBtn: document.getElementById('move-cancel-btn'),
  moveConfirmBtn: document.getElementById('move-confirm-btn'),

  // Filter
  filterToggleBtn: document.getElementById('filter-toggle-btn'),
  filterLabel: document.getElementById('filter-label'),
  filterMenu: document.getElementById('filter-menu'),
  deletedCount: document.getElementById('deleted-count'),

  // Sort
  sortToggleBtn: document.getElementById('sort-toggle-btn'),
  sortLabel: document.getElementById('sort-label'),
  sortMenu: document.getElementById('sort-menu'),

  // Expand/Collapse
  expandCollapseBtn: document.getElementById('expand-collapse-btn'),
  expandCollapseIcon: document.getElementById('expand-collapse-icon'),

  // Info
  versionInfo: document.getElementById('version-info'),
  platformInfo: document.getElementById('platform-info'),

  // Saving indicator
  savingSpinner: document.getElementById('settings-saving-spinner'),

  // Sidebar
  sidebar: document.getElementById('sidebar'),
  sidebarResizeHandle: document.querySelector('.sidebar-resize-handle'),

  // Agent
  sidebarAgent: document.getElementById('sidebar-agent'),
  agentResizeHandle: document.getElementById('agent-resize-handle'),
  agentMessages: document.getElementById('agent-messages'),
  agentInput: document.getElementById('agent-input'),
  agentSendBtn: document.getElementById('agent-send-btn'),
  agentQuickBtn: document.getElementById('agent-quick-btn'),
  agentQuickMenu: document.getElementById('agent-quick-menu'),
  agentModelName: document.getElementById('agent-model-name'),

  // Timeline
  timelineSection: document.getElementById('timeline-section'),
  timelineContainer: document.getElementById('timeline-container'),
  timelineTrack: document.getElementById('timeline-track'),
  timelineTooltip: document.getElementById('timeline-tooltip'),

  // Commit Modal
  commitModal: document.getElementById('commit-modal'),
  commitHash: document.getElementById('commit-hash'),
  commitMessage: document.getElementById('commit-message'),
  commitAuthor: document.getElementById('commit-author'),
  commitDate: document.getElementById('commit-date'),
  commitCancelBtn: document.getElementById('commit-cancel-btn'),
  commitRollbackBtn: document.getElementById('commit-rollback-btn'),

  // Context Menu
  taskContextMenu: document.getElementById('task-context-menu')
};

// ========================================
// Initialization
// ========================================
async function initializeApp() {
  // Load folders from storage
  await loadFoldersFromStorage();

  // Initialize task storage
  await initializeTaskStorage();

  // Navigate to tasks view
  navigateToView('tasks');

  // Update dashboard stats
  await updateProfileStats();
}

// ========================================
// Navigation
// ========================================
async function navigateToView(viewName) {
  state.currentView = viewName;

  // Update nav items
  elements.navItems.forEach(item => {
    const itemView = item.dataset.view;
    if (itemView === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update sidebar icon buttons
  elements.sidebarIconBtns.forEach(btn => {
    const btnView = btn.dataset.view;
    if (btnView === viewName) {
      btn.style.background = 'var(--accent-light)';
      btn.style.color = 'var(--accent-primary)';
    } else {
      btn.style.background = '';
      btn.style.color = '';
    }
  });

  // Update views
  Object.keys(elements.views).forEach(key => {
    if (key === viewName) {
      elements.views[key].classList.add('active');
    } else {
      elements.views[key].classList.remove('active');
    }
  });

  if (viewName === 'profile') {
    await updateProfileStats();
  } else if (viewName === 'settings') {
    renderFolderList();
    renderStatusesList();

    // Detect Ollama if not already detected or loaded
    if (!state.ollamaPath) {
      detectOllama();
    }
  } else if (viewName === 'help') {
    // Update global hotkey display in help view
    if (elements.helpGlobalHotkey && state.globalHotkey) {
      elements.helpGlobalHotkey.textContent = acceleratorToDisplay(state.globalHotkey);
    }
  }
}

// ========================================
// Theme Management
// ========================================
async function initTheme() {
  // Always load config to get saved theme
  const result = await window.electronAPI.config.read();
  if (result.success && result.config.theme) {
    state.theme = result.config.theme;
  }

  const savedTheme = state.theme || 'auto';

  if (elements.themeSelect) {
    elements.themeSelect.value = savedTheme;
  }

  await applyTheme(savedTheme);
}

async function applyTheme(theme) {
  state.theme = theme;

  if (theme === 'auto') {
    try {
      const systemTheme = await window.electronAPI.getSystemTheme();
      document.body.setAttribute('data-theme', systemTheme);
    } catch (error) {
      console.error('Failed to get system theme:', error);
      document.body.setAttribute('data-theme', 'light');
    }
  } else {
    document.body.setAttribute('data-theme', theme);
  }
}

async function handleThemeChange(event) {
  const newTheme = event.target.value;
  await applyTheme(newTheme);
  await saveAllSettings();
}

// ========================================
// Folder Management
// ========================================
async function loadFoldersFromStorage() {
  const result = await window.electronAPI.config.read();
  if (result.success) {
    state.taskFolders = result.config.taskFolders || [];
    state.currentFolderId = result.config.currentFolderId || null;
    state.theme = result.config.theme || 'auto';

    // Load filter and sort settings
    state.activeFilters = new Set(result.config.activeFilters || ['all']);
    state.sortOrder = result.config.sortOrder || 'default';

    // Load sidebar width
    state.sidebarWidth = result.config.sidebarWidth || 200;
    applySidebarWidth(state.sidebarWidth);

    // Load global hotkey
    state.globalHotkey = result.config.globalHotkey || 'CommandOrControl+Alt+T';

    // Load auto-launch setting (default to true)
    state.autoLaunch = result.config.autoLaunch !== undefined ? result.config.autoLaunch : true;

    // Load start minimized setting (default to true)
    state.startMinimized = result.config.startMinimized !== undefined ? result.config.startMinimized : true;

    // Load timeline zoom (default to 1.0)
    state.timelineZoom = result.config.timelineZoom || 1.0;

    // Load task view mode (default to 'list')
    state.taskViewMode = result.config.taskViewMode || 'list';

    // Load expanded tasks for current folder
    const expandedTasksData = result.config.expandedTasks || {};
    if (state.currentFolderId && expandedTasksData[state.currentFolderId]) {
      state.expandedTasks = new Set(expandedTasksData[state.currentFolderId]);
    } else {
      state.expandedTasks = new Set();
    }
  }
}

async function saveFoldersToStorage() {
  await saveAllSettings();
}

function showSavingIndicator() {
  if (elements.savingSpinner) {
    elements.savingSpinner.style.display = 'flex';
  }
}

function hideSavingIndicator() {
  if (elements.savingSpinner) {
    // Keep visible for a brief moment so it's noticeable
    setTimeout(() => {
      elements.savingSpinner.style.display = 'none';
    }, 300);
  }
}

async function saveAllSettings() {
  showSavingIndicator();

  try {
    // Prepare expanded tasks data (convert Set to array for current folder)
    const result = await window.electronAPI.config.read();
    const expandedTasksData = result.success ? (result.config.expandedTasks || {}) : {};

    if (state.currentFolderId) {
      expandedTasksData[state.currentFolderId] = Array.from(state.expandedTasks);
    }

    await window.electronAPI.config.update({
      taskFolders: state.taskFolders,
      currentFolderId: state.currentFolderId,
      theme: state.theme,
      activeFilters: Array.from(state.activeFilters),
      sortOrder: state.sortOrder,
      expandedTasks: expandedTasksData,
      sidebarWidth: state.sidebarWidth,
      globalHotkey: state.globalHotkey,
      autoLaunch: state.autoLaunch,
      startMinimized: state.startMinimized,
      ollamaPath: state.ollamaPath,
      ollamaModel: state.ollamaModel,
      ollamaAvailable: state.ollamaAvailable,
      vectorDbEnabled: state.vectorDbEnabled,
      vectorDbUrl: state.vectorDbUrl,
      vectorDbCollection: state.vectorDbCollection,
      vectorDbConnected: state.vectorDbConnected,
      gitPath: state.gitPath,
      gitAvailable: state.gitAvailable,
      dropboxClientId: state.dropboxClientId,
      dropboxAccessToken: state.dropboxAccessToken,
      dropboxRefreshToken: state.dropboxRefreshToken,
      dropboxConnected: state.dropboxConnected,
      dropboxUserInfo: state.dropboxUserInfo,
      agentQuickPrompts: state.agentQuickPrompts,
      taskStatuses: state.taskStatuses,
      timelineZoom: state.timelineZoom,
      taskViewMode: state.taskViewMode,
      agentHeight: state.agentHeight
    });
  } finally {
    hideSavingIndicator();
  }
}

function getCurrentFolder() {
  if (!state.currentFolderId) return null;
  return state.taskFolders.find(f => f.id === state.currentFolderId);
}

function openAddFolderModal() {
  // Reset inputs
  elements.folderPathInput.value = '';
  elements.dropboxPathInput.value = '';
  elements.folderNameInput.value = '';

  // Reset to local storage type
  if (elements.storageTypeLocal) {
    elements.storageTypeLocal.checked = true;
  }
  updateStorageTypeVisibility();

  // Enable/disable version control checkbox based on git availability
  if (state.gitPath && state.gitAvailable) {
    elements.enableVersionControlCheckbox.disabled = false;
    elements.enableVersionControlCheckbox.parentElement.title = '';
  } else {
    elements.enableVersionControlCheckbox.disabled = true;
    elements.enableVersionControlCheckbox.checked = false;
    elements.enableVersionControlCheckbox.parentElement.title = 'Git must be configured in Settings to enable version control';
  }

  // Disable Dropbox option if not connected
  if (elements.storageTypeDropbox) {
    if (!state.dropboxConnected) {
      elements.storageTypeDropbox.disabled = true;
      elements.storageTypeDropbox.parentElement.title = 'Connect to Dropbox in Settings first';
      elements.storageTypeDropbox.parentElement.style.opacity = '0.5';
    } else {
      elements.storageTypeDropbox.disabled = false;
      elements.storageTypeDropbox.parentElement.title = '';
      elements.storageTypeDropbox.parentElement.style.opacity = '1';
    }
  }

  elements.addFolderModal.classList.add('active');
  elements.folderPathInput.focus();
}

function updateStorageTypeVisibility() {
  const isLocal = elements.storageTypeLocal?.checked;

  if (elements.localFolderSection) {
    elements.localFolderSection.style.display = isLocal ? 'block' : 'none';
  }
  if (elements.dropboxFolderSection) {
    elements.dropboxFolderSection.style.display = isLocal ? 'none' : 'block';
  }
}

function closeAddFolderModal() {
  elements.addFolderModal.classList.remove('active');
  elements.folderPathInput.value = '';
  elements.folderNameInput.value = '';
  elements.enableVersionControlCheckbox.checked = false;
}

async function browseFolderForModal() {
  try {
    const folderPath = await window.electronAPI.tasks.selectFolder();
    if (folderPath) {
      elements.folderPathInput.value = folderPath;

      // Auto-generate folder name if not set
      if (!elements.folderNameInput.value.trim()) {
        const pathParts = folderPath.split(/[/\\]/);
        const folderName = pathParts[pathParts.length - 1] || 'Tasks';
        elements.folderNameInput.value = folderName;
      }
    }
  } catch (error) {
    console.error('Error browsing folder:', error);
  }
}

async function saveAddFolder() {
  // Determine storage type
  const isLocal = elements.storageTypeLocal?.checked;
  const storageType = isLocal ? 'local' : 'dropbox';

  // Get appropriate path based on storage type
  let folderPath;
  let dropboxPath;

  if (storageType === 'local') {
    folderPath = elements.folderPathInput.value.trim();
    if (!folderPath) {
      alert('Please enter or browse for a folder path.');
      return;
    }
  } else {
    dropboxPath = elements.dropboxPathInput.value.trim();
    if (!dropboxPath) {
      alert('Please select a Dropbox folder.');
      return;
    }
  }

  try {
    let actualPath;
    const folderId = Date.now().toString();

    if (storageType === 'local') {
      // Initialize the local folder
      const result = await window.electronAPI.tasks.initialize(folderPath);

      if (!result.success) {
        alert('Failed to initialize folder: ' + result.error);
        return;
      }

      actualPath = result.path;
    } else {
      // Dropbox: Pull contents to ramdisk
      const syncResult = await window.electronAPI.dropbox.syncPull(folderId, dropboxPath);

      if (!syncResult.success) {
        alert('Failed to sync from Dropbox: ' + syncResult.error);
        return;
      }

      // Get the ramdisk path
      const ramdiskResult = await window.electronAPI.dropbox.getRamdiskPath(folderId);
      if (!ramdiskResult.success) {
        alert('Failed to get ramdisk path: ' + ramdiskResult.error);
        return;
      }

      actualPath = ramdiskResult.path;

      // Initialize the ramdisk folder for task operations
      const initResult = await window.electronAPI.tasks.initialize(actualPath);
      if (!initResult.success) {
        alert('Failed to initialize ramdisk folder: ' + initResult.error);
        return;
      }
    }

    // Use custom name or extract from path
    let folderName = elements.folderNameInput.value.trim();
    if (!folderName) {
      if (storageType === 'local') {
        const pathParts = actualPath.split(/[/\\]/);
        folderName = pathParts[pathParts.length - 1] || 'Tasks';
      } else {
        const pathParts = dropboxPath.split('/').filter(p => p);
        folderName = pathParts[pathParts.length - 1] || 'Tasks';
      }
    }

    // Check if version control should be enabled
    const enableVersionControl = elements.enableVersionControlCheckbox.checked;

    // Initialize git if requested
    if (enableVersionControl && state.gitPath) {
      const gitResult = await window.electronAPI.git.init(state.gitPath, actualPath);
      if (!gitResult.success) {
        console.error('Failed to initialize git:', gitResult.error);
        alert('Warning: Could not initialize Git repository: ' + gitResult.error);
      }
    }

    // Create new folder entry
    const newFolder = {
      id: folderId,
      name: folderName,
      path: actualPath,
      storageType: storageType,
      versionControl: enableVersionControl && state.gitPath ? true : false
    };

    // Add dropboxPath for Dropbox folders
    if (storageType === 'dropbox') {
      newFolder.dropboxPath = dropboxPath;
    }

    state.taskFolders.push(newFolder);
    state.currentFolderId = newFolder.id;

    saveFoldersToStorage();
    renderSidebarFolders();
    renderFolderList();
    await loadTasks();

    closeAddFolderModal();
  } catch (error) {
    console.error('Error adding folder:', error);
    alert('Error adding folder: ' + error.message);
  }
}

async function removeFolder(folderId, forcePermDelete = false) {
  const folder = state.taskFolders.find(f => f.id === folderId);
  if (!folder) return;

  if (forcePermDelete) {
    // Permanent delete - no confirmation, delete from disk
    try {
      const result = await window.electronAPI.folders.permanentlyDelete(folder.path);
      if (!result.success) {
        alert('Failed to permanently delete folder: ' + result.error);
        return;
      }
    } catch (error) {
      console.error('Error permanently deleting folder:', error);
      alert('Error permanently deleting folder: ' + error.message);
      return;
    }
  } else {
    // Regular remove - show confirmation, keep files on disk
    if (!confirm('Are you sure you want to remove this folder? The files will not be deleted, only removed from this app.')) {
      return;
    }
  }

  // Remove folder from state
  state.taskFolders = state.taskFolders.filter(f => f.id !== folderId);

  // If we removed the current folder, switch to another one or clear
  if (state.currentFolderId === folderId) {
    if (state.taskFolders.length > 0) {
      state.currentFolderId = state.taskFolders[0].id;
      await loadTasks();
    } else {
      state.currentFolderId = null;
      state.tasks = [];
      renderTasks();
    }
  }

  saveFoldersToStorage();
  renderSidebarFolders();
  renderFolderList();
}

async function renameFolder(folderId, newName) {
  const folder = state.taskFolders.find(f => f.id === folderId);
  if (folder) {
    folder.name = newName;
    saveFoldersToStorage();
    renderSidebarFolders();
    renderFolderList();
  }
}

async function updateFolderPath(folderId, newPath) {
  const folder = state.taskFolders.find(f => f.id === folderId);
  if (!folder) return;

  // Validate that the path exists by trying to initialize it
  const initResult = await window.electronAPI.tasks.initialize(newPath);
  if (!initResult.success) {
    alert(`Invalid folder path: ${initResult.error}`);
    renderFolderList(); // Reset the input to the old value
    return;
  }

  // Update the folder path
  folder.path = newPath;
  saveFoldersToStorage();
  renderSidebarFolders();
  renderFolderList();

  // If this is the currently active folder, reload tasks from the new path
  if (folder.id === state.currentFolderId) {
    await loadTasks();
  }
}

async function browseFolderPath(folderId) {
  const selectedPath = await window.electronAPI.tasks.selectFolder();
  if (selectedPath) {
    await updateFolderPath(folderId, selectedPath);
  }
}

async function switchFolder(folderId) {
  // Save current folder's expanded tasks before switching
  await saveAllSettings();

  state.currentFolderId = folderId;
  state.selectedTaskPaths = []; // Clear selection when switching folders
  state.lastSelectedTaskPath = null;

  // Load the new folder's expanded tasks
  const result = await window.electronAPI.config.read();
  if (result.success) {
    const expandedTasksData = result.config.expandedTasks || {};
    if (folderId && expandedTasksData[folderId]) {
      state.expandedTasks = new Set(expandedTasksData[folderId]);
    } else {
      state.expandedTasks = new Set();
    }
  }

  const folder = getCurrentFolder();
  if (folder) {
    // Tell the main process about the folder switch so it can set up DropboxStorage if needed
    const setFolderResult = await window.electronAPI.tasks.setCurrentFolder({
      id: folder.id,
      path: folder.path,
      storageType: folder.storageType || 'local',
      dropboxPath: folder.dropboxPath || null
    });

    // Check for errors during folder setup
    if (!setFolderResult.success) {
      console.error('Failed to set current folder:', setFolderResult.error);
      state.folderErrors.set(folder.id, setFolderResult.error);
      renderSidebarFolders();

      // Still try to initialize and load, but it will likely fail
      state.tasks = [];
      renderTasks();
      return;
    }

    // Initialize the folder before loading tasks
    const initResult = await window.electronAPI.tasks.initialize(folder.path);
    if (initResult.success) {
      await loadTasks();
    } else {
      // Store initialization error
      state.folderErrors.set(folder.id, initResult.error || 'Failed to initialize folder');
      renderSidebarFolders();
      state.tasks = [];
      renderTasks();
    }
  }

  // Save the folder switch
  await saveFoldersToStorage();

  // Navigate to tasks view
  navigateToView('tasks');

  renderSidebarFolders(); // Update active state
}

function renderSidebarFolders() {
  if (!elements.sidebarFolders) return;

  if (state.taskFolders.length === 0) {
    elements.sidebarFolders.innerHTML = '<p class="empty-state" style="padding: 2rem 1rem; font-size: 0.85rem;">No folders configured.<br><br>Click + to add a folder.</p>';
    return;
  }

  elements.sidebarFolders.innerHTML = state.taskFolders.map(folder => {
    const isActive = folder.id === state.currentFolderId;
    const isDropbox = folder.storageType === 'dropbox';
    const hasError = state.folderErrors.has(folder.id);
    const errorMessage = hasError ? state.folderErrors.get(folder.id) : '';
    return `
      <button class="nav-item folder-nav-item ${isActive ? 'active' : ''} ${hasError ? 'folder-error' : ''}"
              data-folder-id="${folder.id}"
              draggable="true">
        <span class="material-icons nav-icon">folder</span>
        <span class="nav-label">${escapeHtml(folder.name)}</span>
        ${isDropbox ? `
          <span class="material-icons folder-cloud-icon" title="Dropbox folder">cloud</span>
        ` : ''}
        ${folder.versionControl ? `
          <img src="../assets/git-branch-outline.svg" alt="Git" class="folder-git-icon folder-git-icon-light" title="Version control enabled" />
          <img src="../assets/git-branch-outline-white.svg" alt="Git" class="folder-git-icon folder-git-icon-dark" title="Version control enabled" />
        ` : ''}
        ${hasError ? `
          <span class="material-icons folder-error-icon" title="${escapeHtml(errorMessage)}">warning</span>
        ` : ''}
      </button>
    `;
  }).join('');

  // Add click and keyboard handlers
  elements.sidebarFolders.querySelectorAll('.folder-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Only trigger switch if not dragging
      if (!state.draggedFolder) {
        const folderId = btn.dataset.folderId;
        switchFolder(folderId);
      }
    });

    // Add keyboard support for Enter and Space
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!state.draggedFolder) {
          const folderId = btn.dataset.folderId;
          switchFolder(folderId);
        }
      }
    });
  });

  // Setup drag and drop for folders
  setupFolderDragAndDrop();
}

function renderFolderList() {
  if (!elements.folderList) return;

  if (state.taskFolders.length === 0) {
    elements.folderList.innerHTML = '<p class="setting-description" style="text-align: center; padding: 2rem;">No folders configured. Click "Add Folder" to get started.</p>';
    return;
  }

  elements.folderList.innerHTML = state.taskFolders.map(folder => {
    const isDropbox = folder.storageType === 'dropbox';
    const displayPath = isDropbox ? folder.dropboxPath : folder.path;
    return `
    <div class="folder-item">
      <div class="folder-item-info">
        <div class="folder-item-name">
          ${isDropbox ? `
            <span class="folder-cloud-badge" title="Dropbox folder">
              <span class="material-icons">cloud</span>
            </span>
          ` : ''}
          ${folder.versionControl ? `
            <span class="folder-git-badge" title="Version control enabled">
              <img src="../assets/git-branch-outline.svg" alt="Git" class="folder-git-badge-icon folder-git-badge-icon-light" />
              <img src="../assets/git-branch-outline-white.svg" alt="Git" class="folder-git-badge-icon folder-git-badge-icon-dark" />
            </span>
          ` : ''}
          <input type="text" value="${escapeHtml(folder.name)}"
                 data-folder-id="${folder.id}"
                 class="folder-name-input" />
        </div>
        <div class="folder-item-path-container">
          <input type="text" value="${escapeHtml(displayPath)}"
                 data-folder-id="${folder.id}"
                 class="folder-path-input"
                 title="${isDropbox ? 'Dropbox path (read-only)' : 'Click to edit path, or use Browse button'}"
                 placeholder="${isDropbox ? 'Dropbox path' : 'Folder path'}"
                 ${isDropbox ? 'readonly' : ''} />
          ${!isDropbox ? `
            <button class="folder-path-browse-btn" data-folder-id="${folder.id}" title="Browse for folder">
              <span class="material-icons">folder_open</span>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="folder-item-actions">
        <button class="folder-item-btn" data-folder-id="${folder.id}" data-action="remove" title="Remove folder (Ctrl+click to permanently delete from disk)">
          <span class="material-icons folder-delete-icon">delete</span>
          <span class="material-icons folder-delete-icon-permanent">delete_forever</span>
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Add event listeners for rename inputs
  elements.folderList.querySelectorAll('.folder-name-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const folderId = e.target.dataset.folderId;
      const newName = e.target.value.trim();
      if (newName) {
        renameFolder(folderId, newName);
      }
    });
  });

  // Add event listeners for path inputs
  elements.folderList.querySelectorAll('.folder-path-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const folderId = e.target.dataset.folderId;
      const newPath = e.target.value.trim();
      if (newPath) {
        updateFolderPath(folderId, newPath);
      }
    });
  });

  // Add event listeners for browse buttons
  elements.folderList.querySelectorAll('.folder-path-browse-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const folderId = e.currentTarget.dataset.folderId;
      await browseFolderPath(folderId);
    });
  });

  // Add event listeners for remove buttons
  elements.folderList.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const folderId = e.currentTarget.dataset.folderId;
      const forcePermDelete = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
      removeFolder(folderId, forcePermDelete);
    });
  });
}

// ========================================
// Folder Drag and Drop
// ========================================
function setupFolderDragAndDrop() {
  const folderItems = elements.sidebarFolders.querySelectorAll('.folder-nav-item');

  folderItems.forEach(item => {
    item.addEventListener('dragstart', handleFolderDragStart);
    item.addEventListener('dragover', handleFolderDragOver);
    item.addEventListener('drop', handleFolderDrop);
    item.addEventListener('dragend', handleFolderDragEnd);
  });
}

function handleFolderDragStart(e) {
  const folderId = e.currentTarget.dataset.folderId;
  state.draggedFolder = folderId;

  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleFolderDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const targetItem = e.currentTarget;

  // Handle task being dragged onto folder
  if (state.draggedTask) {
    // Clear previous highlights
    document.querySelectorAll('.folder-nav-item').forEach(item => {
      item.classList.remove('drag-over-folder');
    });

    // Don't allow dropping on current folder
    if (targetItem.dataset.folderId === state.currentFolderId) {
      return;
    }

    // Highlight the target folder
    targetItem.classList.add('drag-over-folder');
    return;
  }

  // Handle folder being dragged for reordering
  if (!state.draggedFolder) return;

  // Don't allow dropping on itself
  if (targetItem.dataset.folderId === state.draggedFolder) return;

  // Clear previous highlights
  document.querySelectorAll('.folder-nav-item').forEach(item => {
    item.classList.remove('drop-above', 'drop-below');
  });

  // Highlight drop position
  const rect = targetItem.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;

  if (e.clientY < midpoint) {
    targetItem.classList.add('drop-above');
  } else {
    targetItem.classList.add('drop-below');
  }
}

async function handleFolderDrop(e) {
  e.preventDefault();

  const targetFolderId = e.currentTarget.dataset.folderId;

  // Handle task being dropped onto folder
  if (state.draggedTask) {
    // Don't allow dropping on current folder
    if (targetFolderId === state.currentFolderId) {
      return;
    }

    try {
      // Get task info before move
      const draggedTask = findTaskByPath(state.tasks, state.draggedTask.path);
      const taskTitle = draggedTask ? draggedTask.title : 'Unknown task';

      // Move task to target folder root (no parent)
      const result = await window.electronAPI.tasks.moveToFolder(
        state.draggedTask.path,
        targetFolderId,
        null // No parent - move to root
      );

      if (result.success) {
        await loadTasks(); // Reload tasks

        // Commit to git if version control is enabled
        const destFolder = state.taskFolders.find(f => f.id === targetFolderId);
        await commitTaskChange(`Move task: ${taskTitle} to ${destFolder?.name || 'folder'}`);

        console.log(`Task moved to ${destFolder?.name || 'folder'}`);
      } else {
        console.error('Failed to move task:', result.error);
        alert('Failed to move task: ' + result.error);
      }
    } catch (error) {
      console.error('Error moving task:', error);
      alert('Error moving task: ' + error.message);
    }

    // Clear highlights
    document.querySelectorAll('.folder-nav-item').forEach(item => {
      item.classList.remove('drag-over-folder');
    });

    return;
  }

  // Handle folder being dropped for reordering
  if (!state.draggedFolder || targetFolderId === state.draggedFolder) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const insertBefore = e.clientY < midpoint;

  // Find indices
  const draggedIndex = state.taskFolders.findIndex(f => f.id === state.draggedFolder);
  const targetIndex = state.taskFolders.findIndex(f => f.id === targetFolderId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Reorder the folders
  const draggedFolder = state.taskFolders[draggedIndex];
  state.taskFolders.splice(draggedIndex, 1);

  let newIndex = state.taskFolders.findIndex(f => f.id === targetFolderId);
  if (!insertBefore) {
    newIndex++;
  }

  state.taskFolders.splice(newIndex, 0, draggedFolder);

  // Save and re-render
  await saveFoldersToStorage();
  renderSidebarFolders();

  // Clear highlights
  document.querySelectorAll('.folder-nav-item').forEach(item => {
    item.classList.remove('drop-above', 'drop-below', 'dragging');
  });
}

function handleFolderDragEnd(e) {
  e.currentTarget.classList.remove('dragging');

  document.querySelectorAll('.folder-nav-item').forEach(item => {
    item.classList.remove('drop-above', 'drop-below', 'drag-over-folder');
  });

  state.draggedFolder = null;
}

// ========================================
// Sidebar Resizing
// ========================================
function applySidebarWidth(width) {
  if (elements.sidebar) {
    elements.sidebar.style.width = `${width}px`;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }
}

function setupSidebarResize() {
  if (!elements.sidebarResizeHandle) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  elements.sidebarResizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = state.sidebarWidth;

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(150, Math.min(500, startWidth + deltaX));

    state.sidebarWidth = newWidth;
    applySidebarWidth(newWidth);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save the new width
      saveAllSettings();
    }
  });
}

function setupAgentResize() {
  if (!elements.agentResizeHandle) return;

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  elements.agentResizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = state.agentHeight;

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaY = e.clientY - startY;
    // Invert deltaY: dragging down (positive deltaY) should decrease height
    const newHeight = Math.max(150, Math.min(600, startHeight - deltaY));

    state.agentHeight = newHeight;
    applyAgentHeight(newHeight);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save the new height
      saveAllSettings();
    }
  });
}

function applyAgentHeight(height) {
  if (!elements.sidebarAgent) return;
  elements.sidebarAgent.style.height = `${height}px`;
}

// ========================================
// UI State Restoration
// ========================================
function restoreUIState() {
  // Restore theme dropdown
  if (elements.themeSelect && state.theme) {
    elements.themeSelect.value = state.theme;
  }

  // Restore filter checkboxes
  if (elements.filterMenu) {
    elements.filterMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = state.activeFilters.has(cb.value);
    });
    updateFilterLabel();
  }

  // Restore sort radio buttons
  if (elements.sortMenu) {
    elements.sortMenu.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.checked = radio.value === state.sortOrder;
    });
  }

  // Restore hotkey display
  updateHotkeyDisplay();

  // Restore auto-launch checkbox
  if (elements.autoLaunchCheckbox) {
    elements.autoLaunchCheckbox.checked = state.autoLaunch;
  }

  // Restore start minimized checkbox
  if (elements.startMinimizedCheckbox) {
    elements.startMinimizedCheckbox.checked = state.startMinimized;
  }

  // Restore view mode button states
  if (elements.viewListBtn && elements.viewKanbanBtn) {
    if (state.taskViewMode === 'list') {
      elements.viewListBtn.classList.add('active');
      elements.viewKanbanBtn.classList.remove('active');
    } else {
      elements.viewListBtn.classList.remove('active');
      elements.viewKanbanBtn.classList.add('active');
    }
  }

  // Restore agent height
  if (state.agentHeight) {
    applyAgentHeight(state.agentHeight);
  }
}

// ========================================
// Task Storage Initialization
// ========================================
async function initializeTaskStorage() {
  try {
    await loadFoldersFromStorage();

    // Restore UI state (filters, sort)
    restoreUIState();

    // If we have folders, load tasks from current folder
    if (state.taskFolders.length > 0 && state.currentFolderId) {
      const currentFolder = getCurrentFolder();
      if (currentFolder) {
        // Tell the main process about the current folder so it can set up DropboxStorage if needed
        const setFolderResult = await window.electronAPI.tasks.setCurrentFolder({
          id: currentFolder.id,
          path: currentFolder.path,
          storageType: currentFolder.storageType || 'local',
          dropboxPath: currentFolder.dropboxPath || null
        });

        // Check for errors during folder setup
        if (!setFolderResult.success) {
          console.error('Failed to set current folder:', setFolderResult.error);
          state.folderErrors.set(currentFolder.id, setFolderResult.error);
          renderSidebarFolders();

          // Still try to initialize and load, but it will likely fail
          state.tasks = [];
          renderTasks();
        } else {
          // Initialize the folder
          const result = await window.electronAPI.tasks.initialize(currentFolder.path);
          if (result.success) {
            await loadTasks();
          } else {
            // Store initialization error
            state.folderErrors.set(currentFolder.id, result.error || 'Failed to initialize folder');
            renderSidebarFolders();
            state.tasks = [];
            renderTasks();
          }
        }
      }
    } else {
      // No folders configured, show empty state
      state.tasks = [];
      renderTasks();
    }

    renderSidebarFolders();
    renderFolderList();
  } catch (error) {
    console.error('Error initializing task storage:', error);
  }
}

// ========================================
// Git Integration Helper
// ========================================
let gitCommitQueue = [];
let gitCommitInProgress = false;

async function processGitCommitQueue() {
  // If already processing or queue is empty, do nothing
  if (gitCommitInProgress || gitCommitQueue.length === 0) {
    return;
  }

  gitCommitInProgress = true;

  while (gitCommitQueue.length > 0) {
    const message = gitCommitQueue.shift();

    try {
      // Only commit if git is configured and current folder has version control enabled
      const currentFolder = getCurrentFolder();
      if (!currentFolder || !currentFolder.versionControl) {
        continue; // Skip this commit
      }

      if (!state.gitPath || !state.gitAvailable) {
        console.log('Git not configured, skipping commit');
        continue; // Skip this commit
      }

      // Stage all changes (the git:add handler will poll until files are written)
      const addResult = await window.electronAPI.git.add(state.gitPath, currentFolder.path, '.');
      if (!addResult.success) {
        console.error('Git add failed:', addResult.error);
        continue; // Skip this commit but try next one
      }

      // Commit the changes
      const commitResult = await window.electronAPI.git.commit(state.gitPath, currentFolder.path, message);
      if (!commitResult.success) {
        console.error('Git commit failed:', commitResult.error);
        continue; // Skip this commit but try next one
      }

      console.log('Git commit successful:', message);

      // Reload timeline to show the new commit
      await loadTimeline();

      // If this is a Dropbox folder, push to Dropbox after commit
      if (currentFolder.storageType === 'dropbox' && currentFolder.dropboxPath) {
        console.log('Pushing to Dropbox after git commit...');
        try {
          await window.electronAPI.dropbox.syncPush(currentFolder.id, currentFolder.dropboxPath);
          console.log('Dropbox push successful');
        } catch (dropboxError) {
          console.error('Dropbox push failed:', dropboxError);
          // Don't fail the git commit if Dropbox push fails
        }
      }
    } catch (error) {
      console.error('Error committing to git:', error);
      // Continue processing remaining commits
    }
  }

  gitCommitInProgress = false;
}

async function commitTaskChange(message) {
  // Add commit to queue and start processing
  gitCommitQueue.push(message);
  processGitCommitQueue().catch(err => {
    console.error('Error processing git commit queue:', err);
    gitCommitInProgress = false; // Reset flag on error
  });
}

// ========================================
// Git Timeline
// ========================================
let loadTimelineInProgress = false;

async function loadTimeline() {
  // Prevent concurrent timeline loads which can cause git stack overflow on Windows
  if (loadTimelineInProgress) {
    console.log('Timeline load already in progress, skipping...');
    return;
  }

  loadTimelineInProgress = true;

  try {
    const currentFolder = getCurrentFolder();

    // Hide timeline if folder doesn't have version control
    if (!currentFolder || !currentFolder.versionControl) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
      loadTimelineInProgress = false;
      return;
    }

    if (!state.gitPath || !state.gitAvailable) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
      loadTimelineInProgress = false;
      return;
    }

    // Load git history
    const result = await window.electronAPI.git.log(state.gitPath, currentFolder.path);

    if (!result.success || !result.commits || result.commits.length === 0) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
      loadTimelineInProgress = false;
      return;
    }

    // Store commits in state and show timeline
    state.timelineCommits = result.commits;
    elements.timelineSection.style.display = 'block';
    renderTimeline(result.commits);
    updateZoomDisplay();
  } catch (error) {
    console.error('Error loading timeline:', error);
    elements.timelineSection.style.display = 'none';
    state.timelineCommits = [];
  } finally {
    loadTimelineInProgress = false;
  }
}

function renderTimeline(commits) {
  if (!commits || commits.length === 0) {
    elements.timelineTrack.innerHTML = '';
    return;
  }

  // Debug: Log commit order before reversing
  console.log('Commits from git (newest first):', commits.slice(0, 3).map(c => ({
    date: c.date,
    message: c.message.substring(0, 50)
  })));

  // Reverse commits so oldest is first (left side)
  const sortedCommits = [...commits].reverse();

  // Debug: Log commit order after reversing
  console.log('Commits after reverse (oldest first):', sortedCommits.slice(0, 3).map(c => ({
    date: c.date,
    message: c.message.substring(0, 50)
  })));

  // Calculate time range using only commit timestamps (never "now")
  const firstCommitTime = new Date(sortedCommits[0].date).getTime();
  const lastCommitTime = new Date(sortedCommits[sortedCommits.length - 1].date).getTime();
  const timeRange = lastCommitTime - firstCommitTime;

  // Debug: Log the time range to verify we're using commit timestamps
  console.log('Timeline range:', {
    oldest: new Date(firstCommitTime).toISOString(),
    newest: new Date(lastCommitTime).toISOString(),
    rangeInDays: timeRange / (1000 * 60 * 60 * 24),
    commitCount: sortedCommits.length
  });

  // Get container width and calculate usable space (accounting for padding)
  const containerWidth = elements.timelineContainer.clientWidth;
  const padding = 40; // 40px padding on each side
  const usableWidth = containerWidth - (padding * 2);

  // Calculate minimum width needed to prevent overlap
  // Each commit needs ~80px of space, scaled by zoom level
  const minUsableWidth = sortedCommits.length * 80 * state.timelineZoom;
  const trackWidth = Math.max(minUsableWidth + (padding * 2), containerWidth);
  const actualUsableWidth = trackWidth - (padding * 2);

  // Build HTML with line spanning from padding to padding
  let html = `<div class="timeline-line" style="left: ${padding}px; right: ${padding}px;"></div>`;

  sortedCommits.forEach((commit, index) => {
    const commitTime = new Date(commit.date).getTime();

    // Calculate position as pixels from left padding
    let positionInUsableSpace;
    if (timeRange > 0 && sortedCommits.length > 1) {
      // Proportional positioning based on time
      positionInUsableSpace = ((commitTime - firstCommitTime) / timeRange) * actualUsableWidth;
    } else {
      // Equal spacing if no time range or single commit
      positionInUsableSpace = sortedCommits.length === 1 ? actualUsableWidth / 2 : (index / (sortedCommits.length - 1)) * actualUsableWidth;
    }

    const absolutePosition = padding + positionInUsableSpace;

    const isFirst = index === 0;
    const commitDate = new Date(commit.date);
    const formattedDate = commitDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: commitDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    html += `
      <div class="timeline-point ${isFirst ? 'first-commit' : ''}"
           style="left: ${absolutePosition}px"
           data-commit-hash="${commit.hash}"
           data-commit-author="${commit.author}"
           data-commit-date="${commit.date}"
           data-commit-message="${escapeHtml(commit.message)}">
        <div class="timeline-date">${formattedDate}</div>
      </div>
    `;
  });

  elements.timelineTrack.innerHTML = html;
  elements.timelineTrack.style.width = `${trackWidth}px`;

  // Add click and hover handlers to timeline points
  const timelinePoints = elements.timelineTrack.querySelectorAll('.timeline-point');
  timelinePoints.forEach(point => {
    // Click handler for modal
    point.addEventListener('click', () => {
      const commitData = {
        hash: point.dataset.commitHash,
        author: point.dataset.commitAuthor,
        date: point.dataset.commitDate,
        message: point.dataset.commitMessage
      };
      openCommitModal(commitData);
    });

    // Hover handlers for tooltip
    point.addEventListener('mouseenter', (e) => {
      const message = point.dataset.commitMessage;
      const rect = point.getBoundingClientRect();

      // Show tooltip
      elements.timelineTooltip.textContent = message;
      elements.timelineTooltip.style.display = 'block';

      // Position tooltip above the point
      const tooltipRect = elements.timelineTooltip.getBoundingClientRect();
      const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      const top = rect.top - tooltipRect.height - 8;

      elements.timelineTooltip.style.left = `${left}px`;
      elements.timelineTooltip.style.top = `${top}px`;
    });

    point.addEventListener('mouseleave', () => {
      elements.timelineTooltip.style.display = 'none';
    });
  });
}

function zoomTimelineIn() {
  const maxZoom = 20.0; // Increased from 5.0 to 20.0 (2000% zoom)
  const zoomStep = 0.25;

  state.timelineZoom = Math.min(state.timelineZoom + zoomStep, maxZoom);

  if (state.timelineCommits.length > 0) {
    renderTimeline(state.timelineCommits);
  }

  updateZoomDisplay();
  saveAllSettings();
}

function zoomTimelineOut() {
  const minZoom = 0.5;
  const zoomStep = 0.25;

  state.timelineZoom = Math.max(state.timelineZoom - zoomStep, minZoom);

  if (state.timelineCommits.length > 0) {
    renderTimeline(state.timelineCommits);
  }

  updateZoomDisplay();
  saveAllSettings();
}

function resetTimelineZoom() {
  state.timelineZoom = 1.0;

  if (state.timelineCommits.length > 0) {
    renderTimeline(state.timelineCommits);
  }

  updateZoomDisplay();
  saveAllSettings();
}

function updateZoomDisplay() {
  // No UI element to update, but keep function for consistency
}

function openCommitModal(commit) {
  // Populate modal fields
  elements.commitHash.value = commit.hash;
  elements.commitMessage.value = commit.message;
  elements.commitAuthor.value = commit.author;

  const commitDate = new Date(commit.date);
  elements.commitDate.value = commitDate.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Store commit hash for rollback
  elements.commitModal.dataset.commitHash = commit.hash;

  // Show modal
  elements.commitModal.classList.add('active');
}

function closeCommitModal() {
  elements.commitModal.classList.remove('active');
  delete elements.commitModal.dataset.commitHash;
}

async function handleRollback() {
  const commitHash = elements.commitModal.dataset.commitHash;
  if (!commitHash) return;

  const currentFolder = getCurrentFolder();
  if (!currentFolder || !currentFolder.versionControl) {
    alert('No folder with version control selected');
    return;
  }

  if (!confirm('Are you sure you want to rollback to this commit? This will reset all tasks in this folder to the state at this commit. Any changes made after this commit will be lost. This action cannot be undone.')) {
    return;
  }

  try {
    const result = await window.electronAPI.git.reset(state.gitPath, currentFolder.path, commitHash);

    if (result.success) {
      alert('Rollback successful. Tasks have been reset to the selected commit.');
      closeCommitModal();
      await loadTasks(); // Reload tasks from disk
      await loadTimeline(); // Reload timeline
    } else {
      alert('Rollback failed: ' + result.error);
    }
  } catch (error) {
    console.error('Error during rollback:', error);
    alert('Error during rollback: ' + error.message);
  }
}

// ========================================
// Task Management
// ========================================
// Helper function to add parentId to all tasks
function addParentIds(tasks, parentId = null) {
  for (const task of tasks) {
    task.parentId = parentId;
    if (task.children && task.children.length > 0) {
      addParentIds(task.children, task.id);
    }
  }
}

async function loadTasks() {
  try {
    const result = await window.electronAPI.tasks.load();

    if (result.success) {
      state.tasks = result.tasks;
      // Add parent IDs to all tasks for easy parent lookup
      addParentIds(state.tasks);
      renderTasks();
      updateDeletedCount();
      await loadTimeline(); // Load git timeline

      // Clear any previous error for this folder
      if (state.currentFolderId) {
        state.folderErrors.delete(state.currentFolderId);
        renderSidebarFolders(); // Update sidebar to remove error indicator
      }
    } else {
      console.error('Failed to load tasks:', result.error);

      // Store the error for this folder
      if (state.currentFolderId) {
        state.folderErrors.set(state.currentFolderId, result.error);
        renderSidebarFolders(); // Update sidebar to show error indicator
      }

      // Show empty state with error message
      state.tasks = [];
      renderTasks();
    }
  } catch (error) {
    console.error('Error loading tasks:', error);

    // Store the error for this folder
    if (state.currentFolderId) {
      state.folderErrors.set(state.currentFolderId, error.message || 'Failed to load folder');
      renderSidebarFolders(); // Update sidebar to show error indicator
    }

    // Show empty state
    state.tasks = [];
    renderTasks();
  }
}

async function addTask() {
  const taskText = elements.taskInput.value.trim();

  if (taskText === '') {
    return;
  }

  const currentFolder = getCurrentFolder();
  if (!currentFolder) {
    alert('Please select or add a task folder first.');
    return;
  }

  try {
    const result = await window.electronAPI.tasks.create(
      currentFolder.path,
      taskText,
      ''
    );

    if (result.success) {
      // Clear input immediately so user can continue adding tasks
      elements.taskInput.value = '';
      elements.taskInput.focus();

      // Reload tasks in background (don't block input)
      loadTasks().catch(err => {
        console.error('Error loading tasks:', err);
      });

      // Commit to git asynchronously (fire-and-forget, don't block UI)
      commitTaskChange(`Create task: ${taskText}`).catch(err => {
        console.error('Error committing task change:', err);
      });
    } else {
      console.error('Failed to create task:', result.error);
    }
  } catch (error) {
    console.error('Error creating task:', error);
  }
}

async function checkClipboardAndShowPasteButton() {
  if (!window.electronAPI.clipboard) return;

  try {
    const clipboardText = await window.electronAPI.clipboard.readText();
    if (clipboardText && clipboardText.trim().length > 0) {
      elements.pasteBtn.style.display = 'flex';
    } else {
      elements.pasteBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error reading clipboard:', error);
    elements.pasteBtn.style.display = 'none';
  }
}

function hideClipboardPasteButton() {
  elements.pasteBtn.style.display = 'none';
}

async function pasteFromClipboard() {
  if (!window.electronAPI.clipboard) return;

  try {
    const clipboardText = await window.electronAPI.clipboard.readText();
    if (clipboardText && clipboardText.trim().length > 0) {
      elements.taskInput.value = clipboardText.trim();
      elements.taskInput.focus();
      hideClipboardPasteButton();
    }
  } catch (error) {
    console.error('Error pasting from clipboard:', error);
  }
}

async function deleteTask(taskPath, isDeleted, forcePermDelete = false) {
  try {
    // Get task info for commit message before deletion
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'Unknown task';

    // Remember if this was a selected task
    const wasSelected = state.selectedTaskPaths.includes(taskPath);

    let result;
    let commitMessage;

    if (isDeleted || forcePermDelete) {
      // Permanently delete if already in deleted folder OR if Ctrl is pressed
      result = await window.electronAPI.tasks.permanentlyDelete(taskPath);
      commitMessage = `Permanently delete task: ${taskTitle}`;
    } else {
      // Move to deleted folder
      result = await window.electronAPI.tasks.delete(taskPath);
      commitMessage = `Delete task: ${taskTitle}`;
    }

    if (result.success) {
      await loadTasks();

      // If deleted task was selected, remove it from selection
      if (wasSelected) {
        const index = state.selectedTaskPaths.indexOf(taskPath);
        if (index > -1) {
          state.selectedTaskPaths.splice(index, 1);
        }
        if (state.lastSelectedTaskPath === taskPath) {
          state.lastSelectedTaskPath = state.selectedTaskPaths[state.selectedTaskPaths.length - 1] || null;
        }

        // If no tasks are selected, select the first available task
        if (state.selectedTaskPaths.length === 0) {
          const taskElements = getVisibleTaskElements();
          if (taskElements.length > 0) {
            selectTask(taskElements[0].dataset.taskPath);
          }
        }
      }

      // Commit to git asynchronously (fire-and-forget, don't block UI)
      commitTaskChange(commitMessage).catch(err => {
        console.error('Error committing task change:', err);
      });
    } else {
      console.error('Failed to delete task:', result.error);
    }
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

async function restoreTask(taskPath) {
  try {
    // Get task info for commit message before restoration
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'Unknown task';

    const result = await window.electronAPI.tasks.restore(taskPath);

    if (result.success) {
      await loadTasks();

      // Commit to git if version control is enabled
      await commitTaskChange(`Restore task: ${taskTitle}`);
    } else {
      console.error('Failed to restore task:', result.error);
      alert('Failed to restore task: ' + result.error);
    }
  } catch (error) {
    console.error('Error restoring task:', error);
    alert('Error restoring task: ' + error.message);
  }
}

async function toggleTask(taskPath, currentCompleted) {
  try {
    // Get task info for commit message
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'Unknown task';

    const result = await window.electronAPI.tasks.update(taskPath, {
      completed: !currentCompleted
    });

    if (result.success) {
      await loadTasks();

      // Commit to git asynchronously (fire-and-forget, don't block UI)
      const action = !currentCompleted ? 'Complete' : 'Uncomplete';
      commitTaskChange(`${action} task: ${taskTitle}`).catch(err => {
        console.error('Error committing task change:', err);
      });
    } else {
      console.error('Failed to toggle task:', result.error);
    }
  } catch (error) {
    console.error('Error toggling task:', error);
  }
}

function toggleExpanded(taskId) {
  if (state.expandedTasks.has(taskId)) {
    state.expandedTasks.delete(taskId);
  } else {
    state.expandedTasks.add(taskId);
  }
  renderTasks();
  saveAllSettings();
}

function getAllTaskIds(tasks) {
  const ids = [];
  const collect = (taskList) => {
    for (const task of taskList) {
      if (task.children && task.children.length > 0) {
        ids.push(task.id);
        collect(task.children);
      }
    }
  };
  collect(tasks);
  return ids;
}

function updateExpandCollapseButton() {
  if (!elements.expandCollapseBtn || !elements.expandCollapseIcon) {
    return;
  }

  const allIds = getAllTaskIds(state.tasks);

  if (allIds.length === 0) {
    elements.expandCollapseBtn.disabled = true;
    elements.expandCollapseBtn.style.opacity = '0.5';
    return;
  }

  elements.expandCollapseBtn.disabled = false;
  elements.expandCollapseBtn.style.opacity = '1';

  const allExpanded = allIds.every(id => state.expandedTasks.has(id));

  if (allExpanded) {
    elements.expandCollapseIcon.textContent = '⊟';
    elements.expandCollapseBtn.title = 'Collapse All';
  } else {
    elements.expandCollapseIcon.textContent = '⊞';
    elements.expandCollapseBtn.title = 'Expand All';
  }
}

function toggleExpandCollapseAll() {
  const allIds = getAllTaskIds(state.tasks);
  const allExpanded = allIds.every(id => state.expandedTasks.has(id));

  if (allExpanded) {
    state.expandedTasks.clear();
  } else {
    allIds.forEach(id => state.expandedTasks.add(id));
  }

  renderTasks();
  saveAllSettings();
}

// ========================================
// Inline Task Editing
// ========================================
function enableInlineEdit(textElement) {
  const taskItem = textElement.closest('.task-item');
  const taskPath = taskItem.dataset.taskPath;
  const originalText = textElement.textContent;

  // Make the element editable
  textElement.contentEditable = true;
  textElement.classList.add('editing');

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(textElement);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  // Focus the element
  textElement.focus();

  // Function to save the edit
  const saveEdit = async () => {
    const newText = textElement.textContent.trim();

    if (newText && newText !== originalText) {
      try {
        await window.electronAPI.tasks.update(taskPath, { title: newText });
        await loadTasks();

        // Commit to git asynchronously (fire-and-forget, don't block UI)
        commitTaskChange(`Update task: ${newText}`).catch(err => {
          console.error('Error committing task change:', err);
        });
      } catch (error) {
        console.error('Error updating task:', error);
        textElement.textContent = originalText;
      }
    } else if (!newText) {
      // Restore original text if empty
      textElement.textContent = originalText;
    }

    textElement.contentEditable = false;
    textElement.classList.remove('editing');
  };

  // Function to cancel the edit
  const cancelEdit = () => {
    textElement.textContent = originalText;
    textElement.contentEditable = false;
    textElement.classList.remove('editing');
  };

  // Handle blur (clicking away)
  const handleBlur = () => {
    saveEdit();
  };

  // Handle keydown events
  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // Add event listeners
  textElement.addEventListener('blur', handleBlur, { once: true });
  textElement.addEventListener('keydown', handleKeydown);

  // Clean up keydown listener after blur
  textElement.addEventListener('blur', () => {
    textElement.removeEventListener('keydown', handleKeydown);
  }, { once: true });
}

// ========================================
// Task Modal
// ========================================
// Helper function to extract URLs from text
function extractUrls(text) {
  if (!text) return [];
  // Regex to match URLs (http, https, ftp, and bare domains)
  const urlRegex = /https?:\/\/[^\s<]+|www\.[^\s<]+|ftp:\/\/[^\s<]+/gi;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : []; // Remove duplicates
}

// Helper function to linkify text (convert URLs to clickable links)
// This properly escapes text while preserving URLs as clickable links
function linkifyText(text) {
  if (!text) return '';

  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+|ftp:\/\/[^\s<]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  urlRegex.lastIndex = 0;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add escaped text before the URL
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, match.index)));
    }

    // Add the URL as a link
    const url = match[0];
    const href = url.startsWith('www.') ? `http://${url}` : url;
    parts.push(`<a href="#" class="task-link" data-url="${escapeHtml(href)}" title="Click to open">${escapeHtml(url)}</a>`);

    lastIndex = match.index + url.length;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)));
  }

  return parts.join('');
}

// Show the details in display mode with clickable links
function showDetailsDisplayMode() {
  if (!elements.modalDetails || !elements.modalDetailsDisplay) return;

  const text = elements.modalDetails.value;

  // Linkify URLs (this also escapes text) and convert newlines to <br>
  const htmlText = linkifyText(text).replace(/\n/g, '<br>');

  elements.modalDetailsDisplay.innerHTML = htmlText || '<span class="placeholder-text">No details</span>';
  elements.modalDetailsDisplay.style.display = 'block';
  elements.modalDetails.style.display = 'none';

  // Add click handlers to all links
  elements.modalDetailsDisplay.querySelectorAll('.task-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent switching to edit mode

      const url = e.currentTarget.dataset.url;
      if (url) {
        try {
          await window.electronAPI.openExternal(url);
        } catch (error) {
          console.error('Error opening link:', error);
        }
      }
    });
  });
}

// Show the details in edit mode (textarea)
function showDetailsEditMode() {
  if (!elements.modalDetails || !elements.modalDetailsDisplay) return;

  elements.modalDetailsDisplay.style.display = 'none';
  elements.modalDetails.style.display = 'block';
  elements.modalDetails.focus();
}

function openTaskModal(task) {
  state.editingTask = task;

  // Populate modal fields
  elements.modalTitle.value = task.title;
  elements.modalDetails.value = task.body || '';
  elements.modalPriority.value = task.priority || 'normal';
  elements.modalDueDate.value = task.dueDate || '';

  // Show details in display mode with clickable links
  showDetailsDisplayMode();

  // Populate status dropdown and select current status
  if (elements.modalStatus) {
    elements.modalStatus.innerHTML = state.taskStatuses.map(status => `
      <option value="${escapeHtml(status)}">${escapeHtml(status)}</option>
    `).join('');
    elements.modalStatus.value = task.status || 'Pending';
  }

  // Format created date for display
  const createdDate = new Date(task.created);
  elements.modalCreated.value = createdDate.toLocaleString();

  // Show/hide parent task field
  if (task.parentId) {
    const parentTask = findTaskById(state.tasks, task.parentId);
    if (parentTask) {
      elements.modalParent.textContent = parentTask.title;
      elements.modalParent.dataset.parentId = parentTask.id;
      elements.modalParentContainer.style.display = 'block';
    } else {
      elements.modalParentContainer.style.display = 'none';
    }
  } else {
    elements.modalParentContainer.style.display = 'none';
  }

  // Show/hide undelete button based on deleted status
  if (task.deleted) {
    elements.modalUndeleteBtn.style.display = 'block';
  } else {
    elements.modalUndeleteBtn.style.display = 'none';
  }

  // Show modal
  elements.taskModal.classList.add('active');

  // Setup status sync handlers
  setupModalStatusSync();
}

function setupModalStatusSync() {
  // Remove any existing listeners by cloning the status dropdown
  const newStatusDropdown = elements.modalStatus.cloneNode(true);
  elements.modalStatus.parentNode.replaceChild(newStatusDropdown, elements.modalStatus);
  elements.modalStatus = newStatusDropdown;

  // Populate status dropdown again after cloning
  elements.modalStatus.innerHTML = state.taskStatuses.map(status => `
    <option value="${escapeHtml(status)}">${escapeHtml(status)}</option>
  `).join('');
  elements.modalStatus.value = state.editingTask.status || 'Pending';
}

function closeTaskModal() {
  state.editingTask = null;
  elements.taskModal.classList.remove('active');

  // Clear form
  elements.modalTitle.value = '';
  elements.modalDetails.value = '';
  elements.modalPriority.value = 'normal';
  elements.modalDueDate.value = '';
  elements.modalCreated.value = '';
  elements.modalParent.textContent = '';
  delete elements.modalParent.dataset.parentId;
  elements.modalParentContainer.style.display = 'none';
  if (elements.modalStatus) {
    elements.modalStatus.value = 'Pending';
  }
}

async function saveTaskModal() {
  if (!state.editingTask) return;

  const updates = {
    title: elements.modalTitle.value.trim(),
    body: elements.modalDetails.value.trim(),
    priority: elements.modalPriority.value,
    dueDate: elements.modalDueDate.value || null,
    status: elements.modalStatus ? elements.modalStatus.value : 'Pending'
  };

  try {
    const result = await window.electronAPI.tasks.update(
      state.editingTask.filePath,
      updates
    );

    if (result.success) {
      closeTaskModal();
      await loadTasks();

      // Commit to git if version control is enabled
      await commitTaskChange(`Update task: ${updates.title}`);
    } else {
      console.error('Failed to update task:', result.error);
      alert('Failed to save task: ' + result.error);
    }
  } catch (error) {
    console.error('Error saving task:', error);
    alert('Error saving task: ' + error.message);
  }
}

// ========================================
// Move Task Modal
// ========================================
function openMoveTaskModal(task) {
  if (!task) return;

  state.movingTask = task;
  state.moveSelectedParent = null;

  // Populate folder dropdown
  elements.moveFolderSelect.innerHTML = state.taskFolders
    .filter(f => !f.deleted) // Don't show deleted folder as destination
    .map(folder => {
      const isCurrent = folder.id === state.currentFolderId;
      return `<option value="${folder.id}" ${isCurrent ? 'selected' : ''}>${escapeHtml(folder.name)}</option>`;
    })
    .join('');

  // Load tasks for the selected folder
  updateMoveTaskTree();

  // Show modal
  elements.moveTaskModal.classList.add('active');

  // Handle folder selection change
  const folderChangeHandler = () => updateMoveTaskTree();
  elements.moveFolderSelect.removeEventListener('change', folderChangeHandler);
  elements.moveFolderSelect.addEventListener('change', folderChangeHandler);
}

function closeMoveTaskModal() {
  state.movingTask = null;
  state.moveSelectedParent = null;
  elements.moveTaskModal.classList.remove('active');
  elements.moveTaskTree.innerHTML = '';
}

async function updateMoveTaskTree() {
  const selectedFolderId = elements.moveFolderSelect.value;

  // Load tasks from the selected folder
  const folder = state.taskFolders.find(f => f.id === selectedFolderId);
  if (!folder) {
    elements.moveTaskTree.innerHTML = '<p style="color: var(--text-secondary); padding: 0.5rem;">Folder not found</p>';
    return;
  }

  try {
    const result = await window.electronAPI.tasks.load(folder.path);
    if (!result.success) {
      elements.moveTaskTree.innerHTML = `<p style="color: var(--danger); padding: 0.5rem;">Error: ${result.error}</p>`;
      return;
    }

    const tasks = result.tasks || [];

    if (tasks.length === 0) {
      elements.moveTaskTree.innerHTML = '<p style="color: var(--text-secondary); padding: 0.5rem;">No tasks in this folder. Task will be moved to the root.</p>';
      return;
    }

    // Render task tree
    elements.moveTaskTree.innerHTML = renderMoveTaskTree(tasks, state.movingTask);
  } catch (error) {
    console.error('Error loading move task tree:', error);
    elements.moveTaskTree.innerHTML = `<p style="color: var(--danger); padding: 0.5rem;">Error: ${error.message}</p>`;
  }
}

function renderMoveTaskTree(tasks, movingTask, level = 0) {
  return tasks.map(task => {
    // Disable the task being moved and all its descendants
    const isMovingTask = task.filePath === movingTask.filePath;
    const isDescendant = task.filePath.startsWith(movingTask.filePath.replace('.md', '/'));
    const isDisabled = isMovingTask || isDescendant;

    const hasChildren = task.children && task.children.length > 0;
    const itemClass = `move-task-item ${isDisabled ? 'disabled' : ''} ${state.moveSelectedParent === task.filePath ? 'selected' : ''}`;

    let html = `
      <div>
        <div class="${itemClass}" data-task-path="${escapeHtml(task.filePath)}" ${!isDisabled ? `onclick="selectMoveParent('${escapeHtml(task.filePath)}', event)"` : ''}>
          <span class="move-task-expand">${hasChildren ? '▶' : ' '}</span>
          <span class="move-task-text">${escapeHtml(task.title)}</span>
        </div>`;

    if (hasChildren) {
      html += `<div class="move-task-children">
        ${renderMoveTaskTree(task.children, movingTask, level + 1)}
      </div>`;
    }

    html += '</div>';
    return html;
  }).join('');
}

// Global function to handle parent selection (called from onclick)
window.selectMoveParent = function(taskPath, event) {
  if (event) event.stopPropagation();

  // Toggle selection
  if (state.moveSelectedParent === taskPath) {
    state.moveSelectedParent = null;
  } else {
    state.moveSelectedParent = taskPath;
  }

  // Update UI
  elements.moveTaskTree.querySelectorAll('.move-task-item').forEach(item => {
    item.classList.remove('selected');
  });

  if (state.moveSelectedParent) {
    const selectedItem = elements.moveTaskTree.querySelector(`[data-task-path="${state.moveSelectedParent}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }
};

async function confirmMoveTask() {
  if (!state.movingTask) return;

  const destinationFolderId = elements.moveFolderSelect.value;
  const destinationParentPath = state.moveSelectedParent || null;

  // Save task info before we clear state
  const taskTitle = state.movingTask.title;
  const taskFilePath = state.movingTask.filePath;

  // Confirm if moving to the same folder
  if (destinationFolderId === state.currentFolderId && !destinationParentPath) {
    alert('Task is already in this folder at the root level.');
    return;
  }

  try {
    const result = await window.electronAPI.tasks.moveToFolder(
      taskFilePath,
      destinationFolderId,
      destinationParentPath
    );

    if (result.success) {
      closeMoveTaskModal();
      closeTaskModal(); // Close the task details modal too
      await loadTasks(); // Reload tasks

      // Commit to git if version control is enabled
      const destFolder = state.taskFolders.find(f => f.id === destinationFolderId);
      await commitTaskChange(`Move task: ${taskTitle} to ${destFolder?.name || 'folder'}`);

      // Show success message
      console.log(`Task moved successfully to ${destFolder?.name || 'folder'}`);
    } else {
      console.error('Failed to move task:', result.error);
      alert('Failed to move task: ' + result.error);
    }
  } catch (error) {
    console.error('Error moving task:', error);
    alert('Error moving task: ' + error.message);
  }
}

// ========================================
// Task Filtering
// ========================================
function toggleFilterDropdown() {
  const isActive = elements.filterMenu.classList.toggle('active');
  elements.filterToggleBtn.classList.toggle('active', isActive);
}

function toggleFilterMenu() {
  const isActive = elements.filterMenu.classList.contains('active');

  if (isActive) {
    // Close the menu
    closeFilterMenu();
  } else {
    // Open the menu
    elements.filterMenu.classList.add('active');
    elements.filterToggleBtn.classList.add('active');

    // Focus on first checkbox after a small delay to ensure menu is visible
    setTimeout(() => {
      const firstCheckbox = elements.filterMenu.querySelector('input[type="checkbox"]');
      if (firstCheckbox) {
        firstCheckbox.focus();
      }
    }, 10);
  }
}

function closeFilterMenu() {
  elements.filterMenu.classList.remove('active');
  elements.filterToggleBtn.classList.remove('active');
}

function handleFilterChange(e) {
  if (!e.target.matches('input[type="checkbox"]')) return;

  const filterValue = e.target.value;
  const isChecked = e.target.checked;

  if (filterValue === 'all') {
    // If 'All' is checked, uncheck everything else
    if (isChecked) {
      state.activeFilters.clear();
      state.activeFilters.add('all');
      // Uncheck all other checkboxes
      elements.filterMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.value !== 'all') cb.checked = false;
      });
    }
  } else {
    // If any other filter is checked, uncheck 'All'
    if (isChecked) {
      state.activeFilters.delete('all');
      elements.filterMenu.querySelector('input[value="all"]').checked = false;
      state.activeFilters.add(filterValue);
    } else {
      state.activeFilters.delete(filterValue);
      // If no filters are selected, default to 'All'
      if (state.activeFilters.size === 0) {
        state.activeFilters.add('all');
        elements.filterMenu.querySelector('input[value="all"]').checked = true;
      }
    }
  }

  updateFilterLabel();
  renderTasks();
  saveAllSettings();
}

function updateFilterLabel() {
  if (state.activeFilters.has('all') || state.activeFilters.size === 0) {
    elements.filterLabel.textContent = 'Filters';
  } else {
    const count = state.activeFilters.size;
    elements.filterLabel.textContent = `Filters (${count})`;
  }
}

function countDeletedTasks(tasks) {
  let count = 0;

  const countDeleted = (taskList) => {
    for (const task of taskList) {
      if (task.deleted) {
        count++;
      }
      if (task.children && task.children.length > 0) {
        countDeleted(task.children);
      }
    }
  };

  countDeleted(tasks);
  return count;
}

function updateDeletedCount() {
  if (!elements.deletedCount) return;

  const count = countDeletedTasks(state.tasks);
  if (count > 0) {
    elements.deletedCount.textContent = `(${count})`;
  } else {
    elements.deletedCount.textContent = '';
  }
}

// ========================================
// Task Sorting
// ========================================
function toggleSortDropdown() {
  const isActive = elements.sortMenu.classList.toggle('active');
  elements.sortToggleBtn.classList.toggle('active', isActive);
}

function toggleSortMenu() {
  const isActive = elements.sortMenu.classList.contains('active');

  if (isActive) {
    // Close the menu
    closeSortMenu();
  } else {
    // Open the menu
    elements.sortMenu.classList.add('active');
    elements.sortToggleBtn.classList.add('active');

    // Focus on first radio button after a small delay to ensure menu is visible
    setTimeout(() => {
      const firstRadio = elements.sortMenu.querySelector('input[type="radio"]');
      if (firstRadio) {
        firstRadio.focus();
      }
    }, 10);
  }
}

function closeSortMenu() {
  elements.sortMenu.classList.remove('active');
  elements.sortToggleBtn.classList.remove('active');
}

function handleSortChange(e) {
  if (!e.target.matches('input[type="radio"]')) return;

  const sortValue = e.target.value;
  state.sortOrder = sortValue;

  renderTasks();
  saveAllSettings();
}

function matchesFilters(task) {
  // If 'all' is selected or no filters, show all tasks EXCEPT deleted
  if (state.activeFilters.has('all') || state.activeFilters.size === 0) {
    return !task.deleted;
  }

  let matches = false;

  // Check each active filter
  for (const filter of state.activeFilters) {
    switch (filter) {
      case 'deleted':
        if (task.deleted) matches = true;
        break;

      case 'high-priority':
        if (task.priority === 'high' && !task.deleted) matches = true;
        break;

      case 'complete':
        if (task.completed && !task.deleted) matches = true;
        break;

      case 'not-complete':
        if (!task.completed && !task.deleted) matches = true;
        break;

      case 'past-due':
        if (task.dueDate && new Date(task.dueDate) < new Date() && !task.deleted) {
          matches = true;
        }
        break;

      case 'due-soon':
        if (task.dueDate && !task.deleted) {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);

          const threeDaysFromNow = new Date(today);
          threeDaysFromNow.setDate(today.getDate() + 3);

          // Include both past-due AND due within 3 days
          if (dueDate < today || (dueDate >= today && dueDate <= threeDaysFromNow)) {
            matches = true;
          }
        }
        break;

      case 'with-due-date':
        if (task.dueDate && task.dueDate.trim() && !task.deleted) {
          matches = true;
        }
        break;
    }
  }

  return matches;
}

function sortTasks(tasks) {
  // Create a copy to avoid mutating original
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    if (state.sortOrder === 'priority') {
      // High priority first
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
    } else if (state.sortOrder === 'due-date') {
      // Sort by due date (earliest first), nulls last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (state.sortOrder === 'created') {
      // Sort by creation date (oldest first)
      return new Date(a.created) - new Date(b.created);
    } else {
      // Default: priority -> due date -> creation date
      // First by priority
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;

      // Then by due date (earliest first)
      if (!a.dueDate && !b.dueDate) {
        // Both have no due date, sort by creation date
        return new Date(a.created) - new Date(b.created);
      }
      if (!a.dueDate) return 1; // a has no due date, put it after
      if (!b.dueDate) return -1; // b has no due date, put it after

      const dueDateDiff = new Date(a.dueDate) - new Date(b.dueDate);
      if (dueDateDiff !== 0) return dueDateDiff;

      // If due dates are equal, sort by creation date
      return new Date(a.created) - new Date(b.created);
    }
  });

  // Recursively sort children
  return sorted.map(task => ({
    ...task,
    children: task.children && task.children.length > 0 ? sortTasks(task.children) : task.children
  }));
}

function filterTasks(tasks) {
  return tasks.map(task => {
    // Check if this task matches filters
    const taskMatches = matchesFilters(task);

    // Recursively filter children
    const filteredChildren = task.children && task.children.length > 0
      ? filterTasks(task.children)
      : [];

    // Include task if it matches OR if any of its children match
    if (taskMatches || filteredChildren.length > 0) {
      return {
        ...task,
        children: filteredChildren
      };
    }

    return null;
  }).filter(task => task !== null);
}

// ========================================
// Task Rendering
// ========================================
function renderTasks() {
  if (state.taskViewMode === 'kanban') {
    renderTasksKanban();
  } else {
    renderTasksList();
  }

  // Restore selected task highlight after re-render
  updateSelectedTaskHighlight();

  // Auto-select first task if nothing is selected (only in tasks view)
  if (state.currentView === 'tasks' && state.selectedTaskPaths.length === 0) {
    const taskElements = getVisibleTaskElements();
    if (taskElements.length > 0) {
      selectTask(taskElements[0].dataset.taskPath);
    }
  }
}

// ========================================
// Keyboard Navigation
// ========================================
function updateSelectedTaskHighlight() {
  // Remove previous selection
  document.querySelectorAll('.task-item.selected, .kanban-card.selected').forEach(el => {
    el.classList.remove('selected');
  });

  // Add selection to all selected tasks
  if (state.selectedTaskPaths.length > 0) {
    state.selectedTaskPaths.forEach(taskPath => {
      // Escape backslashes for CSS selector (Windows paths need \\ in selectors)
      const escapedPath = taskPath.replace(/\\/g, '\\\\');

      const selector = state.taskViewMode === 'kanban'
        ? `.kanban-card[data-task-path="${escapedPath}"]`
        : `.task-item[data-task-path="${escapedPath}"]`;

      const element = document.querySelector(selector);

      if (element) {
        element.classList.add('selected');
      }
    });

    // Scroll to the last selected task
    if (state.lastSelectedTaskPath) {
      const escapedPath = state.lastSelectedTaskPath.replace(/\\/g, '\\\\');
      const selector = state.taskViewMode === 'kanban'
        ? `.kanban-card[data-task-path="${escapedPath}"]`
        : `.task-item[data-task-path="${escapedPath}"]`;
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }
}

function getVisibleTaskElements() {
  if (state.taskViewMode === 'kanban') {
    return Array.from(document.querySelectorAll('.kanban-card'));
  } else {
    return Array.from(document.querySelectorAll('.task-item'));
  }
}

function selectTask(taskPath, options = {}) {
  const { ctrlKey = false, shiftKey = false, clearSelection = false } = options;

  if (clearSelection) {
    // Clear all selections
    state.selectedTaskPaths = [];
    state.lastSelectedTaskPath = null;
    updateSelectedTaskHighlight();
    return;
  }

  if (ctrlKey) {
    // Ctrl-Click: Toggle selection
    const index = state.selectedTaskPaths.indexOf(taskPath);
    if (index > -1) {
      // Deselect
      state.selectedTaskPaths.splice(index, 1);
      if (state.lastSelectedTaskPath === taskPath) {
        state.lastSelectedTaskPath = state.selectedTaskPaths[state.selectedTaskPaths.length - 1] || null;
      }
    } else {
      // Select
      state.selectedTaskPaths.push(taskPath);
      state.lastSelectedTaskPath = taskPath;
    }
  } else if (shiftKey && state.lastSelectedTaskPath) {
    // Shift-Click: Select range from last selected to current
    const taskElements = getVisibleTaskElements();
    const startIndex = taskElements.findIndex(el => el.dataset.taskPath === state.lastSelectedTaskPath);
    const endIndex = taskElements.findIndex(el => el.dataset.taskPath === taskPath);

    if (startIndex !== -1 && endIndex !== -1) {
      // Clear current selection
      state.selectedTaskPaths = [];

      // Select range
      const min = Math.min(startIndex, endIndex);
      const max = Math.max(startIndex, endIndex);

      for (let i = min; i <= max; i++) {
        const path = taskElements[i].dataset.taskPath;
        if (!state.selectedTaskPaths.includes(path)) {
          state.selectedTaskPaths.push(path);
        }
      }

      state.lastSelectedTaskPath = taskPath;
    }
  } else {
    // Normal click: Select only this task
    state.selectedTaskPaths = [taskPath];
    state.lastSelectedTaskPath = taskPath;
  }

  updateSelectedTaskHighlight();
}

function navigateTasksVertical(direction, shiftKey = false) {
  const taskElements = getVisibleTaskElements();

  if (taskElements.length === 0) return;

  let currentIndex = -1;
  if (state.lastSelectedTaskPath) {
    currentIndex = taskElements.findIndex(el => el.dataset.taskPath === state.lastSelectedTaskPath);
  }

  let newIndex;
  if (direction === 'down') {
    newIndex = currentIndex < taskElements.length - 1 ? currentIndex + 1 : 0;
  } else {
    newIndex = currentIndex > 0 ? currentIndex - 1 : taskElements.length - 1;
  }

  if (taskElements[newIndex]) {
    const newTaskPath = taskElements[newIndex].dataset.taskPath;

    if (shiftKey && state.lastSelectedTaskPath) {
      // Extend selection: add the new task to selection
      if (!state.selectedTaskPaths.includes(newTaskPath)) {
        state.selectedTaskPaths.push(newTaskPath);
      }
      state.lastSelectedTaskPath = newTaskPath;
      updateSelectedTaskHighlight();
    } else {
      // Normal navigation: clear and select single task
      selectTask(newTaskPath);
    }
  }
}

function navigateTasksHorizontal(direction, shiftKey = false) {
  // Only for kanban view
  if (state.taskViewMode !== 'kanban') return;

  const taskElements = getVisibleTaskElements();
  if (taskElements.length === 0) return;

  let currentIndex = -1;
  if (state.lastSelectedTaskPath) {
    currentIndex = taskElements.findIndex(el => el.dataset.taskPath === state.lastSelectedTaskPath);
  }

  if (currentIndex === -1) {
    selectTask(taskElements[0].dataset.taskPath);
    return;
  }

  const currentElement = taskElements[currentIndex];
  const currentColumn = currentElement.closest('.kanban-column');
  if (!currentColumn) return;

  // Get position in current column
  const cardsInColumn = Array.from(currentColumn.querySelectorAll('.kanban-card'));
  const positionInColumn = cardsInColumn.indexOf(currentElement);

  // Find adjacent column
  const allColumns = Array.from(document.querySelectorAll('.kanban-column'));
  const currentColumnIndex = allColumns.indexOf(currentColumn);

  let targetColumn;
  if (direction === 'right') {
    targetColumn = allColumns[currentColumnIndex + 1];
  } else {
    targetColumn = allColumns[currentColumnIndex - 1];
  }

  if (targetColumn) {
    const targetCards = Array.from(targetColumn.querySelectorAll('.kanban-card'));
    if (targetCards.length > 0) {
      // Try to maintain same position, or select last card if column is shorter
      const targetCard = targetCards[Math.min(positionInColumn, targetCards.length - 1)];
      const newTaskPath = targetCard.dataset.taskPath;

      if (shiftKey && state.lastSelectedTaskPath) {
        // Extend selection: add the new task to selection
        if (!state.selectedTaskPaths.includes(newTaskPath)) {
          state.selectedTaskPaths.push(newTaskPath);
        }
        state.lastSelectedTaskPath = newTaskPath;
        updateSelectedTaskHighlight();
      } else {
        // Normal navigation: clear and select single task
        selectTask(newTaskPath);
      }
    }
  }
}

function handleTaskKeyboardAction(action) {
  if (state.selectedTaskPaths.length === 0) return;

  switch (action) {
    case 'toggle':
      // Spacebar: toggle completed state for last selected task
      if (state.lastSelectedTaskPath) {
        const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
        if (task) {
          toggleTask(state.lastSelectedTaskPath, task.completed);
        }
      }
      break;

    case 'expand':
      // Right arrow: expand last selected task if has children
      if (state.lastSelectedTaskPath) {
        const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
        if (task && task.children && task.children.length > 0) {
          if (!state.expandedTasks.has(task.id)) {
            toggleExpanded(task.id);
          }
        }
      }
      break;

    case 'collapse':
      // Left arrow: collapse last selected task if has children
      if (state.lastSelectedTaskPath) {
        const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
        if (task && task.children && task.children.length > 0) {
          if (state.expandedTasks.has(task.id)) {
            toggleExpanded(task.id);
          }
        }
      }
      break;

    case 'open':
      // Enter: open detail dialog for last selected task
      if (state.lastSelectedTaskPath) {
        const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
        if (task) {
          openTaskModal(task);
        }
      }
      break;

    case 'delete':
      // Del: soft delete all selected tasks
      for (const taskPath of [...state.selectedTaskPaths]) {
        const task = findTaskByPath(state.tasks, taskPath);
        if (task) {
          deleteTask(taskPath, task.deleted, false);
        }
      }
      break;

    case 'nuclear-delete':
      // Ctrl+Del: nuclear delete all selected tasks
      for (const taskPath of [...state.selectedTaskPaths]) {
        const task = findTaskByPath(state.tasks, taskPath);
        if (task) {
          deleteTask(taskPath, task.deleted, true);
        }
      }
      break;
  }
}

function renderTasksList() {
  // Show list view, hide kanban view
  if (elements.taskContainer.parentElement) {
    elements.taskContainer.parentElement.style.display = 'block';
  }
  if (elements.kanbanBoard) {
    elements.kanbanBoard.style.display = 'none';
  }

  if (state.tasks.length === 0) {
    elements.taskContainer.innerHTML = '<p class="empty-state">No tasks yet. Add one above!</p>';
    updateExpandCollapseButton();
    return;
  }

  // Apply sorting then filtering
  const sortedTasks = sortTasks(state.tasks);
  const filteredTasks = filterTasks(sortedTasks);

  if (filteredTasks.length === 0) {
    elements.taskContainer.innerHTML = '<p class="empty-state">No tasks match the current filters.</p>';
    updateExpandCollapseButton();
    return;
  }

  elements.taskContainer.innerHTML = renderTaskList(filteredTasks, 0);
  updateExpandCollapseButton();
}

function renderTasksKanban() {
  // Hide list view, show kanban view
  if (elements.taskContainer.parentElement) {
    elements.taskContainer.parentElement.style.display = 'none';
  }
  if (elements.kanbanBoard) {
    elements.kanbanBoard.style.display = 'flex';
  }

  // Hide expand/collapse button in kanban view
  if (elements.expandCollapseBtn) {
    elements.expandCollapseBtn.style.display = 'none';
  }

  if (state.tasks.length === 0) {
    elements.kanbanBoard.innerHTML = '<p class="empty-state">No tasks yet. Add one above!</p>';
    return;
  }

  // Apply sorting then filtering
  const sortedTasks = sortTasks(state.tasks);
  const filteredTasks = filterTasks(sortedTasks);

  // Group tasks by status
  const tasksByStatus = {};
  state.taskStatuses.forEach(status => {
    tasksByStatus[status] = [];
  });

  // Flatten tasks (ignore hierarchy in kanban view) and group by status
  const flattenTasks = (tasks) => {
    tasks.forEach(task => {
      const taskStatus = task.status || 'Pending';
      if (tasksByStatus[taskStatus]) {
        tasksByStatus[taskStatus].push(task);
      }
      if (task.children && task.children.length > 0) {
        flattenTasks(task.children);
      }
    });
  };

  flattenTasks(filteredTasks);

  // Render kanban columns
  let html = '';
  state.taskStatuses.forEach(status => {
    const tasks = tasksByStatus[status] || [];
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');

    html += `
      <div class="kanban-column" data-status="${escapeHtml(status)}">
        <div class="kanban-column-header">
          <h3>${escapeHtml(status)}</h3>
          <span class="kanban-column-count">${tasks.length}</span>
        </div>
        <div class="kanban-column-content" data-status="${escapeHtml(status)}">
          ${tasks.length === 0 ? '<p class="kanban-empty-state">No tasks</p>' : tasks.map(task => renderKanbanCard(task)).join('')}
        </div>
      </div>
    `;
  });

  elements.kanbanBoard.innerHTML = html;

  // Setup drag and drop for kanban cards
  setupKanbanDragAndDrop();
}

function renderKanbanCard(task) {
  const priorityIcon = task.priority === 'high' ? '⚠' : '○';
  const priorityClass = task.priority === 'high' ? 'priority-high' : 'priority-normal';
  const isDeleted = task.deleted || false;

  // Format dates
  const hasDueDate = task.dueDate && task.dueDate.trim();
  let dateInfo = '';
  let isPastDue = false;
  if (hasDueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    isPastDue = dueDate < today && !task.completed;
    const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateInfo = `<span class="kanban-card-date ${isPastDue ? 'past-due' : ''}">${formattedDate}</span>`;
  }

  return `
    <div class="kanban-card ${task.completed ? 'completed' : ''}"
         data-task-id="${task.id}"
         data-task-path="${escapeHtml(task.filePath)}"
         data-task-status="${escapeHtml(task.status || 'Pending')}"
         draggable="true">
      <div class="kanban-card-header">
        <span class="task-priority ${priorityClass}">${priorityIcon}</span>
        <span class="kanban-card-title">${escapeHtml(task.title)}</span>
      </div>
      ${dateInfo}
      ${task.body ? `<div class="kanban-card-description">${linkifyText(task.body.substring(0, 100))}${task.body.length > 100 ? '...' : ''}</div>` : ''}
    </div>
  `;
}

function renderTaskList(tasks, level) {
  return tasks.map(task => {
    const isExpanded = state.expandedTasks.has(task.id);
    const hasChildren = task.children && task.children.length > 0;
    const indent = level * 16;
    const priorityIcon = task.priority === 'high' ? '⚠' : '○';
    const priorityClass = task.priority === 'high' ? 'priority-high' : 'priority-normal';
    const isDeleted = task.deleted || false;

    // Format dates for tooltip
    const hasDueDate = task.dueDate && task.dueDate.trim();
    let dateTooltip = '';
    let isPastDue = false;
    if (hasDueDate) {
      const createdDate = new Date(task.created);
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
      dueDate.setHours(0, 0, 0, 0);

      isPastDue = dueDate < today && !task.completed;
      dateTooltip = `Due: ${dueDate.toLocaleDateString()}\nCreated: ${createdDate.toLocaleDateString()}`;
    }

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}"
           data-task-id="${task.id}"
           data-task-path="${escapeHtml(task.filePath)}"
           data-task-completed="${task.completed}"
           data-task-deleted="${isDeleted}"
           data-level="${level}"
           draggable="true"
           style="margin-left: ${indent}px;">
        <div class="task-content">
          ${hasChildren ? `
            <button class="task-expand-btn" data-task-id="${task.id}">
              ${isExpanded ? '▼' : '▶'}
            </button>
          ` : '<span class="task-expand-spacer"></span>'}

          <span class="task-priority ${priorityClass}" title="${task.priority === 'high' ? 'High Priority' : 'Normal Priority'}">${priorityIcon}</span>

          <input type="checkbox"
                 class="task-checkbox"
                 ${task.completed ? 'checked' : ''}>

          <span class="task-text">${escapeHtml(task.title)}</span>

          ${hasChildren ? `<span class="task-child-count">(${task.children.length})</span>` : ''}

          ${task.status ? `<span class="task-status-badge status-${task.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(task.status)}</span>` : ''}

          ${hasDueDate ? `<span class="task-date-indicator ${isPastDue ? 'past-due' : ''} material-icons" title="${escapeHtml(dateTooltip)}">event</span>` : ''}
        </div>

        <div class="task-actions">
          ${isDeleted ? '<button class="task-restore" title="Restore task">+</button>' : ''}
          <button class="task-delete" title="${isDeleted ? 'Permanently delete task' : 'Delete task (Ctrl+click to permanently delete)'}">
            <span class="material-icons task-delete-icon">delete</span>
            <span class="material-icons task-delete-icon-permanent">delete_forever</span>
          </button>
        </div>
      </div>
      ${hasChildren && isExpanded ? renderTaskList(task.children, level + 1) : ''}
    `.trim();
  }).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Drag and Drop
// ========================================
function setupDragAndDrop() {
  elements.taskContainer.addEventListener('dragstart', handleDragStart);
  elements.taskContainer.addEventListener('dragover', handleDragOver);
  elements.taskContainer.addEventListener('drop', handleDrop);
  elements.taskContainer.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(e) {
  const taskItem = e.target.closest('.task-item');
  if (!taskItem) return;

  state.draggedTask = {
    path: taskItem.dataset.taskPath,
    id: parseInt(taskItem.dataset.taskId),
    level: parseInt(taskItem.dataset.level)
  };

  taskItem.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const taskItem = e.target.closest('.task-item');
  if (!taskItem || !state.draggedTask) return;

  // Don't allow dropping on itself
  if (taskItem.dataset.taskPath === state.draggedTask.path) {
    return;
  }

  // Highlight drop target
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('drop-target', 'drop-above', 'drop-below');
  });

  const rect = taskItem.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;

  if (e.clientY < midpoint) {
    taskItem.classList.add('drop-above');
  } else {
    taskItem.classList.add('drop-below');
  }
}

async function handleDrop(e) {
  e.preventDefault();

  const taskItem = e.target.closest('.task-item');
  if (!taskItem || !state.draggedTask) return;

  const targetPath = taskItem.dataset.taskPath;

  if (targetPath === state.draggedTask.path) {
    return; // Can't drop on itself
  }

  // Get task info before moving for commit message
  const draggedTask = findTaskByPath(state.tasks, state.draggedTask.path);
  const targetTask = findTaskByPath(state.tasks, targetPath);
  const draggedTitle = draggedTask ? draggedTask.title : 'Unknown task';
  const targetTitle = targetTask ? targetTask.title : 'Unknown task';

  const rect = taskItem.getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;

  try {
    if (e.clientY < midpoint) {
      // Drop above - move to same level as target, then reorder
      const moveResult = await window.electronAPI.tasks.moveToSibling(
        state.draggedTask.path,
        targetPath
      );

      if (moveResult.success) {
        // Now reorder within the new parent
        await reorderTasks(moveResult.newPath, targetPath);

        // Commit to git asynchronously (fire-and-forget, don't block UI)
        commitTaskChange(`Move task "${draggedTitle}" to sibling of "${targetTitle}"`).catch(err => {
          console.error('Error committing task change:', err);
        });
      }
    } else {
      // Drop below - make it a child
      const result = await window.electronAPI.tasks.moveToParent(
        state.draggedTask.path,
        targetPath
      );

      if (result.success) {
        // Automatically expand the parent to show the new child
        const targetId = parseInt(taskItem.dataset.taskId);
        state.expandedTasks.add(targetId);
        await loadTasks();

        // Commit to git asynchronously (fire-and-forget, don't block UI)
        commitTaskChange(`Move task "${draggedTitle}" to child of "${targetTitle}"`).catch(err => {
          console.error('Error committing task change:', err);
        });
      }
    }
  } catch (error) {
    console.error('Error during drop:', error);
  }

  // Clear highlights
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('drop-target', 'drop-above', 'drop-below');
  });
}

async function reorderTasks(draggedPath, targetPath) {
  // Get parent directory and filenames
  const draggedParts = draggedPath.split(/[/\\]/);
  const targetParts = targetPath.split(/[/\\]/);

  const draggedFilename = draggedParts[draggedParts.length - 1];
  const targetFilename = targetParts[targetParts.length - 1];

  const draggedParent = draggedParts.slice(0, -1).join('/');
  const targetParent = targetParts.slice(0, -1).join('/');

  // Only reorder if they're in the same parent
  if (draggedParent !== targetParent) {
    console.log('Cannot reorder - tasks in different parents');
    return;
  }

  // Find all tasks at this level
  const parentTasks = findTasksAtPath(state.tasks, draggedParent);
  if (!parentTasks) return;

  // Get current order
  const currentOrder = parentTasks.map(t => {
    const parts = t.filePath.split(/[/\\]/);
    return parts[parts.length - 1];
  });

  // Remove dragged task from current position
  const draggedIndex = currentOrder.indexOf(draggedFilename);
  if (draggedIndex === -1) return;

  currentOrder.splice(draggedIndex, 1);

  // Insert before target
  const targetIndex = currentOrder.indexOf(targetFilename);
  if (targetIndex === -1) return;

  currentOrder.splice(targetIndex, 0, draggedFilename);

  // Call reorder API
  const result = await window.electronAPI.tasks.reorder(draggedParent, currentOrder);

  if (result.success) {
    await loadTasks();
  }
}

function findTasksAtPath(tasks, parentPath) {
  // If parentPath is the root tasks path, return root tasks
  if (parentPath === state.tasksPath) {
    return tasks;
  }

  // Otherwise search recursively
  for (const task of tasks) {
    const taskDir = task.filePath.replace('.md', '');
    if (taskDir === parentPath && task.children) {
      return task.children;
    }
    if (task.children && task.children.length > 0) {
      const found = findTasksAtPath(task.children, parentPath);
      if (found) return found;
    }
  }

  return null;
}

function handleDragEnd(e) {
  const taskItem = e.target.closest('.task-item');
  if (taskItem) {
    taskItem.classList.remove('dragging');
  }

  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('drop-target', 'drop-above', 'drop-below');
  });

  state.draggedTask = null;
}

// ========================================
// Profile Stats
// ========================================
async function updateProfileStats() {
  // Aggregate stats across all folders
  let totalCount = 0;
  let completedCount = 0;

  for (const folder of state.taskFolders) {
    try {
      // Initialize and load tasks from this folder
      const initResult = await window.electronAPI.tasks.initialize(folder.path);
      if (initResult.success) {
        const loadResult = await window.electronAPI.tasks.load();
        if (loadResult.success) {
          const stats = countTasks(loadResult.tasks);
          totalCount += stats.total;
          completedCount += stats.completed;
        }
      }
    } catch (error) {
      console.error(`Error loading stats for folder ${folder.name}:`, error);
    }
  }

  elements.statTotal.textContent = totalCount;
  elements.statCompleted.textContent = completedCount;
  elements.statPending.textContent = totalCount - completedCount;

  // Restore the current folder
  const currentFolder = getCurrentFolder();
  if (currentFolder) {
    await window.electronAPI.tasks.initialize(currentFolder.path);
  }
}

function countTasks(tasks) {
  let total = 0;
  let completed = 0;

  const count = (taskList) => {
    for (const task of taskList) {
      // Don't count deleted tasks in stats
      if (!task.deleted) {
        total++;
        if (task.completed) {
          completed++;
        }
      }
      if (task.children && task.children.length > 0) {
        count(task.children);
      }
    }
  };

  count(tasks);

  return {
    total,
    completed,
    pending: total - completed
  };
}

// ========================================
// Auto-Launch Management
// ========================================
async function handleAutoLaunchChange(event) {
  const isEnabled = event.target.checked;
  state.autoLaunch = isEnabled;

  try {
    // Save the setting
    await saveAllSettings();

    // Update the system auto-launch setting
    if (window.electronAPI.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(isEnabled, state.startMinimized);
      if (!result.success) {
        console.error('Failed to update auto-launch:', result.error);
        // Revert checkbox on failure
        elements.autoLaunchCheckbox.checked = !isEnabled;
        state.autoLaunch = !isEnabled;
      }
    }
  } catch (error) {
    console.error('Error updating auto-launch:', error);
    // Revert checkbox on error
    elements.autoLaunchCheckbox.checked = !isEnabled;
    state.autoLaunch = !isEnabled;
  }
}

async function handleStartMinimizedChange(event) {
  const isEnabled = event.target.checked;
  state.startMinimized = isEnabled;

  try {
    // Save the setting
    await saveAllSettings();

    // Update the system auto-launch setting (if auto-launch is enabled)
    if (state.autoLaunch && window.electronAPI.setAutoLaunch) {
      const result = await window.electronAPI.setAutoLaunch(state.autoLaunch, isEnabled);
      if (!result.success) {
        console.error('Failed to update start minimized:', result.error);
      }
    }
  } catch (error) {
    console.error('Error updating start minimized:', error);
  }
}

// ========================================
// Global Hotkey Management
// ========================================
function acceleratorToDisplay(accelerator) {
  // Convert Electron accelerator format to display format
  // CommandOrControl -> Ctrl (on Windows/Linux) or Cmd (on macOS)
  let display = accelerator
    .replace('CommandOrControl', 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace('Shift', 'Shift')
    .replace('Super', 'Win');

  return display;
}

function keysToAccelerator(keys) {
  // Convert recorded keys to Electron accelerator format
  const modifiers = [];
  let mainKey = '';

  if (keys.ctrl || keys.meta) {
    modifiers.push('CommandOrControl');
  }
  if (keys.alt) {
    modifiers.push('Alt');
  }
  if (keys.shift) {
    modifiers.push('Shift');
  }

  if (keys.key) {
    mainKey = keys.key.toUpperCase();
  }

  if (modifiers.length === 0 || !mainKey) {
    return null; // Invalid hotkey
  }

  return modifiers.join('+') + '+' + mainKey;
}

function updateHotkeyDisplay() {
  if (elements.globalHotkeyInput) {
    elements.globalHotkeyInput.value = acceleratorToDisplay(state.globalHotkey);
  }
}

async function resetHotkeyToDefault() {
  state.globalHotkey = 'CommandOrControl+Alt+T';
  updateHotkeyDisplay();
  await saveAllSettings();

  // Notify main process to update the global shortcut
  if (window.electronAPI.updateGlobalHotkey) {
    await window.electronAPI.updateGlobalHotkey(state.globalHotkey);
  }
}

function setupHotkeyRecorder() {
  if (!elements.globalHotkeyInput) return;

  let recordingKeys = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    key: null
  };

  elements.globalHotkeyInput.addEventListener('focus', () => {
    elements.globalHotkeyInput.value = 'Press keys...';
    recordingKeys = { ctrl: false, alt: false, shift: false, meta: false, key: null };
  });

  elements.globalHotkeyInput.addEventListener('blur', () => {
    updateHotkeyDisplay();
  });

  elements.globalHotkeyInput.addEventListener('keydown', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Record modifier keys
    recordingKeys.ctrl = e.ctrlKey;
    recordingKeys.alt = e.altKey;
    recordingKeys.shift = e.shiftKey;
    recordingKeys.meta = e.metaKey;

    // Record main key (not a modifier)
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      recordingKeys.key = e.key;

      // Try to create accelerator
      const accelerator = keysToAccelerator(recordingKeys);

      if (accelerator) {
        state.globalHotkey = accelerator;
        updateHotkeyDisplay();
        await saveAllSettings();

        // Notify main process to update the global shortcut
        if (window.electronAPI.updateGlobalHotkey) {
          await window.electronAPI.updateGlobalHotkey(state.globalHotkey);
        }

        // Remove focus
        elements.globalHotkeyInput.blur();
      }
    } else {
      // Show current modifier combination
      const parts = [];
      if (recordingKeys.ctrl || recordingKeys.meta) parts.push('Ctrl');
      if (recordingKeys.alt) parts.push('Alt');
      if (recordingKeys.shift) parts.push('Shift');
      parts.push('...');
      elements.globalHotkeyInput.value = parts.join('+');
    }
  });
}

// ========================================
// Keyboard Shortcuts
// ========================================
function updateDeleteButtonStates() {
  // Update all task delete button appearances based on Ctrl key state
  document.querySelectorAll('.task-delete').forEach(btn => {
    const taskItem = btn.closest('.task-item');
    const isDeleted = taskItem?.dataset.taskDeleted === 'true';

    if (state.ctrlKeyPressed && !isDeleted) {
      btn.classList.add('permanent-delete');
    } else {
      btn.classList.remove('permanent-delete');
    }
  });

  // Update all folder delete button appearances based on Ctrl key state
  document.querySelectorAll('.folder-item-btn').forEach(btn => {
    if (state.ctrlKeyPressed) {
      btn.classList.add('permanent-delete');
    } else {
      btn.classList.remove('permanent-delete');
    }
  });
}

function setupKeyboardShortcuts() {
  // Track Ctrl key state for Ctrl+Click to exit and delete button styling
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      if (window.electronAPI.setCtrlKeyState) {
        window.electronAPI.setCtrlKeyState(true);
      }
      state.ctrlKeyPressed = true;
      updateDeleteButtonStates();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      if (window.electronAPI.setCtrlKeyState) {
        window.electronAPI.setCtrlKeyState(false);
      }
      state.ctrlKeyPressed = false;
      updateDeleteButtonStates();
    }
  });

  // Window blur also means Ctrl is released
  window.addEventListener('blur', () => {
    if (window.electronAPI.setCtrlKeyState) {
      window.electronAPI.setCtrlKeyState(false);
    }
    state.ctrlKeyPressed = false;
    updateDeleteButtonStates();
  });

  // Task navigation keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Handle F12 to toggle DevTools (works anywhere)
    if (e.key === 'F12') {
      e.preventDefault();
      if (window.electronAPI.toggleDevTools) {
        window.electronAPI.toggleDevTools();
      }
      return;
    }

    // Handle Ctrl+X or Ctrl+Alt+F4 to exit app without minimizing to tray (works anywhere)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      if (window.electronAPI.quitApp) {
        window.electronAPI.quitApp();
      }
      return;
    }

    // Handle Ctrl+Alt+F4 to exit app
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'F4') {
      e.preventDefault();
      if (window.electronAPI.quitApp) {
        window.electronAPI.quitApp();
      }
      return;
    }

    // Handle Ctrl+Tab to cycle through folders (works anywhere, even in input fields)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault();
      if (state.taskFolders.length > 0) {
        const currentIndex = state.taskFolders.findIndex(f => f.id === state.currentFolderId);
        const nextIndex = (currentIndex + 1) % state.taskFolders.length;
        const nextFolder = state.taskFolders[nextIndex];
        switchFolder(nextFolder.id);
      }
      return;
    }

    // Handle Ctrl+Number folder switching (works anywhere, even in input fields)
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      const folderIndex = parseInt(e.key) - 1;
      if (folderIndex < state.taskFolders.length) {
        e.preventDefault();
        const folder = state.taskFolders[folderIndex];
        switchFolder(folder.id);
        return;
      }
    }

    // Handle F-key navigation (works anywhere except when in input fields)
    const isInInputField = e.target.matches('input, textarea, [contenteditable="true"]');

    if (e.key === 'F1') {
      e.preventDefault();
      // If in tasks view with a selected task, enable inline edit
      if (state.currentView === 'tasks' && state.lastSelectedTaskPath && !isInInputField) {
        const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
        if (task) {
          // Find the task element and its text element
          const escapedPath = state.lastSelectedTaskPath.replace(/\\/g, '\\\\');
          const taskElement = document.querySelector(`.task-item[data-task-path="${escapedPath}"]`);
          if (taskElement) {
            const textElement = taskElement.querySelector('.task-text');
            if (textElement) {
              enableInlineEdit(textElement);
            }
          }
        }
      } else {
        // If not in tasks view, navigate to help
        navigateToView('help');
      }
      return;
    }
    if (e.key === 'F2') {
      e.preventDefault();
      navigateToView('profile');
      return;
    }
    if (e.key === 'F5') {
      e.preventDefault();
      navigateToView('settings');
      return;
    }

    // Handle Ctrl+A to focus AI agent input (works anywhere)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      // Don't override Ctrl+A in text input fields (select all)
      if (!e.target.matches('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
        if (elements.agentInput) {
          elements.agentInput.focus();
          elements.agentInput.select();
        }
        return;
      }
    }

    // Handle Ctrl+Q to open AI quick prompts menu (works anywhere)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      toggleAgentQuickMenu();
      // Focus first prompt option after a small delay to ensure menu is visible
      setTimeout(() => {
        const firstOption = elements.agentQuickMenu?.querySelector('.agent-quick-option');
        if (firstOption) {
          firstOption.focus();
        }
      }, 10);
      return;
    }

    // Handle Ctrl+K for Kanban view and Ctrl+L for List view (works in tasks view)
    if (state.currentView === 'tasks' && (e.ctrlKey || e.metaKey)) {
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        toggleViewMode('kanban');
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        toggleViewMode('list');
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFilterMenu();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleSortMenu();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        // Open move modal if a task is selected
        if (state.lastSelectedTaskPath) {
          const task = findTaskByPath(state.tasks, state.lastSelectedTaskPath);
          if (task) {
            openMoveTaskModal(task);
          }
        }
        return;
      }
    }

    // Arrow key navigation - handle these specially
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);

    if (isArrowKey) {
      // Don't handle arrow keys if Ctrl is pressed (used for window snapping)
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      // Don't handle arrow keys if user is typing in an input field or textarea
      if (e.target.matches('input, textarea, [contenteditable="true"]')) {
        return;
      }

      // Only handle arrow keys in tasks view and when modal/menus are not open
      const isFilterMenuOpen = elements.filterMenu.classList.contains('active');
      const isSortMenuOpen = elements.sortMenu.classList.contains('active');
      const isAgentQuickMenuOpen = elements.agentQuickMenu.classList.contains('active');

      if (state.currentView === 'tasks' &&
          !elements.taskModal.classList.contains('active') &&
          !isFilterMenuOpen &&
          !isSortMenuOpen &&
          !isAgentQuickMenuOpen) {
        e.preventDefault();
        e.stopPropagation();

        switch (e.key) {
          case 'ArrowUp':
            navigateTasksVertical('up', e.shiftKey);
            break;
          case 'ArrowDown':
            navigateTasksVertical('down', e.shiftKey);
            break;
          case 'ArrowLeft':
            if (state.taskViewMode === 'kanban') {
              navigateTasksHorizontal('left', e.shiftKey);
            } else {
              // In list view, collapse task
              handleTaskKeyboardAction('collapse');
            }
            break;
          case 'ArrowRight':
            if (state.taskViewMode === 'kanban') {
              navigateTasksHorizontal('right', e.shiftKey);
            } else {
              // In list view, expand task
              handleTaskKeyboardAction('expand');
            }
            break;
        }
        return;
      }
    }

    // Handle other task shortcuts
    if (state.currentView !== 'tasks') {
      return;
    }

    // Don't handle if modal is open
    if (elements.taskModal.classList.contains('active')) {
      return;
    }

    // Only block Space, Enter, Delete when in text input fields (except task input) or contenteditable elements
    const isInTextInput = e.target.matches('input:not(#taskInput):not([type="checkbox"]), textarea:not(#taskInput), [contenteditable="true"]');

    switch (e.key) {
      case ' ':
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('toggle');
        }
        break;

      case 'Enter':
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('open');
        }
        break;

      case 'Delete':
        if (!isInTextInput) {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            handleTaskKeyboardAction('nuclear-delete');
          } else {
            handleTaskKeyboardAction('delete');
          }
        }
        break;
    }
  }, true); // Use capture phase to ensure we get the event first

  document.addEventListener('keydown', async (e) => {
    // Handle Alt+F4 to hide to tray (always works, even in input fields)
    if (e.altKey && e.key === 'F4') {
      e.preventDefault();
      if (window.electronAPI.hideToTray) {
        await window.electronAPI.hideToTray();
      }
      return;
    }

    // Only process Ctrl+Arrow keys below this point
    if (!e.ctrlKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      return;
    }

    // Don't interfere with text editing in input fields
    if (e.target.matches('input, textarea, [contenteditable="true"]')) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case 'ArrowLeft':
        // Snap window to left
        if (window.electronAPI.snapWindow) {
          await window.electronAPI.snapWindow('left');
        }
        break;

      case 'ArrowRight':
        // Snap window to right
        if (window.electronAPI.snapWindow) {
          await window.electronAPI.snapWindow('right');
        }
        break;

      case 'ArrowUp':
        // Center window
        if (window.electronAPI.snapWindow) {
          await window.electronAPI.snapWindow('center');
        }
        break;

      case 'ArrowDown':
        // Hide to tray
        if (window.electronAPI.hideToTray) {
          await window.electronAPI.hideToTray();
        }
        break;
    }
  });
}

// ========================================
// Ollama Integration
// ========================================
function updateOllamaStatus(icon, text, type = 'info') {
  if (elements.ollamaStatusIcon) {
    elements.ollamaStatusIcon.textContent = icon;
  }
  if (elements.ollamaStatusText) {
    elements.ollamaStatusText.textContent = text;
  }
  if (elements.ollamaStatus) {
    // Update color based on type
    if (type === 'success') {
      elements.ollamaStatus.style.color = 'var(--success)';
    } else if (type === 'error') {
      elements.ollamaStatus.style.color = 'var(--danger)';
    } else {
      elements.ollamaStatus.style.color = 'var(--text-secondary)';
    }
  }
}

async function detectOllama() {
  try {
    updateOllamaStatus('⏳', 'Detecting Ollama...', 'info');

    const result = await window.electronAPI.ollama.detect();

    if (result.success) {
      state.ollamaPath = result.path;
      state.ollamaAvailable = true;

      if (elements.ollamaPathInput) {
        elements.ollamaPathInput.value = result.path;
      }

      updateOllamaStatus('✓', `Ollama found: ${result.version}`, 'success');

      // Now load available models
      await listOllamaModels(result.path);
    } else {
      state.ollamaPath = null;
      state.ollamaAvailable = false;

      if (elements.ollamaPathInput) {
        elements.ollamaPathInput.value = '';
        elements.ollamaPathInput.placeholder = 'Not found - click Browse or Detect';
      }

      updateOllamaStatus('✗', result.error || 'Ollama not found', 'error');

      // Hide model section
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'none';
      }
    }

    await saveAllSettings();
  } catch (error) {
    console.error('Error detecting Ollama:', error);
    updateOllamaStatus('✗', 'Error detecting Ollama', 'error');
  }
}

async function listOllamaModels(ollamaPath) {
  try {
    updateOllamaStatus('⏳', 'Loading models...', 'info');

    const result = await window.electronAPI.ollama.listModels(ollamaPath);

    if (result.success && result.models && result.models.length > 0) {
      // Populate model dropdown
      if (elements.ollamaModelSelect) {
        elements.ollamaModelSelect.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a model...';
        elements.ollamaModelSelect.appendChild(defaultOption);

        // Add models
        result.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          elements.ollamaModelSelect.appendChild(option);
        });

        // Select previously saved model if available
        if (state.ollamaModel && result.models.includes(state.ollamaModel)) {
          elements.ollamaModelSelect.value = state.ollamaModel;
        }
      }

      // Show model section
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'block';
      }

      updateOllamaStatus('✓', `Found ${result.models.length} model(s)`, 'success');
    } else {
      updateOllamaStatus('⚠', 'No models found. Run "ollama pull" to download models.', 'error');

      // Hide model section
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error listing models:', error);
    updateOllamaStatus('✗', 'Error loading models', 'error');
  }
}

async function browseForOllama() {
  try {
    const filePath = await window.electronAPI.ollama.selectFile();

    if (filePath) {
      // Verify this is actually ollama by trying to run it
      updateOllamaStatus('⏳', 'Verifying executable...', 'info');

      state.ollamaPath = filePath;

      if (elements.ollamaPathInput) {
        elements.ollamaPathInput.value = filePath;
      }

      // Try to list models to verify it works
      const result = await window.electronAPI.ollama.listModels(filePath);

      if (result.success) {
        state.ollamaAvailable = true;
        await listOllamaModels(filePath);
      } else {
        state.ollamaAvailable = false;
        updateOllamaStatus('✗', 'Invalid Ollama executable', 'error');
      }

      await saveAllSettings();
    }
  } catch (error) {
    console.error('Error browsing for Ollama:', error);
    updateOllamaStatus('✗', 'Error selecting file', 'error');
  }
}

function updateAgentModelDisplay() {
  if (elements.agentModelName) {
    if (state.ollamaModel) {
      elements.agentModelName.textContent = `(${state.ollamaModel})`;
    } else {
      elements.agentModelName.textContent = '';
    }
  }
}

async function handleOllamaModelChange(event) {
  state.ollamaModel = event.target.value;
  updateAgentModelDisplay();
  await saveAllSettings();
}

async function refreshOllamaModels() {
  if (!state.ollamaPath) {
    updateOllamaStatus('⚠', 'No Ollama path configured. Please detect or browse for Ollama first.', 'error');
    return;
  }

  try {
    await listOllamaModels(state.ollamaPath);
  } catch (error) {
    console.error('Error refreshing models:', error);
    updateOllamaStatus('✗', 'Error refreshing models', 'error');
  }
}

async function loadOllamaSettings() {
  const result = await window.electronAPI.config.read();
  if (result.success && result.config) {
    state.ollamaPath = result.config.ollamaPath || null;
    state.ollamaModel = result.config.ollamaModel || null;
    state.ollamaAvailable = result.config.ollamaAvailable || false;

    // Load vector DB settings
    state.vectorDbEnabled = result.config.vectorDbEnabled || false;
    state.vectorDbUrl = result.config.vectorDbUrl || 'http://localhost:8000';
    state.vectorDbCollection = result.config.vectorDbCollection || 'tasker_tasks';
    state.vectorDbConnected = result.config.vectorDbConnected || false;

    // Load quick prompts (use defaults if not saved)
    if (result.config.agentQuickPrompts && result.config.agentQuickPrompts.length > 0) {
      state.agentQuickPrompts = result.config.agentQuickPrompts;
    }

    // Load task statuses (use defaults if not saved)
    if (result.config.taskStatuses && result.config.taskStatuses.length > 0) {
      state.taskStatuses = result.config.taskStatuses;
    }

    // Update Ollama UI
    if (state.ollamaPath && elements.ollamaPathInput) {
      elements.ollamaPathInput.value = state.ollamaPath;

      // Try to load models if we have a path
      if (state.ollamaAvailable) {
        await listOllamaModels(state.ollamaPath);
      }
    }

    // Update Vector DB UI
    if (elements.vectorDbEnabled) {
      elements.vectorDbEnabled.checked = state.vectorDbEnabled;
      if (state.vectorDbEnabled) {
        elements.vectorDbConfig.style.display = 'block';
      }
    }
    if (elements.vectorDbUrl) {
      elements.vectorDbUrl.value = state.vectorDbUrl;
    }
    if (elements.vectorDbCollection) {
      elements.vectorDbCollection.value = state.vectorDbCollection;
    }
    updateVectorDbStatus();

    // Render prompts and update agent dropdown
    renderPromptsList();
    updateAgentQuickMenu();

    // Update agent model display
    updateAgentModelDisplay();
  }
}

// ========================================
// Vector Database Integration
// ========================================
function updateVectorDbStatus(icon = '○', text = 'Not configured', type = 'info') {
  if (elements.vectorDbStatusIcon) {
    elements.vectorDbStatusIcon.textContent = icon;
  }
  if (elements.vectorDbStatusText) {
    elements.vectorDbStatusText.textContent = text;
  }
  if (elements.vectorDbStatus) {
    // Update color based on type
    if (type === 'success') {
      elements.vectorDbStatus.style.color = 'var(--success)';
    } else if (type === 'error') {
      elements.vectorDbStatus.style.color = 'var(--danger)';
    } else {
      elements.vectorDbStatus.style.color = 'var(--text-secondary)';
    }
  }
}

async function testVectorDbConnection() {
  try {
    updateVectorDbStatus('⏳', 'Testing connection...', 'info');

    const url = elements.vectorDbUrl.value.trim();
    if (!url) {
      updateVectorDbStatus('✗', 'URL is required', 'error');
      return;
    }

    // Test connection by making a simple health check request
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      state.vectorDbConnected = true;
      updateVectorDbStatus('✓', 'Connected successfully', 'success');

      // Save settings
      await saveFoldersToStorage();
    } else {
      state.vectorDbConnected = false;
      updateVectorDbStatus('✗', `Connection failed: ${response.status}`, 'error');
    }
  } catch (error) {
    console.error('Vector DB connection error:', error);
    state.vectorDbConnected = false;
    updateVectorDbStatus('✗', `Error: ${error.message}`, 'error');
  }
}

function handleVectorDbEnabledChange() {
  state.vectorDbEnabled = elements.vectorDbEnabled.checked;

  // Show/hide config section
  if (state.vectorDbEnabled) {
    elements.vectorDbConfig.style.display = 'block';
    updateVectorDbStatus('○', 'Configure and test connection', 'info');
  } else {
    elements.vectorDbConfig.style.display = 'none';
    updateVectorDbStatus('○', 'Disabled', 'info');
  }

  // Save settings
  saveFoldersToStorage();
}

function handleVectorDbUrlChange() {
  state.vectorDbUrl = elements.vectorDbUrl.value.trim();
  state.vectorDbConnected = false;
  updateVectorDbStatus('○', 'Click "Test Connection" to verify', 'info');
  saveFoldersToStorage();
}

function handleVectorDbCollectionChange() {
  state.vectorDbCollection = elements.vectorDbCollection.value.trim() || 'tasker_tasks';
  saveFoldersToStorage();
}

// ========================================
// Git Integration
// ========================================
function updateGitStatus(icon, text, type = 'info') {
  if (elements.gitStatusIcon) {
    elements.gitStatusIcon.textContent = icon;
  }
  if (elements.gitStatusText) {
    elements.gitStatusText.textContent = text;
  }
  if (elements.gitStatus) {
    // Update color based on type
    if (type === 'success') {
      elements.gitStatus.style.color = 'var(--success)';
    } else if (type === 'error') {
      elements.gitStatus.style.color = 'var(--danger)';
    } else {
      elements.gitStatus.style.color = 'var(--text-secondary)';
    }
  }
}

async function detectGit() {
  try {
    updateGitStatus('⏳', 'Detecting Git...', 'info');

    const result = await window.electronAPI.git.detect();

    if (result.success) {
      state.gitPath = result.path;
      state.gitAvailable = true;

      if (elements.gitPathInput) {
        elements.gitPathInput.value = result.path;
      }

      updateGitStatus('✓', `Git found: ${result.version}`, 'success');
    } else {
      state.gitPath = null;
      state.gitAvailable = false;

      if (elements.gitPathInput) {
        elements.gitPathInput.value = '';
        elements.gitPathInput.placeholder = 'Not found - click Browse or Detect';
      }

      updateGitStatus('✗', result.error || 'Git not found', 'error');
    }

    await saveAllSettings();
  } catch (error) {
    console.error('Error detecting Git:', error);
    updateGitStatus('✗', 'Error detecting Git', 'error');
  }
}

async function browseForGit() {
  try {
    const filePath = await window.electronAPI.git.selectFile();

    if (filePath) {
      // Verify this is actually git by trying to run it
      updateGitStatus('⏳', 'Verifying executable...', 'info');

      state.gitPath = filePath;

      if (elements.gitPathInput) {
        elements.gitPathInput.value = filePath;
      }

      // Try to get version to verify it works
      const result = await window.electronAPI.git.detect();

      if (result.success) {
        state.gitAvailable = true;
        updateGitStatus('✓', `Git found: ${result.version}`, 'success');
      } else {
        state.gitAvailable = false;
        updateGitStatus('✗', 'Invalid Git executable', 'error');
      }

      await saveAllSettings();
    }
  } catch (error) {
    console.error('Error browsing for Git:', error);
    updateGitStatus('✗', 'Error selecting file', 'error');
  }
}

async function loadGitSettings() {
  const result = await window.electronAPI.config.read();
  if (result.success && result.config) {
    state.gitPath = result.config.gitPath || null;
    state.gitAvailable = result.config.gitAvailable || false;

    // Update UI
    if (state.gitPath && elements.gitPathInput) {
      elements.gitPathInput.value = state.gitPath;

      // Show status if available
      if (state.gitAvailable) {
        updateGitStatus('✓', 'Git is configured', 'success');
      }
    }
  }
}

// ========================================
// Dropbox Integration
// ========================================
function updateDropboxStatus(icon, text, type = 'info') {
  if (elements.dropboxStatusIcon) {
    elements.dropboxStatusIcon.textContent = icon;
  }
  if (elements.dropboxStatusText) {
    elements.dropboxStatusText.textContent = text;
  }
  if (elements.dropboxStatus) {
    // Update color based on type
    if (type === 'success') {
      elements.dropboxStatus.style.color = 'var(--success)';
    } else if (type === 'error') {
      elements.dropboxStatus.style.color = 'var(--danger)';
    } else {
      elements.dropboxStatus.style.color = 'var(--text-secondary)';
    }
  }
}

async function handleOAuthLogin() {
  const clientId = elements.dropboxClientIdInput?.value?.trim();

  if (!clientId) {
    alert('Please enter your Dropbox App Key (Client ID)');
    return;
  }

  try {
    // Disable button during OAuth flow
    if (elements.oauthLoginBtn) {
      elements.oauthLoginBtn.disabled = true;
      elements.oauthLoginBtn.textContent = 'Authorizing...';
    }

    // Show status
    if (elements.dropboxStatus) {
      elements.dropboxStatus.style.display = 'block';
    }
    if (elements.dropboxUserInfo) {
      elements.dropboxUserInfo.style.display = 'none';
    }
    updateDropboxStatus('⏳', 'Opening browser for authorization...', 'info');

    // Start OAuth flow
    const result = await window.electronAPI.dropbox.oauthStart(clientId);

    if (result.success) {
      // Store OAuth2 credentials
      state.dropboxClientId = clientId;
      state.dropboxAccessToken = result.accessToken;
      state.dropboxRefreshToken = result.refreshToken;
      state.dropboxConnected = true;

      updateDropboxStatus('⏳', 'Verifying connection...', 'info');

      // Validate and get user info
      const validateResult = await window.electronAPI.dropbox.validate();

      if (validateResult.success && validateResult.userInfo) {
        state.dropboxUserInfo = validateResult.userInfo;

        // Update UI
        updateDropboxStatus('✓', 'Connected via OAuth2', 'success');

        if (elements.dropboxUserName) {
          elements.dropboxUserName.textContent = validateResult.userInfo.name;
        }
        if (elements.dropboxUserEmail) {
          elements.dropboxUserEmail.textContent = validateResult.userInfo.email;
        }
        if (elements.dropboxUserInfo) {
          elements.dropboxUserInfo.style.display = 'block';
        }

        // Save settings
        await saveAllSettings();

        console.log('Dropbox OAuth2 connected successfully:', validateResult.userInfo);

        // If Add Folder modal is open, update the Dropbox option visibility
        if (elements.addFolderModal.classList.contains('active')) {
          if (elements.storageTypeDropbox) {
            elements.storageTypeDropbox.disabled = false;
            elements.storageTypeDropbox.parentElement.title = '';
            elements.storageTypeDropbox.parentElement.style.opacity = '1';
          }
        }

        // If current folder is a Dropbox folder with an error, try to reload it
        if (state.currentFolderId) {
          const currentFolder = getCurrentFolder();
          if (currentFolder && currentFolder.storageType === 'dropbox' && state.folderErrors.has(currentFolder.id)) {
            console.log('[OAuth] Reloading current Dropbox folder after successful authentication');
            await switchFolder(currentFolder.id);
          }
        }
      } else {
        updateDropboxStatus('✗', validateResult.error || 'Connection failed', 'error');
      }
    } else {
      updateDropboxStatus('✗', result.error || 'Authorization failed', 'error');
      alert(`Failed to authorize: ${result.error}`);
    }
  } catch (error) {
    console.error('Error during OAuth login:', error);
    updateDropboxStatus('✗', 'Authorization failed', 'error');
    alert(`OAuth error: ${error.message}`);
  } finally {
    // Re-enable button
    if (elements.oauthLoginBtn) {
      elements.oauthLoginBtn.disabled = false;
      elements.oauthLoginBtn.innerHTML = '<span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 0.25rem;">login</span>Sign in with Dropbox';
    }
  }
}

async function testDropboxConnection() {
  try {
    // Show status
    if (elements.dropboxStatus) {
      elements.dropboxStatus.style.display = 'block';
    }
    if (elements.dropboxUserInfo) {
      elements.dropboxUserInfo.style.display = 'none';
    }
    updateDropboxStatus('⏳', 'Testing connection...', 'info');

    // Check if we have OAuth2 credentials or legacy token
    const hasOAuth2 = state.dropboxClientId && state.dropboxRefreshToken;
    const hasLegacyToken = elements.dropboxTokenInput?.value?.trim();

    if (!hasOAuth2 && !hasLegacyToken) {
      updateDropboxStatus('✗', 'No credentials configured. Please sign in with OAuth2 or enter an access token.', 'error');
      return;
    }

    // If OAuth2 credentials exist, use them (they're already set)
    // If only legacy token exists, set it
    if (!hasOAuth2 && hasLegacyToken) {
      await window.electronAPI.dropbox.setToken(hasLegacyToken);
    }

    // Validate the connection
    const result = await window.electronAPI.dropbox.validate();

    if (result.success && result.userInfo) {
      // Update state based on which method is being used
      if (!hasOAuth2 && hasLegacyToken) {
        state.dropboxAccessToken = hasLegacyToken;
        state.dropboxConnected = true;
      }
      state.dropboxUserInfo = result.userInfo;

      // Update UI
      const statusText = hasOAuth2 ? 'Connected via OAuth2' : 'Connected to Dropbox';
      updateDropboxStatus('✓', statusText, 'success');

      if (elements.dropboxUserName) {
        elements.dropboxUserName.textContent = result.userInfo.name;
      }
      if (elements.dropboxUserEmail) {
        elements.dropboxUserEmail.textContent = result.userInfo.email;
      }
      if (elements.dropboxUserInfo) {
        elements.dropboxUserInfo.style.display = 'block';
      }

      // Save settings
      await saveAllSettings();

      console.log('Dropbox connected successfully:', result.userInfo);

      // If Add Folder modal is open, update the Dropbox option visibility
      if (elements.addFolderModal.classList.contains('active')) {
        if (elements.storageTypeDropbox) {
          elements.storageTypeDropbox.disabled = false;
          elements.storageTypeDropbox.parentElement.title = '';
          elements.storageTypeDropbox.parentElement.style.opacity = '1';
        }
      }
    } else {
      state.dropboxAccessToken = null;
      state.dropboxConnected = false;
      state.dropboxUserInfo = null;

      updateDropboxStatus('✗', result.error || 'Connection failed', 'error');
    }
  } catch (error) {
    console.error('Error testing Dropbox connection:', error);
    updateDropboxStatus('✗', 'Connection failed', 'error');
  }
}

async function disconnectDropbox() {
  if (!confirm('Are you sure you want to disconnect from Dropbox? Any Dropbox-based task folders will become inaccessible until you reconnect.')) {
    return;
  }

  // Clear state
  state.dropboxAccessToken = null;
  state.dropboxConnected = false;
  state.dropboxUserInfo = null;

  // Clear UI
  if (elements.dropboxTokenInput) {
    elements.dropboxTokenInput.value = '';
  }
  if (elements.dropboxStatus) {
    elements.dropboxStatus.style.display = 'none';
  }
  if (elements.dropboxUserInfo) {
    elements.dropboxUserInfo.style.display = 'none';
  }

  // Save settings
  await saveAllSettings();

  console.log('Dropbox disconnected');

  // If Add Folder modal is open, disable the Dropbox option
  if (elements.addFolderModal.classList.contains('active')) {
    if (elements.storageTypeDropbox) {
      elements.storageTypeDropbox.disabled = true;
      elements.storageTypeDropbox.parentElement.title = 'Connect to Dropbox in Settings first';
      elements.storageTypeDropbox.parentElement.style.opacity = '0.5';
      // If Dropbox was selected, switch back to local
      if (elements.storageTypeDropbox.checked) {
        elements.storageTypeLocal.checked = true;
        updateStorageTypeVisibility();
      }
    }
  }
}

async function loadDropboxSettings() {
  const result = await window.electronAPI.config.read();

  if (result.success && result.config) {
    state.dropboxClientId = result.config.dropboxClientId || null;
    state.dropboxAccessToken = result.config.dropboxAccessToken || null;
    state.dropboxRefreshToken = result.config.dropboxRefreshToken || null;
    state.dropboxConnected = result.config.dropboxConnected || false;
    state.dropboxUserInfo = result.config.dropboxUserInfo || null;

    // Update UI
    if (state.dropboxClientId && elements.dropboxClientIdInput) {
      elements.dropboxClientIdInput.value = state.dropboxClientId;
    }
    if (state.dropboxAccessToken && elements.dropboxTokenInput) {
      elements.dropboxTokenInput.value = state.dropboxAccessToken;
    }

    // If we have OAuth2 credentials, restore them
    if (state.dropboxClientId && state.dropboxRefreshToken) {
      try {
        await window.electronAPI.dropbox.setOAuth2(
          state.dropboxAccessToken,
          state.dropboxRefreshToken,
          state.dropboxClientId
        );
        console.log('[Dropbox] OAuth2 credentials restored from config');
      } catch (error) {
        console.error('[Dropbox] Failed to restore OAuth2 credentials:', error);
      }
    } else if (state.dropboxAccessToken) {
      // Legacy access token mode
      try {
        await window.electronAPI.dropbox.setToken(state.dropboxAccessToken);
        console.log('[Dropbox] Legacy access token restored from config');
      } catch (error) {
        console.error('[Dropbox] Failed to restore access token:', error);
      }
    }

    // Show connection status if connected
    if (state.dropboxConnected && state.dropboxUserInfo) {
      if (elements.dropboxStatus) {
        elements.dropboxStatus.style.display = 'block';
      }

      const statusText = state.dropboxRefreshToken ? 'Connected via OAuth2' : 'Connected to Dropbox';
      updateDropboxStatus('✓', statusText, 'success');

      if (elements.dropboxUserName) {
        elements.dropboxUserName.textContent = state.dropboxUserInfo.name;
      }
      if (elements.dropboxUserEmail) {
        elements.dropboxUserEmail.textContent = state.dropboxUserInfo.email;
      }
      if (elements.dropboxUserInfo) {
        elements.dropboxUserInfo.style.display = 'block';
      }
    }
  }
}

// Dropbox folder browser state
const dropboxBrowser = {
  currentPath: '/',
  selectedPath: null,
  onSelectCallback: null
};

async function openDropboxBrowser(onSelect) {
  if (!state.dropboxConnected) {
    alert('Please connect to Dropbox in Settings first.');
    return;
  }

  dropboxBrowser.currentPath = '/';
  dropboxBrowser.selectedPath = null;
  dropboxBrowser.onSelectCallback = onSelect;

  if (elements.dropboxBrowserModal) {
    elements.dropboxBrowserModal.classList.add('active');
  }

  await loadDropboxFolder(dropboxBrowser.currentPath);

  // Focus should work - ensure the input is accessible
  setTimeout(() => {
    if (elements.dropboxNewFolderInput) {
      console.log('[Dropbox Browser] Input element:', elements.dropboxNewFolderInput);
      console.log('[Dropbox Browser] Input disabled?', elements.dropboxNewFolderInput.disabled);
      console.log('[Dropbox Browser] Input readonly?', elements.dropboxNewFolderInput.readOnly);
    }
  }, 100);
}

function closeDropboxBrowser() {
  if (elements.dropboxBrowserModal) {
    elements.dropboxBrowserModal.classList.remove('active');
  }
  if (elements.dropboxNewFolderInput) {
    elements.dropboxNewFolderInput.value = '';
  }
  dropboxBrowser.onSelectCallback = null;
}

async function loadDropboxFolder(path) {
  if (!elements.dropboxFolderList) return;

  try {
    // Update current path display
    if (elements.dropboxCurrentPath) {
      elements.dropboxCurrentPath.value = path || '/';
    }

    // Show loading
    elements.dropboxFolderList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading...</p>';

    // List folder contents
    const result = await window.electronAPI.dropbox.listFolder(path);

    if (!result.success) {
      elements.dropboxFolderList.innerHTML = `<p style="text-align: center; padding: 2rem; color: var(--danger);">Error: ${result.error}</p>`;
      return;
    }

    // Filter to only show folders
    const folders = result.entries.filter(e => e.isFolder);

    if (folders.length === 0) {
      elements.dropboxFolderList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No folders found. Create one below or select current folder.</p>';
      return;
    }

    // Render folders
    elements.dropboxFolderList.innerHTML = folders.map(folder => `
      <div class="dropbox-folder-item" data-path="${escapeHtml(folder.path)}">
        <span class="material-icons">folder</span>
        <span class="dropbox-folder-name">${escapeHtml(folder.name)}</span>
      </div>
    `).join('');

    // Add click handlers
    elements.dropboxFolderList.querySelectorAll('.dropbox-folder-item').forEach(item => {
      item.addEventListener('click', () => {
        const folderPath = item.dataset.path;

        // Toggle selection
        const wasSelected = item.classList.contains('selected');

        // Remove selection from all items
        elements.dropboxFolderList.querySelectorAll('.dropbox-folder-item').forEach(i => {
          i.classList.remove('selected');
        });

        if (!wasSelected) {
          item.classList.add('selected');
          dropboxBrowser.selectedPath = folderPath;
        } else {
          dropboxBrowser.selectedPath = null;
        }
      });

      // Double-click to navigate into folder
      item.addEventListener('dblclick', () => {
        const folderPath = item.dataset.path;
        dropboxBrowser.currentPath = folderPath;
        dropboxBrowser.selectedPath = null;
        loadDropboxFolder(folderPath);
      });
    });
  } catch (error) {
    console.error('Error loading Dropbox folder:', error);
    elements.dropboxFolderList.innerHTML = `<p style="text-align: center; padding: 2rem; color: var(--danger);">Error loading folder</p>`;
  }
}

async function navigateDropboxUp() {
  if (dropboxBrowser.currentPath === '/' || dropboxBrowser.currentPath === '') {
    return; // Already at root
  }

  // Go up one level
  const parts = dropboxBrowser.currentPath.split('/').filter(p => p);
  parts.pop();
  const newPath = parts.length > 0 ? '/' + parts.join('/') : '/';

  dropboxBrowser.currentPath = newPath;
  dropboxBrowser.selectedPath = null;
  await loadDropboxFolder(newPath);
}

async function refreshDropboxFolder() {
  dropboxBrowser.selectedPath = null;
  await loadDropboxFolder(dropboxBrowser.currentPath);
}

async function createDropboxFolder() {
  const folderName = elements.dropboxNewFolderInput?.value?.trim();

  if (!folderName) {
    alert('Please enter a folder name');
    return;
  }

  try {
    const newFolderPath = dropboxBrowser.currentPath === '/'
      ? `/${folderName}`
      : `${dropboxBrowser.currentPath}/${folderName}`;

    const result = await window.electronAPI.dropbox.createFolder(newFolderPath);

    if (result.success) {
      // Clear input
      if (elements.dropboxNewFolderInput) {
        elements.dropboxNewFolderInput.value = '';
      }

      // Refresh the folder list
      await refreshDropboxFolder();
    } else {
      alert(`Failed to create folder: ${result.error}`);
    }
  } catch (error) {
    console.error('Error creating Dropbox folder:', error);
    alert('Failed to create folder');
  }
}

function selectDropboxFolder() {
  // Use selected folder if one is highlighted, otherwise use current path
  const selectedPath = dropboxBrowser.selectedPath || dropboxBrowser.currentPath;

  if (dropboxBrowser.onSelectCallback) {
    dropboxBrowser.onSelectCallback(selectedPath);
  }

  closeDropboxBrowser();
}

// ========================================
// Quick Prompts Management
// ========================================
function renderPromptsList() {
  if (!elements.promptsList) return;

  if (state.agentQuickPrompts.length === 0) {
    elements.promptsList.innerHTML = '<p class="setting-description" style="text-align: center; padding: 2rem;">No prompts configured. Click "Add Prompt" to create one.</p>';
    return;
  }

  elements.promptsList.innerHTML = state.agentQuickPrompts.map(prompt => `
    <div class="prompt-item" data-prompt-id="${prompt.id}">
      <input
        type="text"
        class="prompt-item-text"
        value="${escapeHtml(prompt.prompt)}"
        data-prompt-id="${prompt.id}"
        placeholder="Enter prompt text..."
      />
      <div class="prompt-item-actions">
        <button class="prompt-item-btn" data-action="remove" data-prompt-id="${prompt.id}" title="Delete prompt">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners for prompt editing
  elements.promptsList.querySelectorAll('.prompt-item-text').forEach(input => {
    input.addEventListener('blur', async (e) => {
      const promptId = parseInt(e.target.dataset.promptId);
      const newText = e.target.value.trim();

      if (newText) {
        const prompt = state.agentQuickPrompts.find(p => p.id === promptId);
        if (prompt) {
          prompt.prompt = newText;
          // Update label from first few words
          prompt.label = newText.substring(0, 30) + (newText.length > 30 ? '...' : '');
          await saveAllSettings();
          updateAgentQuickMenu();
        }
      }
    });
  });

  // Add event listeners for delete buttons
  elements.promptsList.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const promptId = parseInt(e.currentTarget.dataset.promptId);
      await deletePrompt(promptId);
    });
  });
}

function toggleAgentQuickMenu() {
  const isActive = elements.agentQuickMenu.classList.toggle('active');
  elements.agentQuickBtn.classList.toggle('active', isActive);
}

function closeAgentQuickMenu() {
  elements.agentQuickMenu.classList.remove('active');
  elements.agentQuickBtn.classList.remove('active');
}

function updateAgentQuickMenu() {
  if (!elements.agentQuickMenu) return;

  // Clear and rebuild menu items
  elements.agentQuickMenu.innerHTML = '';

  state.agentQuickPrompts.forEach(prompt => {
    const button = document.createElement('button');
    button.className = 'agent-quick-option';
    button.dataset.prompt = prompt.prompt;
    button.textContent = prompt.label;
    button.tabIndex = 0; // Make focusable for keyboard navigation
    elements.agentQuickMenu.appendChild(button);
  });

  // Add event listeners to new menu items
  elements.agentQuickMenu.querySelectorAll('.agent-quick-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const prompt = e.currentTarget.dataset.prompt;
      if (prompt) {
        sendAgentMessage(prompt);
        closeAgentQuickMenu();
      }
    });

    // Add keyboard navigation to each option
    option.addEventListener('keydown', (e) => {
      const options = Array.from(elements.agentQuickMenu.querySelectorAll('.agent-quick-option'));
      const currentIndex = options.indexOf(e.currentTarget);

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        let nextIndex;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }
        if (options[nextIndex]) {
          options[nextIndex].focus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAgentQuickMenu();
        if (elements.agentInput) {
          elements.agentInput.focus();
        }
      }
    });
  });
}

async function addPrompt() {
  const newId = state.agentQuickPrompts.length > 0
    ? Math.max(...state.agentQuickPrompts.map(p => p.id)) + 1
    : 1;

  const newPrompt = {
    id: newId,
    label: 'New Prompt',
    prompt: ''
  };

  state.agentQuickPrompts.push(newPrompt);
  await saveAllSettings();
  renderPromptsList();
  updateAgentQuickMenu();

  // Focus the new input
  setTimeout(() => {
    const newInput = elements.promptsList.querySelector(`[data-prompt-id="${newId}"]`);
    if (newInput) {
      newInput.focus();
    }
  }, 100);
}

async function deletePrompt(promptId) {
  state.agentQuickPrompts = state.agentQuickPrompts.filter(p => p.id !== promptId);
  await saveAllSettings();
  renderPromptsList();
  updateAgentQuickMenu();
}

// ========================================
// Task Status Management
// ========================================
function renderStatusesList() {
  if (!elements.statusesList) return;

  if (state.taskStatuses.length === 0) {
    elements.statusesList.innerHTML = '<p class="setting-description" style="text-align: center; padding: 2rem;">No statuses configured.</p>';
    return;
  }

  elements.statusesList.innerHTML = state.taskStatuses.map((status, index) => `
    <div class="status-item" data-status-index="${index}">
      <input
        type="text"
        class="status-item-text"
        value="${escapeHtml(status)}"
        data-status-index="${index}"
        placeholder="Status name..."
        ${status === 'Completed' ? 'readonly title="Completed status cannot be renamed"' : ''}
      />
      <div class="status-item-actions">
        ${status !== 'Completed' ? `
          <button class="status-item-btn" data-action="remove" data-status-index="${index}" title="Delete status">
            <span class="material-icons">delete</span>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Add event listeners for status editing
  elements.statusesList.querySelectorAll('.status-item-text').forEach(input => {
    input.addEventListener('blur', async (e) => {
      const statusIndex = parseInt(e.target.dataset.statusIndex);
      const newText = e.target.value.trim();

      if (newText && statusIndex >= 0 && statusIndex < state.taskStatuses.length) {
        state.taskStatuses[statusIndex] = newText;
        await saveAllSettings();
        updateModalStatusDropdown();
      }
    });
  });

  // Add event listeners for delete buttons
  elements.statusesList.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const statusIndex = parseInt(e.currentTarget.dataset.statusIndex);
      await deleteStatus(statusIndex);
    });
  });
}

async function addStatus() {
  const newStatus = 'New Status';
  state.taskStatuses.push(newStatus);
  await saveAllSettings();
  renderStatusesList();
  updateModalStatusDropdown();

  // Focus the new input
  setTimeout(() => {
    const newInput = elements.statusesList.querySelector(`[data-status-index="${state.taskStatuses.length - 1}"]`);
    if (newInput) {
      newInput.focus();
      newInput.select();
    }
  }, 100);
}

async function deleteStatus(statusIndex) {
  if (statusIndex < 0 || statusIndex >= state.taskStatuses.length) return;

  const statusToDelete = state.taskStatuses[statusIndex];

  // Cannot delete Completed status
  if (statusToDelete === 'Completed') {
    alert('Cannot delete the Completed status.');
    return;
  }

  if (!confirm(`Are you sure you want to delete the status "${statusToDelete}"? Tasks with this status will remain unchanged.`)) {
    return;
  }

  state.taskStatuses.splice(statusIndex, 1);
  await saveAllSettings();
  renderStatusesList();
  updateModalStatusDropdown();
}

function updateModalStatusDropdown() {
  if (!elements.modalStatus) return;

  const currentValue = elements.modalStatus.value;

  // Rebuild dropdown options
  elements.modalStatus.innerHTML = state.taskStatuses.map(status => `
    <option value="${escapeHtml(status)}">${escapeHtml(status)}</option>
  `).join('');

  // Restore selected value if it still exists
  if (state.taskStatuses.includes(currentValue)) {
    elements.modalStatus.value = currentValue;
  }
}

// ========================================
// Settings
// ========================================
async function handleClearData() {
  if (confirm('Are you sure you want to clear all tasks? This cannot be undone.')) {
    // TODO: Implement clearing all task files
    console.log('Clear all tasks - not yet implemented');
  }
}

async function handleClearDeletedItems() {
  if (confirm('Are you sure you want to permanently delete all deleted items? This cannot be undone.')) {
    try {
      const result = await window.electronAPI.tasks.clearDeleted();

      if (result.success) {
        await loadTasks();
        alert('Deleted items cleared successfully.');
      } else {
        console.error('Failed to clear deleted items:', result.error);
        alert('Failed to clear deleted items: ' + result.error);
      }
    } catch (error) {
      console.error('Error clearing deleted items:', error);
      alert('Error clearing deleted items: ' + error.message);
    }
  }
}

// ========================================
// AI Agent
// ========================================
let currentAgentRequest = null; // Track if request is in progress

function formatAgentResponse(text) {
  // Escape HTML first
  let formatted = escapeHtml(text);

  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* or _italic_ to <em>
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

  // Convert bullet points at the start of lines to styled list items
  // Match: start of string or newline, followed by bullet (•, -, *), space, then content
  formatted = formatted.replace(/(^|\n)([•\-\*])\s+(.+)/g, (match, prefix, bullet, content) => {
    return `${prefix}<span class="agent-bullet">•</span> ${content}`;
  });

  // Convert numbered lists (e.g., "1. ", "2. ")
  formatted = formatted.replace(/(^|\n)(\d+)\.\s+(.+)/g, (match, prefix, num, content) => {
    return `${prefix}<span class="agent-number">${num}.</span> ${content}`;
  });

  // Convert newlines to <br>
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

function addAgentMessage(content, type = 'assistant', withSpinner = false, withStopButton = false) {
  if (!elements.agentMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `agent-message agent-message-${type}`;

  if (withSpinner) {
    const spinner = document.createElement('div');
    spinner.className = 'agent-thinking-spinner';
    messageDiv.appendChild(spinner);
  }

  const textSpan = document.createElement('span');

  // For assistant messages, format with markdown-style elements
  if (type === 'assistant') {
    textSpan.innerHTML = formatAgentResponse(content);
    textSpan.style.whiteSpace = 'pre-wrap';
  } else {
    textSpan.textContent = content;
  }

  messageDiv.appendChild(textSpan);

  if (withStopButton) {
    const stopBtn = document.createElement('button');
    stopBtn.className = 'agent-stop-btn';
    stopBtn.textContent = 'Stop';
    stopBtn.onclick = stopAgentRequest;
    messageDiv.appendChild(stopBtn);
  }

  elements.agentMessages.appendChild(messageDiv);

  // Scroll to bottom
  elements.agentMessages.scrollTop = elements.agentMessages.scrollHeight;

  return messageDiv;
}

function stopAgentRequest() {
  // Mark request as cancelled
  currentAgentRequest = null;

  // Remove thinking message
  const messages = elements.agentMessages.querySelectorAll('.agent-message-system');
  if (messages.length > 0) {
    messages[messages.length - 1].remove();
  }

  // Re-enable send button
  if (elements.agentSendBtn) {
    elements.agentSendBtn.disabled = false;
  }

  // Add cancellation message
  addAgentMessage('Request cancelled.', 'system');

  // Focus input
  if (elements.agentInput) {
    elements.agentInput.focus();
  }
}

function buildTasksContext(tasks, indent = 0) {
  let context = '';
  const prefix = '  '.repeat(indent);

  for (const task of tasks) {
    const status = task.completed ? '[✓]' : '[ ]';
    const priority = task.priority === 'high' ? '⚠ ' : '';
    const dueDate = task.dueDate ? ` (Due: ${task.dueDate})` : '';
    const deleted = task.deleted ? ' [DELETED]' : '';

    context += `${prefix}${status} ${priority}${task.title}${dueDate}${deleted}\n`;

    if (task.body && task.body.trim()) {
      context += `${prefix}  Notes: ${task.body.trim()}\n`;
    }

    if (task.children && task.children.length > 0) {
      context += buildTasksContext(task.children, indent + 1);
    }
  }

  return context;
}

async function sendAgentMessage(prompt) {
  if (!prompt || !prompt.trim()) return;

  // Check if Ollama is configured
  if (!state.ollamaPath || !state.ollamaModel) {
    addAgentMessage('Please configure Ollama in Settings first.', 'error');
    return;
  }

  // Disable send button
  if (elements.agentSendBtn) {
    elements.agentSendBtn.disabled = true;
  }

  // Remove the initial greeting message if it exists
  const greetingMessage = elements.agentMessages.querySelector('.agent-message-system');
  if (greetingMessage && greetingMessage.textContent.includes('Ask me about your tasks!')) {
    greetingMessage.remove();
  }

  // Add user message
  addAgentMessage(prompt, 'user');

  // Clear input
  if (elements.agentInput) {
    elements.agentInput.value = '';
  }

  // Build task context
  const tasksContext = buildTasksContext(state.tasks);

  // Create a unique request ID
  const requestId = Date.now();
  currentAgentRequest = requestId;

  // Add thinking message with spinner and stop button
  addAgentMessage('Thinking...', 'system', true, true);

  try {
    const result = await window.electronAPI.ollama.chat(
      state.ollamaPath,
      state.ollamaModel,
      prompt,
      tasksContext
    );

    // Check if request was cancelled
    if (currentAgentRequest !== requestId) {
      console.log('Request was cancelled, ignoring response');
      return;
    }

    // Remove thinking message
    const messages = elements.agentMessages.querySelectorAll('.agent-message-system');
    if (messages.length > 0) {
      messages[messages.length - 1].remove();
    }

    if (result.success) {
      addAgentMessage(result.response, 'assistant');
    } else {
      addAgentMessage(`Error: ${result.error}`, 'error');
    }
  } catch (error) {
    // Check if request was cancelled
    if (currentAgentRequest !== requestId) {
      console.log('Request was cancelled, ignoring error');
      return;
    }

    console.error('Error sending agent message:', error);

    // Remove thinking message
    const messages = elements.agentMessages.querySelectorAll('.agent-message-system');
    if (messages.length > 0) {
      messages[messages.length - 1].remove();
    }

    addAgentMessage(`Error: ${error.message}`, 'error');
  } finally {
    // Only re-enable if this request wasn't cancelled
    if (currentAgentRequest === requestId) {
      currentAgentRequest = null;

      // Re-enable send button
      if (elements.agentSendBtn) {
        elements.agentSendBtn.disabled = false;
      }

      // Focus input
      if (elements.agentInput) {
        elements.agentInput.focus();
      }
    }
  }
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
  // Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewName = item.dataset.view;
      navigateToView(viewName);
    });
  });

  // Sidebar icon buttons for profile and settings
  elements.sidebarIconBtns.forEach(btn => {
    if (btn.dataset.view) {
      btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;
        navigateToView(viewName);
      });
    }
  });

  // Tasks
  elements.addTaskBtn.addEventListener('click', addTask);
  elements.taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // View Toggle
  if (elements.viewListBtn) {
    elements.viewListBtn.addEventListener('click', () => toggleViewMode('list'));
  }
  if (elements.viewKanbanBtn) {
    elements.viewKanbanBtn.addEventListener('click', () => toggleViewMode('kanban'));
  }

  // Clipboard paste button
  elements.taskInput.addEventListener('focus', checkClipboardAndShowPasteButton);
  elements.taskInput.addEventListener('blur', () => {
    // Delay hiding to allow clicking the button
    setTimeout(hideClipboardPasteButton, 200);
  });
  elements.taskInput.addEventListener('input', () => {
    // Hide paste button when user starts typing
    if (elements.taskInput.value.length > 0) {
      hideClipboardPasteButton();
    }
  });
  elements.pasteBtn.addEventListener('click', pasteFromClipboard);

  // Task item interactions (event delegation)
  elements.taskContainer.addEventListener('click', (e) => {
    // Handle expand/collapse button
    if (e.target.classList.contains('task-expand-btn')) {
      const taskId = parseInt(e.target.dataset.taskId);
      toggleExpanded(taskId);
      return;
    }

    // Handle restore button (check if click is on or inside the restore button)
    const restoreBtn = e.target.closest('.task-restore');
    if (restoreBtn) {
      e.stopPropagation(); // Prevent modal from opening
      const taskItem = restoreBtn.closest('.task-item');
      const taskPath = taskItem.dataset.taskPath;
      restoreTask(taskPath);
      return;
    }

    // Handle delete button (check if click is on or inside the delete button)
    const deleteBtn = e.target.closest('.task-delete');
    if (deleteBtn) {
      e.stopPropagation(); // Prevent modal from opening
      const taskItem = deleteBtn.closest('.task-item');
      const taskPath = taskItem.dataset.taskPath;
      const isDeleted = taskItem.dataset.taskDeleted === 'true';
      const forcePermDelete = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
      deleteTask(taskPath, isDeleted, forcePermDelete);
      return;
    }

    // Handle task text click - enable inline editing
    if (e.target.classList.contains('task-text')) {
      e.stopPropagation();
      enableInlineEdit(e.target);
      return;
    }

    // Handle task item click (anywhere else)
    const taskItem = e.target.closest('.task-item');
    if (taskItem && !e.target.classList.contains('task-checkbox')) {
      const taskPath = taskItem.dataset.taskPath;

      // Multi-select with Ctrl/Shift or single select
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // Multi-select mode
        selectTask(taskPath, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
      } else {
        // Single select - open modal
        selectTask(taskPath);
        const taskId = parseInt(taskItem.dataset.taskId);
        const task = findTaskById(state.tasks, taskId);
        if (task) {
          openTaskModal(task);
        }
      }
      return;
    }
  });

  // Handle checkbox changes
  elements.taskContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-checkbox')) {
      const taskItem = e.target.closest('.task-item');
      const taskPath = taskItem.dataset.taskPath;
      const currentCompleted = taskItem.dataset.taskCompleted === 'true';
      toggleTask(taskPath, currentCompleted);
    }
  });

  // Context menu for tasks
  elements.taskContainer.addEventListener('contextmenu', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;

    e.preventDefault();

    // Get the task
    const taskPath = taskItem.dataset.taskPath;
    const task = findTaskByPath(state.tasks, taskPath);
    if (!task) return;

    // Store task for context menu actions
    state.contextMenuTask = task;

    // Position and show context menu
    elements.taskContextMenu.style.left = `${e.clientX}px`;
    elements.taskContextMenu.style.top = `${e.clientY}px`;
    elements.taskContextMenu.classList.add('active');
  });

  // Context menu item clicks
  elements.taskContextMenu.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem || !state.contextMenuTask) return;

    const action = menuItem.dataset.action;

    switch (action) {
      case 'move':
        openMoveTaskModal(state.contextMenuTask);
        break;
      case 'open':
        openTaskModal(state.contextMenuTask);
        break;
      case 'delete':
        deleteTask(state.contextMenuTask.filePath);
        break;
    }

    // Close context menu
    elements.taskContextMenu.classList.remove('active');
    state.contextMenuTask = null;
  });

  // Close context menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!elements.taskContextMenu.contains(e.target)) {
      elements.taskContextMenu.classList.remove('active');
      state.contextMenuTask = null;
    }
  });

  // Expand/Collapse All
  elements.expandCollapseBtn.addEventListener('click', toggleExpandCollapseAll);

  // Filter
  elements.filterToggleBtn.addEventListener('click', toggleFilterDropdown);
  elements.filterMenu.addEventListener('change', handleFilterChange);

  // Sort
  elements.sortToggleBtn.addEventListener('click', toggleSortDropdown);
  elements.sortMenu.addEventListener('change', handleSortChange);

  // Filter menu keyboard navigation
  elements.filterMenu.addEventListener('keydown', (e) => {
    if (!elements.filterMenu.classList.contains('active')) return;

    const checkboxes = Array.from(elements.filterMenu.querySelectorAll('input[type="checkbox"]'));
    const currentIndex = checkboxes.indexOf(document.activeElement);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      let nextIndex;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < checkboxes.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : checkboxes.length - 1;
      }
      if (checkboxes[nextIndex]) {
        checkboxes[nextIndex].focus();
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentIndex >= 0 && checkboxes[currentIndex]) {
        checkboxes[currentIndex].checked = !checkboxes[currentIndex].checked;
        checkboxes[currentIndex].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      closeFilterMenu();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeFilterMenu();
    }
  });

  // Sort menu keyboard navigation
  elements.sortMenu.addEventListener('keydown', (e) => {
    if (!elements.sortMenu.classList.contains('active')) return;

    const radios = Array.from(elements.sortMenu.querySelectorAll('input[type="radio"]'));
    const currentIndex = radios.indexOf(document.activeElement);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      let nextIndex;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < radios.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : radios.length - 1;
      }
      if (radios[nextIndex]) {
        radios[nextIndex].focus();
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentIndex >= 0 && radios[currentIndex]) {
        radios[currentIndex].checked = true;
        radios[currentIndex].dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      closeSortMenu();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSortMenu();
    }
  });

  // Close filter and sort dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown') && elements.filterMenu.classList.contains('active')) {
      elements.filterMenu.classList.remove('active');
      elements.filterToggleBtn.classList.remove('active');
    }
    if (!e.target.closest('.sort-dropdown') && elements.sortMenu.classList.contains('active')) {
      elements.sortMenu.classList.remove('active');
      elements.sortToggleBtn.classList.remove('active');
    }
  });

  // Folder management
  elements.addFolderSettingsBtn.addEventListener('click', openAddFolderModal);

  // Prompt management
  if (elements.addPromptBtn) {
    elements.addPromptBtn.addEventListener('click', addPrompt);
  }

  // Status management
  if (elements.addStatusBtn) {
    elements.addStatusBtn.addEventListener('click', addStatus);
  }

  // Add Folder Modal
  if (elements.storageTypeLocal) {
    elements.storageTypeLocal.addEventListener('change', updateStorageTypeVisibility);
  }
  if (elements.storageTypeDropbox) {
    elements.storageTypeDropbox.addEventListener('change', updateStorageTypeVisibility);
  }
  elements.browseFolderBtn.addEventListener('click', browseFolderForModal);
  if (elements.browseDropboxBtn) {
    elements.browseDropboxBtn.addEventListener('click', () => {
      openDropboxBrowser((selectedPath) => {
        if (elements.dropboxPathInput) {
          elements.dropboxPathInput.value = selectedPath;
        }
        // Auto-generate folder name from path
        if (!elements.folderNameInput.value.trim() && selectedPath) {
          const pathParts = selectedPath.split('/').filter(p => p);
          const folderName = pathParts[pathParts.length - 1] || 'Tasks';
          elements.folderNameInput.value = folderName;
        }
      });
    });
  }
  elements.addFolderCancelBtn.addEventListener('click', closeAddFolderModal);
  elements.addFolderSaveBtn.addEventListener('click', saveAddFolder);

  // Close modal when clicking outside
  elements.addFolderModal.addEventListener('click', (e) => {
    if (e.target === elements.addFolderModal) {
      closeAddFolderModal();
    }
  });

  // Enter key to save
  elements.folderPathInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveAddFolder();
    }
  });

  elements.folderNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveAddFolder();
    }
  });

  // Settings
  elements.themeSelect.addEventListener('change', handleThemeChange);
  elements.clearDataBtn.addEventListener('click', handleClearData);
  elements.clearDeletedBtn.addEventListener('click', handleClearDeletedItems);
  elements.resetHotkeyBtn.addEventListener('click', resetHotkeyToDefault);
  elements.autoLaunchCheckbox.addEventListener('change', handleAutoLaunchChange);
  elements.startMinimizedCheckbox.addEventListener('change', handleStartMinimizedChange);

  // Ollama
  elements.detectOllamaBtn.addEventListener('click', detectOllama);
  elements.browseOllamaBtn.addEventListener('click', browseForOllama);
  elements.ollamaModelSelect.addEventListener('change', handleOllamaModelChange);
  elements.refreshModelsBtn.addEventListener('click', refreshOllamaModels);

  // Git
  // Vector DB
  elements.vectorDbEnabled.addEventListener('change', handleVectorDbEnabledChange);
  elements.vectorDbUrl.addEventListener('change', handleVectorDbUrlChange);
  elements.vectorDbCollection.addEventListener('change', handleVectorDbCollectionChange);
  elements.testVectorDbBtn.addEventListener('click', testVectorDbConnection);

  // Git
  elements.detectGitBtn.addEventListener('click', detectGit);
  elements.browseGitBtn.addEventListener('click', browseForGit);

  // Dropbox
  if (elements.oauthLoginBtn) {
    elements.oauthLoginBtn.addEventListener('click', handleOAuthLogin);
  }
  if (elements.testDropboxBtn) {
    elements.testDropboxBtn.addEventListener('click', testDropboxConnection);
  }
  if (elements.disconnectDropboxBtn) {
    elements.disconnectDropboxBtn.addEventListener('click', disconnectDropbox);
  }

  // Dropbox Browser
  if (elements.dropboxUpBtn) {
    elements.dropboxUpBtn.addEventListener('click', navigateDropboxUp);
  }
  if (elements.dropboxRefreshBtn) {
    elements.dropboxRefreshBtn.addEventListener('click', refreshDropboxFolder);
  }
  if (elements.dropboxCreateFolderBtn) {
    elements.dropboxCreateFolderBtn.addEventListener('click', createDropboxFolder);
  }
  if (elements.dropboxBrowserCancelBtn) {
    elements.dropboxBrowserCancelBtn.addEventListener('click', closeDropboxBrowser);
  }
  if (elements.dropboxBrowserSelectBtn) {
    elements.dropboxBrowserSelectBtn.addEventListener('click', selectDropboxFolder);
  }

  // Close Dropbox browser when clicking outside
  if (elements.dropboxBrowserModal) {
    elements.dropboxBrowserModal.addEventListener('click', (e) => {
      if (e.target === elements.dropboxBrowserModal) {
        closeDropboxBrowser();
      }
    });
  }

  // Enter key in new folder input
  if (elements.dropboxNewFolderInput) {
    elements.dropboxNewFolderInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createDropboxFolder();
      }
    });
  }

  // Modal
  elements.modalCancelBtn.addEventListener('click', closeTaskModal);
  elements.modalSaveBtn.addEventListener('click', saveTaskModal);
  elements.modalUndeleteBtn.addEventListener('click', async () => {
    if (state.editingTask && state.editingTask.deleted) {
      await restoreTask(state.editingTask.filePath);
      closeTaskModal();
    }
  });

  elements.modalMoveBtn.addEventListener('click', () => {
    if (state.editingTask) {
      openMoveTaskModal(state.editingTask);
    }
  });

  // Move Task Modal
  elements.moveCancelBtn.addEventListener('click', closeMoveTaskModal);
  elements.moveConfirmBtn.addEventListener('click', confirmMoveTask);

  // Switch to edit mode when clicking on display area
  if (elements.modalDetailsDisplay) {
    elements.modalDetailsDisplay.addEventListener('click', (e) => {
      // Don't switch to edit mode if clicking on a link
      if (!e.target.classList.contains('task-link')) {
        showDetailsEditMode();
      }
    });
  }

  // Switch back to display mode when textarea loses focus
  if (elements.modalDetails) {
    elements.modalDetails.addEventListener('blur', () => {
      showDetailsDisplayMode();
    });
  }

  // Parent task link click handler
  elements.modalParent.addEventListener('click', () => {
    const parentId = elements.modalParent.dataset.parentId;
    if (parentId) {
      const parentTask = findTaskById(state.tasks, parseInt(parentId));
      if (parentTask) {
        closeTaskModal();
        // Small delay to allow modal close animation
        setTimeout(() => {
          openTaskModal(parentTask);
        }, 100);
      }
    }
  });

  // Close modal when clicking outside
  elements.taskModal.addEventListener('click', (e) => {
    if (e.target === elements.taskModal) {
      closeTaskModal();
    }
  });

  // Commit Modal
  elements.commitCancelBtn.addEventListener('click', closeCommitModal);
  elements.commitRollbackBtn.addEventListener('click', handleRollback);

  // Close commit modal when clicking outside
  elements.commitModal.addEventListener('click', (e) => {
    if (e.target === elements.commitModal) {
      closeCommitModal();
    }
  });

  // Escape key to close modals and views
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      // If we're in an input field, clear it and blur
      if (e.target.matches('input[type="text"], textarea')) {
        e.target.value = '';
        e.target.blur();
        return;
      }

      // Check if any modals are open
      if (elements.moveTaskModal.classList.contains('active')) {
        closeMoveTaskModal();
      } else if (elements.taskModal.classList.contains('active')) {
        closeTaskModal();
      } else if (elements.addFolderModal.classList.contains('active')) {
        closeAddFolderModal();
      } else if (elements.commitModal.classList.contains('active')) {
        closeCommitModal();
      } else if (state.currentView === 'help' || state.currentView === 'settings' || state.currentView === 'dashboard') {
        // If in help, settings, or dashboard, return to tasks view
        navigateToView('tasks');
      }
    }
  });

  // Drag and drop
  setupDragAndDrop();

  // Agent
  if (elements.agentSendBtn) {
    elements.agentSendBtn.addEventListener('click', () => {
      const prompt = elements.agentInput?.value?.trim();
      if (prompt) {
        sendAgentMessage(prompt);
      }
    });
  }

  if (elements.agentInput) {
    elements.agentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const prompt = elements.agentInput.value.trim();
        if (prompt) {
          sendAgentMessage(prompt);
        }
      }
    });
  }

  // Agent quick prompts button
  if (elements.agentQuickBtn) {
    elements.agentQuickBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAgentQuickMenu();
    });
  }

  // Close quick menu when clicking outside
  document.addEventListener('click', (e) => {
    if (elements.agentQuickMenu &&
        elements.agentQuickMenu.classList.contains('active') &&
        !e.target.closest('.agent-quick-dropdown')) {
      closeAgentQuickMenu();
    }
  });

  // Timeline zoom controls
  const zoomInBtn = document.getElementById('timeline-zoom-in');
  const zoomOutBtn = document.getElementById('timeline-zoom-out');
  const zoomResetBtn = document.getElementById('timeline-zoom-reset');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', zoomTimelineIn);
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', zoomTimelineOut);
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', resetTimelineZoom);
  }

  // Mouse wheel zoom on timeline (Ctrl+Wheel)
  if (elements.timelineContainer) {
    elements.timelineContainer.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        if (e.deltaY < 0) {
          // Scrolling up - zoom in
          zoomTimelineIn();
        } else {
          // Scrolling down - zoom out
          zoomTimelineOut();
        }
      }
    }, { passive: false });
  }
}

// Helper function to find a task by ID
function findTaskById(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.children && task.children.length > 0) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to find a task by file path
function findTaskByPath(tasks, filePath) {
  for (const task of tasks) {
    if (task.filePath === filePath) {
      return task;
    }
    if (task.children && task.children.length > 0) {
      const found = findTaskByPath(task.children, filePath);
      if (found) return found;
    }
  }
  return null;
}

// ========================================
// Kanban Drag and Drop
// ========================================
function setupKanbanDragAndDrop() {
  const kanbanCards = elements.kanbanBoard.querySelectorAll('.kanban-card');
  const kanbanColumns = elements.kanbanBoard.querySelectorAll('.kanban-column-content');

  kanbanCards.forEach(card => {
    card.addEventListener('dragstart', handleKanbanDragStart);
    card.addEventListener('dragend', handleKanbanDragEnd);
    card.addEventListener('click', handleKanbanCardClick);

    // Add click handlers for links in card descriptions
    card.querySelectorAll('.task-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent card click

        const url = e.currentTarget.dataset.url;
        if (url) {
          try {
            await window.electronAPI.openExternal(url);
          } catch (error) {
            console.error('Error opening link:', error);
          }
        }
      });
    });
  });

  kanbanColumns.forEach(column => {
    column.addEventListener('dragover', handleKanbanDragOver);
    column.addEventListener('drop', handleKanbanDrop);
    column.addEventListener('dragleave', handleKanbanDragLeave);
  });
}

function handleKanbanDragStart(e) {
  const card = e.currentTarget;
  state.draggedTask = {
    path: card.dataset.taskPath,
    id: parseInt(card.dataset.taskId),
    currentStatus: card.dataset.taskStatus
  };

  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleKanbanDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const column = e.currentTarget;
  column.classList.add('drag-over');
}

function handleKanbanDragLeave(e) {
  const column = e.currentTarget;
  // Only remove if we're actually leaving the column
  if (!column.contains(e.relatedTarget)) {
    column.classList.remove('drag-over');
  }
}

async function handleKanbanDrop(e) {
  e.preventDefault();

  const column = e.currentTarget;
  column.classList.remove('drag-over');

  if (!state.draggedTask) return;

  const newStatus = column.dataset.status;
  const taskPath = state.draggedTask.path;

  // If status hasn't changed, no need to update
  if (newStatus === state.draggedTask.currentStatus) {
    return;
  }

  try {
    // Get task info for commit message
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'Unknown task';

    // Update the task status
    const result = await window.electronAPI.tasks.update(taskPath, {
      status: newStatus
    });

    if (result.success) {
      await loadTasks();

      // Commit to git asynchronously (fire-and-forget, don't block UI)
      commitTaskChange(`Change status of "${taskTitle}" to ${newStatus}`).catch(err => {
        console.error('Error committing task change:', err);
      });
    } else {
      console.error('Failed to update task status:', result.error);
    }
  } catch (error) {
    console.error('Error updating task status:', error);
  }
}

function handleKanbanDragEnd(e) {
  const card = e.currentTarget;
  card.classList.remove('dragging');

  // Remove drag-over from all columns
  document.querySelectorAll('.kanban-column-content').forEach(col => {
    col.classList.remove('drag-over');
  });

  state.draggedTask = null;
}

function handleKanbanCardClick(e) {
  // Don't open modal if we're dragging
  if (state.draggedTask) return;

  const card = e.currentTarget;
  const taskPath = card.dataset.taskPath;

  // Multi-select with Ctrl/Shift or single select
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    // Multi-select mode
    selectTask(taskPath, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey });
  } else {
    // Single select - open modal
    selectTask(taskPath);
    const taskId = parseInt(card.dataset.taskId);
    const task = findTaskById(state.tasks, taskId);
    if (task) {
      openTaskModal(task);
    }
  }
}

// ========================================
// View Toggle
// ========================================
async function toggleViewMode(mode) {
  state.taskViewMode = mode;

  // Update button states
  if (elements.viewListBtn && elements.viewKanbanBtn) {
    if (mode === 'list') {
      elements.viewListBtn.classList.add('active');
      elements.viewKanbanBtn.classList.remove('active');
    } else {
      elements.viewListBtn.classList.remove('active');
      elements.viewKanbanBtn.classList.add('active');
    }
  }

  // Re-render with new view mode
  renderTasks();

  // Save preference
  await saveAllSettings();
}

// ========================================
// Initialization
// ========================================
async function init() {
  try {
    // Get app version and platform
    const version = await window.electronAPI.getAppVersion();
    const platform = await window.electronAPI.getPlatform();

    const platformNames = {
      'win32': 'Windows',
      'darwin': 'MacOS',
      'linux': 'Linux'
    };

    const platformIcons = {
      'win32': '🪟',
      'darwin': '🍎',
      'linux': '🐧'
    };

    const platformName = platformNames[platform] || platform;
    const platformIcon = platformIcons[platform] || '💻';

    if (elements.platformInfo) {
      elements.platformInfo.textContent = platformIcon;
      elements.platformInfo.title = platformName; // Show name on hover
    }

    if (elements.settingsPlatform) {
      elements.settingsPlatform.textContent = platformName;
    }

    if (elements.settingsVersion) {
      elements.settingsVersion.textContent = version;
    }

    // Initialize theme
    await initTheme();

    // Setup event listeners
    setupEventListeners();

    // Setup sidebar resizing
    setupSidebarResize();

    // Setup agent resizing
    setupAgentResize();

    // Setup hotkey recorder
    setupHotkeyRecorder();

    // Setup keyboard shortcuts for window controls
    setupKeyboardShortcuts();

    // Load Ollama settings
    await loadOllamaSettings();

    // Load Git settings
    await loadGitSettings();

    // Load Dropbox settings
    await loadDropboxSettings();

    // Initialize the application
    await initializeApp();

    // Listen for system theme changes
    if (window.electronAPI.onThemeChanged) {
      window.electronAPI.onThemeChanged((theme) => {
        if (state.theme === 'auto') {
          document.body.setAttribute('data-theme', theme);
        }
      });
    }

    // Listen for quick add task trigger from global hotkey
    if (window.electronAPI.onQuickAddTask) {
      window.electronAPI.onQuickAddTask(() => {
        // Navigate to tasks view if not already there
        if (state.currentView !== 'tasks') {
          navigateToView('tasks');
        }

        // Focus the task input with a small delay to ensure view is ready
        setTimeout(() => {
          if (elements.taskInput) {
            elements.taskInput.focus();
            elements.taskInput.select();
          }
        }, 50);
      });
    }

  } catch (error) {
    console.error('Failed to initialize app:', error);
    if (elements.platformInfo) {
      elements.platformInfo.textContent = '💻';
      elements.platformInfo.title = 'Unknown';
    }
  }
}

// Start the app
init();

// ========================================
// Application State
// ========================================
const state = {
  currentView: 'tasks',
  tasks: [],
  theme: 'auto',
  taskFolders: [], // Array of {id, name, path} objects
  currentFolderId: null, // Currently active folder ID
  expandedTasks: new Set(), // Track which tasks are expanded
  draggedTask: null, // Track task being dragged
  draggedFolder: null, // Track folder being dragged
  editingTask: null, // Track task being edited in modal
  timelineZoom: 1.0, // Timeline zoom level (1.0 = 100%)
  timelineCommits: [], // Current commits being displayed on timeline
  activeFilters: new Set(['all']), // Track active filters
  sortOrder: 'default', // Track sort order: default, priority, due-date, created
  sidebarWidth: 200, // Sidebar width in pixels
  windowBounds: null, // Window size and position
  globalHotkey: 'CommandOrControl+Alt+T', // Global hotkey for quick add (Electron accelerator format)
  autoLaunch: true, // Launch on Windows startup (default enabled)
  startMinimized: true, // Start minimized to tray (default enabled)
  ollamaPath: null, // Path to ollama executable
  ollamaModel: null, // Selected ollama model
  ollamaAvailable: false, // Whether ollama is detected and working
  gitPath: null, // Path to git executable
  gitAvailable: false, // Whether git is detected and working
  agentQuickPrompts: [ // Quick prompts for AI agent
    { id: 1, label: 'High Priority Tasks', prompt: 'Show my 3 highest priority tasks' },
    { id: 2, label: 'Due in 3 Days', prompt: 'Show the work due in the next 3 days' },
    { id: 3, label: 'What to Work On', prompt: 'What should I work on now?' }
  ],
  ctrlKeyPressed: false // Track Ctrl/Cmd key state for delete button styling
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

  // Add Folder Modal
  addFolderModal: document.getElementById('add-folder-modal'),
  folderPathInput: document.getElementById('folder-path-input'),
  folderNameInput: document.getElementById('folder-name-input'),
  browseFolderBtn: document.getElementById('browse-folder-btn'),
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

  // Git
  gitPathInput: document.getElementById('git-path-input'),
  browseGitBtn: document.getElementById('browse-git-btn'),
  detectGitBtn: document.getElementById('detect-git-btn'),
  gitStatus: document.getElementById('git-status'),
  gitStatusIcon: document.getElementById('git-status-icon'),
  gitStatusText: document.getElementById('git-status-text'),

  // Help
  helpGlobalHotkey: document.getElementById('help-global-hotkey'),

  // Modal
  taskModal: document.getElementById('task-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalDetails: document.getElementById('modal-details'),
  modalPriority: document.getElementById('modal-priority'),
  modalCompleted: document.getElementById('modal-completed'),
  modalDueDate: document.getElementById('modal-due-date'),
  modalCreated: document.getElementById('modal-created'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSaveBtn: document.getElementById('modal-save-btn'),
  modalUndeleteBtn: document.getElementById('modal-undelete-btn'),

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
  commitRollbackBtn: document.getElementById('commit-rollback-btn')
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
      gitPath: state.gitPath,
      gitAvailable: state.gitAvailable,
      agentQuickPrompts: state.agentQuickPrompts,
      timelineZoom: state.timelineZoom
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
  elements.folderPathInput.value = '';
  elements.folderNameInput.value = '';

  // Enable/disable version control checkbox based on git availability
  if (state.gitPath && state.gitAvailable) {
    elements.enableVersionControlCheckbox.disabled = false;
    elements.enableVersionControlCheckbox.parentElement.title = '';
  } else {
    elements.enableVersionControlCheckbox.disabled = true;
    elements.enableVersionControlCheckbox.checked = false;
    elements.enableVersionControlCheckbox.parentElement.title = 'Git must be configured in Settings to enable version control';
  }

  elements.addFolderModal.classList.add('active');
  elements.folderPathInput.focus();
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
  const folderPath = elements.folderPathInput.value.trim();

  if (!folderPath) {
    alert('Please enter or browse for a folder path.');
    return;
  }

  try {
    // Initialize the folder
    const result = await window.electronAPI.tasks.initialize(folderPath);

    if (result.success) {
      // Use custom name or extract from path
      let folderName = elements.folderNameInput.value.trim();
      if (!folderName) {
        const pathParts = result.path.split(/[/\\]/);
        folderName = pathParts[pathParts.length - 1] || 'Tasks';
      }

      // Check if version control should be enabled
      const enableVersionControl = elements.enableVersionControlCheckbox.checked;

      // Initialize git if requested
      if (enableVersionControl && state.gitPath) {
        const gitResult = await window.electronAPI.git.init(state.gitPath, result.path);
        if (!gitResult.success) {
          console.error('Failed to initialize git:', gitResult.error);
          alert('Warning: Could not initialize Git repository: ' + gitResult.error);
        }
      }

      // Create new folder entry
      const newFolder = {
        id: Date.now().toString(),
        name: folderName,
        path: result.path,
        versionControl: enableVersionControl && state.gitPath ? true : false
      };

      state.taskFolders.push(newFolder);
      state.currentFolderId = newFolder.id;

      saveFoldersToStorage();
      renderSidebarFolders();
      renderFolderList();
      await loadTasks();

      closeAddFolderModal();
    } else {
      alert('Failed to initialize folder: ' + result.error);
    }
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

async function switchFolder(folderId) {
  // Save current folder's expanded tasks before switching
  await saveAllSettings();

  state.currentFolderId = folderId;

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
    // Initialize the folder before loading tasks
    const initResult = await window.electronAPI.tasks.initialize(folder.path);
    if (initResult.success) {
      await loadTasks();
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
    return `
      <button class="nav-item folder-nav-item ${isActive ? 'active' : ''}"
              data-folder-id="${folder.id}"
              draggable="true">
        <span class="material-icons nav-icon">folder</span>
        <span class="nav-label">${escapeHtml(folder.name)}</span>
        ${folder.versionControl ? `
          <img src="../assets/git-branch-outline.svg" alt="Git" class="folder-git-icon folder-git-icon-light" title="Version control enabled" />
          <img src="../assets/git-branch-outline-white.svg" alt="Git" class="folder-git-icon folder-git-icon-dark" title="Version control enabled" />
        ` : ''}
      </button>
    `;
  }).join('');

  // Add click handlers
  elements.sidebarFolders.querySelectorAll('.folder-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Only trigger switch if not dragging
      if (!state.draggedFolder) {
        const folderId = btn.dataset.folderId;
        switchFolder(folderId);
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

  elements.folderList.innerHTML = state.taskFolders.map(folder => `
    <div class="folder-item">
      <div class="folder-item-info">
        <div class="folder-item-name">
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
        <div class="folder-item-path" title="${escapeHtml(folder.path)}">${escapeHtml(folder.path)}</div>
      </div>
      <div class="folder-item-actions">
        <button class="folder-item-btn" data-folder-id="${folder.id}" data-action="remove" title="Remove folder (Ctrl+click to permanently delete from disk)">
          <span class="material-icons folder-delete-icon">delete</span>
          <span class="material-icons folder-delete-icon-permanent">delete_forever</span>
        </button>
      </div>
    </div>
  `).join('');

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
    item.classList.remove('drop-above', 'drop-below');
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
        // Initialize the folder
        const result = await window.electronAPI.tasks.initialize(currentFolder.path);
        if (result.success) {
          await loadTasks();
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
async function commitTaskChange(message) {
  try {
    // Only commit if git is configured and current folder has version control enabled
    const currentFolder = getCurrentFolder();
    if (!currentFolder || !currentFolder.versionControl) {
      return; // Skip git operations if not enabled
    }

    if (!state.gitPath || !state.gitAvailable) {
      console.log('Git not configured, skipping commit');
      return;
    }

    // Stage all changes (the git:add handler will poll until files are written)
    const addResult = await window.electronAPI.git.add(state.gitPath, currentFolder.path, '.');
    if (!addResult.success) {
      console.error('Git add failed:', addResult.error);
      return; // Don't block task operations if git fails
    }

    // Commit the changes
    const commitResult = await window.electronAPI.git.commit(state.gitPath, currentFolder.path, message);
    if (!commitResult.success) {
      console.error('Git commit failed:', commitResult.error);
      return; // Don't block task operations if git fails
    }

    console.log('Git commit successful:', message);

    // Reload timeline to show the new commit
    await loadTimeline();
  } catch (error) {
    console.error('Error committing to git:', error);
    // Don't block task operations if git fails
  }
}

// ========================================
// Git Timeline
// ========================================
async function loadTimeline() {
  try {
    const currentFolder = getCurrentFolder();

    // Hide timeline if folder doesn't have version control
    if (!currentFolder || !currentFolder.versionControl) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
      return;
    }

    if (!state.gitPath || !state.gitAvailable) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
      return;
    }

    // Load git history
    const result = await window.electronAPI.git.log(state.gitPath, currentFolder.path);

    if (!result.success || !result.commits || result.commits.length === 0) {
      elements.timelineSection.style.display = 'none';
      state.timelineCommits = [];
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
async function loadTasks() {
  try {
    const result = await window.electronAPI.tasks.load();

    if (result.success) {
      state.tasks = result.tasks;
      renderTasks();
      updateProfileStats();
      updateDeletedCount();
      await loadTimeline(); // Load git timeline
    } else {
      console.error('Failed to load tasks:', result.error);
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
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
      await loadTasks(); // Reload all tasks

      // Commit to git if version control is enabled
      await commitTaskChange(`Create task: ${taskText}`);

      elements.taskInput.value = '';
      elements.taskInput.focus();
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

      // Commit to git if version control is enabled
      await commitTaskChange(commitMessage);
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

      // Commit to git if version control is enabled
      const action = !currentCompleted ? 'Complete' : 'Uncomplete';
      await commitTaskChange(`${action} task: ${taskTitle}`);
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

        // Commit to git if version control is enabled
        await commitTaskChange(`Update task: ${newText}`);
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
function openTaskModal(task) {
  state.editingTask = task;

  // Populate modal fields
  elements.modalTitle.value = task.title;
  elements.modalDetails.value = task.body || '';
  elements.modalPriority.value = task.priority || 'normal';
  elements.modalCompleted.checked = task.completed || false;
  elements.modalDueDate.value = task.dueDate || '';

  // Format created date for display
  const createdDate = new Date(task.created);
  elements.modalCreated.value = createdDate.toLocaleString();

  // Show/hide undelete button based on deleted status
  if (task.deleted) {
    elements.modalUndeleteBtn.style.display = 'block';
  } else {
    elements.modalUndeleteBtn.style.display = 'none';
  }

  // Show modal
  elements.taskModal.classList.add('active');
}

function closeTaskModal() {
  state.editingTask = null;
  elements.taskModal.classList.remove('active');

  // Clear form
  elements.modalTitle.value = '';
  elements.modalDetails.value = '';
  elements.modalPriority.value = 'normal';
  elements.modalCompleted.checked = false;
  elements.modalDueDate.value = '';
  elements.modalCreated.value = '';
}

async function saveTaskModal() {
  if (!state.editingTask) return;

  const updates = {
    title: elements.modalTitle.value.trim(),
    body: elements.modalDetails.value.trim(),
    priority: elements.modalPriority.value,
    completed: elements.modalCompleted.checked,
    dueDate: elements.modalDueDate.value || null
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
// Task Filtering
// ========================================
function toggleFilterDropdown() {
  const isActive = elements.filterMenu.classList.toggle('active');
  elements.filterToggleBtn.classList.toggle('active', isActive);
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

        // Commit to git if version control is enabled
        await commitTaskChange(`Move task "${draggedTitle}" to sibling of "${targetTitle}"`);
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

        // Commit to git if version control is enabled
        await commitTaskChange(`Move task "${draggedTitle}" to child of "${targetTitle}"`);
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

    // Load quick prompts (use defaults if not saved)
    if (result.config.agentQuickPrompts && result.config.agentQuickPrompts.length > 0) {
      state.agentQuickPrompts = result.config.agentQuickPrompts;
    }

    // Update UI
    if (state.ollamaPath && elements.ollamaPathInput) {
      elements.ollamaPathInput.value = state.ollamaPath;

      // Try to load models if we have a path
      if (state.ollamaAvailable) {
        await listOllamaModels(state.ollamaPath);
      }
    }

    // Render prompts and update agent dropdown
    renderPromptsList();
    updateAgentQuickMenu();

    // Update agent model display
    updateAgentModelDisplay();
  }
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

    // Handle restore button
    if (e.target.classList.contains('task-restore')) {
      const taskItem = e.target.closest('.task-item');
      const taskPath = taskItem.dataset.taskPath;
      restoreTask(taskPath);
      return;
    }

    // Handle delete button
    if (e.target.classList.contains('task-delete')) {
      const taskItem = e.target.closest('.task-item');
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

    // Handle task item click (anywhere else) - open modal
    const taskItem = e.target.closest('.task-item');
    if (taskItem && !e.target.classList.contains('task-checkbox')) {
      const taskId = parseInt(taskItem.dataset.taskId);
      const task = findTaskById(state.tasks, taskId);
      if (task) {
        openTaskModal(task);
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

  // Expand/Collapse All
  elements.expandCollapseBtn.addEventListener('click', toggleExpandCollapseAll);

  // Filter
  elements.filterToggleBtn.addEventListener('click', toggleFilterDropdown);
  elements.filterMenu.addEventListener('change', handleFilterChange);

  // Sort
  elements.sortToggleBtn.addEventListener('click', toggleSortDropdown);
  elements.sortMenu.addEventListener('change', handleSortChange);

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

  // Add Folder Modal
  elements.browseFolderBtn.addEventListener('click', browseFolderForModal);
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
  elements.detectGitBtn.addEventListener('click', detectGit);
  elements.browseGitBtn.addEventListener('click', browseForGit);

  // Modal
  elements.modalCancelBtn.addEventListener('click', closeTaskModal);
  elements.modalSaveBtn.addEventListener('click', saveTaskModal);
  elements.modalUndeleteBtn.addEventListener('click', async () => {
    if (state.editingTask && state.editingTask.deleted) {
      await restoreTask(state.editingTask.filePath);
      closeTaskModal();
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

  // Escape key to close modals
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      // If we're in an input field, clear it and blur
      if (e.target.matches('input[type="text"], textarea')) {
        e.target.value = '';
        e.target.blur();
        return;
      }

      // Check if any modals are open
      if (elements.taskModal.classList.contains('active')) {
        closeTaskModal();
      } else if (elements.addFolderModal.classList.contains('active')) {
        closeAddFolderModal();
      } else if (elements.commitModal.classList.contains('active')) {
        closeCommitModal();
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

    // Setup hotkey recorder
    setupHotkeyRecorder();

    // Setup keyboard shortcuts for window controls
    setupKeyboardShortcuts();

    // Load Ollama settings
    await loadOllamaSettings();

    // Load Git settings
    await loadGitSettings();

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

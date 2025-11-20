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
  agentQuickPrompts: [ // Quick prompts for AI agent
    { id: 1, label: 'High Priority Tasks', prompt: 'Show my 3 highest priority tasks' },
    { id: 2, label: 'Due in 3 Days', prompt: 'Show the work due in the next 3 days' },
    { id: 3, label: 'What to Work On', prompt: 'What should I work on now?' }
  ]
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

  // Help Modal
  helpModal: document.getElementById('help-modal'),
  helpBtn: document.getElementById('help-btn'),
  helpCloseBtn: document.getElementById('help-close-btn'),
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
  agentQuickSelect: document.getElementById('agent-quick-select')
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
      agentQuickPrompts: state.agentQuickPrompts
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
  elements.addFolderModal.classList.add('active');
  elements.folderPathInput.focus();
}

function closeAddFolderModal() {
  elements.addFolderModal.classList.remove('active');
  elements.folderPathInput.value = '';
  elements.folderNameInput.value = '';
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

      // Create new folder entry
      const newFolder = {
        id: Date.now().toString(),
        name: folderName,
        path: result.path
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

async function removeFolder(folderId) {
  if (confirm('Are you sure you want to remove this folder? The files will not be deleted, only removed from this app.')) {
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
          <input type="text" value="${escapeHtml(folder.name)}"
                 data-folder-id="${folder.id}"
                 class="folder-name-input" />
        </div>
        <div class="folder-item-path" title="${escapeHtml(folder.path)}">${escapeHtml(folder.path)}</div>
      </div>
      <div class="folder-item-actions">
        <button class="folder-item-btn" data-folder-id="${folder.id}" data-action="remove" title="Remove folder">
          <span class="material-icons">delete</span>
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
      removeFolder(folderId);
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

async function deleteTask(taskPath, isDeleted) {
  try {
    let result;

    if (isDeleted) {
      // Permanently delete if already in deleted folder
      result = await window.electronAPI.tasks.permanentlyDelete(taskPath);
    } else {
      // Move to deleted folder
      result = await window.electronAPI.tasks.delete(taskPath);
    }

    if (result.success) {
      await loadTasks();
    } else {
      console.error('Failed to delete task:', result.error);
    }
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

async function restoreTask(taskPath) {
  try {
    const result = await window.electronAPI.tasks.restore(taskPath);

    if (result.success) {
      await loadTasks();
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
    const result = await window.electronAPI.tasks.update(taskPath, {
      completed: !currentCompleted
    });

    if (result.success) {
      await loadTasks();
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
          const threeDaysFromNow = new Date(today);
          threeDaysFromNow.setDate(today.getDate() + 3);

          if (dueDate >= today && dueDate <= threeDaysFromNow) {
            matches = true;
          }
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
        </div>

        <div class="task-actions">
          ${isDeleted ? '<button class="task-restore" title="Restore task">+</button>' : ''}
          <button class="task-delete" title="${isDeleted ? 'Permanently delete task' : 'Delete task'}">✕</button>
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
// Help Modal
// ========================================
function openHelpModal() {
  // Update global hotkey display in help modal
  if (elements.helpGlobalHotkey && state.globalHotkey) {
    elements.helpGlobalHotkey.textContent = acceleratorToDisplay(state.globalHotkey);
  }
  elements.helpModal.classList.add('active');
}

function closeHelpModal() {
  elements.helpModal.classList.remove('active');
}

// ========================================
// Keyboard Shortcuts
// ========================================
function setupKeyboardShortcuts() {
  // Track Ctrl key state for Ctrl+Click to exit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      if (window.electronAPI.setCtrlKeyState) {
        window.electronAPI.setCtrlKeyState(true);
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      if (window.electronAPI.setCtrlKeyState) {
        window.electronAPI.setCtrlKeyState(false);
      }
    }
  });

  // Window blur also means Ctrl is released
  window.addEventListener('blur', () => {
    if (window.electronAPI.setCtrlKeyState) {
      window.electronAPI.setCtrlKeyState(false);
    }
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

async function handleOllamaModelChange(event) {
  state.ollamaModel = event.target.value;
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
    updateAgentQuickSelect();
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
          updateAgentQuickSelect();
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

function updateAgentQuickSelect() {
  if (!elements.agentQuickSelect) return;

  // Save current value
  const currentValue = elements.agentQuickSelect.value;

  // Clear and rebuild options
  elements.agentQuickSelect.innerHTML = '<option value="">Quick Prompts...</option>';

  state.agentQuickPrompts.forEach(prompt => {
    const option = document.createElement('option');
    option.value = prompt.prompt;
    option.textContent = prompt.label;
    elements.agentQuickSelect.appendChild(option);
  });

  // Restore selection if it still exists
  if (currentValue) {
    elements.agentQuickSelect.value = currentValue;
  }
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
  updateAgentQuickSelect();

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
  updateAgentQuickSelect();
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

function handleAgentQuickPrompt() {
  const prompt = elements.agentQuickSelect?.value;
  if (prompt) {
    sendAgentMessage(prompt);
    // Reset the select to placeholder after sending
    if (elements.agentQuickSelect) {
      elements.agentQuickSelect.value = '';
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
      deleteTask(taskPath, isDeleted);
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
      } else if (elements.helpModal.classList.contains('active')) {
        closeHelpModal();
      }
    }
  });

  // Help button
  elements.helpBtn.addEventListener('click', openHelpModal);
  elements.helpCloseBtn.addEventListener('click', closeHelpModal);

  // Close help modal when clicking outside
  elements.helpModal.addEventListener('click', (e) => {
    if (e.target === elements.helpModal) {
      closeHelpModal();
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

  if (elements.agentQuickSelect) {
    elements.agentQuickSelect.addEventListener('change', handleAgentQuickPrompt);
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

// ========================================
// Constants
// ========================================
const DEFAULT_OLLAMA_SYSTEM_PROMPT = `SYSTEM ROLE — Task Engineering Prioritizer

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
  textContextTarget: null, // Track input/textarea for text context menu
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
  ollamaUrl: 'http://localhost:11434', // Ollama HTTP API URL
  ollamaPath: null, // Deprecated - keeping for backwards compat
  ollamaModel: null, // Selected ollama model for chat
  ollamaEmbeddingModel: null, // Selected ollama model for embeddings
  ollamaSystemPrompt: null, // Custom system prompt for AI agent (null = use default)
  ollamaAvailable: false, // Whether ollama is detected and working
  // Vector DB settings removed - now embedded and auto-configured
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
  lastSelectedTaskPath: null, // Track last selected task for shift-click range selection
  enableOkrs: false, // Enable OKR tracking
  enableGoals: false // Enable Annual Goals tracking
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
    'goals-view': document.getElementById('goals-view'),
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
  enableOkrsCheckbox: document.getElementById('enable-okrs-checkbox'),
  enableGoalsCheckbox: document.getElementById('enable-goals-checkbox'),

  // Sidebar Sections
  okrsSection: document.getElementById('okrs-section'),
  goalsSection: document.getElementById('goals-section'),

  // Ollama
  ollamaPathInput: document.getElementById('ollama-path-input'),
  detectOllamaBtn: document.getElementById('detect-ollama-btn'),
  ollamaModelSelect: document.getElementById('ollama-model-select'),
  ollamaModelSection: document.getElementById('ollama-model-section'),
  ollamaEmbeddingModelSelect: document.getElementById('ollama-embedding-model-select'),
  ollamaEmbeddingModelSection: document.getElementById('ollama-embedding-model-section'),
  refreshModelsBtn: document.getElementById('refresh-models-btn'),
  ollamaStatus: document.getElementById('ollama-status'),
  ollamaStatusIcon: document.getElementById('ollama-status-icon'),
  ollamaStatusText: document.getElementById('ollama-status-text'),
  ollamaSystemPrompt: document.getElementById('ollama-system-prompt'),
  ollamaSystemPromptSection: document.getElementById('ollama-system-prompt-section'),
  resetSystemPromptBtn: document.getElementById('reset-system-prompt-btn'),

  // Embeddings Status
  embeddingsStatus: document.getElementById('embeddings-status'),
  embeddingsStatusIcon: document.getElementById('embeddings-status-icon'),
  embeddingsStatusText: document.getElementById('embeddings-status-text'),
  regenerateEmbeddingsBtn: document.getElementById('regenerate-embeddings-btn'),

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
  agentChat: document.getElementById('agent-chat'),
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

  // Goal Modal
  goalModal: document.getElementById('goal-modal'),
  goalModalYear: document.getElementById('goal-modal-year'),
  goalModalTitle: document.getElementById('goal-modal-title'),
  goalModalDescription: document.getElementById('goal-modal-description'),
  goalModalWhy: document.getElementById('goal-modal-why'),
  goalModalSuccess: document.getElementById('goal-modal-success'),
  goalModalMilestones: document.getElementById('goal-modal-milestones'),
  goalModalStatus: document.getElementById('goal-modal-status'),
  goalModalConfidence: document.getElementById('goal-modal-confidence'),
  goalModalLinkedTasks: document.getElementById('goal-modal-linked-tasks'),
  goalModalCreated: document.getElementById('goal-modal-created'),
  goalModalCancelBtn: document.getElementById('goal-modal-cancel-btn'),
  goalModalSaveBtn: document.getElementById('goal-modal-save-btn'),
  goalModalDeleteBtn: document.getElementById('goal-modal-delete-btn'),
  addMilestoneBtn: document.getElementById('add-milestone-btn'),
  linkTaskBtn: document.getElementById('link-task-btn'),
  addGoalBtn: document.getElementById('add-goal-btn'),

  // Context Menu
  taskContextMenu: document.getElementById('task-context-menu'),
  textContextMenu: document.getElementById('text-context-menu')
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

    // Check embeddings status
    await checkEmbeddingsStatus();

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

    // Load feature toggles (default to false)
    state.enableOkrs = result.config.enableOkrs || false;
    state.enableGoals = result.config.enableGoals || false;

    // Initialize goals sidebar if goals are enabled
    if (state.enableGoals) {
      await initializeGoalsSidebar();
    }

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
      ollamaUrl: state.ollamaUrl,
      ollamaModel: state.ollamaModel,
      ollamaEmbeddingModel: state.ollamaEmbeddingModel,
      ollamaSystemPrompt: state.ollamaSystemPrompt,
      ollamaAvailable: state.ollamaAvailable,
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
      agentHeight: state.agentHeight,
      enableOkrs: state.enableOkrs,
      enableGoals: state.enableGoals
    });
  } finally {
    hideSavingIndicator();
  }
}

function getCurrentFolder() {
  if (!state.currentFolderId) return null;
  return state.taskFolders.find(f => f.id === state.currentFolderId);
}

// ========================================
// Embeddings Helper Functions
// ========================================

/**
 * Check if embeddings are enabled for the current folder
 * @returns {boolean}
 */
function areEmbeddingsEnabled() {
  // Embeddings are now always enabled for all folders (using embedded ChromaDB)
  return true;
}

/**
 * Generate text representation of a task for embeddings
 * @param {Object} task - Task object
 * @returns {string}
 */
function generateTaskText(task) {
  const parts = [];

  if (task.title) {
    parts.push(task.title);
  }

  if (task.details || task.body) {
    parts.push(task.details || task.body);
  }

  return parts.join('\n\n').trim();
}

/**
 * Extract metadata from a task for embeddings
 * @param {Object} task - Task object
 * @returns {Object}
 */
function extractTaskMetadata(task) {
  return {
    title: task.title || '',
    details: task.details || task.body || '',
    priority: task.priority || 'normal',
    status: task.status || 'Pending',
    completed: task.completed || false,
    dueDate: task.dueDate || null,
    created: task.created || new Date().toISOString(),
    path: task.path || task.filePath || '',
    folderId: state.currentFolderId
  };
}

/**
 * Generate and store embeddings for a task (fire-and-forget)
 * @param {Object} task - Task object
 */
async function generateTaskEmbeddings(task) {
  if (!areEmbeddingsEnabled()) {
    return; // Embeddings not enabled, skip silently
  }

  try {
    const taskText = generateTaskText(task);
    if (!taskText || taskText.trim().length === 0) {
      return; // No text content, skip
    }

    const taskId = task.path || task.filePath;
    if (!taskId) {
      console.warn('[Embeddings] Task ID missing, cannot generate embeddings');
      return;
    }

    const metadata = extractTaskMetadata(task);

    // Generate and store embeddings (async, don't await)
    window.electronAPI.vectordb.storeEmbeddings(taskId, taskText, metadata).catch(err => {
      console.error('[Embeddings] Failed to generate embeddings for task:', taskId, err);
    });
  } catch (error) {
    console.error('[Embeddings] Error in generateTaskEmbeddings:', error);
  }
}

/**
 * Update embeddings for a task (fire-and-forget)
 * @param {Object} task - Task object
 */
async function updateTaskEmbeddings(task) {
  if (!areEmbeddingsEnabled()) {
    return; // Embeddings not enabled, skip silently
  }

  try {
    const taskText = generateTaskText(task);
    if (!taskText || taskText.trim().length === 0) {
      // No text content, delete embeddings if they exist
      const taskId = task.path || task.filePath;
      if (taskId) {
        window.electronAPI.vectordb.deleteEmbeddings(taskId).catch(err => {
          console.error('[Embeddings] Failed to delete embeddings:', err);
        });
      }
      return;
    }

    const taskId = task.path || task.filePath;
    if (!taskId) {
      console.warn('[Embeddings] Task ID missing, cannot update embeddings');
      return;
    }

    const metadata = extractTaskMetadata(task);

    // Update embeddings (async, don't await)
    window.electronAPI.vectordb.updateEmbeddings(taskId, taskText, metadata).catch(err => {
      console.error('[Embeddings] Failed to update embeddings for task:', taskId, err);
    });
  } catch (error) {
    console.error('[Embeddings] Error in updateTaskEmbeddings:', error);
  }
}

/**
 * Delete embeddings for a task (fire-and-forget)
 * @param {string} taskPath - Task path/ID
 */
async function deleteTaskEmbeddings(taskPath) {
  if (!areEmbeddingsEnabled()) {
    return; // Embeddings not enabled, skip silently
  }

  try {
    if (!taskPath) {
      console.warn('[Embeddings] Task path missing, cannot delete embeddings');
      return;
    }

    // Delete embeddings (async, don't await)
    window.electronAPI.vectordb.deleteEmbeddings(taskPath).catch(err => {
      console.error('[Embeddings] Failed to delete embeddings for task:', taskPath, err);
    });
  } catch (error) {
    console.error('[Embeddings] Error in deleteTaskEmbeddings:', error);
  }
}

/**
 * Handle embeddings after a task has been moved to a new path
 * Deletes old embeddings and generates new ones with the new path
 * @param {string} oldPath - Original task path (used as embedding ID)
 * @param {string} newPath - New task path after move
 */
async function handleTaskPathChange(oldPath, newPath) {
  if (!areEmbeddingsEnabled()) {
    return;
  }

  try {
    console.log('[Embeddings] Handling path change from', oldPath, 'to', newPath);

    // Delete embeddings at the old path
    await deleteTaskEmbeddings(oldPath);

    // Also delete any embeddings that might already exist at the new path
    // (in case the task was previously at this location)
    await deleteTaskEmbeddings(newPath);

    // Find the task at the new path in the task tree
    const movedTask = findTaskByPath(state.tasks, newPath);
    if (movedTask) {
      // Generate fresh embeddings with the new path as ID
      // Important: Use newPath directly as ID, not movedTask.filePath
      // This ensures we use the correct path even if the task object has stale data
      const text = `${movedTask.title}\n${movedTask.body || ''}`.trim();
      const metadata = {
        title: movedTask.title,
        body: movedTask.body || '',
        priority: movedTask.priority,
        dueDate: movedTask.dueDate,
        status: movedTask.status
      };

      const result = await window.electronAPI.vectordb.storeEmbeddings(
        newPath,  // Use newPath directly as ID
        text,
        metadata
      );

      if (result.success) {
        console.log('[Embeddings] Updated embeddings for moved task at:', newPath);
      } else {
        console.error('[Embeddings] Failed to update embeddings:', result.error);
      }
    } else {
      console.warn('[Embeddings] Could not find task at new path:', newPath);
      console.warn('[Embeddings] Embeddings will be regenerated on next edit');
    }
  } catch (error) {
    console.error('[Embeddings] Error handling task path change:', error);
  }
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
      versionControl: enableVersionControl && state.gitPath ? true : false,
      embeddingsEnabled: true // Embeddings are always enabled (automatic)
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
      const oldPath = state.draggedTask.path;

      // Move task to target folder root (no parent)
      const result = await window.electronAPI.tasks.moveToFolder(
        oldPath,
        targetFolderId,
        null // No parent - move to root
      );

      if (result.success) {
        await loadTasks(); // Reload tasks

        // Update embeddings after path change
        await handleTaskPathChange(oldPath, result.newPath);

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

function setupSidebarSectionCollapse() {
  // Event delegation for sidebar section headers
  document.addEventListener('click', (e) => {
    const sectionHeader = e.target.closest('.sidebar-section-header');
    if (sectionHeader) {
      const section = sectionHeader.closest('.sidebar-section');
      if (section) {
        section.classList.toggle('collapsed');
      }
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

  // Restore OKRs and Goals checkboxes and section visibility
  if (elements.enableOkrsCheckbox) {
    elements.enableOkrsCheckbox.checked = state.enableOkrs;
    elements.okrsSection.style.display = state.enableOkrs ? 'block' : 'none';
  }
  if (elements.enableGoalsCheckbox) {
    elements.enableGoalsCheckbox.checked = state.enableGoals;
    elements.goalsSection.style.display = state.enableGoals ? 'block' : 'none';
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

async function loadOkrs() {
  try {
    // Navigate to tasks view first
    navigateToView('tasks');

    // Load OKRs data
    const result = await window.electronAPI.okrs.load();

    if (result.success) {
      state.tasks = result.okrs;
      // Add parent IDs to all OKRs for easy parent lookup
      addParentIds(state.tasks);
      renderTasks();
      updateDeletedCount();
    } else {
      console.error('Failed to load OKRs:', result.error);
      state.tasks = [];
      renderTasks();
    }
  } catch (error) {
    console.error('Error loading OKRs:', error);
    state.tasks = [];
    renderTasks();
  }
}

async function initializeGoalsSidebar() {
  try {
    // Load Goals data
    const result = await window.electronAPI.goals.load();

    if (result.success) {
      state.goals = result.goals || [];

      // Organize goals by year
      const goalsByYear = {};
      state.goals.forEach(goal => {
        const goalYear = goal.goalYear || new Date().getFullYear();
        if (!goalsByYear[goalYear]) {
          goalsByYear[goalYear] = [];
        }
        goalsByYear[goalYear].push(goal);
      });

      // If no goals exist, add placeholder for current year
      const currentYear = new Date().getFullYear();
      if (Object.keys(goalsByYear).length === 0) {
        goalsByYear[currentYear] = [];
      }

      state.goalsByYear = goalsByYear;
      // Don't set selectedGoalYear here - only when actually viewing goals
      state.selectedGoalYear = null;

      // Render sidebar with year subsections (no year will be highlighted)
      renderGoalsSidebar();
    }
  } catch (error) {
    console.error('Error initializing goals sidebar:', error);
  }
}

async function loadGoals(year = null) {
  try {
    // Clear folder selection when viewing goals
    state.currentFolderId = null;
    renderSidebarFolders();

    // Load Goals data
    const result = await window.electronAPI.goals.load();

    if (result.success) {
      state.goals = result.goals || [];

      // Organize goals by year
      const goalsByYear = {};
      state.goals.forEach(goal => {
        const goalYear = goal.goalYear || new Date().getFullYear();
        if (!goalsByYear[goalYear]) {
          goalsByYear[goalYear] = [];
        }
        goalsByYear[goalYear].push(goal);
      });

      // If no goals exist, add placeholder for current year
      const currentYear = new Date().getFullYear();
      if (Object.keys(goalsByYear).length === 0) {
        goalsByYear[currentYear] = [];
      }

      state.goalsByYear = goalsByYear;

      // Set selected year before rendering sidebar
      const selectedYear = year || currentYear;
      state.selectedGoalYear = selectedYear;

      // Render sidebar with year subsections
      renderGoalsSidebar();

      // Navigate to goals view and render
      navigateToView('goals-view');
      renderGoals();
    } else {
      console.error('Failed to load Goals:', result.error);
      state.goals = [];
      state.goalsByYear = {};
      state.currentFolderId = null;
      renderSidebarFolders();
      renderGoalsSidebar();
      navigateToView('goals-view');
      renderGoals();
    }
  } catch (error) {
    console.error('Error loading Goals:', error);
    state.goals = [];
    state.goalsByYear = {};
    state.currentFolderId = null;
    renderSidebarFolders();
    renderGoalsSidebar();
    navigateToView('goals-view');
    renderGoals();
  }
}

// ========================================
// Goals Rendering Functions
// ========================================

function renderGoals() {
  const container = document.getElementById('goals-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  // Filter goals by selected year
  const selectedYear = state.selectedGoalYear || new Date().getFullYear();
  const yearGoals = state.goalsByYear && state.goalsByYear[selectedYear] ? state.goalsByYear[selectedYear] : [];

  if (yearGoals.length === 0) {
    container.innerHTML = `<p class="empty-state">No goals for ${selectedYear} yet. Click "Add Goal" to create your first annual goal!</p>`;
    return;
  }

  // Render each goal as a card
  yearGoals.forEach(goal => {
    const card = createGoalCard(goal);
    container.appendChild(card);
  });
}

function renderGoalsSidebar() {
  const sidebar = document.getElementById('sidebar-goals');
  if (!sidebar) return;

  // Clear sidebar
  sidebar.innerHTML = '';

  // Get years sorted in descending order (newest first)
  const years = Object.keys(state.goalsByYear || {}).map(y => parseInt(y)).sort((a, b) => b - a);

  if (years.length === 0) {
    // Show placeholder for current year if no goals exist
    const currentYear = new Date().getFullYear();
    years.push(currentYear);
  }

  // Create year subsections
  years.forEach(year => {
    const yearItem = document.createElement('div');
    yearItem.className = 'sidebar-item';
    yearItem.dataset.year = year;

    // Highlight selected year
    if (year === state.selectedGoalYear) {
      yearItem.classList.add('active');
    }

    const goalsCount = (state.goalsByYear && state.goalsByYear[year]) ? state.goalsByYear[year].length : 0;
    yearItem.innerHTML = `
      <span class="sidebar-item-text">${year}</span>
      ${goalsCount > 0 ? `<span class="sidebar-item-count">${goalsCount}</span>` : ''}
    `;

    // Click handler to load goals for this year
    yearItem.addEventListener('click', (e) => {
      e.stopPropagation();
      loadGoals(year);
    });

    sidebar.appendChild(yearItem);
  });
}

function createGoalCard(goal) {
  const card = document.createElement('div');
  card.className = 'goal-card';
  card.dataset.goalId = goal.id;

  // Calculate progress from linked tasks
  const progress = calculateGoalProgress(goal);

  // Determine status class
  const statusClass = (goal.goalStatus || 'On Track').toLowerCase().replace(/\s+/g, '-');

  card.innerHTML = `
    <div class="goal-card-header">
      <div class="goal-card-title-section">
        <h3 class="goal-card-title">${escapeHtml(goal.title || 'Untitled Goal')}</h3>
        <div class="goal-card-status-row">
          <span class="goal-status-badge ${statusClass}">${escapeHtml(goal.goalStatus || 'On Track')}</span>
          ${goal.confidenceLevel !== null && goal.confidenceLevel !== undefined ? `
            <div class="goal-confidence">
              <span>${goal.confidenceLevel}%</span>
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${goal.confidenceLevel}%"></div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      <span class="material-icons goal-card-expand-icon">expand_more</span>
    </div>

    <div class="goal-card-body">
      ${goal.body ? `
        <div class="goal-section">
          <div class="goal-section-title">Description</div>
          <div class="goal-section-content">${escapeHtml(goal.body)}</div>
        </div>
      ` : ''}

      ${goal.whyItMatters ? `
        <div class="goal-section">
          <div class="goal-section-title">Why It Matters</div>
          <div class="goal-section-content">${escapeHtml(goal.whyItMatters)}</div>
        </div>
      ` : ''}

      ${goal.successCriteria ? `
        <div class="goal-section">
          <div class="goal-section-title">Success Criteria</div>
          <div class="goal-section-content">${escapeHtml(goal.successCriteria)}</div>
        </div>
      ` : ''}

      ${goal.keyMilestones && goal.keyMilestones.length > 0 ? `
        <div class="goal-section">
          <div class="goal-section-title">Key Milestones</div>
          <div class="milestones-list">
            ${goal.keyMilestones.map(milestone => `
              <div class="milestone-item ${milestone.completed ? 'completed' : ''}">
                <input type="checkbox" class="milestone-checkbox" ${milestone.completed ? 'checked' : ''} disabled />
                <div class="milestone-content">
                  <div class="milestone-title">${escapeHtml(milestone.title || 'Untitled Milestone')}</div>
                  ${milestone.date ? `<div class="milestone-date">Target: ${new Date(milestone.date).toLocaleDateString()}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${goal.linkedTasks && goal.linkedTasks.length > 0 ? `
        <div class="goal-section">
          <div class="goal-section-title">Linked Tasks (${progress.completed}/${progress.total})</div>
          <div class="linked-tasks-list">
            ${goal.linkedTasks.map(taskId => {
              const task = findTaskById(taskId);
              return task ? `
                <div class="linked-task-item ${task.completed ? 'completed' : ''}">
                  <div class="linked-task-info">
                    <input type="checkbox" class="linked-task-checkbox" ${task.completed ? 'checked' : ''} disabled />
                    <span class="linked-task-title">${escapeHtml(task.title || 'Untitled Task')}</span>
                  </div>
                </div>
              ` : '';
            }).join('')}
          </div>
          <div class="goal-progress-section">
            <div class="progress-rollup">
              <div class="progress-rollup-bar">
                <div class="progress-rollup-fill" style="width: ${progress.percentage}%"></div>
              </div>
              <div class="progress-rollup-text">
                <span>Progress: ${progress.percentage}%</span>
                <span>${progress.completed} of ${progress.total} tasks complete</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="goal-card-actions">
        <button class="goal-card-action-btn">
          <span class="material-icons">edit</span>
          <span>Edit</span>
        </button>
      </div>
    </div>
  `;

  // Add click handler for expand/collapse (only on header, not on body)
  const header = card.querySelector('.goal-card-header');
  header.addEventListener('click', (e) => {
    // Don't toggle if clicking on action buttons
    if (!e.target.closest('.goal-card-action-btn')) {
      card.classList.toggle('expanded');
    }
  });

  // Add click handler for edit button
  const editBtn = card.querySelector('.goal-card-action-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent card expansion
    openGoalEditModal(goal.id);
  });

  return card;
}

function calculateGoalProgress(goal) {
  if (!goal.linkedTasks || goal.linkedTasks.length === 0) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  let total = 0;
  let completed = 0;

  goal.linkedTasks.forEach(taskId => {
    const task = findTaskById(taskId);
    if (task) {
      total++;
      if (task.completed) {
        completed++;
      }
    }
  });

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

function findTaskById(taskId) {
  // Search through all tasks in state.tasks to find matching task
  // This is a simplified version - in production you'd want a more efficient lookup
  function searchTasks(tasks) {
    for (const task of tasks) {
      if (task.id === taskId || task.filePath === taskId) {
        return task;
      }
      if (task.children && task.children.length > 0) {
        const found = searchTasks(task.children);
        if (found) return found;
      }
    }
    return null;
  }

  return searchTasks(state.tasks || []);
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
    // Determine parent path based on currently selected task
    let parentPath = currentFolder.path;

    if (state.lastSelectedTaskPath) {
      // Get the selected task
      const selectedTask = findTaskByPath(state.tasks, state.lastSelectedTaskPath);

      if (selectedTask) {
        // Get the parent of the selected task (same level as selected)
        const selectedTaskPath = selectedTask.filePath;
        const pathParts = selectedTaskPath.split(/[/\\]/);

        // If the selected task is nested (has parent folder(s))
        if (pathParts.length > 1) {
          // Remove the filename to get parent path
          parentPath = pathParts.slice(0, -1).join('/');
        }
        // else: selected task is at root level, use currentFolder.path
      }
    }

    const result = await window.electronAPI.tasks.create(
      parentPath,
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

      // Generate embeddings for new task (fire-and-forget, don't block UI)
      if (result.task) {
        generateTaskEmbeddings(result.task).catch(err => {
          console.error('Error generating embeddings:', err);
        });
      }

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

    // Delete embeddings for both soft and permanent deletes (fire-and-forget, don't block UI)
    // For soft deletes: deleted tasks shouldn't be searchable via embeddings
    // For permanent deletes: embeddings are removed completely
    // Note: When restoring a soft-deleted task, handleTaskPathChange will generate new embeddings
    deleteTaskEmbeddings(taskPath).catch(err => {
      console.error('Error deleting embeddings:', err);
    });

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
    const oldPath = taskPath;

    const result = await window.electronAPI.tasks.restore(oldPath);

    if (result.success) {
      await loadTasks();

      // Update embeddings after path change
      await handleTaskPathChange(oldPath, result.restoredPath);

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

      // Update embeddings with new task data (fire-and-forget, don't block UI)
      if (result.task) {
        updateTaskEmbeddings(result.task).catch(err => {
          console.error('Error updating embeddings:', err);
        });
      }

      // Reorder tasks: put completed tasks at bottom, incomplete at top
      const parentPath = taskPath.split(/[/\\]/).slice(0, -1).join('/');
      const siblings = findTasksAtPath(state.tasks, parentPath);

      if (siblings && siblings.length > 1) {
        // Separate incomplete and completed tasks, maintaining current order within each group
        const incomplete = [];
        const completed = [];

        for (const sibling of siblings) {
          if (sibling.completed) {
            completed.push(sibling);
          } else {
            incomplete.push(sibling);
          }
        }

        // Combine: incomplete first, then completed
        const reorderedSiblings = [...incomplete, ...completed];

        // Extract filenames for reorder API
        const newOrder = reorderedSiblings.map(t => {
          const parts = t.filePath.split(/[/\\]/);
          return parts[parts.length - 1];
        });

        // Call reorder API
        await window.electronAPI.tasks.reorder(parentPath, newOrder);
        await loadTasks();
      }

      // After completing a task, select the nearest incomplete task
      if (!currentCompleted) { // Task was just marked complete
        // Reload siblings after reordering
        const updatedSiblings = findTasksAtPath(state.tasks, parentPath);

        if (updatedSiblings) {
          // Find the completed task's new position
          const completedTaskIndex = updatedSiblings.findIndex(t =>
            normalizePath(t.filePath) === normalizePath(taskPath)
          );

          // Find nearest incomplete task (try below first, then above)
          let nextTaskToSelect = null;

          // Look for incomplete task below
          for (let i = completedTaskIndex + 1; i < updatedSiblings.length; i++) {
            if (!updatedSiblings[i].completed) {
              nextTaskToSelect = updatedSiblings[i];
              break;
            }
          }

          // If no incomplete task below, look above
          if (!nextTaskToSelect) {
            for (let i = completedTaskIndex - 1; i >= 0; i--) {
              if (!updatedSiblings[i].completed) {
                nextTaskToSelect = updatedSiblings[i];
                break;
              }
            }
          }

          // Update selection
          if (nextTaskToSelect) {
            state.selectedTaskPaths = [nextTaskToSelect.filePath];
            state.lastSelectedTaskPath = nextTaskToSelect.filePath;
          } else {
            // No incomplete tasks remain, clear selection
            state.selectedTaskPaths = [];
            state.lastSelectedTaskPath = null;
          }

          // Re-render to show new selection
          renderTasks();
        }
      }

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

        // Update embeddings with new task title (fire-and-forget, don't block UI)
        const updatedTask = findTaskByPath(state.tasks, taskPath);
        if (updatedTask) {
          updateTaskEmbeddings(updatedTask).catch(err => {
            console.error('Error updating embeddings:', err);
          });
        }

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

  // Switch to edit mode and focus the details field after a short delay
  // to ensure the modal is fully visible
  setTimeout(() => {
    showDetailsEditMode();
  }, 50);
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

  // Save the file path before closing modal (which sets state.editingTask to null)
  const taskFilePath = state.editingTask.filePath;

  try {
    const result = await window.electronAPI.tasks.update(
      taskFilePath,
      updates
    );

    if (result.success) {
      closeTaskModal();
      await loadTasks();

      // Update embeddings with new task data (fire-and-forget, don't block UI)
      const updatedTask = findTaskByPath(state.tasks, taskFilePath);
      if (updatedTask) {
        updateTaskEmbeddings(updatedTask).catch(err => {
          console.error('Error updating embeddings:', err);
        });
      }

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
// Goal Modal
// ========================================
function openGoalEditModal(goalId) {
  if (goalId) {
    // Edit existing goal
    const goal = state.goals.find(g => g.id === goalId || g.id === parseInt(goalId));
    if (!goal) {
      console.error('Goal not found:', goalId);
      return;
    }
    state.editingGoal = goal;
  } else {
    // Create new goal
    state.editingGoal = null;
  }

  // Populate year dropdown (current year - 2 to current year + 5)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYear - 2; year <= currentYear + 5; year++) {
    yearOptions.push(`<option value="${year}">${year}</option>`);
  }
  elements.goalModalYear.innerHTML = yearOptions.join('');

  // Populate modal fields
  if (state.editingGoal && state.editingGoal.filePath) {
    elements.goalModalYear.value = state.editingGoal.goalYear || currentYear;
    elements.goalModalTitle.value = state.editingGoal.title || '';
    elements.goalModalDescription.value = state.editingGoal.body || '';
    elements.goalModalWhy.value = state.editingGoal.whyItMatters || '';
    elements.goalModalSuccess.value = state.editingGoal.successCriteria || '';
    elements.goalModalStatus.value = state.editingGoal.goalStatus || 'On Track';
    elements.goalModalConfidence.value = state.editingGoal.confidenceLevel || '';

    // Format created date for display
    const createdDate = new Date(state.editingGoal.created);
    elements.goalModalCreated.value = createdDate.toLocaleString();

    // Show delete button for existing goal
    elements.goalModalDeleteBtn.style.display = 'block';
  } else {
    // Clear fields for new goal - default to selected year or current year
    elements.goalModalYear.value = state.selectedGoalYear || currentYear;
    elements.goalModalTitle.value = '';
    elements.goalModalDescription.value = '';
    elements.goalModalWhy.value = '';
    elements.goalModalSuccess.value = '';
    elements.goalModalStatus.value = 'On Track';
    elements.goalModalConfidence.value = '';
    elements.goalModalCreated.value = '';

    // Hide delete button for new goal
    elements.goalModalDeleteBtn.style.display = 'none';
  }

  // Render milestones and linked tasks
  renderGoalMilestones();
  renderGoalLinkedTasks();

  // Show modal
  elements.goalModal.classList.add('active');
}

function closeGoalModal() {
  state.editingGoal = null;
  elements.goalModal.classList.remove('active');
}

async function saveGoalModal() {
  const title = elements.goalModalTitle.value.trim();
  if (!title) {
    alert('Please enter a goal title');
    return;
  }

  const goalData = {
    title,
    body: elements.goalModalDescription.value.trim(),
    whyItMatters: elements.goalModalWhy.value.trim(),
    successCriteria: elements.goalModalSuccess.value.trim(),
    keyMilestones: state.editingGoal ? state.editingGoal.keyMilestones || [] : [],
    linkedTasks: state.editingGoal ? state.editingGoal.linkedTasks || [] : [],
    goalStatus: elements.goalModalStatus.value,
    confidenceLevel: elements.goalModalConfidence.value ? parseInt(elements.goalModalConfidence.value) : null,
    goalYear: parseInt(elements.goalModalYear.value)
  };

  try {
    if (state.editingGoal && state.editingGoal.filePath) {
      // Update existing goal
      const result = await window.electronAPI.goals.update(
        state.editingGoal.filePath,
        goalData
      );

      if (result.success) {
        closeGoalModal();
        await loadGoals(goalData.goalYear);
      } else {
        console.error('Failed to update goal:', result.error);
        alert('Failed to save goal: ' + result.error);
      }
    } else {
      // Create new goal
      const result = await window.electronAPI.goals.create(title, goalData.body);

      if (result.success && result.goal) {
        // Update the goal with additional fields
        const updateResult = await window.electronAPI.goals.update(
          result.goal.filePath,
          goalData
        );

        if (updateResult.success) {
          closeGoalModal();
          await loadGoals(goalData.goalYear);
        } else {
          console.error('Failed to update new goal:', updateResult.error);
          alert('Failed to save goal: ' + updateResult.error);
        }
      } else {
        console.error('Failed to create goal:', result.error);
        alert('Failed to create goal: ' + result.error);
      }
    }
  } catch (error) {
    console.error('Error saving goal:', error);
    alert('Error saving goal: ' + error.message);
  }
}

async function deleteGoal() {
  if (!state.editingGoal) return;

  if (!confirm(`Are you sure you want to delete the goal "${state.editingGoal.title}"?`)) {
    return;
  }

  const goalYear = state.editingGoal.goalYear;

  try {
    const result = await window.electronAPI.goals.delete(state.editingGoal.filePath);

    if (result.success) {
      closeGoalModal();
      await loadGoals(goalYear);
    } else {
      console.error('Failed to delete goal:', result.error);
      alert('Failed to delete goal: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting goal:', error);
    alert('Error deleting goal: ' + error.message);
  }
}

function addMilestone() {
  if (!state.editingGoal) {
    // If creating new goal, initialize milestones array
    state.editingGoal = { keyMilestones: [] };
  }

  if (!state.editingGoal.keyMilestones) {
    state.editingGoal.keyMilestones = [];
  }

  const newMilestone = {
    title: '',
    date: '',
    completed: false
  };

  state.editingGoal.keyMilestones.push(newMilestone);
  renderGoalMilestones();
}

function removeMilestone(index) {
  if (!state.editingGoal || !state.editingGoal.keyMilestones) return;

  state.editingGoal.keyMilestones.splice(index, 1);
  renderGoalMilestones();
}

function renderGoalMilestones() {
  const milestones = (state.editingGoal && state.editingGoal.keyMilestones) || [];

  elements.goalModalMilestones.innerHTML = milestones.map((milestone, index) => `
    <div class="milestone-item" data-index="${index}">
      <input type="checkbox" class="milestone-checkbox" ${milestone.completed ? 'checked' : ''}
             onchange="toggleMilestone(${index})" />
      <div class="milestone-content">
        <input type="text" class="milestone-title-input" placeholder="Milestone title"
               value="${escapeHtml(milestone.title || '')}"
               onchange="updateMilestone(${index}, 'title', this.value)"
               style="width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--border-color); padding: 0.25rem 0; font-size: 0.9rem; color: var(--text-primary);" />
        <input type="date" class="milestone-date-input"
               value="${milestone.date || ''}"
               onchange="updateMilestone(${index}, 'date', this.value)"
               style="margin-top: 0.25rem; background: transparent; border: 1px solid var(--border-color); border-radius: 3px; padding: 0.25rem; font-size: 0.75rem; color: var(--text-secondary);" />
      </div>
      <div class="milestone-actions">
        <button class="milestone-action-btn" onclick="removeMilestone(${index})" title="Delete milestone">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function toggleMilestone(index) {
  if (!state.editingGoal || !state.editingGoal.keyMilestones) return;

  state.editingGoal.keyMilestones[index].completed = !state.editingGoal.keyMilestones[index].completed;
  renderGoalMilestones();
}

function updateMilestone(index, field, value) {
  if (!state.editingGoal || !state.editingGoal.keyMilestones) return;

  state.editingGoal.keyMilestones[index][field] = value;
}

async function linkTaskToGoal() {
  // Simple implementation: show prompt for task ID
  // In a real implementation, you'd show a task picker modal
  const taskId = prompt('Enter the task ID or file path to link:');
  if (!taskId) return;

  // Find the task to verify it exists
  const task = findTaskById(taskId);
  if (!task) {
    alert('Task not found');
    return;
  }

  if (!state.editingGoal) {
    state.editingGoal = { linkedTasks: [] };
  }

  if (!state.editingGoal.linkedTasks) {
    state.editingGoal.linkedTasks = [];
  }

  // Check if already linked
  if (state.editingGoal.linkedTasks.includes(taskId)) {
    alert('Task is already linked to this goal');
    return;
  }

  state.editingGoal.linkedTasks.push(taskId);
  renderGoalLinkedTasks();
}

function removeLinkedTask(taskId) {
  if (!state.editingGoal || !state.editingGoal.linkedTasks) return;

  const index = state.editingGoal.linkedTasks.indexOf(taskId);
  if (index > -1) {
    state.editingGoal.linkedTasks.splice(index, 1);
    renderGoalLinkedTasks();
  }
}

// Expose functions to window for inline event handlers
window.toggleMilestone = toggleMilestone;
window.updateMilestone = updateMilestone;
window.removeMilestone = removeMilestone;
window.removeLinkedTask = removeLinkedTask;

function renderGoalLinkedTasks() {
  const linkedTasks = (state.editingGoal && state.editingGoal.linkedTasks) || [];

  elements.goalModalLinkedTasks.innerHTML = linkedTasks.map(taskId => {
    const task = findTaskById(taskId);
    if (!task) return '';

    return `
      <div class="linked-task-item ${task.completed ? 'completed' : ''}">
        <div class="linked-task-info">
          <input type="checkbox" class="linked-task-checkbox" ${task.completed ? 'checked' : ''} disabled />
          <span class="linked-task-title">${escapeHtml(task.title || 'Untitled Task')}</span>
        </div>
        <div class="linked-task-actions">
          <button class="linked-task-action-btn" onclick="removeLinkedTask('${taskId}')" title="Unlink task">
            <span class="material-icons">link_off</span>
          </button>
        </div>
      </div>
    `;
  }).join('') || '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No tasks linked yet</p>';
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
        <div class="${itemClass}" data-task-path="${escapeHtml(task.filePath)}" ${isDisabled ? 'data-disabled="true"' : ''}>
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
    const oldPath = taskFilePath;
    const result = await window.electronAPI.tasks.moveToFolder(
      oldPath,
      destinationFolderId,
      destinationParentPath
    );

    if (result.success) {
      closeMoveTaskModal();
      closeTaskModal(); // Close the task details modal too
      await loadTasks(); // Reload tasks

      // Update embeddings after path change
      await handleTaskPathChange(oldPath, result.newPath);

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
  // For default sort, preserve positional order (no sorting)
  // This allows manual repositioning to work properly
  if (state.sortOrder === 'default') {
    // Just recursively apply to children, but don't sort at this level
    return tasks.map(task => ({
      ...task,
      children: task.children && task.children.length > 0 ? sortTasks(task.children) : task.children
    }));
  }

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
    }
    return 0;
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

// ========================================
// Keyboard Hierarchy Navigation Helpers
// ========================================

async function promoteTask(taskPath) {
  try {
    // Get parent directory path using native path separator from original path
    const pathSep = taskPath.includes('\\') ? '\\' : '/';
    const pathParts = taskPath.split(/[/\\]/);
    const parentDir = pathParts.slice(0, -1).join(pathSep);

    // Check if already at root
    const currentFolder = getCurrentFolder();
    if (!currentFolder) return;

    if (normalizePath(parentDir) === normalizePath(currentFolder.path)) {
      console.log('[Promote] Already at root level');
      return;
    }

    // Find the parent task path (the .md file for the parent directory)
    const parentTaskPath = parentDir + '.md';

    console.log('[Promote] Looking for parent task at:', parentTaskPath);
    console.log('[Promote] Current task path:', taskPath);
    console.log('[Promote] Parent dir:', parentDir);

    // Check if parent task exists
    const parentTask = findTaskByPath(state.tasks, parentTaskPath);
    if (!parentTask) {
      console.log('[Promote] Cannot find parent task');
      console.log('[Promote] Available tasks:', state.tasks.length);
      return;
    }

    console.log('[Promote] Found parent task:', parentTask.title);
    console.log('[Promote] Promoting task to same level as parent');

    const oldPath = taskPath;
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'task';
    const parentTitle = parentTask.title;

    // Move to be a sibling of the parent
    const result = await window.electronAPI.tasks.moveToSibling(oldPath, parentTaskPath);

    if (result.success) {
      await loadTasks();
      await handleTaskPathChange(oldPath, result.newPath);
      await commitTaskChange(`Promote "${taskTitle}" to same level as "${parentTitle}"`);

      // Update selection to the new path
      state.selectedTaskPaths = [result.newPath];
      state.lastSelectedTaskPath = result.newPath;

      // Re-render to show selection and scroll into view
      renderTasks();
    }
  } catch (error) {
    console.error('[Promote] Error:', error);
  }
}

async function nestTaskIntoAbove(taskPath) {
  try {
    // Find the task above this one at the same level
    const parentPath = taskPath.split(/[/\\]/).slice(0, -1).join('/');
    const siblings = findTasksAtPath(state.tasks, parentPath);

    if (!siblings) {
      console.log('[Nest] Cannot find siblings');
      return;
    }

    // Find current task index
    const currentIndex = siblings.findIndex(t => normalizePath(t.filePath) === normalizePath(taskPath));
    if (currentIndex === -1 || currentIndex === 0) {
      console.log('[Nest] Already at top or task not found');
      return;
    }

    // Get the task above
    const taskAbove = siblings[currentIndex - 1];

    console.log('[Nest] Nesting into task above');

    const oldPath = taskPath;
    const task = findTaskByPath(state.tasks, taskPath);
    const taskTitle = task ? task.title : 'task';
    const targetTitle = taskAbove.title;

    // Move to be a child of the task above
    const result = await window.electronAPI.tasks.moveToParent(oldPath, taskAbove.filePath);

    if (result.success) {
      // Expand the parent to show the nested task
      state.expandedTasks.add(taskAbove.id);

      await loadTasks();
      await handleTaskPathChange(oldPath, result.newPath);
      await commitTaskChange(`Nest "${taskTitle}" into "${targetTitle}"`);

      // Update selection to the new path
      state.selectedTaskPaths = [result.newPath];
      state.lastSelectedTaskPath = result.newPath;

      // Re-render to show selection and scroll into view
      renderTasks();
    }
  } catch (error) {
    console.error('[Nest] Error:', error);
  }
}

async function moveTaskUpOnePosition(taskPath) {
  try {
    // Find siblings at the same level
    const parentPath = taskPath.split(/[/\\]/).slice(0, -1).join('/');
    const siblings = findTasksAtPath(state.tasks, parentPath);

    if (!siblings || siblings.length < 2) {
      console.log('[Move Up] Cannot move - not enough siblings');
      return;
    }

    // Find current task index
    const currentIndex = siblings.findIndex(t => normalizePath(t.filePath) === normalizePath(taskPath));
    if (currentIndex === -1 || currentIndex === 0) {
      console.log('[Move Up] Already at top');
      return;
    }

    console.log('[Move Up] Moving task up one position');

    // Get filenames in current order
    const pathSep = taskPath.includes('\\') ? '\\' : '/';
    const currentOrder = siblings.map(t => {
      const parts = t.filePath.split(/[/\\]/);
      return parts[parts.length - 1];
    });

    // Swap with task above
    [currentOrder[currentIndex], currentOrder[currentIndex - 1]] =
    [currentOrder[currentIndex - 1], currentOrder[currentIndex]];

    // Reorder
    const result = await window.electronAPI.tasks.reorder(parentPath, currentOrder);

    if (result.success) {
      await loadTasks();
      const task = findTaskByPath(state.tasks, taskPath);
      if (task) {
        await commitTaskChange(`Move "${task.title}" up`);
      }

      // Maintain selection on the same task
      state.selectedTaskPaths = [taskPath];
      state.lastSelectedTaskPath = taskPath;

      // Re-render to show selection and scroll into view
      renderTasks();
    }
  } catch (error) {
    console.error('[Move Up] Error:', error);
  }
}

async function moveTaskDownOnePosition(taskPath) {
  try {
    // Find siblings at the same level
    const parentPath = taskPath.split(/[/\\]/).slice(0, -1).join('/');
    const siblings = findTasksAtPath(state.tasks, parentPath);

    if (!siblings || siblings.length < 2) {
      console.log('[Move Down] Cannot move - not enough siblings');
      return;
    }

    // Find current task index
    const currentIndex = siblings.findIndex(t => normalizePath(t.filePath) === normalizePath(taskPath));
    if (currentIndex === -1 || currentIndex === siblings.length - 1) {
      console.log('[Move Down] Already at bottom');
      return;
    }

    console.log('[Move Down] Moving task down one position');

    // Get filenames in current order
    const currentOrder = siblings.map(t => {
      const parts = t.filePath.split(/[/\\]/);
      return parts[parts.length - 1];
    });

    // Swap with task below
    [currentOrder[currentIndex], currentOrder[currentIndex + 1]] =
    [currentOrder[currentIndex + 1], currentOrder[currentIndex]];

    // Reorder
    const result = await window.electronAPI.tasks.reorder(parentPath, currentOrder);

    if (result.success) {
      await loadTasks();
      const task = findTaskByPath(state.tasks, taskPath);
      if (task) {
        await commitTaskChange(`Move "${task.title}" down`);
      }

      // Maintain selection on the same task
      state.selectedTaskPaths = [taskPath];
      state.lastSelectedTaskPath = taskPath;

      // Re-render to show selection and scroll into view
      renderTasks();
    }
  } catch (error) {
    console.error('[Move Down] Error:', error);
  }
}

// ========================================
// Keyboard Action Handler
// ========================================

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

    case 'promote':
      // [: Promote task one level (move to parent's level)
      if (state.lastSelectedTaskPath) {
        promoteTask(state.lastSelectedTaskPath);
      }
      break;

    case 'nest-into-above':
      // ]: Nest task into the item above it at the same level
      if (state.lastSelectedTaskPath) {
        nestTaskIntoAbove(state.lastSelectedTaskPath);
      }
      break;

    case 'move-up':
      // ;: Move task up one position at same level
      if (state.lastSelectedTaskPath) {
        moveTaskUpOnePosition(state.lastSelectedTaskPath);
      }
      break;

    case 'move-down':
      // ': Move task down one position at same level
      if (state.lastSelectedTaskPath) {
        moveTaskDownOnePosition(state.lastSelectedTaskPath);
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

  // Check if the target is the parent of the dragged task
  const draggedParentPath = state.draggedTask.path.split(/[/\\]/).slice(0, -1).join('/');
  const targetTaskDir = targetPath.replace('.md', '');
  const isTargetTheParent = normalizePath(draggedParentPath) === normalizePath(targetTaskDir);

  try {
    // Special case: dragging a child onto the top edge of its parent to promote it
    if (isTargetTheParent && e.clientY < midpoint) {
      console.log('[Drag] Promoting child to same level as parent');
      const oldPath = state.draggedTask.path;

      // Find the parent's parent (grandparent) path
      const parentParts = targetPath.split(/[/\\]/);
      const grandparentPath = parentParts.slice(0, -1).join(parentParts[0].includes('\\') ? '\\' : '/');

      // Move the child to be a sibling of its parent
      const moveResult = await window.electronAPI.tasks.moveToSibling(
        oldPath,
        targetPath
      );

      if (moveResult.success) {
        console.log('[Drag] Promotion successful, new path:', moveResult.newPath);
        await loadTasks();

        // Update embeddings after path change
        await handleTaskPathChange(oldPath, moveResult.newPath);

        // Commit to git
        await commitTaskChange(`Promote "${draggedTitle}" to same level as "${targetTitle}"`);
      }
    } else if (e.clientY < midpoint) {
      // Drop above - move to same level as target, then reorder
      console.log('[Drag] Drop ABOVE midpoint - moving to sibling');
      const oldPath = state.draggedTask.path;
      const moveResult = await window.electronAPI.tasks.moveToSibling(
        oldPath,
        targetPath
      );

      if (moveResult.success) {
        console.log('[Drag] Move successful, new path:', moveResult.newPath);

        // Reload tasks first to get the updated file structure
        console.log('[Drag] Reloading tasks before reorder');
        await loadTasks();

        // Now reorder within the new parent
        await reorderTasks(moveResult.newPath, targetPath);

        // Update embeddings after path change
        await handleTaskPathChange(oldPath, moveResult.newPath);

        // Commit to git
        await commitTaskChange(`Move task "${draggedTitle}" to sibling of "${targetTitle}"`);
      }
    } else {
      // Drop below - make it a child
      console.log('[Drag] Drop BELOW midpoint - making child');
      const oldPath = state.draggedTask.path;
      const result = await window.electronAPI.tasks.moveToParent(
        oldPath,
        targetPath
      );

      if (result.success) {
        console.log('[Drag] Move successful, new path:', result.newPath);
        // Automatically expand the parent to show the new child
        const targetId = parseInt(taskItem.dataset.taskId);
        state.expandedTasks.add(targetId);
        await loadTasks();

        // Update embeddings after path change
        await handleTaskPathChange(oldPath, result.newPath);

        // Commit to git
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
  console.log('[Reorder] Starting reorder - dragged:', draggedPath, 'target:', targetPath);

  // Get parent directory and filenames
  const draggedParts = draggedPath.split(/[/\\]/);
  const targetParts = targetPath.split(/[/\\]/);

  const draggedFilename = draggedParts[draggedParts.length - 1];
  const targetFilename = targetParts[targetParts.length - 1];

  // Use native path separator for comparison
  const pathSep = draggedPath.includes('\\') ? '\\' : '/';
  const draggedParent = draggedParts.slice(0, -1).join(pathSep);
  const targetParent = targetParts.slice(0, -1).join(pathSep);

  console.log('[Reorder] Parent paths - dragged:', draggedParent, 'target:', targetParent);

  // Only reorder if they're in the same parent (use normalized comparison)
  if (normalizePath(draggedParent) !== normalizePath(targetParent)) {
    console.log('[Reorder] Cannot reorder - tasks in different parents');
    console.log('[Reorder] Normalized - dragged:', normalizePath(draggedParent));
    console.log('[Reorder] Normalized - target:', normalizePath(targetParent));
    return;
  }

  // Find all tasks at this level
  console.log('[Reorder] Finding tasks at parent path:', draggedParent);
  const parentTasks = findTasksAtPath(state.tasks, draggedParent);
  if (!parentTasks) {
    console.log('[Reorder] No parent tasks found!');
    return;
  }

  console.log('[Reorder] Found', parentTasks.length, 'tasks at this level');

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
  console.log('[Reorder] Calling reorder API with order:', currentOrder);
  const result = await window.electronAPI.tasks.reorder(draggedParent, currentOrder);

  if (result.success) {
    console.log('[Reorder] Reorder API succeeded, calling loadTasks()');
    await loadTasks();
    console.log('[Reorder] loadTasks() completed, tasks should be refreshed');
  } else {
    console.error('[Reorder] Reorder API failed:', result.error);
  }
}

/**
 * Normalize path for comparison (handle Windows vs Unix separators)
 * @param {string} filePath - Path to normalize
 * @returns {string} Normalized path with consistent separators
 */
function normalizePath(filePath) {
  if (!filePath) {
    return '';
  }
  // Convert all backslashes to forward slashes for consistent comparison
  return filePath.replace(/\\/g, '/').toLowerCase();
}

function findTasksAtPath(tasks, parentPath) {
  const normalizedParentPath = normalizePath(parentPath);

  // Get the current folder's path
  const currentFolder = getCurrentFolder();
  const currentFolderPath = currentFolder ? currentFolder.path : '';
  const normalizedCurrentFolderPath = normalizePath(currentFolderPath);

  console.log('[findTasksAtPath] Looking for parent:', normalizedParentPath);
  console.log('[findTasksAtPath] Current folder path:', normalizedCurrentFolderPath);

  // If parentPath is the root tasks path (current folder root), return root tasks
  if (normalizedParentPath === normalizedCurrentFolderPath) {
    console.log('[findTasksAtPath] Returning root tasks:', tasks.length, 'tasks');
    return tasks;
  }

  // Otherwise search recursively
  for (const task of tasks) {
    const taskDir = task.filePath.replace('.md', '');
    const normalizedTaskDir = normalizePath(taskDir);

    if (normalizedTaskDir === normalizedParentPath && task.children) {
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

async function handleEnableOkrsChange(event) {
  const isEnabled = event.target.checked;
  state.enableOkrs = isEnabled;

  // Toggle section visibility
  elements.okrsSection.style.display = isEnabled ? 'block' : 'none';

  try {
    // Initialize storage path if enabling
    if (isEnabled) {
      const result = await window.electronAPI.okrs.initialize();
      if (result.success) {
        // Save the path to config
        await window.electronAPI.config.update({ okrsPath: result.path });
      } else {
        throw new Error(result.error || 'Failed to initialize OKRs storage');
      }
    }

    // Save the setting
    await saveAllSettings();
  } catch (error) {
    console.error('Error updating enable OKRs:', error);
    // Revert checkbox on error
    elements.enableOkrsCheckbox.checked = !isEnabled;
    state.enableOkrs = !isEnabled;
    elements.okrsSection.style.display = !isEnabled ? 'block' : 'none';
  }
}

async function handleEnableGoalsChange(event) {
  const isEnabled = event.target.checked;
  state.enableGoals = isEnabled;

  // Toggle section visibility
  elements.goalsSection.style.display = isEnabled ? 'block' : 'none';

  try {
    // Initialize storage path if enabling
    if (isEnabled) {
      const result = await window.electronAPI.goals.initialize();
      if (result.success) {
        // Save the path to config
        await window.electronAPI.config.update({ goalsPath: result.path });

        // Load goals to populate sidebar with years
        await initializeGoalsSidebar();
      } else {
        throw new Error(result.error || 'Failed to initialize Goals storage');
      }
    }

    // Save the setting
    await saveAllSettings();
  } catch (error) {
    console.error('Error updating enable Goals:', error);
    // Revert checkbox on error
    elements.enableGoalsCheckbox.checked = !isEnabled;
    state.enableGoals = !isEnabled;
    elements.goalsSection.style.display = !isEnabled ? 'block' : 'none';
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

    // Only block Space, Enter, Delete when in text input fields or contenteditable elements
    const isInTextInput = e.target.matches('input:not([type="checkbox"]), textarea, [contenteditable="true"]');

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

      case '[':
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('promote');
        }
        break;

      case ']':
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('nest-into-above');
        }
        break;

      case ';':
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('move-up');
        }
        break;

      case "'":
        if (!isInTextInput) {
          e.preventDefault();
          handleTaskKeyboardAction('move-down');
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
    updateOllamaStatus('⏳', 'Testing connection...', 'info');

    // Get URL from input or use saved state
    const url = elements.ollamaPathInput.value.trim() || state.ollamaUrl;

    const result = await window.electronAPI.ollama.detect(url);

    if (result.success) {
      state.ollamaUrl = url;
      state.ollamaPath = url; // Backwards compat
      state.ollamaAvailable = true;

      updateOllamaStatus('✓', `Connected: ${result.version}`, 'success');

      // Load available models
      await listOllamaModels();
    } else {
      state.ollamaAvailable = false;

      updateOllamaStatus('✗', result.error || 'Cannot connect to Ollama', 'error');

      // Hide model sections
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'none';
      }
      if (elements.ollamaEmbeddingModelSection) {
        elements.ollamaEmbeddingModelSection.style.display = 'none';
      }
    }

    await saveAllSettings();
  } catch (error) {
    console.error('Error testing Ollama connection:', error);
    updateOllamaStatus('✗', 'Error connecting to Ollama', 'error');
  }
}

async function listOllamaModels() {
  try {
    updateOllamaStatus('⏳', 'Loading models...', 'info');

    console.log('[listOllamaModels] About to call IPC with URL:', state.ollamaUrl);

    // Use configured URL
    const result = await window.electronAPI.ollama.listModels(state.ollamaUrl);

    console.log('[listOllamaModels] IPC call returned:', result);
    console.log('[listOllamaModels] Models:', result.models);

    if (result.success && result.models && result.models.length > 0) {
      // Filter models by type
      // Embedding models typically have these patterns in their names
      const embeddingModels = result.models.filter(model => {
        const lowerModel = model.toLowerCase();
        return lowerModel.includes('embed') ||     // nomic-embed-text, mxbai-embed-large
               lowerModel.includes('minilm') ||    // all-minilm
               lowerModel.includes('sentence') ||  // sentence-transformers models
               lowerModel.includes('e5-');         // e5-small, e5-base, e5-large
      });
      const chatModels = result.models.filter(model => {
        const lowerModel = model.toLowerCase();
        return !(lowerModel.includes('embed') ||
                 lowerModel.includes('minilm') ||
                 lowerModel.includes('sentence') ||
                 lowerModel.includes('e5-'));
      });

      console.log('[listOllamaModels] Filtered models:');
      console.log('[listOllamaModels] - Chat models:', chatModels);
      console.log('[listOllamaModels] - Embedding models:', embeddingModels);

      // Populate chat model dropdown (exclude embedding models)
      if (elements.ollamaModelSelect) {
        elements.ollamaModelSelect.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a model...';
        elements.ollamaModelSelect.appendChild(defaultOption);

        // Add chat models only
        chatModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          elements.ollamaModelSelect.appendChild(option);
        });

        // Select previously saved model if available
        if (state.ollamaModel && chatModels.includes(state.ollamaModel)) {
          elements.ollamaModelSelect.value = state.ollamaModel;
        }
      }

      // Populate embedding model dropdown (only embedding models)
      if (elements.ollamaEmbeddingModelSelect) {
        elements.ollamaEmbeddingModelSelect.innerHTML = '';

        // Add default option
        const defaultEmbedOption = document.createElement('option');
        defaultEmbedOption.value = '';
        defaultEmbedOption.textContent = 'Select an embedding model...';
        elements.ollamaEmbeddingModelSelect.appendChild(defaultEmbedOption);

        // Add embedding models only
        embeddingModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          elements.ollamaEmbeddingModelSelect.appendChild(option);
        });

        // Select previously saved embedding model if available
        if (state.ollamaEmbeddingModel && embeddingModels.includes(state.ollamaEmbeddingModel)) {
          elements.ollamaEmbeddingModelSelect.value = state.ollamaEmbeddingModel;
        }
      }

      // Show model sections
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'block';
      }
      if (elements.ollamaEmbeddingModelSection) {
        elements.ollamaEmbeddingModelSection.style.display = 'block';
      }

      updateOllamaStatus('✓', `Found ${chatModels.length} chat model(s) and ${embeddingModels.length} embedding model(s)`, 'success');
    } else {
      updateOllamaStatus('⚠', 'No models found. Run "ollama pull" to download models.', 'error');

      // Hide model sections
      if (elements.ollamaModelSection) {
        elements.ollamaModelSection.style.display = 'none';
      }
      if (elements.ollamaEmbeddingModelSection) {
        elements.ollamaEmbeddingModelSection.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error listing models:', error);
    updateOllamaStatus('✗', 'Error loading models', 'error');
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

async function handleOllamaEmbeddingModelChange(event) {
  const oldEmbeddingModel = state.ollamaEmbeddingModel;
  state.ollamaEmbeddingModel = event.target.value;
  await saveAllSettings();

  // If both URL and embedding model are configured, reinitialize embeddings
  if (state.ollamaUrl && state.ollamaEmbeddingModel && oldEmbeddingModel !== state.ollamaEmbeddingModel) {
    console.log('[Embeddings] Embedding model changed, reinitializing...');
    await reinitializeEmbeddings();
  }
}

async function reinitializeEmbeddings() {
  try {
    // Update status indicator to show "Reinitializing..."
    elements.embeddingsStatusIcon.textContent = 'sync';
    elements.embeddingsStatusIcon.style.color = 'var(--accent-primary)';
    elements.embeddingsStatusText.textContent = 'Reinitializing embeddings database...';
    elements.embeddingsStatus.style.background = 'var(--bg-secondary)';
    elements.embeddingsStatus.style.borderColor = 'var(--accent-primary)';

    console.log('[Embeddings] Calling vectordb.reinitialize with:', {
      ollamaUrl: state.ollamaUrl,
      embeddingModel: state.ollamaEmbeddingModel
    });

    // Call IPC to reinitialize embeddings
    const result = await window.electronAPI.vectordb.reinitialize(
      state.ollamaUrl,
      state.ollamaEmbeddingModel
    );

    if (result.success) {
      console.log('[Embeddings] Reinitialization successful');

      // Update status to success
      elements.embeddingsStatusIcon.textContent = 'check_circle';
      elements.embeddingsStatusIcon.style.color = 'var(--success)';
      elements.embeddingsStatusText.textContent = 'Embeddings database reinitialized successfully';
      elements.embeddingsStatus.style.background = 'var(--success-bg)';
      elements.embeddingsStatus.style.borderColor = 'var(--success)';

      // Refresh status after a short delay
      setTimeout(async () => {
        await checkEmbeddingsStatus();
      }, 2000);
    } else {
      console.error('[Embeddings] Reinitialization failed:', result.error);

      // Update status to error
      elements.embeddingsStatusIcon.textContent = 'error';
      elements.embeddingsStatusIcon.style.color = 'var(--danger)';
      elements.embeddingsStatusText.textContent = `Failed to reinitialize: ${result.error}`;
      elements.embeddingsStatus.style.background = 'var(--danger-bg)';
      elements.embeddingsStatus.style.borderColor = 'var(--danger)';
    }
  } catch (error) {
    console.error('[Embeddings] Error during reinitialization:', error);

    // Update status to error
    elements.embeddingsStatusIcon.textContent = 'error';
    elements.embeddingsStatusIcon.style.color = 'var(--danger)';
    elements.embeddingsStatusText.textContent = `Error reinitializing: ${error.message}`;
    elements.embeddingsStatus.style.background = 'var(--danger-bg)';
    elements.embeddingsStatus.style.borderColor = 'var(--danger)';
  }
}

async function refreshOllamaModels() {
  try {
    console.log('[refreshOllamaModels] Button clicked!');

    // Get URL from input or use saved state
    const url = elements.ollamaPathInput.value.trim() || state.ollamaUrl;

    console.log('[refreshOllamaModels] Input field value:', elements.ollamaPathInput.value);
    console.log('[refreshOllamaModels] Current state.ollamaUrl:', state.ollamaUrl);
    console.log('[refreshOllamaModels] Using URL:', url);

    if (!url) {
      updateOllamaStatus('⚠', 'No Ollama URL configured. Please enter a URL first.', 'error');
      return;
    }

    // Save old URL to detect changes
    const oldOllamaUrl = state.ollamaUrl;

    // Update state with current URL
    state.ollamaUrl = url;
    state.ollamaPath = url; // Backwards compat

    console.log('[refreshOllamaModels] Updated state, about to call listOllamaModels()');

    // Load models from the URL
    await listOllamaModels();

    console.log('[refreshOllamaModels] listOllamaModels() completed');

    // Save the new URL to config
    await saveAllSettings();

    console.log('[refreshOllamaModels] Settings saved');

    // If both URL and embedding model are configured, and URL changed, reinitialize embeddings
    if (state.ollamaUrl && state.ollamaEmbeddingModel && oldOllamaUrl !== state.ollamaUrl) {
      console.log('[Embeddings] Ollama URL changed, reinitializing...');
      await reinitializeEmbeddings();
    }
  } catch (error) {
    console.error('[refreshOllamaModels] Error:', error);
    updateOllamaStatus('✗', 'Error refreshing models', 'error');
  }
}

/**
 * Handle system prompt change
 * Save to config when textarea loses focus
 */
async function handleSystemPromptChange() {
  try {
    const newPrompt = elements.ollamaSystemPrompt.value.trim();

    // Store in state (empty string becomes null to use default)
    state.ollamaSystemPrompt = newPrompt.length > 0 ? newPrompt : null;

    // Save to config
    await saveAllSettings();

    console.log('[SystemPrompt] Updated system prompt');
  } catch (error) {
    console.error('[SystemPrompt] Error saving system prompt:', error);
  }
}

/**
 * Reset system prompt to default
 */
async function handleResetSystemPrompt() {
  try {
    if (!confirm('Reset AI agent system prompt to default?\n\nThis will discard any custom changes you\'ve made.')) {
      return;
    }

    // Reset to default
    state.ollamaSystemPrompt = null;
    elements.ollamaSystemPrompt.value = DEFAULT_OLLAMA_SYSTEM_PROMPT;

    // Save to config
    await saveAllSettings();

    console.log('[SystemPrompt] Reset to default system prompt');
  } catch (error) {
    console.error('[SystemPrompt] Error resetting system prompt:', error);
  }
}

async function loadOllamaSettings() {
  const result = await window.electronAPI.config.read();
  if (result.success && result.config) {
    state.ollamaPath = result.config.ollamaPath || null;
    state.ollamaUrl = result.config.ollamaUrl || 'http://localhost:11434';
    state.ollamaModel = result.config.ollamaModel || null;
    state.ollamaEmbeddingModel = result.config.ollamaEmbeddingModel || null;
    state.ollamaSystemPrompt = result.config.ollamaSystemPrompt || null;
    state.ollamaAvailable = result.config.ollamaAvailable || false;

    // Vector DB settings no longer needed (embedded, auto-configured)

    // Load quick prompts (use defaults if not saved)
    if (result.config.agentQuickPrompts && result.config.agentQuickPrompts.length > 0) {
      state.agentQuickPrompts = result.config.agentQuickPrompts;
    }

    // Load task statuses (use defaults if not saved)
    if (result.config.taskStatuses && result.config.taskStatuses.length > 0) {
      state.taskStatuses = result.config.taskStatuses;
    }

    // Update Ollama UI
    if (state.ollamaUrl && elements.ollamaPathInput) {
      elements.ollamaPathInput.value = state.ollamaUrl;

      // Try to load models if we have a URL
      if (state.ollamaAvailable) {
        await listOllamaModels();
      }
    }

    // Update system prompt UI
    if (elements.ollamaSystemPrompt) {
      // Use custom prompt if set, otherwise use default
      elements.ollamaSystemPrompt.value = state.ollamaSystemPrompt || DEFAULT_OLLAMA_SYSTEM_PROMPT;

      // Show system prompt section if Ollama is configured
      if (state.ollamaAvailable && elements.ollamaSystemPromptSection) {
        elements.ollamaSystemPromptSection.style.display = 'block';
      }
    }

    // Vector DB is now embedded and automatically initialized on app startup
    // No UI configuration needed - embeddings work for all folders automatically

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
// Note: Vector DB is now embedded and auto-initialized
// No manual configuration or testing needed

// Removed functions (UI elements no longer exist):
// - updateVectorDbStatus()
// - testVectorDbConnection()
// - handleVectorDbEnabledChange()
// - handleVectorDbUrlChange()
// - handleVectorDbCollectionChange()

// ========================================
// Bulk Embeddings Generation
// ========================================

/**
 * Update bulk embeddings folder dropdown
 * Populate with folders that have embeddings enabled
 */
/**
 * Recursively collect all tasks from a task tree
 */
function collectAllTasks(tasks, collected = []) {
  for (const task of tasks) {
    collected.push(task);
    if (task.children && task.children.length > 0) {
      collectAllTasks(task.children, collected);
    }
  }
  return collected;
}

/**
 * Handle regenerate all embeddings button click
 */
async function handleRegenerateAllEmbeddings() {
  try {
    // Confirm with user
    if (!confirm('Regenerate embeddings for ALL tasks across ALL folders?\n\nThis will use the currently selected embedding model and may take several minutes for large task collections.\n\nThis action cannot be undone.')) {
      return;
    }

    // Update status to show processing
    elements.embeddingsStatusIcon.textContent = 'hourglass_empty';
    elements.embeddingsStatusIcon.style.color = 'var(--accent-primary)';
    elements.embeddingsStatusText.textContent = 'Clearing existing embeddings...';
    elements.embeddingsStatus.style.background = 'var(--bg-secondary)';
    elements.embeddingsStatus.style.borderColor = 'var(--accent-primary)';

    // Disable button during processing
    elements.regenerateEmbeddingsBtn.disabled = true;

    // Clear existing vector database by reinitializing
    console.log('[Regenerate] Clearing existing embeddings database...');
    const reinitResult = await window.electronAPI.vectordb.reinitialize(state.ollamaUrl, state.ollamaEmbeddingModel);

    if (!reinitResult.success) {
      console.error('[Regenerate] Failed to reinitialize vector database:', reinitResult.error);
      elements.embeddingsStatusIcon.textContent = 'error';
      elements.embeddingsStatusIcon.style.color = 'var(--danger)';
      elements.embeddingsStatusText.textContent = `Failed to clear embeddings: ${reinitResult.error}`;
      elements.embeddingsStatus.style.background = 'var(--danger-bg)';
      elements.embeddingsStatus.style.borderColor = 'var(--danger)';
      elements.regenerateEmbeddingsBtn.disabled = false;
      return;
    }

    console.log('[Regenerate] Vector database cleared successfully');

    // Update status to loading tasks
    elements.embeddingsStatusText.textContent = 'Loading all tasks...';

    let totalTasks = 0;
    const allTasksForBulk = [];

    // Load tasks from all folders
    for (const folder of state.taskFolders) {
      const loadResult = await window.electronAPI.tasks.load(folder.path);
      if (loadResult.success && loadResult.tasks) {
        const folderTasks = collectAllTasks(loadResult.tasks);
        console.log(`[Regenerate] Folder "${folder.name}": ${folderTasks.length} tasks`);

        // Prepare tasks for bulk processing
        for (const task of folderTasks) {
          const taskText = generateTaskText(task);
          if (taskText && taskText.trim().length > 0) {
            allTasksForBulk.push({
              taskId: task.filePath || task.path,
              text: taskText,
              metadata: extractTaskMetadata({ ...task, folderId: folder.id })
            });
          }
        }
        totalTasks += folderTasks.length;
      }
    }

    if (allTasksForBulk.length === 0) {
      elements.embeddingsStatusIcon.textContent = 'info';
      elements.embeddingsStatusIcon.style.color = 'var(--text-secondary)';
      elements.embeddingsStatusText.textContent = 'No tasks found to process';
      elements.embeddingsStatus.style.background = 'var(--bg-secondary)';
      elements.embeddingsStatus.style.borderColor = 'var(--border-color)';
      elements.regenerateEmbeddingsBtn.disabled = false;
      return;
    }

    console.log(`[Regenerate] Total: ${allTasksForBulk.length} tasks across ${state.taskFolders.length} folders`);

    elements.embeddingsStatusText.textContent = `Generating embeddings for ${allTasksForBulk.length} tasks... (this may take several minutes)`;

    // Call bulk store API
    const result = await window.electronAPI.vectordb.bulkStore(allTasksForBulk);

    if (result.success) {
      if (result.failed === 0) {
        elements.embeddingsStatusIcon.textContent = 'check_circle';
        elements.embeddingsStatusIcon.style.color = 'var(--success)';
        elements.embeddingsStatusText.textContent = `Successfully generated embeddings for all ${result.processed} tasks`;
        elements.embeddingsStatus.style.background = 'var(--success-bg)';
        elements.embeddingsStatus.style.borderColor = 'var(--success)';
      } else {
        elements.embeddingsStatusIcon.textContent = 'warning';
        elements.embeddingsStatusIcon.style.color = 'var(--warning)';
        elements.embeddingsStatusText.textContent = `Completed with ${result.processed} successful, ${result.failed} failed`;
        elements.embeddingsStatus.style.background = 'var(--warning-bg)';
        elements.embeddingsStatus.style.borderColor = 'var(--warning)';
      }
    } else {
      elements.embeddingsStatusIcon.textContent = 'error';
      elements.embeddingsStatusIcon.style.color = 'var(--danger)';
      elements.embeddingsStatusText.textContent = `Failed: ${result.error}`;
      elements.embeddingsStatus.style.background = 'var(--danger-bg)';
      elements.embeddingsStatus.style.borderColor = 'var(--danger)';
    }

    // Re-enable button
    elements.regenerateEmbeddingsBtn.disabled = false;

    // Refresh status after a short delay
    setTimeout(async () => {
      await checkEmbeddingsStatus();
    }, 3000);

  } catch (error) {
    console.error('Error regenerating embeddings:', error);
    elements.embeddingsStatusIcon.textContent = 'error';
    elements.embeddingsStatusIcon.style.color = 'var(--danger)';
    elements.embeddingsStatusText.textContent = `Error: ${error.message}`;
    elements.embeddingsStatus.style.background = 'var(--danger-bg)';
    elements.embeddingsStatus.style.borderColor = 'var(--danger)';
    elements.regenerateEmbeddingsBtn.disabled = false;
  }
}

/**
 * Check and display embeddings status
 */
async function checkEmbeddingsStatus() {
  try {
    // Check if embeddings are initialized
    const result = await window.electronAPI.vectordb.isInitialized();

    if (result.success && result.initialized) {
      // Embeddings are enabled
      elements.embeddingsStatusIcon.textContent = 'check_circle';
      elements.embeddingsStatusIcon.style.color = 'var(--success)';
      elements.embeddingsStatusText.textContent = 'Embeddings enabled - Tasks will be automatically indexed for semantic search';
      elements.embeddingsStatus.style.background = 'var(--success-bg)';
      elements.embeddingsStatus.style.borderColor = 'var(--success)';
    } else {
      // Embeddings are disabled
      elements.embeddingsStatusIcon.textContent = 'info';
      elements.embeddingsStatusIcon.style.color = 'var(--text-secondary)';
      elements.embeddingsStatusText.textContent = 'Embeddings disabled - Configure Ollama URL and select an embedding model above to enable';
      elements.embeddingsStatus.style.background = 'var(--bg-secondary)';
      elements.embeddingsStatus.style.borderColor = 'var(--border-color)';
    }
  } catch (error) {
    console.error('Error checking embeddings status:', error);
    elements.embeddingsStatusIcon.textContent = 'error';
    elements.embeddingsStatusIcon.style.color = 'var(--danger)';
    elements.embeddingsStatusText.textContent = 'Error checking embeddings status';
    elements.embeddingsStatus.style.background = 'var(--danger-bg)';
    elements.embeddingsStatus.style.borderColor = 'var(--danger)';
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

  // Auto-scroll behavior for new messages
  if (elements.agentChat) {
    // Use a small delay to ensure DOM layout is complete before scrolling
    setTimeout(() => {
      const container = elements.agentChat;
      const messageTop = messageDiv.offsetTop;
      const messageHeight = messageDiv.offsetHeight;
      const messageBottom = messageTop + messageHeight;
      const containerHeight = container.clientHeight;
      const currentScrollTop = container.scrollTop;
      const viewportTop = currentScrollTop;
      const viewportBottom = currentScrollTop + containerHeight;

      // Check if message fits in viewport
      if (messageHeight <= containerHeight) {
        // Message fits - scroll to show it fully
        // Position it so the bottom is visible
        const targetScroll = messageBottom - containerHeight;
        container.scrollTop = Math.max(0, targetScroll);
      } else {
        // Message is too tall - scroll just enough to show the top
        // Don't scroll past the top of the message
        if (messageTop < viewportTop) {
          // Message starts above viewport - scroll up to it
          container.scrollTop = messageTop;
        } else if (messageTop >= viewportBottom) {
          // Message starts below viewport - scroll down to show it
          // Position top of message near top of viewport with small padding
          container.scrollTop = messageTop - 20; // 20px padding
        }
        // If messageTop is already in viewport, don't scroll at all
      }
    }, 10);
  }

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

/**
 * Build smart task context using semantic search when available
 * Falls back to full task list if embeddings aren't enabled
 * @param {string} query - User's question/prompt
 * @param {number} limit - Maximum number of relevant tasks to return (default: 10)
 * @returns {Promise<string>} - Formatted task context
 */
async function buildSmartTasksContext(query, limit = 10) {
  // Check if embeddings are enabled for current folder
  if (!areEmbeddingsEnabled()) {
    // Fallback to traditional full context
    console.log('[AI Agent] Embeddings not enabled, using full task list');
    return buildTasksContext(state.tasks);
  }

  try {
    console.log('[AI Agent] Using semantic search for context');

    // Perform semantic search
    const searchResult = await window.electronAPI.vectordb.search(query, limit);

    if (!searchResult.success) {
      console.warn('[AI Agent] Semantic search failed, falling back to full list:', searchResult.error);
      return buildTasksContext(state.tasks);
    }

    if (!searchResult.results || searchResult.results.length === 0) {
      console.log('[AI Agent] No semantic search results, using full task list');
      return buildTasksContext(state.tasks);
    }

    // Log search results
    console.log('[AI Agent] Vector DB search returned', searchResult.results.length, 'results:');
    searchResult.results.forEach((result, index) => {
      const metadata = result.metadata || {};
      const score = result.score ? `${(result.score * 100).toFixed(1)}%` : 'N/A';
      console.log(`  ${index + 1}. "${metadata.title || 'Untitled'}" (score: ${score}, taskId: ${result.taskId})`);
    });

    // Build context from search results
    let context = `[Using semantic search - ${searchResult.results.length} most relevant tasks]\n\n`;

    for (const result of searchResult.results) {
      const metadata = result.metadata || {};
      const score = result.score ? ` (relevance: ${(result.score * 100).toFixed(1)}%)` : '';

      const completionStatus = metadata.completed ? '[✓]' : '[ ]';
      const dueDate = metadata.dueDate ? ` (Due: ${metadata.dueDate})` : '';
      const created = metadata.created ? ` (Created: ${metadata.created.split('T')[0]})` : '';
      const title = metadata.title || 'Untitled Task';

      context += `${completionStatus} ${title}${dueDate}${created}${score}\n`;

      // Add task details/body from metadata
      const details = metadata.details || metadata.body;
      if (details && details.trim()) {
        context += `  Details: ${details.trim()}\n`;
      }

      // Always show priority
      const priority = metadata.priority || 'normal';
      context += `  Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}\n`;

      // Always show status
      const taskStatus = metadata.status || 'Pending';
      context += `  Status: ${taskStatus}\n`;

      context += '\n';
    }

    console.log(`[AI Agent] Built context from ${searchResult.results.length} semantically relevant tasks`);
    return context;

  } catch (error) {
    console.error('[AI Agent] Error in semantic search:', error);
    // Fallback to traditional context on error
    return buildTasksContext(state.tasks);
  }
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

  // Build task context using semantic search when available
  const tasksContext = await buildSmartTasksContext(prompt);

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

  // Sidebar items (OKRs, Goals) - event delegation
  document.addEventListener('click', (e) => {
    const sidebarItem = e.target.closest('.sidebar-item');
    if (sidebarItem) {
      const dataType = sidebarItem.dataset.type;
      if (dataType === 'okrs') {
        loadOkrs();
      } else if (dataType === 'goals') {
        loadGoals();
      }
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

  // Text Context Menu - for input/textarea fields and any selected text
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;

    // Check if right-click is on an input/textarea or there's selected text
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || hasSelection) {
      e.preventDefault();

      // Store the target element
      state.textContextTarget = target;

      // Show/hide menu items based on context
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const pasteItem = elements.textContextMenu.querySelector('[data-action="paste"]');
      const cutItem = elements.textContextMenu.querySelector('[data-action="cut"]');
      const selectAllItem = elements.textContextMenu.querySelector('[data-action="select-all"]');
      const divider = elements.textContextMenu.querySelector('.context-menu-divider');

      // Only show paste, cut, and select-all for editable fields
      if (pasteItem) pasteItem.style.display = isEditable ? '' : 'none';
      if (cutItem) cutItem.style.display = isEditable ? '' : 'none';
      if (selectAllItem) selectAllItem.style.display = isEditable ? '' : 'none';
      // Hide divider if select-all is hidden (nothing below it)
      if (divider) divider.style.display = isEditable ? '' : 'none';

      // Position and show text context menu
      elements.textContextMenu.style.left = `${e.clientX}px`;
      elements.textContextMenu.style.top = `${e.clientY}px`;
      elements.textContextMenu.classList.add('active');
    }
  });

  // Text context menu item clicks
  elements.textContextMenu.addEventListener('click', async (e) => {
    const menuItem = e.target.closest('.context-menu-item');
    if (!menuItem || !state.textContextTarget) return;

    const action = menuItem.dataset.action;
    const target = state.textContextTarget;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    switch (action) {
      case 'copy':
        if (isEditable) {
          // Copy from input/textarea
          if (target.selectionStart !== target.selectionEnd) {
            const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
            await window.electronAPI.clipboard.writeText(selectedText);
          } else {
            // If no selection, copy all text
            await window.electronAPI.clipboard.writeText(target.value);
          }
        } else {
          // Copy from any selected text in the page
          const selection = window.getSelection();
          const selectedText = selection.toString();
          if (selectedText) {
            await window.electronAPI.clipboard.writeText(selectedText);
          }
        }
        break;

      case 'paste':
        const clipboardText = await window.electronAPI.clipboard.readText();
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const text = target.value;

        // Insert clipboard text at cursor or replace selection
        target.value = text.substring(0, start) + clipboardText + text.substring(end);

        // Set cursor position after pasted text
        target.selectionStart = target.selectionEnd = start + clipboardText.length;

        // Trigger input event for any listeners
        target.dispatchEvent(new Event('input', { bubbles: true }));
        break;

      case 'cut':
        if (target.selectionStart !== target.selectionEnd) {
          const selectedText = target.value.substring(target.selectionStart, target.selectionEnd);
          await window.electronAPI.clipboard.writeText(selectedText);

          // Remove selected text
          const startPos = target.selectionStart;
          const endPos = target.selectionEnd;
          target.value = target.value.substring(0, startPos) + target.value.substring(endPos);
          target.selectionStart = target.selectionEnd = startPos;

          // Trigger input event
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;

      case 'select-all':
        target.select();
        break;
    }

    // Close context menu
    elements.textContextMenu.classList.remove('active');
    state.textContextTarget = null;
  });

  // Close text context menu when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!elements.textContextMenu.contains(e.target)) {
      elements.textContextMenu.classList.remove('active');
      state.textContextTarget = null;
    }
  });

  // Global copy handler - copy any selected text with Ctrl+C
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+C (Windows/Linux) or Cmd+C (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey && !e.altKey) {
      const selection = window.getSelection();
      const selectedText = selection.toString();

      // Only handle if text is selected and not in an input/textarea (those handle themselves)
      if (selectedText && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        await window.electronAPI.clipboard.writeText(selectedText);
        console.log('Copied selected text to clipboard');
      }
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
  elements.enableOkrsCheckbox.addEventListener('change', handleEnableOkrsChange);
  elements.enableGoalsCheckbox.addEventListener('change', handleEnableGoalsChange);

  // Ollama
  elements.detectOllamaBtn.addEventListener('click', detectOllama);
  elements.ollamaModelSelect.addEventListener('change', handleOllamaModelChange);
  elements.ollamaEmbeddingModelSelect.addEventListener('change', handleOllamaEmbeddingModelChange);
  elements.refreshModelsBtn.addEventListener('click', refreshOllamaModels);
  elements.ollamaSystemPrompt.addEventListener('blur', handleSystemPromptChange);
  elements.resetSystemPromptBtn.addEventListener('click', handleResetSystemPrompt);

  // Embeddings
  // Embeddings are now automatic for all folders when tasks are created/updated
  // Users can manually regenerate all embeddings with the button in settings
  elements.regenerateEmbeddingsBtn.addEventListener('click', handleRegenerateAllEmbeddings);

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

  // Event delegation for move task tree item selection
  elements.moveTaskTree.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.move-task-item');
    if (taskItem && !taskItem.dataset.disabled) {
      const taskPath = taskItem.dataset.taskPath;
      if (taskPath) {
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
          taskItem.classList.add('selected');
        }
      }
    }
  });

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

  // Goal Modal
  if (elements.addGoalBtn) {
    elements.addGoalBtn.addEventListener('click', () => {
      openGoalEditModal(null); // null = create new goal
    });
  }

  if (elements.goalModalCancelBtn) {
    elements.goalModalCancelBtn.addEventListener('click', closeGoalModal);
  }

  if (elements.goalModalSaveBtn) {
    elements.goalModalSaveBtn.addEventListener('click', saveGoalModal);
  }

  if (elements.goalModalDeleteBtn) {
    elements.goalModalDeleteBtn.addEventListener('click', deleteGoal);
  }

  if (elements.addMilestoneBtn) {
    elements.addMilestoneBtn.addEventListener('click', addMilestone);
  }

  if (elements.linkTaskBtn) {
    elements.linkTaskBtn.addEventListener('click', linkTaskToGoal);
  }

  // Close goal modal when clicking outside
  if (elements.goalModal) {
    elements.goalModal.addEventListener('click', (e) => {
      if (e.target === elements.goalModal) {
        closeGoalModal();
      }
    });
  }

  // Escape key to close modals and views
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      // Check if any modals are open first (priority over input clearing)
      if (elements.moveTaskModal.classList.contains('active')) {
        closeMoveTaskModal();
        return;
      } else if (elements.taskModal.classList.contains('active')) {
        closeTaskModal();
        return;
      } else if (elements.goalModal && elements.goalModal.classList.contains('active')) {
        closeGoalModal();
        return;
      } else if (elements.addFolderModal.classList.contains('active')) {
        closeAddFolderModal();
        return;
      } else if (elements.commitModal.classList.contains('active')) {
        closeCommitModal();
        return;
      }

      // If we're in an input field and no modals are open, clear it and blur
      if (e.target.matches('input[type="text"], textarea')) {
        e.target.value = '';
        e.target.blur();
        return;
      }

      // If in help, settings, or dashboard, return to tasks view
      if (state.currentView === 'help' || state.currentView === 'settings' || state.currentView === 'dashboard') {
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

      // Update embeddings with new status (fire-and-forget, don't block UI)
      const updatedTask = findTaskByPath(state.tasks, taskPath);
      if (updatedTask) {
        updateTaskEmbeddings(updatedTask).catch(err => {
          console.error('Error updating embeddings:', err);
        });
      }

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

    // Setup sidebar section collapse/expand
    setupSidebarSectionCollapse();

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

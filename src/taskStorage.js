const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

/**
 * Task Storage Manager
 * Handles file-based task storage with markdown files and folder hierarchy
 */
class TaskStorage {
  constructor() {
    this.tasksPath = null;
    this.METADATA_FILE = '.tasks';
    this.CONFIG_FILE = '.tasker';
    this.configPath = null;
  }

  /**
   * Initialize the task storage with a base path
   */
  async initialize(customPath = null) {
    if (customPath) {
      this.tasksPath = customPath;
    } else {
      // Default to user's home directory / tasks
      const userHome = app.getPath('home');
      this.tasksPath = path.join(userHome, 'tasks');
    }

    // Create the tasks directory if it doesn't exist
    await this.ensureDirectory(this.tasksPath);

    return this.tasksPath;
  }

  /**
   * Get the current tasks path
   */
  getTasksPath() {
    return this.tasksPath;
  }

  /**
   * Initialize OKRs storage path
   */
  async initializeOkrsPath() {
    const userHome = app.getPath('home');
    const taskerData = path.join(userHome, '.tasker-data');
    const okrsPath = path.join(taskerData, 'okrs');

    // Create the directory structure
    await this.ensureDirectory(okrsPath);

    // Initialize metadata file if it doesn't exist
    const metadataPath = path.join(okrsPath, this.METADATA_FILE);
    try {
      await fs.access(metadataPath);
    } catch (error) {
      // Create initial metadata
      await this.writeMetadata(okrsPath, {
        order: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      });
    }

    return okrsPath;
  }

  /**
   * Initialize Goals storage path
   */
  async initializeGoalsPath() {
    const userHome = app.getPath('home');
    const taskerData = path.join(userHome, '.tasker-data');
    const goalsPath = path.join(taskerData, 'goals');

    // Create the directory structure
    await this.ensureDirectory(goalsPath);

    // Initialize metadata file if it doesn't exist
    const metadataPath = path.join(goalsPath, this.METADATA_FILE);
    try {
      await fs.access(metadataPath);
    } catch (error) {
      // Create initial metadata
      await this.writeMetadata(goalsPath, {
        order: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      });
    }

    return goalsPath;
  }

  /**
   * Get OKRs path (constructs path without creating directory)
   */
  getOkrsPath() {
    const userHome = app.getPath('home');
    return path.join(userHome, '.tasker-data', 'okrs');
  }

  /**
   * Get Goals path (constructs path without creating directory)
   */
  getGoalsPath() {
    const userHome = app.getPath('home');
    return path.join(userHome, '.tasker-data', 'goals');
  }

  /**
   * Ensure a directory exists, create it if it doesn't
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Generate a safe filename from task text
   */
  generateFileName(text, id) {
    // Use timestamp-based ID for uniqueness
    const timestamp = id || Date.now();
    // Sanitize the text for filename
    const sanitized = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    return `${timestamp}-${sanitized || 'task'}.md`;
  }

  /**
   * Read metadata file from a directory
   */
  async readMetadata(dirPath) {
    const metadataPath = path.join(dirPath, this.METADATA_FILE);

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default metadata if file doesn't exist
      return {
        order: [],
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
    }
  }

  /**
   * Write metadata file to a directory
   */
  async writeMetadata(dirPath, metadata) {
    const metadataPath = path.join(dirPath, this.METADATA_FILE);
    metadata.modified = new Date().toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  /**
   * Parse a markdown task file
   */
  async parseTaskFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Extract ID from filename (timestamp prefix)
    const idMatch = fileName.match(/^(\d+)-/);
    const id = idMatch ? parseInt(idMatch[1]) : Date.now();

    // Parse markdown frontmatter and content
    const lines = content.split('\n');
    let title = '';
    let completed = false;
    let priority = 'normal';
    let dueDate = null;
    let created = null;
    let status = 'Pending';
    let body = '';
    let inFrontmatter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '---') {
        if (i === 0) {
          inFrontmatter = true;
          continue;
        } else if (inFrontmatter) {
          inFrontmatter = false;
          continue;
        }
      }

      if (inFrontmatter) {
        if (line.startsWith('completed:')) {
          completed = line.includes('true');
        } else if (line.startsWith('title:')) {
          title = line.substring(6).trim();
        } else if (line.startsWith('priority:')) {
          priority = line.substring(9).trim();
        } else if (line.startsWith('dueDate:')) {
          dueDate = line.substring(8).trim() || null;
        } else if (line.startsWith('created:')) {
          created = line.substring(8).trim();
        } else if (line.startsWith('status:')) {
          status = line.substring(7).trim();
        }
      } else {
        body += line + '\n';
      }
    }

    // Trim body and remove the title heading if present
    body = body.trim();

    // If no title in frontmatter, use first line of body
    if (!title && body) {
      const firstLine = body.split('\n')[0];
      title = firstLine.replace(/^#\s*/, '').trim();
    }

    // Remove the title heading from body if it matches (case-insensitive)
    if (title && body) {
      const bodyLines = body.split('\n');
      if (bodyLines[0].trim() === `# ${title}`) {
        // Remove first line (title heading) and any following empty lines
        bodyLines.shift();
        while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
          bodyLines.shift();
        }
        body = bodyLines.join('\n').trim();
      }
    }

    // Check if this task has children (is a directory)
    const taskDir = filePath.replace('.md', '');
    let hasChildren = false;
    try {
      const stat = await fs.stat(taskDir);
      hasChildren = stat.isDirectory();
    } catch (error) {
      // Directory doesn't exist, no children
    }

    // Check if this task is in the .deleted folder
    const isDeleted = filePath.includes(path.sep + '.deleted' + path.sep);

    // If status is not set, derive from completed flag
    if (!status) {
      status = completed ? 'Completed' : 'Pending';
    }

    return {
      id,
      title: title || 'Untitled Task',
      completed,
      body: body.trim(),
      priority: priority || 'normal',
      dueDate: dueDate || null,
      status: status || 'Pending',
      created: created || new Date().toISOString(),
      fileName,
      filePath,
      hasChildren,
      children: [],
      deleted: isDeleted
    };
  }

  /**
   * Create task markdown content
   */
  createTaskContent(title, completed = false, body = '', priority = 'normal', dueDate = null, status = 'Pending', created = null) {
    const createdDate = created || new Date().toISOString();
    const dueDateLine = dueDate ? `dueDate: ${dueDate}` : 'dueDate: ';

    return `---
completed: ${completed}
title: ${title}
priority: ${priority}
${dueDateLine}
status: ${status}
created: ${createdDate}
---

# ${title}

${body}
`;
  }

  /**
   * Create a new task
   */
  async createTask(parentPath, text, body = '') {
    const id = Date.now();
    const fileName = this.generateFileName(text, id);
    const taskPath = path.join(parentPath, fileName);

    // Create the markdown file with status: 'Pending'
    const content = this.createTaskContent(text, false, body, 'normal', null, 'Pending');
    await fs.writeFile(taskPath, content, 'utf-8');

    // Update parent metadata to include this task in order
    const metadata = await this.readMetadata(parentPath);
    if (!metadata.order.includes(fileName)) {
      // Find the position of the first completed task
      let insertIndex = metadata.order.length; // Default: add at end

      for (let i = 0; i < metadata.order.length; i++) {
        const siblingFileName = metadata.order[i];
        const siblingPath = path.join(parentPath, siblingFileName);

        try {
          const siblingTask = await this.parseTaskFile(siblingPath);
          if (siblingTask.completed) {
            // Found first completed task, insert new task before it
            insertIndex = i;
            break;
          }
        } catch (error) {
          // If we can't read a sibling task, skip it
          console.error(`Error reading sibling task ${siblingPath}:`, error);
        }
      }

      // Insert at the calculated position
      metadata.order.splice(insertIndex, 0, fileName);
      await this.writeMetadata(parentPath, metadata);
    }

    return {
      id,
      title: text,
      completed: false,
      body,
      status: 'Pending',
      fileName,
      filePath: taskPath,
      hasChildren: false,
      children: []
    };
  }

  /**
   * Update a task
   */
  async updateTask(taskPath, updates) {
    const task = await this.parseTaskFile(taskPath);

    const title = updates.title !== undefined ? updates.title : task.title;
    let completed = updates.completed !== undefined ? updates.completed : task.completed;
    const body = updates.body !== undefined ? updates.body : task.body;
    const priority = updates.priority !== undefined ? updates.priority : task.priority;
    const dueDate = updates.dueDate !== undefined ? updates.dueDate : task.dueDate;
    let status = updates.status !== undefined ? updates.status : task.status;

    // Sync status and completed flag - prioritize status field over completed checkbox
    if (updates.status !== undefined) {
      // If status is being updated, sync completed flag
      completed = updates.status === 'Completed';
    } else if (updates.completed !== undefined) {
      // If completed flag is being updated (and status wasn't), sync status
      status = updates.completed ? 'Completed' : 'Pending';
    }

    const content = this.createTaskContent(title, completed, body, priority, dueDate, status, task.created);
    await fs.writeFile(taskPath, content, 'utf-8');

    return { ...task, title, completed, body, priority, dueDate, status };
  }

  /**
   * Delete a task (move to .deleted folder for soft delete)
   */
  async deleteTask(taskPath) {
    const fileName = path.basename(taskPath);
    const parentPath = path.dirname(taskPath);
    const taskDir = taskPath.replace('.md', '');

    // Create .deleted folder in parent directory
    const deletedFolder = path.join(parentPath, '.deleted');
    await this.ensureDirectory(deletedFolder);

    // Move the markdown file to .deleted folder (copy + delete for cross-device support)
    const deletedFilePath = path.join(deletedFolder, fileName);
    try {
      await fs.copyFile(taskPath, deletedFilePath);
      await fs.unlink(taskPath);
    } catch (error) {
      console.error('Error moving task file to .deleted:', error);
      throw error;
    }

    // Move the directory if it exists (copy recursively + delete)
    try {
      const deletedDirPath = path.join(deletedFolder, path.basename(taskDir));
      // Check if directory exists
      await fs.access(taskDir);
      // Copy recursively
      await fs.cp(taskDir, deletedDirPath, { recursive: true });
      // Delete original
      await fs.rm(taskDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
      if (error.code !== 'ENOENT') {
        console.error('Error moving task directory to .deleted:', error);
      }
    }

    // Update parent metadata
    const metadata = await this.readMetadata(parentPath);
    metadata.order = metadata.order.filter(f => f !== fileName);
    await this.writeMetadata(parentPath, metadata);
  }

  /**
   * Permanently delete all items in the .deleted folder
   */
  async clearDeletedItems() {
    const deletedFolder = path.join(this.tasksPath, '.deleted');

    try {
      // Remove the entire .deleted folder and its contents
      await fs.rm(deletedFolder, { recursive: true, force: true });
      console.log('Deleted items cleared successfully');
    } catch (error) {
      if (error.code === 'ENOENT') {
        // .deleted folder doesn't exist, that's fine
        console.log('No deleted items to clear');
      } else {
        throw error;
      }
    }
  }

  /**
   * Restore a deleted task (move it back from .deleted folder)
   */
  async restoreTask(taskPath) {
    // Check if this is actually a deleted task
    if (!taskPath.includes(path.sep + '.deleted' + path.sep)) {
      throw new Error('Task is not in deleted folder');
    }

    const fileName = path.basename(taskPath);
    const deletedParentPath = path.dirname(taskPath);
    const taskDir = taskPath.replace('.md', '');

    // Figure out the restore path (remove .deleted from the path)
    const pathParts = taskPath.split(path.sep);
    const deletedIndex = pathParts.indexOf('.deleted');
    const restorePathParts = [...pathParts.slice(0, deletedIndex), ...pathParts.slice(deletedIndex + 1)];
    const restorePath = restorePathParts.join(path.sep);
    const restoreParentPath = path.dirname(restorePath);

    // Ensure parent directory exists
    await this.ensureDirectory(restoreParentPath);

    // Move the markdown file back
    await fs.rename(taskPath, restorePath);

    // Move the directory if it exists
    try {
      const restoreDirPath = restorePath.replace('.md', '');
      await fs.rename(taskDir, restoreDirPath);
    } catch (error) {
      // Directory might not exist, that's fine
    }

    // Update deleted folder metadata
    const deletedMetadata = await this.readMetadata(deletedParentPath);
    deletedMetadata.order = deletedMetadata.order.filter(f => f !== fileName);
    await this.writeMetadata(deletedParentPath, deletedMetadata);

    // Update restore parent metadata
    const restoreMetadata = await this.readMetadata(restoreParentPath);
    if (!restoreMetadata.order.includes(fileName)) {
      restoreMetadata.order.push(fileName);
      await this.writeMetadata(restoreParentPath, restoreMetadata);
    }

    return restorePath;
  }

  /**
   * Permanently delete a task (for already deleted items)
   */
  async permanentlyDeleteTask(taskPath) {
    const fileName = path.basename(taskPath);
    const parentPath = path.dirname(taskPath);
    const taskDir = taskPath.replace('.md', '');

    // Delete the markdown file permanently
    await fs.unlink(taskPath);

    // Delete the directory if it exists
    try {
      await fs.rm(taskDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }

    // Update parent metadata
    const metadata = await this.readMetadata(parentPath);
    metadata.order = metadata.order.filter(f => f !== fileName);
    await this.writeMetadata(parentPath, metadata);
  }

  /**
   * Make a task a child of another task
   */
  async moveTaskToParent(taskPath, newParentTaskPath) {
    const fileName = path.basename(taskPath);
    const oldParentPath = path.dirname(taskPath);

    // Create directory for parent task if it doesn't exist
    const parentDir = newParentTaskPath.replace('.md', '');
    await this.ensureDirectory(parentDir);

    // Move the file
    const newTaskPath = path.join(parentDir, fileName);
    await fs.rename(taskPath, newTaskPath);

    // Move associated directory if it exists
    const oldTaskDir = taskPath.replace('.md', '');
    const newTaskDir = newTaskPath.replace('.md', '');
    try {
      await fs.rename(oldTaskDir, newTaskDir);
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    // Update old parent metadata
    const oldMetadata = await this.readMetadata(oldParentPath);
    oldMetadata.order = oldMetadata.order.filter(f => f !== fileName);
    await this.writeMetadata(oldParentPath, oldMetadata);

    // Update new parent metadata
    const newMetadata = await this.readMetadata(parentDir);
    if (!newMetadata.order.includes(fileName)) {
      newMetadata.order.push(fileName);
      await this.writeMetadata(parentDir, newMetadata);
    }

    return newTaskPath;
  }

  /**
   * Move a task to be at the same level (sibling) as another task
   */
  async moveTaskToSibling(taskPath, targetTaskPath) {
    const fileName = path.basename(taskPath);
    const oldParentPath = path.dirname(taskPath);
    const newParentPath = path.dirname(targetTaskPath);

    console.log('[moveToSibling] Moving:', taskPath);
    console.log('[moveToSibling] Target:', targetTaskPath);
    console.log('[moveToSibling] Old parent:', oldParentPath);
    console.log('[moveToSibling] New parent:', newParentPath);

    // If already in the same parent, no move needed (use normalized comparison)
    const normalizedOldParent = oldParentPath.replace(/\\/g, '/').toLowerCase();
    const normalizedNewParent = newParentPath.replace(/\\/g, '/').toLowerCase();

    if (normalizedOldParent === normalizedNewParent) {
      console.log('[moveToSibling] Already in same parent, no file move needed');
      return taskPath;
    }

    console.log('[moveToSibling] Moving to different parent, performing file operations');

    // Ensure the new parent directory exists
    await this.ensureDirectory(newParentPath);

    // Move the file
    const newTaskPath = path.join(newParentPath, fileName);
    await fs.rename(taskPath, newTaskPath);

    // Move associated directory if it exists
    const oldTaskDir = taskPath.replace('.md', '');
    const newTaskDir = newTaskPath.replace('.md', '');
    try {
      await fs.rename(oldTaskDir, newTaskDir);
    } catch (error) {
      // Directory doesn't exist, that's fine
    }

    // Update old parent metadata
    const oldMetadata = await this.readMetadata(oldParentPath);
    oldMetadata.order = oldMetadata.order.filter(f => f !== fileName);
    await this.writeMetadata(oldParentPath, oldMetadata);

    // Update new parent metadata
    const newMetadata = await this.readMetadata(newParentPath);
    if (!newMetadata.order.includes(fileName)) {
      newMetadata.order.push(fileName);
      await this.writeMetadata(newParentPath, newMetadata);
    }

    return newTaskPath;
  }

  /**
   * Reorder tasks within a directory
   */
  async reorderTasks(dirPath, orderedFileNames) {
    const metadata = await this.readMetadata(dirPath);
    metadata.order = orderedFileNames;
    await this.writeMetadata(dirPath, metadata);
  }

  /**
   * Load all tasks from a directory (recursive)
   */
  async loadTasks(dirPath, recursive = true) {
    const files = await fs.readdir(dirPath);
    const metadata = await this.readMetadata(dirPath);
    const tasks = [];

    // Filter markdown files
    const mdFiles = files.filter(f => f.endsWith('.md'));

    // Sort by metadata order
    const orderedFiles = metadata.order.filter(f => mdFiles.includes(f));
    const unorderedFiles = mdFiles.filter(f => !metadata.order.includes(f));
    const allFiles = [...orderedFiles, ...unorderedFiles];

    // Update metadata if there are new files
    if (unorderedFiles.length > 0) {
      metadata.order = allFiles;
      await this.writeMetadata(dirPath, metadata);
    }

    for (const file of allFiles) {
      const filePath = path.join(dirPath, file);
      const task = await this.parseTaskFile(filePath);

      // Load children if recursive and task has children
      if (recursive && task.hasChildren) {
        const childDir = filePath.replace('.md', '');
        task.children = await this.loadTasks(childDir, true);
      }

      tasks.push(task);
    }

    // Also load tasks from .deleted folder if it exists
    if (recursive) {
      const deletedFolder = path.join(dirPath, '.deleted');
      try {
        const stat = await fs.stat(deletedFolder);
        if (stat.isDirectory()) {
          const deletedTasks = await this.loadTasks(deletedFolder, true);
          tasks.push(...deletedTasks);
        }
      } catch (error) {
        // .deleted folder doesn't exist, that's fine
      }
    }

    return tasks;
  }

  /**
   * Search tasks by text
   */
  async searchTasks(dirPath, searchText) {
    const allTasks = await this.loadTasks(dirPath, true);
    const results = [];

    const search = (tasks, parentPath = []) => {
      for (const task of tasks) {
        const pathInfo = [...parentPath, task.title];

        if (task.title.toLowerCase().includes(searchText.toLowerCase()) ||
            task.body.toLowerCase().includes(searchText.toLowerCase())) {
          results.push({
            ...task,
            path: pathInfo
          });
        }

        if (task.children.length > 0) {
          search(task.children, pathInfo);
        }
      }
    };

    search(allTasks);
    return results;
  }

  /**
   * Get the config file path
   */
  getConfigPath() {
    if (!this.configPath) {
      const userHome = app.getPath('home');
      this.configPath = path.join(userHome, this.CONFIG_FILE);
    }
    return this.configPath;
  }

  /**
   * Read the config file
   */
  async readConfig() {
    const configPath = this.getConfigPath();

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default config if file doesn't exist
      return {
        taskFolders: [],
        currentFolderId: null,
        theme: 'auto',
        isAuthenticated: false,
        currentUser: null,
        activeFilters: ['all'],
        sortOrder: 'default',
        expandedTasks: {}, // { folderId: [taskId1, taskId2, ...] }
        enableOkrs: false, // Toggle OKR tracking
        enableGoals: false, // Toggle Annual Goals tracking
        okrsPath: null, // Path to OKRs folder (auto-set on first enable)
        goalsPath: null, // Path to Goals folder (auto-set on first enable)
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
    }
  }

  /**
   * Write the config file
   */
  async writeConfig(config) {
    const configPath = this.getConfigPath();
    config.modified = new Date().toISOString();

    // Ensure created timestamp exists
    if (!config.created) {
      config.created = new Date().toISOString();
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Update config with partial data
   */
  async updateConfig(updates) {
    const config = await this.readConfig();
    const updatedConfig = { ...config, ...updates };
    await this.writeConfig(updatedConfig);
    return updatedConfig;
  }
}

// Export singleton instance
const taskStorage = new TaskStorage();
module.exports = taskStorage;

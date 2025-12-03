const TaskStorage = require('./taskStorage');
const chokidar = require('chokidar');
const { EventEmitter } = require('events');

/**
 * Dropbox Storage Manager
 * Wraps TaskStorage to add automatic Dropbox syncing via file watching
 */
class DropboxStorage extends EventEmitter {
  constructor(dropboxClient, ramdiskManager, taskStorage) {
    super();
    this.dropboxClient = dropboxClient;
    this.ramdiskManager = ramdiskManager;
    this.taskStorage = taskStorage; // Use provided TaskStorage instance
    this.watchers = new Map(); // folderId -> watcher instance
    this.syncInProgress = new Map(); // folderId -> boolean
    this.syncQueue = new Map(); // folderId -> array of pending changes
  }

  /**
   * Initialize a Dropbox-backed folder
   * @param {string} folderId - Unique folder ID
   * @param {string} dropboxPath - Path in Dropbox
   * @returns {Promise<string>} - Ramdisk path where tasks are stored
   */
  async initialize(folderId, dropboxPath) {
    // Create ramdisk for this folder
    const ramdiskResult = await this.ramdiskManager.createRamdisk(folderId);
    if (!ramdiskResult.success) {
      throw new Error(`Failed to create ramdisk: ${ramdiskResult.error}`);
    }

    const ramdiskPath = ramdiskResult.path;

    // Initialize TaskStorage with ramdisk path
    await this.taskStorage.initialize(ramdiskPath);

    // Pull from Dropbox to ramdisk
    await this.pullFromDropbox(folderId, dropboxPath);

    // Start watching for changes
    await this.startWatching(folderId, ramdiskPath, dropboxPath);

    return ramdiskPath;
  }

  /**
   * Pull files from Dropbox to ramdisk
   * @param {string} folderId - Unique folder ID
   * @param {string} dropboxPath - Path in Dropbox
   */
  async pullFromDropbox(folderId, dropboxPath) {
    try {
      this.emit('sync-start', { folderId, direction: 'pull' });

      const ramdiskPath = this.ramdiskManager.getRamdiskPath(folderId);

      // Download entire Dropbox folder to ramdisk recursively
      const downloadResult = await this.dropboxClient.downloadFolderRecursive(dropboxPath, ramdiskPath);

      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }

      this.emit('sync-complete', { folderId, direction: 'pull', filesCount: downloadResult.filesDownloaded });
      console.log(`[DropboxStorage] Pulled ${downloadResult.filesDownloaded} files from Dropbox`);
    } catch (error) {
      this.emit('sync-error', { folderId, direction: 'pull', error: error.message });
      throw error;
    }
  }

  /**
   * Push files from ramdisk to Dropbox (sync: upload new/modified, delete removed)
   * @param {string} folderId - Unique folder ID
   * @param {string} dropboxPath - Path in Dropbox
   */
  async pushToDropbox(folderId, dropboxPath) {
    // Check if sync already in progress
    if (this.syncInProgress.get(folderId)) {
      console.log(`[DropboxStorage] Sync already in progress for folder ${folderId}, queueing...`);
      return;
    }

    try {
      this.syncInProgress.set(folderId, true);
      this.emit('sync-start', { folderId, direction: 'push' });

      const ramdiskPath = this.ramdiskManager.getRamdiskPath(folderId);

      // Get list of files in ramdisk
      const ramdiskFiles = await this.ramdiskManager.listFiles(ramdiskPath);
      const ramdiskRelativePaths = new Set(
        ramdiskFiles.map(file => file.substring(ramdiskPath.length).replace(/^[\/\\]/, ''))
      );

      // Get list of files in Dropbox
      let dropboxFiles = [];
      try {
        dropboxFiles = await this.dropboxClient.listFolderRecursive(dropboxPath);
      } catch (error) {
        console.log(`[DropboxStorage] Dropbox folder doesn't exist yet, will create it`);
      }

      const dropboxRelativePaths = new Set(
        dropboxFiles
          .filter(file => !file.isFolder)
          .map(file => file.path.substring(dropboxPath.length).replace(/^[\/\\]/, ''))
      );

      let uploadCount = 0;
      let deleteCount = 0;

      // Upload files that exist in ramdisk
      const uploadResult = await this.dropboxClient.uploadFolderRecursive(ramdiskPath, dropboxPath);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }
      uploadCount = uploadResult.filesUploaded;

      // Delete files from Dropbox that don't exist in ramdisk
      for (const dropboxRelativePath of dropboxRelativePaths) {
        if (!ramdiskRelativePaths.has(dropboxRelativePath)) {
          const dropboxFilePath = `${dropboxPath}/${dropboxRelativePath}`.replace(/\\/g, '/');
          console.log(`[DropboxStorage] Deleting from Dropbox: ${dropboxFilePath}`);
          const deleteResult = await this.dropboxClient.deleteFile(dropboxFilePath);
          if (deleteResult.success) {
            deleteCount++;
          } else {
            console.error(`[DropboxStorage] Failed to delete ${dropboxFilePath}:`, deleteResult.error);
          }
        }
      }

      this.emit('sync-complete', { folderId, direction: 'push', filesCount: uploadCount + deleteCount });
      console.log(`[DropboxStorage] Pushed to Dropbox: ${uploadCount} uploaded, ${deleteCount} deleted`);
    } catch (error) {
      this.emit('sync-error', { folderId, direction: 'push', error: error.message });
      console.error(`[DropboxStorage] Error pushing to Dropbox:`, error);
    } finally {
      this.syncInProgress.set(folderId, false);
    }
  }

  /**
   * Start watching ramdisk for changes and auto-sync to Dropbox
   * @param {string} folderId - Unique folder ID
   * @param {string} ramdiskPath - Local ramdisk path to watch
   * @param {string} dropboxPath - Dropbox path to sync to
   */
  async startWatching(folderId, ramdiskPath, dropboxPath) {
    // Don't start duplicate watchers
    if (this.watchers.has(folderId)) {
      console.log(`[DropboxStorage] Watcher already exists for folder ${folderId}`);
      return;
    }

    console.log(`[DropboxStorage] Starting watcher for ${folderId} at ${ramdiskPath}`);

    // Initialize sync queue for this folder
    this.syncQueue.set(folderId, []);

    // Create watcher
    const watcher = chokidar.watch(ramdiskPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles except .tasks
      persistent: true,
      ignoreInitial: true, // Don't trigger for existing files
      awaitWriteFinish: {
        stabilityThreshold: 500, // Wait 500ms for file writes to finish
        pollInterval: 100
      }
    });

    // Debounce push operations to avoid too many syncs
    let pushTimeout = null;
    const debouncedPush = () => {
      clearTimeout(pushTimeout);
      pushTimeout = setTimeout(() => {
        this.pushToDropbox(folderId, dropboxPath).catch(err => {
          console.error(`[DropboxStorage] Error in debounced push:`, err);
        });
      }, 1000); // Wait 1 second after last change before pushing
    };

    // Watch for changes
    watcher
      .on('add', (filePath) => {
        console.log(`[DropboxStorage] File added: ${filePath}`);
        debouncedPush();
      })
      .on('change', (filePath) => {
        console.log(`[DropboxStorage] File changed: ${filePath}`);
        debouncedPush();
      })
      .on('unlink', (filePath) => {
        console.log(`[DropboxStorage] File deleted: ${filePath}`);
        debouncedPush();
      })
      .on('addDir', (dirPath) => {
        console.log(`[DropboxStorage] Directory added: ${dirPath}`);
        debouncedPush();
      })
      .on('unlinkDir', (dirPath) => {
        console.log(`[DropboxStorage] Directory deleted: ${dirPath}`);
        debouncedPush();
      })
      .on('error', (error) => {
        console.error(`[DropboxStorage] Watcher error for ${folderId}:`, error);
        this.emit('watch-error', { folderId, error: error.message });
      });

    this.watchers.set(folderId, watcher);
  }

  /**
   * Stop watching a folder for changes
   * @param {string} folderId - Unique folder ID
   */
  async stopWatching(folderId) {
    const watcher = this.watchers.get(folderId);
    if (watcher) {
      console.log(`[DropboxStorage] Stopping watcher for ${folderId}`);
      await watcher.close();
      this.watchers.delete(folderId);
      this.syncQueue.delete(folderId);
      this.syncInProgress.delete(folderId);
    }
  }

  /**
   * Cleanup ramdisk for a folder
   * @param {string} folderId - Unique folder ID
   */
  async cleanup(folderId) {
    // Stop watching first
    await this.stopWatching(folderId);

    // Clean up ramdisk
    await this.ramdiskManager.cleanupRamdisk(folderId);
  }

  /**
   * Get the underlying TaskStorage instance
   * This allows main.js to use TaskStorage methods directly
   */
  getTaskStorage() {
    return this.taskStorage;
  }

  /**
   * Get sync status for a folder
   * @param {string} folderId - Unique folder ID
   */
  getSyncStatus(folderId) {
    return {
      syncing: this.syncInProgress.get(folderId) || false,
      watching: this.watchers.has(folderId),
      queueLength: (this.syncQueue.get(folderId) || []).length
    };
  }

  /**
   * Manually trigger a push sync (useful for git post-commit hooks)
   * @param {string} folderId - Unique folder ID
   * @param {string} dropboxPath - Dropbox path to sync to
   */
  async manualPush(folderId, dropboxPath) {
    console.log(`[DropboxStorage] Manual push requested for ${folderId}`);
    await this.pushToDropbox(folderId, dropboxPath);
  }
}

module.exports = DropboxStorage;

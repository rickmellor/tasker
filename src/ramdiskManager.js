const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * RamdiskManager
 * Manages temporary ramdisk directories for Dropbox-backed task folders
 * Uses OS temp directory approach for cross-platform compatibility
 */
class RamdiskManager {
  constructor() {
    // Base directory for all Tasker ramdisks
    this.baseDir = path.join(os.tmpdir(), 'tasker-ramdisks');

    // Track active ramdisks
    this.activeRamdisks = new Map(); // folderId -> ramdiskPath
  }

  /**
   * Initialize the ramdisk manager
   * Creates base directory and cleans up orphaned ramdisks
   */
  async initialize() {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.baseDir, { recursive: true });

      // Clean up any orphaned ramdisks from previous sessions
      await this.cleanupOrphaned();

      return { success: true };
    } catch (error) {
      console.error('RamdiskManager initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a ramdisk for a specific folder
   * @param {string} folderId - Unique folder identifier
   * @returns {Promise<{success: boolean, path?: string, error?: string}>}
   */
  async createRamdisk(folderId) {
    try {
      const ramdiskPath = path.join(this.baseDir, folderId);

      // Check if ramdisk already exists
      try {
        await fs.access(ramdiskPath);
        console.log(`Ramdisk already exists for folder ${folderId}`);
        this.activeRamdisks.set(folderId, ramdiskPath);
        return { success: true, path: ramdiskPath };
      } catch {
        // Directory doesn't exist, create it
      }

      // Create the ramdisk directory
      await fs.mkdir(ramdiskPath, { recursive: true });

      // Track this ramdisk
      this.activeRamdisks.set(folderId, ramdiskPath);

      console.log(`Created ramdisk for folder ${folderId} at ${ramdiskPath}`);
      return { success: true, path: ramdiskPath };
    } catch (error) {
      console.error('Ramdisk creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create ramdisk'
      };
    }
  }

  /**
   * Get the ramdisk path for a folder
   * @param {string} folderId - Folder identifier
   * @returns {string|null} - Path to ramdisk or null if not found
   */
  getRamdiskPath(folderId) {
    return this.activeRamdisks.get(folderId) || null;
  }

  /**
   * Check if a ramdisk exists for a folder
   * @param {string} folderId - Folder identifier
   * @returns {boolean}
   */
  hasRamdisk(folderId) {
    return this.activeRamdisks.has(folderId);
  }

  /**
   * Clean up a specific ramdisk
   * @param {string} folderId - Folder identifier
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async cleanupRamdisk(folderId) {
    try {
      const ramdiskPath = this.activeRamdisks.get(folderId);

      if (!ramdiskPath) {
        return { success: true }; // Already cleaned up
      }

      // Remove the directory recursively
      await this.removeDirectory(ramdiskPath);

      // Remove from active ramdisks
      this.activeRamdisks.delete(folderId);

      console.log(`Cleaned up ramdisk for folder ${folderId}`);
      return { success: true };
    } catch (error) {
      console.error('Ramdisk cleanup error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cleanup ramdisk'
      };
    }
  }

  /**
   * Clean up all active ramdisks
   * @returns {Promise<{success: boolean, cleaned?: number, error?: string}>}
   */
  async cleanupAll() {
    try {
      let cleaned = 0;

      // Clean up each active ramdisk
      for (const folderId of this.activeRamdisks.keys()) {
        const result = await this.cleanupRamdisk(folderId);
        if (result.success) {
          cleaned++;
        }
      }

      console.log(`Cleaned up ${cleaned} ramdisks`);
      return { success: true, cleaned };
    } catch (error) {
      console.error('Cleanup all error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cleanup ramdisks'
      };
    }
  }

  /**
   * Clean up orphaned ramdisks from previous sessions
   * @returns {Promise<{success: boolean, cleaned?: number}>}
   */
  async cleanupOrphaned() {
    try {
      let cleaned = 0;

      // Check if base directory exists
      try {
        await fs.access(this.baseDir);
      } catch {
        // Base directory doesn't exist, nothing to clean
        return { success: true, cleaned: 0 };
      }

      // Read all directories in base directory
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });

      // Remove all subdirectories (orphaned ramdisks)
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const orphanedPath = path.join(this.baseDir, entry.name);
          await this.removeDirectory(orphanedPath);
          cleaned++;
          console.log(`Cleaned up orphaned ramdisk: ${entry.name}`);
        }
      }

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} orphaned ramdisks`);
      }

      return { success: true, cleaned };
    } catch (error) {
      console.error('Orphaned cleanup error:', error);
      // Don't fail initialization if cleanup fails
      return { success: true, cleaned: 0 };
    }
  }

  /**
   * Recursively remove a directory
   * @param {string} dirPath - Path to directory
   * @returns {Promise<void>}
   */
  async removeDirectory(dirPath) {
    try {
      // Check if directory exists
      try {
        await fs.access(dirPath);
      } catch {
        return; // Directory doesn't exist, nothing to remove
      }

      // Use recursive remove (Node.js 14.14.0+)
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      // Fallback for older Node.js versions or if rm fails
      try {
        await this.removeDirectoryRecursive(dirPath);
      } catch (fallbackError) {
        console.error('Failed to remove directory:', dirPath, fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Recursively remove directory (fallback implementation)
   * @param {string} dirPath - Path to directory
   * @returns {Promise<void>}
   */
  async removeDirectoryRecursive(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await this.removeDirectoryRecursive(entryPath);
      } else {
        await fs.unlink(entryPath);
      }
    }

    await fs.rmdir(dirPath);
  }

  /**
   * Get information about all active ramdisks
   * @returns {Promise<{folderIds: string[], totalSize?: number}>}
   */
  async getInfo() {
    const folderIds = Array.from(this.activeRamdisks.keys());
    let totalSize = 0;

    try {
      // Calculate total size of all ramdisks
      for (const ramdiskPath of this.activeRamdisks.values()) {
        const size = await this.getDirectorySize(ramdiskPath);
        totalSize += size;
      }

      return {
        folderIds,
        totalSize,
        count: folderIds.length
      };
    } catch (error) {
      console.error('Get info error:', error);
      return {
        folderIds,
        count: folderIds.length
      };
    }
  }

  /**
   * Get the size of a directory in bytes
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>}
   */
  async getDirectorySize(dirPath) {
    let size = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(entryPath);
        } else {
          const stats = await fs.stat(entryPath);
          size += stats.size;
        }
      }
    } catch (error) {
      console.error('Get directory size error:', error);
    }

    return size;
  }
}

module.exports = RamdiskManager;

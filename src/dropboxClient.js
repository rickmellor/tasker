const { Dropbox } = require('dropbox');
const fs = require('fs').promises;
const path = require('path');

/**
 * DropboxClient
 * Wrapper around Dropbox SDK for task storage operations
 */
class DropboxClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.dbx = null;

    if (accessToken) {
      this.dbx = new Dropbox({ accessToken });
    }
  }

  /**
   * Set or update the access token
   */
  setAccessToken(accessToken) {
    this.accessToken = accessToken;
    this.dbx = new Dropbox({ accessToken });
  }

  /**
   * Validate the access token and get user info
   * @returns {Promise<{success: boolean, userInfo?: object, error?: string}>}
   */
  async validateToken() {
    if (!this.dbx) {
      return { success: false, error: 'No access token set' };
    }

    try {
      const response = await this.dbx.usersGetCurrentAccount();
      return {
        success: true,
        userInfo: {
          name: response.result.name.display_name,
          email: response.result.email,
          accountId: response.result.account_id
        }
      };
    } catch (error) {
      console.error('Dropbox token validation error:', error);
      return {
        success: false,
        error: error.message || 'Invalid access token'
      };
    }
  }

  /**
   * List contents of a Dropbox folder
   * @param {string} folderPath - Dropbox path (e.g., "/Apps/Tasker")
   * @returns {Promise<{success: boolean, entries?: array, error?: string}>}
   */
  async listFolder(folderPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      // Dropbox API requires empty string for root, not "/"
      const path = folderPath === '/' ? '' : folderPath;

      const response = await this.dbx.filesListFolder({ path });

      const entries = response.result.entries.map(entry => ({
        name: entry.name,
        path: entry.path_display,
        isFolder: entry['.tag'] === 'folder',
        size: entry.size || 0,
        modified: entry.server_modified || entry.client_modified
      }));

      return { success: true, entries };
    } catch (error) {
      console.error('Dropbox list folder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to list folder'
      };
    }
  }

  /**
   * Download a file from Dropbox
   * @param {string} dropboxPath - Path in Dropbox
   * @returns {Promise<{success: boolean, content?: Buffer, error?: string}>}
   */
  async downloadFile(dropboxPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      const response = await this.dbx.filesDownload({ path: dropboxPath });

      // The file content is in the fileBinary property
      return {
        success: true,
        content: response.result.fileBinary
      };
    } catch (error) {
      console.error('Dropbox download error:', error);
      return {
        success: false,
        error: error.message || 'Failed to download file'
      };
    }
  }

  /**
   * Upload a file to Dropbox
   * @param {string} dropboxPath - Destination path in Dropbox
   * @param {Buffer|string} content - File content
   * @param {boolean} overwrite - Whether to overwrite existing file
   * @returns {Promise<{success: boolean, metadata?: object, error?: string}>}
   */
  async uploadFile(dropboxPath, content, overwrite = true) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      const mode = overwrite ? 'overwrite' : 'add';

      const response = await this.dbx.filesUpload({
        path: dropboxPath,
        contents: content,
        mode: { '.tag': mode },
        autorename: false
      });

      return {
        success: true,
        metadata: {
          id: response.result.id,
          rev: response.result.rev,
          size: response.result.size
        }
      };
    } catch (error) {
      console.error('Dropbox upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  }

  /**
   * Delete a file or folder from Dropbox
   * @param {string} dropboxPath - Path to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteFile(dropboxPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      await this.dbx.filesDeleteV2({ path: dropboxPath });
      return { success: true };
    } catch (error) {
      console.error('Dropbox delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file'
      };
    }
  }

  /**
   * Create a folder in Dropbox
   * @param {string} dropboxPath - Path of folder to create
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async createFolder(dropboxPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      await this.dbx.filesCreateFolderV2({
        path: dropboxPath,
        autorename: false
      });
      return { success: true };
    } catch (error) {
      // Folder already exists is not really an error for our purposes
      if (error.error && error.error.error && error.error.error['.tag'] === 'path' &&
          error.error.error.path && error.error.error.path['.tag'] === 'conflict') {
        return { success: true };
      }

      console.error('Dropbox create folder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create folder'
      };
    }
  }

  /**
   * Download an entire folder recursively from Dropbox
   * @param {string} dropboxPath - Source path in Dropbox
   * @param {string} localPath - Destination path on local filesystem
   * @returns {Promise<{success: boolean, filesDownloaded?: number, error?: string}>}
   */
  async downloadFolderRecursive(dropboxPath, localPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      let filesDownloaded = 0;

      // Ensure local directory exists
      await fs.mkdir(localPath, { recursive: true });

      // List folder contents
      const listResult = await this.listFolder(dropboxPath);
      if (!listResult.success) {
        return { success: false, error: listResult.error };
      }

      // Process each entry
      for (const entry of listResult.entries) {
        const localEntryPath = path.join(localPath, entry.name);

        if (entry.isFolder) {
          // Recursively download subfolder
          const subResult = await this.downloadFolderRecursive(entry.path, localEntryPath);
          if (!subResult.success) {
            return { success: false, error: subResult.error };
          }
          filesDownloaded += subResult.filesDownloaded;
        } else {
          // Download file
          const downloadResult = await this.downloadFile(entry.path);
          if (!downloadResult.success) {
            return { success: false, error: downloadResult.error };
          }

          // Write to local filesystem
          await fs.writeFile(localEntryPath, downloadResult.content);
          filesDownloaded++;
        }
      }

      return { success: true, filesDownloaded };
    } catch (error) {
      console.error('Dropbox download folder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to download folder'
      };
    }
  }

  /**
   * Upload an entire folder recursively to Dropbox
   * @param {string} localPath - Source path on local filesystem
   * @param {string} dropboxPath - Destination path in Dropbox
   * @returns {Promise<{success: boolean, filesUploaded?: number, error?: string}>}
   */
  async uploadFolderRecursive(localPath, dropboxPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      let filesUploaded = 0;

      // Ensure Dropbox folder exists
      const createResult = await this.createFolder(dropboxPath);
      if (!createResult.success) {
        return { success: false, error: createResult.error };
      }

      // Read local directory
      const entries = await fs.readdir(localPath, { withFileTypes: true });

      for (const entry of entries) {
        const localEntryPath = path.join(localPath, entry.name);
        const dropboxEntryPath = `${dropboxPath}/${entry.name}`;

        if (entry.isDirectory()) {
          // Recursively upload subfolder
          const subResult = await this.uploadFolderRecursive(localEntryPath, dropboxEntryPath);
          if (!subResult.success) {
            return { success: false, error: subResult.error };
          }
          filesUploaded += subResult.filesUploaded;
        } else {
          // Upload file
          const content = await fs.readFile(localEntryPath);
          const uploadResult = await this.uploadFile(dropboxEntryPath, content);
          if (!uploadResult.success) {
            return { success: false, error: uploadResult.error };
          }
          filesUploaded++;
        }
      }

      return { success: true, filesUploaded };
    } catch (error) {
      console.error('Dropbox upload folder error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload folder'
      };
    }
  }

  /**
   * Move/rename a file or folder in Dropbox
   * @param {string} fromPath - Source path
   * @param {string} toPath - Destination path
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async moveFile(fromPath, toPath) {
    if (!this.dbx) {
      return { success: false, error: 'Not connected to Dropbox' };
    }

    try {
      await this.dbx.filesMoveV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: false
      });
      return { success: true };
    } catch (error) {
      console.error('Dropbox move error:', error);
      return {
        success: false,
        error: error.message || 'Failed to move file'
      };
    }
  }
}

module.exports = DropboxClient;

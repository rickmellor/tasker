/**
 * Vector Database Client
 * Handles embeddings generation and vector database operations for semantic search
 * Uses Vectra (embedded local vector database for Node.js)
 */

const { LocalIndex } = require('vectra');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const path = require('path');

class VectorDbClient {
  /**
   * Create a new VectorDbClient with embedded Vectra
   * @param {string} storagePath - Path to store Vectra index locally
   * @param {string} ollamaUrl - URL of the Ollama service for embeddings (e.g., http://localhost:11434)
   * @param {string} embeddingModel - Name of the Ollama embedding model to use
   * @param {string} collectionName - Name of the collection to use (default: tasker_tasks)
   */
  constructor(storagePath, ollamaUrl, embeddingModel, collectionName = 'tasker_tasks') {
    this.storagePath = storagePath;
    this.ollamaUrl = ollamaUrl;
    this.embeddingModel = embeddingModel;
    this.collectionName = collectionName;

    // Initialize Vectra local index
    const indexPath = path.join(storagePath, collectionName);
    this.index = new LocalIndex(indexPath);

    console.log('[VectorDbClient] Initialized with embedded Vectra at:', indexPath);
  }

  /**
   * Initialize the embedded database (verify it's accessible and create if needed)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async initialize() {
    try {
      console.log('[VectorDbClient] Initializing embedded Vectra index...');

      // Check if index exists, if not create it
      const indexExists = await this.index.isIndexCreated();

      if (!indexExists) {
        console.log('[VectorDbClient] Creating new Vectra index...');
        await this.index.createIndex();
      }

      console.log('[VectorDbClient] Embedded database ready');
      return { success: true };
    } catch (error) {
      console.error('[VectorDbClient] Failed to initialize embedded database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create collection (no-op for Vectra, index is the collection)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async createCollection() {
    // For Vectra, the index is the collection, so this is a no-op
    // Just ensure the index exists
    return this.initialize();
  }

  /**
   * Generate embeddings for text using Ollama
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<{success: boolean, embeddings?: number[], error?: string}>}
   */
  async generateEmbeddings(text) {
    const startTime = Date.now();
    try {
      if (!text || text.trim().length === 0) {
        return { success: false, error: 'Text is required' };
      }

      const payload = JSON.stringify({
        model: this.embeddingModel,
        prompt: text
      });

      const parsedUrl = new URL(this.ollamaUrl);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      return new Promise((resolve) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: '/api/embeddings',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 30000
        };

        const req = protocol.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response.embedding) {
                const duration = Date.now() - startTime;
                console.log(`[VectorDbClient] Generated embeddings in ${duration}ms (model: ${this.embeddingModel}, text length: ${text.length} chars, dimensions: ${response.embedding.length})`);
                resolve({ success: true, embeddings: response.embedding });
              } else {
                resolve({ success: false, error: 'No embeddings in response' });
              }
            } catch (parseError) {
              resolve({ success: false, error: 'Failed to parse embeddings response' });
            }
          });
        });

        req.on('error', (error) => {
          const duration = Date.now() - startTime;
          console.log(`[VectorDbClient] Embedding generation failed after ${duration}ms: ${error.message}`);
          resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
          req.destroy();
          const duration = Date.now() - startTime;
          console.log(`[VectorDbClient] Embedding generation timed out after ${duration}ms`);
          resolve({ success: false, error: 'Request timeout' });
        });

        req.write(payload);
        req.end();
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[VectorDbClient] Embedding generation error after ${duration}ms: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store embeddings for a task in the vector database
   * @param {string} taskId - Unique identifier for the task
   * @param {number[]} embeddings - Embedding vector
   * @param {Object} metadata - Task metadata (title, details, priority, etc.)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async storeEmbeddings(taskId, embeddings, metadata) {
    const startTime = Date.now();
    try {
      if (!taskId || !embeddings || !Array.isArray(embeddings)) {
        return { success: false, error: 'Invalid parameters' };
      }

      console.log('[VectorDbClient] Storing embeddings for task:', taskId);
      console.log('[VectorDbClient] Embedding dimensions:', embeddings.length);

      // Ensure index exists
      await this.initialize();

      // Generate document text from metadata
      const documentText = `${metadata.title || ''}\n${metadata.details || metadata.body || ''}`.trim();

      // Add item to Vectra index
      await this.index.insertItem({
        id: taskId,
        vector: embeddings,
        metadata: {
          ...metadata,
          text: documentText
        }
      });

      const duration = Date.now() - startTime;
      console.log(`[VectorDbClient] Stored embeddings in ${duration}ms (task: ${taskId})`);
      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[VectorDbClient] Failed to store embeddings after ${duration}ms:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update embeddings for a task
   * @param {string} taskId - Unique identifier for the task
   * @param {number[]} embeddings - New embedding vector
   * @param {Object} metadata - Updated task metadata
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateEmbeddings(taskId, embeddings, metadata) {
    const startTime = Date.now();
    try {
      if (!taskId || !embeddings || !Array.isArray(embeddings)) {
        return { success: false, error: 'Invalid parameters' };
      }

      console.log('[VectorDbClient] Updating embeddings for task:', taskId);

      // Delete existing and insert new (Vectra doesn't have native update)
      await this.index.deleteItem(taskId);

      // Generate document text from metadata
      const documentText = `${metadata.title || ''}\n${metadata.details || metadata.body || ''}`.trim();

      // Insert updated item
      await this.index.insertItem({
        id: taskId,
        vector: embeddings,
        metadata: {
          ...metadata,
          text: documentText
        }
      });

      const duration = Date.now() - startTime;
      console.log(`[VectorDbClient] Updated embeddings in ${duration}ms (task: ${taskId})`);
      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[VectorDbClient] Failed to update embeddings after ${duration}ms:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete embeddings for a task
   * @param {string} taskId - Unique identifier for the task
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteEmbeddings(taskId) {
    const startTime = Date.now();
    try {
      if (!taskId) {
        return { success: false, error: 'Task ID is required' };
      }

      console.log('[VectorDbClient] Deleting embeddings for task:', taskId);

      // Delete item from index
      await this.index.deleteItem(taskId);

      const duration = Date.now() - startTime;
      console.log(`[VectorDbClient] Deleted embeddings in ${duration}ms (task: ${taskId})`);
      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[VectorDbClient] Failed to delete embeddings after ${duration}ms:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for similar tasks using semantic search
   * @param {string} query - Search query text
   * @param {number} limit - Maximum number of results to return (default: 10)
   * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
   */
  async searchSimilar(query, limit = 10) {
    const startTime = Date.now();
    try {
      if (!query || query.trim().length === 0) {
        return { success: false, error: 'Query is required' };
      }

      console.log('[VectorDbClient] Searching for similar tasks with query:', query);
      console.log('[VectorDbClient] Limit:', limit);

      // Generate embeddings for the query
      const embeddingStartTime = Date.now();
      const embeddingsResult = await this.generateEmbeddings(query);
      if (!embeddingsResult.success) {
        return { success: false, error: 'Failed to generate query embeddings: ' + embeddingsResult.error };
      }
      const embeddingDuration = Date.now() - embeddingStartTime;

      // Query the index
      const searchStartTime = Date.now();
      const searchResults = await this.index.queryItems(embeddingsResult.embeddings, limit);
      const searchDuration = Date.now() - searchStartTime;

      // Format results
      const results = searchResults.map(result => ({
        taskId: result.item.id,
        score: result.score, // Vectra returns similarity score (0-1, higher is better)
        metadata: result.item.metadata || {},
        text: result.item.metadata?.text || ''
      }));

      const totalDuration = Date.now() - startTime;
      console.log(`[VectorDbClient] Search complete in ${totalDuration}ms (embedding: ${embeddingDuration}ms, search: ${searchDuration}ms, found: ${results.length} tasks)`);
      return { success: true, results };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[VectorDbClient] Search failed after ${duration}ms:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk store embeddings for multiple tasks
   * @param {Array<{taskId: string, text: string, metadata: Object}>} tasks - Array of tasks to process
   * @returns {Promise<{success: boolean, processed: number, failed: number, errors?: Array}>}
   */
  async bulkStoreEmbeddings(tasks) {
    const overallStartTime = Date.now();
    try {
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return { success: false, error: 'Tasks array is required', processed: 0, failed: 0 };
      }

      let processed = 0;
      let failed = 0;
      const errors = [];
      let totalEmbeddingTime = 0;
      let totalStoreTime = 0;

      console.log(`[VectorDbClient] Starting bulk operation for ${tasks.length} tasks`);

      for (const task of tasks) {
        try {
          // Generate embeddings for the task
          const embeddingStartTime = Date.now();
          const embeddingsResult = await this.generateEmbeddings(task.text);
          const embeddingDuration = Date.now() - embeddingStartTime;
          totalEmbeddingTime += embeddingDuration;

          if (!embeddingsResult.success) {
            failed++;
            errors.push({ taskId: task.taskId, error: embeddingsResult.error });
            continue;
          }

          // Store the embeddings
          const storeStartTime = Date.now();
          const storeResult = await this.storeEmbeddings(task.taskId, embeddingsResult.embeddings, task.metadata);
          const storeDuration = Date.now() - storeStartTime;
          totalStoreTime += storeDuration;

          if (!storeResult.success) {
            failed++;
            errors.push({ taskId: task.taskId, error: storeResult.error });
            continue;
          }

          processed++;

          // Log progress every 10 tasks
          if (processed % 10 === 0) {
            const elapsedTime = Date.now() - overallStartTime;
            const avgTimePerTask = elapsedTime / processed;
            const estimatedTimeRemaining = avgTimePerTask * (tasks.length - processed - failed);
            console.log(`[VectorDbClient] Progress: ${processed}/${tasks.length} (${Math.round(processed / tasks.length * 100)}%) - ETA: ${Math.round(estimatedTimeRemaining / 1000)}s`);
          }
        } catch (error) {
          failed++;
          errors.push({ taskId: task.taskId, error: error.message });
        }
      }

      const overallDuration = Date.now() - overallStartTime;
      const avgEmbeddingTime = processed > 0 ? Math.round(totalEmbeddingTime / processed) : 0;
      const avgStoreTime = processed > 0 ? Math.round(totalStoreTime / processed) : 0;
      const avgTotalTime = processed > 0 ? Math.round(overallDuration / processed) : 0;
      const throughput = processed > 0 ? (processed / (overallDuration / 1000)).toFixed(2) : 0;

      console.log(`[VectorDbClient] Bulk operation complete in ${overallDuration}ms`);
      console.log(`[VectorDbClient] - Processed: ${processed}, Failed: ${failed}`);
      console.log(`[VectorDbClient] - Avg per task: ${avgTotalTime}ms (embedding: ${avgEmbeddingTime}ms, store: ${avgStoreTime}ms)`);
      console.log(`[VectorDbClient] - Throughput: ${throughput} tasks/sec`);
      console.log(`[VectorDbClient] - Model: ${this.embeddingModel}`);

      return {
        success: true,
        processed,
        failed,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const overallDuration = Date.now() - overallStartTime;
      console.error(`[VectorDbClient] Bulk operation failed after ${overallDuration}ms:`, error);
      return { success: false, error: error.message, processed: 0, failed: 0 };
    }
  }
}

module.exports = VectorDbClient;

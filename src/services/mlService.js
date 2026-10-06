const axios = require('axios');
const env = require('../config/env');
const AppError = require('../utils/appError');

class MLService {
  constructor() {
    this.client = axios.create({
      timeout: 12000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  get baseUrl() {
    const rawUrl = env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
    return rawUrl.replace(/\/+$/, '');
  }

  /**
   * Sends initial lightweight warm-up ping to ML Service on Express startup.
   */
  async warmup() {
    try {
      console.log(`[ML Service] Triggering startup warm-up ping to ${this.baseUrl}/health...`);
      await this.client.get(`${this.baseUrl}/health`, { timeout: 5000 });
      console.log(`[ML Service] Startup warm-up ping acknowledged by ML Service.`);
    } catch (err) {
      console.log(`[ML Service] Startup warm-up ping sent (ML Service may be sleeping and will wake on demand).`);
    }
  }

  /**
   * Checks operational health status of FastAPI ML Service.
   * @returns {Promise<{status: string, model_loaded: boolean}>}
   */
  async checkHealth() {
    try {
      const response = await this.client.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      return {
        status: 'unavailable',
        model_loaded: false,
        message: `ML Service unreachable or sleeping at ${this.baseUrl}`
      };
    }
  }

  /**
   * Helper to identify retryable cold-start / server errors.
   */
  isRetryableError(error) {
    if (!error) return false;

    // Connection / network / timeout errors
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'ETIMEDOUT',
      'EAI_AGAIN',
      'ECONNABORTED',
      'ERR_BAD_RESPONSE',
      'ERR_NETWORK'
    ];
    if (error.code && networkErrorCodes.includes(error.code)) {
      return true;
    }

    // Axios timeout
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    // 5xx HTTP server / gateway / proxy errors (e.g. 500, 502 Bad Gateway, 503 Service Unavailable, 504)
    if (error.response) {
      const status = error.response.status;
      if (status >= 500 && status <= 599) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sends feature payload to FastAPI ML Service for inference & SHAP explainability.
   * Automatically retries when ML service is cold-starting / waking up on Render Free.
   * @param {Object} inputData - 20 feature input payload
   * @param {number} maxRetries - Maximum retry attempts (default 15)
   * @param {number} retryDelayMs - Delay between retries in ms (default 3000ms)
   * @returns {Promise<{prediction: number, modelVersion: string, explanation: Object}>}
   */
  async getPrediction(inputData, maxRetries = 15, retryDelayMs = 3000) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ML Service] ML prediction attempt ${attempt}/${maxRetries} -> ${this.baseUrl}/predict...`);

        const response = await this.client.post(`${this.baseUrl}/predict`, inputData, {
          timeout: 10000
        });

        if (!response.data || typeof response.data.prediction !== 'number' || !response.data.explanation) {
          throw new AppError('Invalid or corrupted prediction response received from ML Service.', 502);
        }

        const { prediction, model_version, explanation } = response.data;
        console.log(`[ML Service] ML prediction attempt ${attempt}/${maxRetries} successful! ML service ready.`);

        return {
          prediction,
          modelVersion: model_version || '1.0.0',
          explanation
        };

      } catch (error) {
        lastError = error;

        // Validation / Client errors (400, 422, 401, 403, 404) -> DO NOT RETRY
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          const statusCode = error.response.status;
          const detail = error.response.data?.detail || error.response.data?.message || 'ML Service input validation error';
          const messageStr = typeof detail === 'string' ? detail : JSON.stringify(detail);
          console.warn(`[ML Service] Non-retryable client error (${statusCode}) on attempt ${attempt}: ${messageStr}`);
          throw new AppError(`ML Input Validation Error (${statusCode}): ${messageStr}`, 400);
        }

        // AppError thrown explicitly (e.g. invalid payload) and not retryable
        if (error instanceof AppError && !this.isRetryableError(error)) {
          throw error;
        }

        const errDetail = error.response
          ? `HTTP status ${error.response.status}`
          : (error.code || error.message || 'Network Timeout');

        console.log(`[ML Service] Attempt ${attempt}/${maxRetries} failed (${errDetail}). ML service unavailable, retrying...`);

        if (attempt < maxRetries) {
          console.log(`[ML Service] Waiting ${retryDelayMs / 1000}s before attempt ${attempt + 1}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // All retry attempts exhausted
    console.error(`[ML Service] ML service remained unavailable after ${maxRetries} attempts. Last error:`, lastError?.message || lastError);
    throw new AppError(
      'AI prediction service is temporarily unavailable. Please try again in a moment.',
      503
    );
  }
}

module.exports = new MLService();



const axios = require('axios');
const env = require('../config/env');
const AppError = require('../utils/appError');

class MLService {
  constructor() {
    this.client = axios.create({
      baseURL: env.ML_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Sends 20 feature input payload to FastAPI ML Service for inference & SHAP explainability.
   * @param {Object} inputData - Raw 20 customer features
   * @returns {Promise<{prediction: number, modelVersion: string, explanation: Object}>}
   */
  async getPrediction(inputData) {
    try {
      const response = await this.client.post('/predict', inputData);
      
      // Response validation
      if (!response.data || typeof response.data.prediction !== 'number' || !response.data.explanation) {
        throw new AppError('Invalid or corrupted prediction response received from ML Service.', 502);
      }

      const { prediction, model_version, explanation } = response.data;

      return {
        prediction,
        modelVersion: model_version || '1.0.0',
        explanation
      };
    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const detail = error.response.data?.detail || 'ML Service error';
        throw new AppError(`ML Service Error (${statusCode}): ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`, statusCode >= 500 ? 503 : 400);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new AppError(
          `Unable to connect to ML Service at ${env.ML_SERVICE_URL}. Please ensure the FastAPI server is running on http://127.0.0.1:8000.`,
          503
        );
      } else if (error.code === 'ECONNABORTED') {
        throw new AppError('ML Service request timed out. Please try again.', 504);
      } else if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError(`ML Service communication failed: ${error.message}`, 500);
      }
    }
  }

  /**
   * Checks operational health status of FastAPI ML Service.
   * @returns {Promise<{status: string, model_loaded: boolean}>}
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        model_loaded: false,
        message: `ML Service unreachable at ${env.ML_SERVICE_URL}`
      };
    }
  }
}

module.exports = new MLService();

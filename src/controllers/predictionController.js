const Prediction = require('../models/Prediction');
const mlService = require('../services/mlService');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

const prepareInputFeatures = (body) => {
  return {
    age: parseInt(body.age, 10),
    gender: body.gender.charAt(0).toUpperCase() + body.gender.slice(1).toLowerCase(),
    bmi: parseFloat(body.bmi),
    children: parseInt(body.children, 10),
    smoker: body.smoker.charAt(0).toUpperCase() + body.smoker.slice(1).toLowerCase(),
    region: body.region.trim(),
    occupation: body.occupation.trim(),
    annual_income_usd: parseFloat(body.annual_income_usd),
    exercise_level: body.exercise_level.toLowerCase() === 'medium' ? 'Moderate' : body.exercise_level.trim(),
    chronic_diseases: parseInt(body.chronic_diseases, 10),
    doctor_visits_per_year: parseInt(body.doctor_visits_per_year, 10),
    hospitalizations_last_year: parseInt(body.hospitalizations_last_year, 10),
    alcohol_consumption_per_week: parseInt(body.alcohol_consumption_per_week, 10),
    insurance_plan: body.insurance_plan.trim(),
    blood_pressure: body.blood_pressure.trim(),
    diabetes: body.diabetes.charAt(0).toUpperCase() + body.diabetes.slice(1).toLowerCase(),
    cholesterol: parseFloat(body.cholesterol),
    sleep_hours: parseFloat(body.sleep_hours),
    stress_level: parseFloat(body.stress_level),
    marital_status: body.marital_status.trim()
  };
};

const createPrediction = async (req, res, next) => {
  try {
    const inputFeatures = prepareInputFeatures(req.body);

    // 1. Obtain prediction & SHAP explanation from FastAPI ML Service
    const { prediction, modelVersion, explanation } = await mlService.getPrediction(inputFeatures);

    let savedRecord = null;

    // 2. Persist to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      savedRecord = await Prediction.create({
        userId: req.user._id,
        inputFeatures,
        predictedPremium: prediction,
        modelVersion,
        explanation
      });
    }

    // 3. Return payload
    res.status(201).json({
      status: 'success',
      data: {
        id: savedRecord ? savedRecord._id : null,
        userId: req.user._id,
        prediction,
        modelVersion,
        explanation,
        inputFeatures,
        createdAt: savedRecord ? savedRecord.createdAt : new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPredictionHistory = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { predictions: [] },
        message: 'Database is operating in offline mode.'
      });
    }

    const predictions = await Prediction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: 'success',
      results: predictions.length,
      data: {
        predictions
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPredictionById = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return next(new AppError('Database connection unavailable.', 503));
    }

    const prediction = await Prediction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!prediction) {
      return next(new AppError('Prediction record not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        prediction
      }
    });
  } catch (error) {
    next(error);
  }
};

const deletePrediction = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return next(new AppError('Database connection unavailable.', 503));
    }

    const prediction = await Prediction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!prediction) {
      return next(new AppError('Prediction record not found or unauthorized.', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Prediction history record deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const getMLHealth = async (req, res, next) => {
  try {
    const healthStatus = await mlService.checkHealth();
    res.status(200).json({
      status: 'success',
      data: healthStatus
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPrediction,
  getPredictionHistory,
  getPredictionById,
  deletePrediction,
  getMLHealth
};

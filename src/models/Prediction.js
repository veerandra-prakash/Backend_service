const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Prediction must be linked to a userId'],
      index: true
    },
    inputFeatures: {
      age: { type: Number, required: true },
      gender: { type: String, required: true },
      bmi: { type: Number, required: true },
      children: { type: Number, required: true },
      smoker: { type: String, required: true },
      region: { type: String, required: true },
      occupation: { type: String, required: true },
      annual_income_usd: { type: Number, required: true },
      exercise_level: { type: String, required: true },
      chronic_diseases: { type: Number, required: true },
      doctor_visits_per_year: { type: Number, required: true },
      hospitalizations_last_year: { type: Number, required: true },
      alcohol_consumption_per_week: { type: Number, required: true },
      insurance_plan: { type: String, required: true },
      blood_pressure: { type: String, required: true },
      diabetes: { type: String, required: true },
      cholesterol: { type: Number, required: true },
      sleep_hours: { type: Number, required: true },
      stress_level: { type: Number, required: true },
      marital_status: { type: String, required: true }
    },
    predictedPremium: {
      type: Number,
      required: [true, 'Predicted premium value is required']
    },
    modelVersion: {
      type: String,
      default: '1.0.0'
    },
    explanation: {
      type: Map,
      of: Number,
      required: [true, 'SHAP explanation dictionary is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance queries
predictionSchema.index({ createdAt: -1 });
predictionSchema.index({ userId: 1, createdAt: -1 });

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction;

const { body, validationResult } = require('express-validator');
const AppError = require('../utils/appError');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => `${err.path}: ${err.msg}`).join('; ');
    return next(new AppError(`Validation Failed: ${errorMessages}`, 400));
  }
  next();
};

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email address is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().withMessage('Valid email address is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validatePrediction = [
  body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be an integer between 18 and 100'),
  body('gender').isIn(['Female', 'Male', 'female', 'male']).withMessage('Gender must be Female or Male'),
  body('bmi').isFloat({ min: 10.0, max: 70.0 }).withMessage('BMI must be a number between 10.0 and 70.0'),
  body('children').isInt({ min: 0, max: 10 }).withMessage('Children must be an integer between 0 and 10'),
  body('smoker').isIn(['No', 'Yes', 'no', 'yes']).withMessage('Smoker status must be No or Yes'),
  body('region').isIn(['Central', 'Northeast', 'Northwest', 'Southeast', 'Southwest']).withMessage('Invalid region'),
  body('occupation').notEmpty().withMessage('Occupation title is required'),
  body('annual_income_usd').isFloat({ min: 0.0 }).withMessage('Annual income must be a non-negative number'),
  body('exercise_level').isIn(['Low', 'Moderate', 'High', 'Medium', 'low', 'moderate', 'high', 'medium']).withMessage('Exercise level must be Low, Moderate, or High'),
  body('chronic_diseases').isInt({ min: 0, max: 10 }).withMessage('Chronic diseases count must be an integer between 0 and 10'),
  body('doctor_visits_per_year').isInt({ min: 0, max: 100 }).withMessage('Doctor visits per year must be a non-negative integer'),
  body('hospitalizations_last_year').isInt({ min: 0, max: 10 }).withMessage('Hospitalizations must be an integer between 0 and 10'),
  body('alcohol_consumption_per_week').isInt({ min: 0, max: 100 }).withMessage('Alcohol consumption must be a non-negative integer'),
  body('insurance_plan').isIn(['Basic', 'Standard', 'Premium', 'Gold']).withMessage('Invalid insurance plan tier'),
  body('blood_pressure').matches(/^\d{2,3}\/\d{2,3}$/).withMessage('Blood pressure must be in format "systolic/diastolic" (e.g. "120/80")'),
  body('diabetes').isIn(['No', 'Yes', 'no', 'yes']).withMessage('Diabetes status must be No or Yes'),
  body('cholesterol').isFloat({ min: 50.0, max: 600.0 }).withMessage('Cholesterol must be a number between 50 and 600'),
  body('sleep_hours').isFloat({ min: 0.0, max: 24.0 }).withMessage('Sleep hours must be between 0 and 24'),
  body('stress_level').isFloat({ min: 1.0, max: 10.0 }).withMessage('Stress level must be between 1.0 and 10.0'),
  body('marital_status').isIn(['Divorced', 'Married', 'Single', 'Widowed']).withMessage('Invalid marital status'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePrediction
};

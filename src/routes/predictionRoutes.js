const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');
const { protect } = require('../middleware/authMiddleware');
const { validatePrediction } = require('../middleware/validationMiddleware');

// Public route to check status of underlying ML service
router.get('/ml-health', predictionController.getMLHealth);

// Protected routes (Require Authentication Token)
router.use(protect);

router.post('/', validatePrediction, predictionController.createPrediction);
router.get('/', predictionController.getPredictionHistory);
router.get('/:id', predictionController.getPredictionById);
router.delete('/:id', predictionController.deletePrediction);

module.exports = router;

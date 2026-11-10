const express = require('express');
const router = express.Router();

const { verifyUser } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/verify
router.post('/', async (req, res, next) => {
  try {
    const result = await verifyUser({
      email: req.body.email,
      authCode: req.body.authCode
    });
    if (!result.success) {
      return res.status(400).json({
        error: 'INVALID_VERIFICATION',
        message: 'Invalid email or verification code'
      });
    }
    res.status(200).json(result);
  }
  catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        error: error.code,
        message: error.message
      });
    }
    next(error);
  }
});

module.exports = router;
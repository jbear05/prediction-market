const express = require('express');
const router = express.Router();

const { newVerCode } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/verify/resend
router.post('/resend', async (req, res, next) => {
  try {
    const result = await newVerCode({
      email: req.body.email
    });
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
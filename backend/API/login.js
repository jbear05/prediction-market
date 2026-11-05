const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { login } = require('../services/users.js');
const { AppError } = require('../services/errors');

// POST /api/login
router.post('/', async (req, res, next) => {
  try {
    const result = await login({
      email: req.body.email,
      rawPassword: req.body.rawPassword
    });
    if (result.needVerification) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.'
      });
    }

    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        subject: String(result.userId),
        expiresIn: '1h'
      }
    );
    res.status(200).json({ ...result, token });
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
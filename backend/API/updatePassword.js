const express = require('express');
const router = express.Router();

const { finishPasswordReset } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/password/update
router.post('/update', async (req, res, next) => {
  try {
    const result = await finishPasswordReset({
      email: req.body.email,
      newPassword: req.body.newPassword,
      authCode: req.body.authCode
    });
    if (!result.success) {
      return res.status(400).json({
        error: 'INVALID_PASSWORD_RESET',
        message: 'Invalid email or password reset code'
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
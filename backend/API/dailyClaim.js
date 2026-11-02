const express = require('express');
const router = express.Router();

const { dailyClaim } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/daily-claim
router.post('/', async (req, res, next) => {
  try {
    const result = await dailyClaim({
      userId: req.user.id
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
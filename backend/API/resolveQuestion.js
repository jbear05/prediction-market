const express = require('express');
const router = express.Router();

const { resolveQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/resQuestion
router.post('/', async (req, res, next) => {
  try {
    const result = await resolveQuestion(req.body);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
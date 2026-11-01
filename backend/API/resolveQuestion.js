const express = require('express');
const router = express.Router();

const { resolveQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/resolve
router.post('/:questionId/resolve', async (req, res, next) => {
  try {
    const result = await resolveQuestion({
      questionId: req.params.questionId,
      outcome: req.body.outcome
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
    else {
      next(error);
    }
  }
});

module.exports = router;
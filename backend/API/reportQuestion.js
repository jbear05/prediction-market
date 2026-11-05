const express = require('express');
const router = express.Router();

const { reportQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/report
router.post('/:questionId/report', async (req, res, next) => {
  try {
    const result = await reportQuestion({
      reporterId: req.user.id,
      questionId: req.params.questionId,
      reason: req.body.reason
    });
    res.status(201).json(result); // HTTP Code 201: Created
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
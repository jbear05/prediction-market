const express = require('express');
const router = express.Router();

const { reportQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/report
router.post('/:questionId/report', async (req, res, next) => {
  try {
    const result = await reportQuestion({
      reporterId: req.body.reporterId,
      questionId: req.params.questionId,
      reason: req.body.reason
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
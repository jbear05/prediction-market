const express = require('express');
const router = express.Router();

const { searchReportsWrapper } = require('../services/questions');
const { AppError } = require('../services/errors');

// GET /api/reports/search?reporterId=...&questionId=...&reason=...
router.get('/search', async (req, res, next) => {
  try {
    const result = await searchReportsWrapper({
      userId: req.user.id,
      reporterId: req.query.reporterId,
      questionId: req.query.questionId,
      reason: req.query.reason
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
const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');

const { resolveReport } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/reports/:reportId/resolve
router.post('/:reportId/resolve', requireAdmin, async (req, res, next) => {
  try {
    const result = await resolveReport({
      userId: req.user.id,
      reportId: req.params.reportId,
      killQuestion: req.body.killQuestion
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
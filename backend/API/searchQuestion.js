const express = require('express');
const router = express.Router();

const { searchQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// GET /api/questions?q=...&category=...&status=...&sort=...&page=...&limit=...
router.get('/', async (req, res, next) => {
  try {
    const result = await searchQuestion({
      q: req.query.q,
      category: req.query.category,
      status: req.query.status,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
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
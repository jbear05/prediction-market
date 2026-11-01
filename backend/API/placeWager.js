const express = require('express');
const router = express.Router();

const { placeWager } = require('../services/wagers');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/place-wager
router.post('/:questionId/place-wager', async (req, res, next) => {
  try {
    const result = await placeWager({
      userId: req.user.id,
      questionId: req.params.questionId,
      side: req.body.side,
      amount: req.body.amount
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
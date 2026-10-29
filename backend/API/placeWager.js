const express = require('express');
const router = express.Router();

const { placeWager } = require('../services/wagers');
const { AppError } = require('../services/errors');

// POST /api/placeWager
router.post('/', async (req, res, next) => {
  try {
    const result = await placeWager(req.body);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json(
        {
            success: false,
            error: error
        }
    )
  }
});

module.exports = router;
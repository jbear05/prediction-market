const express = require('express');
const router = express.Router();

const { claimDaily } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/claimDaily
router.post('/', async (req, res, next) => {
  try {
    const result = await claimDaily(req.body);

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
const express = require('express');
const router = express.Router();

const { verifyUser } = require('../services/users');
const { AppError } = require('../services/errors');

// POST /api/verifyUser
router.post('/', async (req, res, next) => {
  try {
    const result = await verifyUser(req.body);

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
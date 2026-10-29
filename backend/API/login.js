const express = require('express');
const router = express.Router();

const { login } = require('../services/users.js');
const { AppError } = require('../services/errors');

// POST /api/login
router.post('/', async (req, res, next) => {
  try {
    const result = await login(req.body);

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
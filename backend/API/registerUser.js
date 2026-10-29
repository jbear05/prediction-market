const express = require('express');
const router = express.Router();

const { createUser } = require('../services/users.js');
const { AppError } = require('../services/errors');

// POST /api/registerUser
router.post('/', async (req, res, next) => {
  try {
    const result = await createUser(req.body);

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
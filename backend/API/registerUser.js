const express = require('express');
const router = express.Router();

const { createUser } = require('../services/users.js');
const { AppError } = require('../services/errors');

// POST /api/register
router.post('/', async (req, res, next) => {
  try {
    const result = await createUser({
      email: req.body.email,
      displayName: req.body.displayName,
      rawPassword: req.body.rawPassword
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
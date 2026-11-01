const express = require('express');
const router = express.Router();

const { cancelQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/cancel
router.post('/:questionId/cancel', async (req, res, next) => {
    try {
        const result = await cancelQuestion(req.params);
        res.status(200).json(result);
    }
    catch (error) {
        if (error instanceof AppError) {
            return res.status(error.status).json({
                error: error.code,
                message: error.message
            });
        }
        else {
            next(error);
        }
    }
});

module.exports = router;
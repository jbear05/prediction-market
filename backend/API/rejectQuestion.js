const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');

const { rejectQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/reject
router.post('/:questionId/reject', requireAdmin, async (req, res, next) => {
    try {
        const result = await rejectQuestion({
            questionId: req.params.questionId
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

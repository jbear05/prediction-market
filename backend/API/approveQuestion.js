const express = require('express');
const router = express.Router();
const requireAdmin = require('../middleware/requireAdmin');

const { approveQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions/:questionId/approve
router.post('/:questionId/approve', requireAdmin, async (req, res, next) => {
    try {
        const result = await approveQuestion({
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

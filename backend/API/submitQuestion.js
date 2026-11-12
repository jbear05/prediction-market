const express = require('express');
const router = express.Router();

const { submitQuestion } = require('../services/questions');
const { AppError } = require('../services/errors');

// POST /api/questions
router.post('/', async (req, res, next) => {
	try {
		const result = await submitQuestion({
			creatorId: req.user.id,
			title: req.body.title,
			description: req.body.description,
			category: req.body.category,
			closesAt: req.body.closesAt
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
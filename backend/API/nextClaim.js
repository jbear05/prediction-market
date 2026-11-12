const express = require('express');
const router = express.Router();

const { nextClaim } = require('../services/users');
const { AppError } = require('../services/errors');

// GET /api/daily-claim
router.get('/', async (req, res, next) => {
	try {
		const result = await nextClaim({
			userId: req.user.id
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
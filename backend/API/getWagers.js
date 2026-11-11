const express = require('express');
const router = express.Router();

const { getWagers } = require('../services/wagers');
const { AppError } = require('../services/errors');

// GET /api/wagers
router.get('/', async (req, res, next) => {
	try {
		const result = await getWagers({
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
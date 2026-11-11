jest.mock('../services/questions', () => ({ reportQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/reportQuestion');
const { AppError } = require('../services/errors');
const { invokeRoute, testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';
const reporterId = '4c53d6135742fd7137c88d3b';

testRoute({
	name: 'reportQuestion',
	router,
	method: 'post',
	path: '/:questionId/report',
	request: {
		params: { questionId },
		body: { reason: 'Inappropriate question.' },
		user: { id: reporterId },
	},
	service: questions.reportQuestion,
	args: {
		reporterId,
		questionId,
		reason: 'Inappropriate question.',
	},
	status: 201,
});

test('maps invalid report input to HTTP 400', async () => {
	questions.reportQuestion.mockRejectedValue(
		new AppError(400, 'INVALID_REPORT', 'Invalid report'),
	);

	const { res, next } = await invokeRoute(router, 'post', '/:questionId/report', {
		params: { questionId },
		body: { reason: '' },
		user: { id: reporterId },
	});

	expect(res.status).toHaveBeenCalledWith(400);
	expect(res.json).toHaveBeenCalledWith({
		error: 'INVALID_REPORT',
		message: 'Invalid report',
	});
	expect(next).not.toHaveBeenCalled();
});
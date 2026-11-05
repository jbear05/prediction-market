jest.mock('../services/questions', () => ({ reportQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/reportQuestion');
const { testRoute } = require('./apiTestHelpers');

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
jest.mock('../services/questions', () => ({ resolveQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/resolveQuestion');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'resolveQuestion',
	router,
	method: 'post',
	path: '/:questionId/resolve',
	request: {
		params: { questionId },
		body: { outcome: 'yes' },
	},
	service: questions.resolveQuestion,
	args: { questionId, outcome: 'yes' },
});

test('resolveQuestion route requires admin middleware', () => {
	expectAdminMiddleware(router, '/:questionId/resolve');
});
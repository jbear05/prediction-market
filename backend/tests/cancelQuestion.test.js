jest.mock('../services/questions', () => ({ cancelQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/cancelQuestion');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'cancelQuestion',
	router,
	method: 'post',
	path: '/:questionId/cancel',
	request: { params: { questionId } },
	service: questions.cancelQuestion,
	args: { questionId },
});

test('cancelQuestion route requires admin middleware', () => {
	expectAdminMiddleware(router, '/:questionId/cancel');
});
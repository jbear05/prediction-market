jest.mock('../services/questions', () => ({ approveQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/approveQuestion');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'approveQuestion',
	router,
	method: 'post',
	path: '/:questionId/approve',
	request: { params: { questionId } },
	service: questions.approveQuestion,
	args: { questionId },
});

test('approveQuestion route requires admin middleware', () => {
	expectAdminMiddleware(router, '/:questionId/approve');
});

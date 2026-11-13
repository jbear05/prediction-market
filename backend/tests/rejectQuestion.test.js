jest.mock('../services/questions', () => ({ rejectQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/rejectQuestion');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'rejectQuestion',
	router,
	method: 'post',
	path: '/:questionId/reject',
	request: { params: { questionId } },
	service: questions.rejectQuestion,
	args: { questionId },
});

test('rejectQuestion route requires admin middleware', () => {
	expectAdminMiddleware(router, '/:questionId/reject');
});

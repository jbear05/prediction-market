jest.mock('../services/questions', () => ({ searchReportsWrapper: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/searchReport');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

const reporterId = '4c53d6135742fd7137c88d3b';
const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'searchReport',
	router,
	method: 'get',
	path: '/',
	request: {
		query: {
			reporterId,
			questionId,
			reason: 'spam',
		},
	},
	service: questions.searchReportsWrapper,
	args: {
		userId: '98ae7a88404f4fcdee142747',
		reporterId,
		questionId,
		reason: 'spam',
	},
});

test('searchReport route requires admin middleware', () => {
	expectAdminMiddleware(router, '/');
});
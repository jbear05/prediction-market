jest.mock('../services/questions', () => ({ resolveReport: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/resolveReport');
const { expectAdminMiddleware, testRoute } = require('./apiTestHelpers');

testRoute({
	name: 'resolveReport',
	router,
	method: 'post',
	path: '/:reportId/resolve',
	request: {
		params: { reportId: 'report-1' },
		body: { killQuestion: true },
	},
	service: questions.resolveReport,
	args: {
		userId: '98ae7a88404f4fcdee142747',
		reportId: 'report-1',
		killQuestion: true,
	},
});

test('resolveReport route requires admin middleware', () => {
	expectAdminMiddleware(router, '/:reportId/resolve');
});
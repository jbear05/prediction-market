jest.mock('../services/questions', () => ({ searchQuestion: jest.fn() }));

const questions = require('../services/questions');
const router = require('../API/searchQuestion');
const { invokeRoute, testRoute } = require('./apiTestHelpers');

const query = {
	q: 'election',
	category: 'politics',
	status: 'open',
	sort: 'newest',
	page: '2',
	limit: '10',
};

testRoute({
	name: 'searchQuestion',
	router,
	method: 'get',
	path: '/',
	request: { query },
	service: questions.searchQuestion,
	args: query,
});

test('forwards absent optional query parameters as undefined', async () => {
	questions.searchQuestion.mockResolvedValue([]);

	await invokeRoute(router, 'get', '/', { query: {} });

	expect(questions.searchQuestion).toHaveBeenCalledWith({
		q: undefined,
		category: undefined,
		status: undefined,
		sort: undefined,
		page: undefined,
		limit: undefined,
	});
});
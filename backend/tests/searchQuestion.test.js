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
	args: { ...query, viewerId: '98ae7a88404f4fcdee142747' },
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
		viewerId: '98ae7a88404f4fcdee142747',
	});
});

test('mine=true limits the search to the logged-in user\'s own questions', async () => {
	questions.searchQuestion.mockResolvedValue([]);

	await invokeRoute(router, 'get', '/', { query: { mine: 'true', status: 'all' } });

	expect(questions.searchQuestion).toHaveBeenCalledWith(expect.objectContaining({
		status: 'all',
		creatorId: '98ae7a88404f4fcdee142747',
		viewerId: '98ae7a88404f4fcdee142747',
	}));
});
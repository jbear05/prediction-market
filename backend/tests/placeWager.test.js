jest.mock('../services/wagers', () => ({ placeWager: jest.fn() }));

const wagers = require('../services/wagers');
const router = require('../API/placeWager');
const { testRoute } = require('./apiTestHelpers');

const questionId = '586978ad9d33c5fe44da9f6e';

testRoute({
	name: 'placeWager',
	router,
	method: 'post',
	path: '/:questionId/place-wager',
	request: {
		params: { questionId },
		body: { side: 'yes', amount: 25 },
	},
	service: wagers.placeWager,
	args: {
		userId: '98ae7a88404f4fcdee142747',
		questionId,
		side: 'yes',
		amount: 25,
	},
	status: 201,
});
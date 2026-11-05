jest.mock('../services/users', () => ({ createUser: jest.fn() }));

const users = require('../services/users');
const router = require('../API/registerUser');
const { testRoute } = require('./apiTestHelpers');

const body = {
	email: 'person@example.com',
	displayName: 'Person',
	rawPassword: 'password',
};

testRoute({
	name: 'registerUser',
	router,
	method: 'post',
	path: '/',
	request: { body },
	service: users.createUser,
	args: body,
	status: 201,
});
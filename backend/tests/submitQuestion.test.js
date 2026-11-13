jest.mock('../services/questions', () => ({ submitQuestion: jest.fn() }));

const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const questions = require('../services/questions');
const router = require('../API/submitQuestion');
const testDb = require('./testDb');
const { makeUser, HOUR } = require('./factories');
const Question = require('../models/Question');
const requireAuth = require('../middleware/requireAuth');
const realSubmitQuestion = jest.requireActual('../services/questions').submitQuestion;
const { testRoute } = require('./apiTestHelpers');

const title = 'Will UCF win?';
const description = 'Resolves yes if UCF wins.';
const closesAt = '2026-11-12T21:00:00.000Z';
const jwtSecret = 'submit-question-http-test-secret';
const originalJwtSecret = process.env.JWT_SECRET;
const app = express();
app.use(express.json());
app.use('/api/questions', requireAuth, router);

let server;

function postQuestion(body, token) {
	return new Promise((resolve, reject) => {
		const headers = { 'content-type': 'application/json' };
		if (token) headers.authorization = `Bearer ${token}`;

		const request = http.request({
			host: '127.0.0.1', port: server.address().port,
			path: '/api/questions', method: 'POST', headers
		}, 
		(response) => {
			let responseBody = '';
			response.setEncoding('utf8');
			response.on('data', (chunk) => { responseBody += chunk; });
			response.on('end', () => {
				try {
					resolve({
						status: response.statusCode,
						body: JSON.parse(responseBody),
					});
				}
				catch (error) {
					reject(error);
				}
			});
		});

		request.on('error', reject);
		request.end(JSON.stringify(body));
	});
}

function tokenFor(userId) {
	return jwt.sign({}, jwtSecret, {
		subject: String(userId),
		expiresIn: '1h',
	});
}

testRoute({
	name: 'submitQuestion',
	router,
	method: 'post',
	path: '/',
	request: {
		body: { title, description, closesAt },
	},
	service: questions.submitQuestion,
	args: {
		creatorId: '98ae7a88404f4fcdee142747',
		title,
		description,
		category: undefined,
		closesAt,
	},
	status: 201,
	result: {
		questionId: '586978ad9d33c5fe44da9f6e',
		creatorId: '98ae7a88404f4fcdee142747',
		title,
		description,
		category: 'other',
		status: 'pending',
		closesAt,
		createdAt: '2026-11-11T21:00:00.000Z',
	},
});

describe('POST /api/questions over HTTP', () => {
	beforeAll(async () => {
		process.env.JWT_SECRET = jwtSecret;
		await testDb.connect();
		server = app.listen(0, '127.0.0.1');
		await new Promise((resolve) => server.once('listening', resolve));
	});

	beforeEach(() => {
		questions.submitQuestion.mockImplementation(realSubmitQuestion);
	});

	afterEach(testDb.clear);

	afterAll(async () => {
		if (server) {
			await new Promise((resolve, reject) => {
				server.close((error) => error ? reject(error) : resolve());
			});
		}
		await testDb.disconnect();
		if (originalJwtSecret === undefined) {
			delete process.env.JWT_SECRET;
		} else {
			process.env.JWT_SECRET = originalJwtSecret;
		}
	});

	test('creates a question and returns its public response shape', async () => {
		const user = await makeUser();
		const payload = {
			title: 'Will the HTTP test create a question?',
			description: 'Resolves yes if the HTTP request is accepted.',
			closesAt: new Date(Date.now() + HOUR).toISOString(),
		};

		const response = await postQuestion(payload, tokenFor(user._id));

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({
			creatorId: user._id.toString(),
			title: payload.title,
			description: payload.description,
			category: 'other',
			status: 'pending',
			closesAt: payload.closesAt,
		});
		expect(response.body.questionId).toMatch(/^[a-f\d]{24}$/i);
		expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
		expect(response.body).not.toHaveProperty('poolYes');
		expect(response.body).not.toHaveProperty('poolNo');
		expect(response.body).not.toHaveProperty('outcome');
		expect(response.body).not.toHaveProperty('__v');

		const savedQuestion = await Question.findById(response.body.questionId);
		expect(savedQuestion).not.toBeNull();
		expect(savedQuestion.creatorId.toString()).toBe(user._id.toString());
	});

	test('returns the validation error as HTTP 400 without creating a question', async () => {
		const user = await makeUser();
		const response = await postQuestion({
			title: 'Question without a description',
			closesAt: new Date(Date.now() + HOUR).toISOString(),
		}, tokenFor(user._id));

		expect(response.status).toBe(400);
		expect(response.body).toMatchObject({
			error: 'INVALID_QUESTION',
			message: expect.any(String),
		});
		expect(await Question.countDocuments()).toBe(0);
	});

	test('rejects requests without authentication', async () => {
		const response = await postQuestion({
			title: 'Unauthenticated question',
			description: 'This request should not create a question.',
			closesAt: new Date(Date.now() + HOUR).toISOString(),
		});

		expect(response.status).toBe(401);
		expect(await Question.countDocuments()).toBe(0);
	});
});
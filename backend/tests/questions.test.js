const testDb = require('./testDb');
const { makeUser, makeQuestion, HOUR } = require('./factories');
const User = require('../models/User');
const Question = require('../models/Question');
const Report = require('../models/Report');
const Wager = require('../models/Wager');
const Transaction = require('../models/Transaction');
const AuthCode = require('../models/AuthCode');
const { placeWager } = require('../services/wagers');
const {
	resolveQuestion, cancelQuestion, closeExpiredQuestions, submitQuestion, reportQuestion, searchQuestion
} = require('../services/questions');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

async function balanceOf(user) {
	return (await User.findById(user._id)).balance;
}

describe('resolveQuestion', () => {
	test('winners split the whole pool in proportion to their bets; losers get nothing', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob, carol] = await Promise.all([makeUser(), makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		// Pool: A = 100 + 300 = 400, B = 600, total 1000
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 100 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'yes', amount: 300 });
		await placeWager({ userId: carol._id, questionId: question._id, side: 'no', amount: 600 });

		const result = await resolveQuestion({ questionId: question._id, outcome: 'yes' });

		expect(result.totalPaid).toBe(1000);
		expect(await balanceOf(alice)).toBe(1000 - 100 + 250); // 100/400 of 1000
		expect(await balanceOf(bob)).toBe(1000 - 300 + 750); // 300/400 of 1000
		expect(await balanceOf(carol)).toBe(1000 - 600);
		const q = await Question.findById(question._id);
		expect(q.status).toBe('resolved');
		expect(q.outcome).toBe('yes');
		expect((await Wager.findOne({ userId: carol._id })).payout).toBe(0);
		expect(await Transaction.countDocuments({ type: 'payout' })).toBe(2);
	});

	test('rounds payouts down, so it never pays out more than the pool', async () => {
		const admin = await makeUser({ role: 'admin' });
		const users = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		// A = 1 + 1 + 1 = 3, B = 10, total 13: each winner gets floor(13/3) = 4
		for (const u of users.slice(0, 3)) {
			await placeWager({ userId: u._id, questionId: question._id, side: 'yes', amount: 1 });
		}
		await placeWager({ userId: users[3]._id, questionId: question._id, side: 'no', amount: 10 });

		const result = await resolveQuestion({ questionId: question._id, outcome: 'yes' });

		expect(result.totalPaid).toBe(12);
		expect(result.totalPaid).toBeLessThanOrEqual(13);
		for (const u of users.slice(0, 3)) expect(await balanceOf(u)).toBe(1000 - 1 + 4);
	});

	test('refunds everyone when nobody bet on the winning side', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		await placeWager({ userId: alice._id, questionId: question._id, side: 'no', amount: 100 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'no', amount: 50 });

		const result = await resolveQuestion({ questionId: question._id, outcome: 'yes' });

		expect(result.refunded).toBe(true);
		expect(await balanceOf(alice)).toBe(1000);
		expect(await balanceOf(bob)).toBe(1000);
		expect(await Transaction.countDocuments({ type: 'refund' })).toBe(2);
	});

	test('when everyone bet on the winner, each just gets their coins back', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 70 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'yes', amount: 30 });

		await resolveQuestion({ questionId: question._id, outcome: 'yes' });

		expect(await balanceOf(alice)).toBe(1000);
		expect(await balanceOf(bob)).toBe(1000);
	});

	test('pays a user once per wager when they bet more than once', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 50 });
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 50 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'no', amount: 100 });

		await resolveQuestion({ questionId: question._id, outcome: 'yes' });

		expect(await balanceOf(alice)).toBe(1000 - 100 + 200);
		expect(await balanceOf(bob)).toBe(900);
	});

	test('works on a question with no wagers at all', async () => {
		const admin = await makeUser({ role: 'admin' });
		const question = await makeQuestion(admin);
		const result = await resolveQuestion({ questionId: question._id, outcome: 'no' });
		expect(result.wagerCount).toBe(0);
		expect(result.totalPaid).toBe(0);
	});

	test('can only be resolved once, even if two requests arrive together', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 100 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'no', amount: 100 });

		const attempts = await Promise.allSettled([
			resolveQuestion({ questionId: question._id, outcome: 'yes' }),
			resolveQuestion({ questionId: question._id, outcome: 'yes' }),
		]);

		expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
		expect(attempts.find((a) => a.status === 'rejected').reason.code).toBe('QUESTION_NOT_RESOLVABLE');
		expect(await balanceOf(alice)).toBe(1100); // paid once, not twice
		await expect(
			resolveQuestion({ questionId: question._id, outcome: 'no' })
		).rejects.toMatchObject({ code: 'QUESTION_NOT_RESOLVABLE' });
	});

	test('refuses pending, rejected, and cancelled questions', async () => {
		const admin = await makeUser({ role: 'admin' });
		for (const status of ['pending', 'rejected', 'cancelled']) {
			const question = await makeQuestion(admin, { status });
			await expect(
				resolveQuestion({ questionId: question._id, outcome: 'yes' })
			).rejects.toMatchObject({ code: 'QUESTION_NOT_RESOLVABLE' });
		}
	});
});

describe('cancelQuestion', () => {
	test('refunds every wager and cannot be undone by resolving later', async () => {
		const admin = await makeUser({ role: 'admin' });
		const [alice, bob] = await Promise.all([makeUser(), makeUser()]);
		const question = await makeQuestion(admin);
		await placeWager({ userId: alice._id, questionId: question._id, side: 'yes', amount: 100 });
		await placeWager({ userId: bob._id, questionId: question._id, side: 'no', amount: 40 });

		const result = await cancelQuestion({ questionId: question._id });

		expect(result.totalRefunded).toBe(140);
		expect(await balanceOf(alice)).toBe(1000);
		expect(await balanceOf(bob)).toBe(1000);
		expect((await Question.findById(question._id)).status).toBe('cancelled');
		await expect(
			resolveQuestion({ questionId: question._id, outcome: 'yes' })
		).rejects.toMatchObject({ code: 'QUESTION_NOT_RESOLVABLE' });
	});
});

describe('closeExpiredQuestions', () => {
	test('closes open questions past closesAt and leaves the rest alone', async () => {
		const user = await makeUser();
		const expired = await makeQuestion(user, { closesAt: new Date(Date.now() - HOUR) });
		const future = await makeQuestion(user);

		expect(await closeExpiredQuestions()).toBe(1);
		expect((await Question.findById(expired._id)).status).toBe('closed');
		expect((await Question.findById(future._id)).status).toBe('open');
	});
});

describe('submitQuestion', () => {
	test('defaults an omitted category to other and requires a description', async () => {
		const creator = await makeUser();
		const question = await submitQuestion({
			creatorId: creator._id,
			title: 'Will UCF win?',
			description: 'Resolves yes if UCF wins.',
			closesAt: new Date(Date.now() + HOUR),
		});

		expect(question.description).toBe('Resolves yes if UCF wins.');
		expect(question.category).toBe('other');
		expect(question.status).toBe('pending');
	});

	test('defaults a null category to other', async () => {
		const creator = await makeUser();
		const question = await submitQuestion({
			creatorId: creator._id,
			title: 'Will UCF win?',
			description: 'Resolves yes if UCF wins.',
			category: null,
			closesAt: new Date(Date.now() + HOUR),
		});

		expect(question.category).toBe('other');
	});

	test.each([
		['missing title', { title: undefined }],
		['missing description', { description: undefined }],
		['invalid category', { category: 'invalid' }],
		['invalid closesAt', { closesAt: 'not-a-date' }],
	])('returns a client error for %s', async (_label, overrides) => {
		const creator = await makeUser();

		await expect(submitQuestion({
			creatorId: creator._id,
			title: 'Will UCF win?',
			description: 'Resolves yes if UCF wins.',
			closesAt: new Date(Date.now() + HOUR),
			...overrides,
		})).rejects.toMatchObject({ status: 400, code: 'INVALID_QUESTION' });
	});
});

describe('reportQuestion', () => {
	test('creates a report for the authenticated reporter', async () => {
		const reporter = await makeUser();
		const question = await makeQuestion(reporter);
		const reason = 'This question is inappropriate.';

		const result = await reportQuestion({
			reporterId: reporter._id,
			questionId: question._id,
			reason,
		});

		expect(result.id).toBeDefined();
		await expect(Report.findById(result.id)).resolves.toMatchObject({
			reporterId: reporter._id,
			questionId: question._id,
			reason,
		});
	});

	test.each([
		['invalid question id', { questionId: 'not-an-object-id', reason: 'Inappropriate question.' }],
		['missing reason', { questionId: '64b000000000000000000000', reason: undefined }],
	])
	('returns a client error for %s', async (_label, fields) => {
		const reporter = await makeUser();
		await expect(reportQuestion({
			reporterId: reporter._id,
			...fields,
		})).rejects.toMatchObject({ status: 400, code: 'INVALID_REPORT' });
	});
});

describe('searchQuestion', () => {
	let user;
	beforeEach(async () => {
		user = await makeUser();
		await makeQuestion(user, { title: 'Will UCF win the bowl game?', category: 'sports', poolYes: 30, poolNo: 20 });
		await makeQuestion(user, { title: 'Will C++ 29 add reflection?', category: 'tech', poolYes: 100, poolNo: 400 });
		await makeQuestion(user, { title: 'Will the new garage open?', category: 'campus', description: 'Parking at UCF' });
		await makeQuestion(user, { title: 'Pending UCF question', status: 'pending' });
	});

	test('matches title or description, ignoring case, and only open questions by default', async () => {
		const { results, total } = await searchQuestion({ q: 'ucf' });
		expect(total).toBe(2);
		expect(results.map((r) => r.title).sort()).toEqual(['Will UCF win the bowl game?', 'Will the new garage open?']);
	});

	test('treats regex characters literally', async () => {
		expect((await searchQuestion({ q: 'C++' })).total).toBe(1);
		expect((await searchQuestion({ q: '.*' })).total).toBe(0);
		await expect(searchQuestion({ q: '(unclosed[' })).resolves.toMatchObject({ total: 0 });
	});

	test('filters by category and status', async () => {
		expect((await searchQuestion({ category: 'tech' })).total).toBe(1);
		expect((await searchQuestion({ status: 'pending' })).total).toBe(1);
		expect((await searchQuestion({ status: 'all' })).total).toBe(4);
		await expect(searchQuestion({ category: 'cooking' })).rejects.toMatchObject({ code: 'INVALID_CATEGORY' });
		await expect(searchQuestion({ status: 'bogus' })).rejects.toMatchObject({ code: 'INVALID_STATUS' });
	});

	test('sorts by popularity and paginates', async () => {
		const page1 = await searchQuestion({ sort: 'popular', limit: 2, page: 1 });
		expect(page1.results.map((r) => r.totalPool)).toEqual([500, 50]);
		expect(page1.totalPages).toBe(2);
		const page2 = await searchQuestion({ sort: 'popular', limit: 2, page: 2 });
		expect(page2.results).toHaveLength(1);
	});

	test('includes the creator name and total pool in each result', async () => {
		const { results } = await searchQuestion({ q: 'C++' });
		expect(results[0].creator.displayName).toBe(user.displayName);
		expect(results[0].creator.passwordHash).toBeUndefined();
		expect(results[0].totalPool).toBe(500);
	});

	test('clamps silly page and limit values', async () => {
		const result = await searchQuestion({ page: -3, limit: 1000 });
		expect(result.page).toBe(1);
		expect(result.limit).toBe(50);
	});
});

describe('indexes', () => {
	test('the database has the indexes the schemas declare', async () => {
		const questionIndexes = (await Question.collection.indexes()).map((i) => i.name);
		expect(questionIndexes).toEqual(
			expect.arrayContaining(['status_1_category_1_closesAt_1', 'status_1_createdAt_-1', 'creatorId_1_createdAt_-1'])
		);
		const wagerIndexes = (await Wager.collection.indexes()).map((i) => i.name);
		expect(wagerIndexes).toEqual(expect.arrayContaining(['userId_1_createdAt_-1', 'questionId_1']));
	});

	test('auth_codes has a TTL index on expiresAt', async () => {
		const ttl = (await AuthCode.collection.indexes()).find((i) => i.name === 'expiresAt_1');
		expect(ttl.expireAfterSeconds).toBe(0);
	});

	test('documents get createdAt but no updatedAt', async () => {
		const user = await makeUser();
		const saved = await User.findById(user._id).lean();
		expect(saved.createdAt).toBeInstanceOf(Date);
		expect(saved.updatedAt).toBeUndefined();
	});

	test('email and displayName are unique (displayName ignoring case)', async () => {
		await makeUser({ email: 'same@example.com', displayName: 'SameName' });
		await expect(makeUser({ email: 'same@example.com' })).rejects.toMatchObject({ code: 11000 });
		await expect(makeUser({ displayName: 'samename' })).rejects.toMatchObject({ code: 11000 });
	});
});
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Wager = require('../models/Wager');
const Report = require('../models/Report');
const Transaction = require('../models/Transaction');
const { AppError, mapMongooseInputError } = require('./errors');
const { withTransaction } = require('./withTransaction');

// Pays out (or refunds) every wager on a question inside the current transaction.
// payouts: array of { wager, payout }. Users get the coins, wagers get payout set,
// and the ledger gets one row per wager that paid anything.
async function settleWagers(session, question, payouts, type) {
	if (payouts.length === 0) return 0;

	await Wager.bulkWrite(
		payouts.map(({ wager, payout }) => ({
			updateOne: { filter: { _id: wager._id }, update: { $set: { payout } } },
		})),
		{ session }
	);

	const paid = payouts.filter((p) => p.payout > 0);
	if (paid.length > 0) {
		await User.bulkWrite(
			paid.map(({ wager, payout }) => ({
				updateOne: { filter: { _id: wager.userId }, update: { $inc: { balance: payout } } },
			})),
			{ session }
		);
		await Transaction.insertMany(
			paid.map(({ wager, payout }) => ({ userId: wager.userId, type, amount: payout, questionId: question._id })),
			{ session }
		);
	}

	return paid.reduce((sum, p) => sum + p.payout, 0);
}

// Admin picks the winning side. Winners split the whole pool in proportion to
// what they bet: payout = floor(amount * totalPool / winningPool). If nobody
// bet on the winning side, everyone gets their coins back.
// The status condition in the first update means a question can only be
// resolved once, even if the admin double-clicks.
async function resolveQuestion({ questionId, outcome }) {
	if (!mongoose.isValidObjectId(questionId)) {
		throw new AppError(400, 'INVALID_ID', 'Invalid question id');
	}
	if (outcome !== 'yes' && outcome !== 'no') {
		throw new AppError(400, 'INVALID_OUTCOME', 'outcome must be "yes" or "no"');
	}

	return withTransaction(async (session) => {
		const question = await Question.findOneAndUpdate(
			{ _id: questionId, status: { $in: ['open', 'closed'] } },
			{ $set: { status: 'resolved', outcome } },
			{ returnDocument: 'after', session }
		);
		if (!question) {
			throw new AppError(409, 'QUESTION_NOT_RESOLVABLE', 'Question not found, or already resolved/cancelled');
		}

		const wagers = await Wager.find({ questionId }).session(session);
		const totalPool = question.poolYes + question.poolNo;
		const winningPool = outcome === 'yes' ? question.poolYes : question.poolNo;

		let payouts;
		let type;
		if (winningPool === 0) {
			// Nobody picked the winner: refund everyone
			payouts = wagers.map((wager) => ({ wager, payout: wager.amount }));
			type = 'refund';
		} else {
			payouts = wagers.map((wager) => ({
				wager,
				payout: wager.side === outcome ? Math.floor((wager.amount * totalPool) / winningPool) : 0,
			}));
			type = 'payout';
		}

		const totalPaid = await settleWagers(session, question, payouts, type);
		return { question, wagerCount: wagers.length, totalPaid, refunded: type === 'refund' };
	});
}

// Admin calls off a question (bad wording, event cancelled...). Everyone gets their coins back.
async function cancelQuestion({ questionId }) {
	if (!mongoose.isValidObjectId(questionId)) {
		throw new AppError(400, 'INVALID_ID', 'Invalid question id');
	}

	return withTransaction(async (session) => {
		const question = await Question.findOneAndUpdate(
			{ _id: questionId, status: { $in: ['pending', 'open', 'closed'] } },
			{ $set: { status: 'cancelled' } },
			{ returnDocument: 'after', session }
		);
		if (!question) {
			throw new AppError(409, 'QUESTION_NOT_CANCELLABLE', 'Question not found, or already resolved/cancelled');
		}

		const wagers = await Wager.find({ questionId }).session(session);
		const payouts = wagers.map((wager) => ({ wager, payout: wager.amount }));
		const totalRefunded = await settleWagers(session, question, payouts, 'refund');
		return { question, wagerCount: wagers.length, totalRefunded };
	});
}

// After a failed pending-only update, works out why so the admin sees a useful error.
async function explainNotPending(questionId) {
	const question = await Question.findById(questionId).select('status closesAt');
	if (!question) {
		throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
	}
	if (question.status !== 'pending') {
		throw new AppError(409, 'QUESTION_NOT_PENDING', `Question was already reviewed (status: ${question.status})`);
	}
	return question;
}

// Admin approves a user-submitted question: pending -> open, so wagering starts.
// A question whose closing time already passed can't be approved (it would open
// already expired), so the admin should reject it instead.
async function approveQuestion({ questionId }) {
	if (!mongoose.isValidObjectId(questionId)) {
		throw new AppError(400, 'INVALID_ID', 'Invalid question id');
	}

	// The status condition lives inside the update, so two admins clicking at the
	// same moment can't both review the same question
	const question = await Question.findOneAndUpdate(
		{ _id: questionId, status: 'pending', closesAt: { $gt: new Date() } },
		{ $set: { status: 'open' } },
		{ returnDocument: 'after' }
	);
	if (question) return { question };

	await explainNotPending(questionId);
	throw new AppError(409, 'CLOSES_AT_PASSED', 'Closing time has already passed; reject this question instead');
}

// Admin rejects a user-submitted question: pending -> rejected. Pending questions
// never take wagers, so there is nothing to refund.
async function rejectQuestion({ questionId }) {
	if (!mongoose.isValidObjectId(questionId)) {
		throw new AppError(400, 'INVALID_ID', 'Invalid question id');
	}

	const question = await Question.findOneAndUpdate(
		{ _id: questionId, status: 'pending' },
		{ $set: { status: 'rejected' } },
		{ returnDocument: 'after' }
	);
	if (question) return { question };

	await explainNotPending(questionId);
	// Only reachable if the question changed between the two queries
	throw new AppError(409, 'QUESTION_NOT_PENDING', 'Question was already reviewed');
}

// Marks open questions whose closesAt has passed as closed. placeWager already
// refuses late wagers on its own; this just keeps the status field honest.
// Call it from a timer in server.js, e.g. setInterval(closeExpiredQuestions, 60 * 1000).
async function closeExpiredQuestions() {
	const result = await Question.updateMany(
		{ status: 'open', closesAt: { $lte: new Date() } },
		{ $set: { status: 'closed' } }
	);
	return result.modifiedCount;
}

// totalPool isn't stored, so "popular" sorts on a value computed in the query
const SORTS = {
	newest: { createdAt: -1 },
	popular: { totalPool: -1, createdAt: -1 },
	closing: { closesAt: 1 },
};

// Escape characters that mean something in a regex, so "C++" or "(test" searches literally
function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search + browse. Every argument is optional. Returns one page of results plus
// totals. Each result also has totalPool and creator: { _id, displayName }.
// Questions that haven't passed admin review. Only admins, and the user who
// submitted them, may see these; everyone else sees only reviewed questions.
const UNREVIEWED_STATUSES = ['pending', 'rejected'];

// viewerId is the logged-in user. creatorId limits the search to one user's own
// questions ("My Markets"), which may include their pending/rejected ones.
async function searchQuestion({ q, category, status = 'open', sort = 'newest', page = 1, limit = 20, creatorId, viewerId } = {}) {
	const filter = {};

	if (creatorId) {
		filter.creatorId = new mongoose.Types.ObjectId(creatorId);
	}

	if (status !== 'all' && !Question.STATUSES.includes(status)) {
		throw new AppError(400, 'INVALID_STATUS', `status must be one of: all, ${Question.STATUSES.join(', ')}`);
	}

	// Searching your own questions can show any status; otherwise unreviewed
	// questions need an admin. The role is read from the database, so it's only
	// looked up when the request actually asks for unreviewed questions.
	const wantsUnreviewed = status === 'all' || UNREVIEWED_STATUSES.includes(status);
	let canSeeUnreviewed = Boolean(creatorId) && String(creatorId) === String(viewerId);
	if (wantsUnreviewed && !canSeeUnreviewed && mongoose.isValidObjectId(viewerId)) {
		const viewer = await User.findById(viewerId).select('role');
		canSeeUnreviewed = viewer?.role === 'admin';
	}

	if (status === 'all') {
		if (!canSeeUnreviewed) filter.status = { $nin: UNREVIEWED_STATUSES };
	} else {
		if (UNREVIEWED_STATUSES.includes(status) && !canSeeUnreviewed) {
			throw new AppError(403, 'STATUS_NOT_ALLOWED', 'Only admins can browse pending or rejected questions');
		}
		filter.status = status;
	}
	if (category) {
		if (!Question.CATEGORIES.includes(category)) {
			throw new AppError(400, 'INVALID_CATEGORY', `category must be one of: ${Question.CATEGORIES.join(', ')}`);
		}
		filter.category = category;
	}
	if (q && q.trim()) {
		const pattern = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
		filter.$or = [{ title: pattern }, { description: pattern }];
	}
	if (!SORTS[sort]) {
		throw new AppError(400, 'INVALID_SORT', `sort must be one of: ${Object.keys(SORTS).join(', ')}`);
	}

	const pageNum = Math.max(1, parseInt(page, 10) || 1);
	const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

	const [results, total] = await Promise.all([
		Question.aggregate([
			{ $match: filter },
			{ $addFields: { totalPool: { $add: ['$poolYes', '$poolNo'] } } },
			{ $sort: SORTS[sort] },
			{ $skip: (pageNum - 1) * pageSize },
			{ $limit: pageSize },
			// Same as populate('creatorId', 'displayName'), inside the aggregation
			{
				$lookup: {
					from: User.collection.collectionName,
					localField: 'creatorId',
					foreignField: '_id',
					pipeline: [{ $project: { displayName: 1 } }],
					as: 'creator',
				},
			},
			{ $set: { creator: { $first: '$creator' } } },
		]),
		Question.countDocuments(filter),
	]);

	return { results, page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

// category is the only optional argument
async function submitQuestion({ creatorId, title, description, category, closesAt }) {
	let question;
	try {
		question = await Question.create({
			creatorId: creatorId, title: title, description: description,
			category: category ?? 'other', closesAt: closesAt
		});
	}
	catch (error) {
		throw mapMongooseInputError(error, 'INVALID_QUESTION');
	}

	return {
		questionId: question._id, creatorId: question.creatorId, title: question.title,
		description: question.description, category: question.category,
		status: question.status, closesAt: question.closesAt, createdAt: question.createdAt
	};
}

async function reportQuestion({ reporterId,  questionId, reason }) {
	let report;
	try {
		report = await Report.create({ reporterId, questionId, reason });
	}
	catch (error) {
		throw mapMongooseInputError(error, 'INVALID_REPORT');
	}
	return { id : report._id };
}

async function searchReportsWrapper({ userId, reporterId, questionId, reason }) {
	const user = await User.findById(userId);

	if (!user) {
		throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
	}

	if (user.role !== 'admin') {
		throw new AppError(403, 'ADMIN_REQUIRED', 'Admin access required');
	}

	return searchReports({ reporterId, questionId, reason });
}

async function searchReports({ reporterId, questionId, reason } = {}) {
	const filter = {};

	// Exact match for reporter ID
	if (reporterId?.trim()) {
		if (!mongoose.isValidObjectId(reporterId)) {
			throw new AppError(400, 'INVALID_ID', 'Invalid reporter ID');
		}
		filter.reporterId = reporterId;
	}

	// Exact match for question ID
	if (questionId?.trim()) {
		if (!mongoose.isValidObjectId(questionId)) {
			throw new AppError(400, 'INVALID_ID', 'Invalid question ID');
		}
		filter.questionId = questionId;
	}

	// Partial, case-insensitive match for reason
	if (reason?.trim()) {
		const escapedReason = reason.trim().replace(
			/[.*+?^${}()|[\]\\]/g,
			'\\$&'
		);
		filter.reason = { $regex: escapedReason, $options: 'i' };
	}

	return Report.find(filter).sort({ createdAt: 1 });
}

async function resolveReport({ userId, reportId, killQuestion }) {
	const user = await User.findById(userId);

	if (!user) {
		throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
	}

	if (user.role !== 'admin') {
		throw new AppError(403, 'ADMIN_REQUIRED', 'Admin access required');
	}

	if (!mongoose.isValidObjectId(reportId)) {
		throw new AppError(400, 'INVALID_ID', 'Invalid report ID');
	}

	const report = await Report.findById(reportId);

	if (!report) {
		throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');
	}

	if (killQuestion) {
		await cancelQuestion({ questionId : report.questionId });
	}

	await report.deleteOne();

	return { removedId: report._id };
}

module.exports = { 
	resolveQuestion, cancelQuestion, approveQuestion, rejectQuestion, closeExpiredQuestions, escapeRegex, searchQuestion,
	submitQuestion, reportQuestion, searchReports, searchReportsWrapper, resolveReport
};
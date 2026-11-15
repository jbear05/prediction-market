const testDb = require('./testDb');
const { makeUser } = require('./factories');
const AuthCode = require('../models/AuthCode');
const { createAuthCode, verifyAuthCode, MAX_ATTEMPTS } = require('../services/authCodes');

beforeAll(testDb.connect);
afterEach(testDb.clear);
afterAll(testDb.disconnect);

describe('auth codes', () => {
  test('makes a 6-digit code and stores only its hash', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'verify');
    expect(code).toMatch(/^\d{6}$/);
    const saved = await AuthCode.findOne({ userId: user._id });
    expect(saved.codeHash).not.toContain(code);
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
  });

  test('the right code works once; a wrong code never does', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'reset');
    const wrong = code === '000000' ? '111111' : '000000';
    expect(await verifyAuthCode(user._id, 'reset', wrong)).toBe(false);
    expect(await verifyAuthCode(user._id, 'reset', code)).toBe(true);
    expect(await verifyAuthCode(user._id, 'reset', code)).toBe(false);
  });

  test('a verify code does not work as a reset code', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'verify');
    expect(await verifyAuthCode(user._id, 'reset', code)).toBe(false);
  });

  test('asking for a new code cancels the old one', async () => {
    const user = await makeUser();
    const first = await createAuthCode(user._id, 'verify');
    const second = await createAuthCode(user._id, 'verify');
    expect(await AuthCode.countDocuments({ userId: user._id })).toBe(1);
    if (first !== second) expect(await verifyAuthCode(user._id, 'verify', first)).toBe(false);
    expect(await verifyAuthCode(user._id, 'verify', second)).toBe(true);
  });

  test('an expired code is refused even before MongoDB deletes it', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'verify');
    await AuthCode.updateOne({ userId: user._id }, { expiresAt: new Date(Date.now() - 1000) });
    expect(await verifyAuthCode(user._id, 'verify', code)).toBe(false);
  });

  test('stops working after too many wrong guesses, even the right code', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'reset');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(await verifyAuthCode(user._id, 'reset', wrong)).toBe(false);
    }
    expect(await verifyAuthCode(user._id, 'reset', code)).toBe(false);
    expect(await AuthCode.countDocuments({ userId: user._id })).toBe(0);
  });

  test('guesses fired at the same time still count against the limit', async () => {
    const user = await makeUser();
    const code = await createAuthCode(user._id, 'reset');
    const wrong = code === '000000' ? '111111' : '000000';
    await Promise.all(
      Array.from({ length: MAX_ATTEMPTS * 3 }, () => verifyAuthCode(user._id, 'reset', wrong))
    );
    expect(await verifyAuthCode(user._id, 'reset', code)).toBe(false);
  });

  test('a new code gets a fresh set of guesses', async () => {
    const user = await makeUser();
    const first = await createAuthCode(user._id, 'verify');
    const wrong = first === '000000' ? '111111' : '000000';
    for (let i = 0; i < MAX_ATTEMPTS; i++) await verifyAuthCode(user._id, 'verify', wrong);
    const second = await createAuthCode(user._id, 'verify');
    expect(await verifyAuthCode(user._id, 'verify', second)).toBe(true);
  });

  test('rejects anything that is not 6 digits', async () => {
    const user = await makeUser();
    await createAuthCode(user._id, 'verify');
    for (const bad of [undefined, 123456, '12345', 'abcdef', { $ne: null }]) {
      expect(await verifyAuthCode(user._id, 'verify', bad)).toBe(false);
    }
  });
});
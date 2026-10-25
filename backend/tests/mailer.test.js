// Without SMTP settings, emails are printed instead of sent (laptops without SES keys, and CI).
describe('mailer without SMTP settings', () => {
  let mailer;
  let log;
  beforeAll(() => {
    delete process.env.SMTP_HOST;
    jest.resetModules();
    mailer = require('../services/mailer');
  });
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  test('prints the verification code instead of sending', async () => {
    await expect(mailer.sendVerificationCode('a@example.com', '123456')).resolves.toEqual({ logged: true });
    expect(log.mock.calls[0][0]).toContain('123456');
    expect(log.mock.calls[0][0]).toContain('a@example.com');
  });

  test('prints the reset code instead of sending', async () => {
    await mailer.sendPasswordResetCode('b@example.com', '654321');
    expect(log.mock.calls[0][0]).toContain('654321');
  });
});
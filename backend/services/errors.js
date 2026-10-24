// An expected failure (bad input, not enough coins, ...). Routes turn it into
// res.status(err.status).json({ error: err.code, message: err.message }).
class AppError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

module.exports = { AppError };
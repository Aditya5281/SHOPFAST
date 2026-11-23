class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

module.exports = {
  AppError,
  badRequest: (m = 'Bad request') => new AppError(400, m, 'BAD_REQUEST'),
  unauthorized: (m = 'Unauthorized') => new AppError(401, m, 'UNAUTHORIZED'),
  forbidden: (m = 'Forbidden') => new AppError(403, m, 'FORBIDDEN'),
  notFound: (m = 'Not found') => new AppError(404, m, 'NOT_FOUND'),
  conflict: (m = 'Conflict') => new AppError(409, m, 'CONFLICT'),
};

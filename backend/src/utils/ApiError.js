export default class ApiError extends Error {
  constructor(statusCode = 500, message = "Internal server error", errors = [], stack = "") {
    super(message);
    this.name = "ApiError";
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.success = false;
    this.errors = Array.isArray(errors) ? errors : [];

    if (stack) {
      this.stack = stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

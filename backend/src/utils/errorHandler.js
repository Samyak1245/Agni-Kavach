import ApiError from "./ApiError.js";
import ApiResponse from "./ApiResponse.js";

/** JSON error handler. This is not authentication or a 404 route handler. */
export default function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;

  const safeStatus = statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
  const message = error instanceof ApiError
    ? error.message
    : safeStatus === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error."
      : String(error?.message || "Internal server error.");

  const body = new ApiResponse(safeStatus, null, message, {
    errors: Array.isArray(error?.errors) ? error.errors : [],
    ...(process.env.NODE_ENV === "production" ? {} : { path: req.originalUrl }),
  });

  if (safeStatus >= 500) {
    console.error("API error:", error);
  }

  return res.status(safeStatus).json({ ...body, error: message });
}

/**
 * Wrap an async Express handler and forward rejected promises to Express's
 * error pipeline. Register errorHandler after the API routes in app.js.
 */
export default function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

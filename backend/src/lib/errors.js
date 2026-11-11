/* The one error type routes throw. The error handler maps `status` and `details`
   straight onto the documented { error, details } shape. */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

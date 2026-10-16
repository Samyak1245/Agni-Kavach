export default class ApiResponse {
  constructor(statusCode = 200, data = null, message = "Success", meta = undefined) {
    this.success = statusCode >= 200 && statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;

    if (meta !== undefined) {
      this.meta = meta;
    }
  }
}

export type ErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "FILE_LOCKED"
  | "IO_ERROR"
  | "ENCODING_UNSUPPORTED";

export type HttpErrorStatus = 400 | 404 | 409 | 500;

export const ERROR_STATUS_MAP: Record<ErrorCode, HttpErrorStatus> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FILE_LOCKED: 409,
  IO_ERROR: 500,
  ENCODING_UNSUPPORTED: 500,
};

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: HttpErrorStatus;

  public constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_STATUS_MAP[code];
  }
}

export function toErrorResponse(error: AppError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

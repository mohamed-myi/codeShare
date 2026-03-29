export interface DependencyErrorOptions {
  dependency: string;
  operation: string;
  errorType: string;
  message: string;
  statusCode?: number;
  isTimeout?: boolean;
  cause?: unknown;
}

export class DependencyError extends Error {
  readonly dependency: string;
  readonly operation: string;
  readonly errorType: string;
  readonly statusCode?: number;
  readonly isTimeout: boolean;

  constructor(options: DependencyErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = "DependencyError";
    this.dependency = options.dependency;
    this.operation = options.operation;
    this.errorType = options.errorType;
    this.statusCode = options.statusCode;
    this.isTimeout = options.isTimeout ?? false;
  }
}

export function isDependencyError(error: unknown): error is DependencyError {
  if (error instanceof DependencyError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return (
    typeof (error as Partial<DependencyError>).dependency === "string" &&
    typeof (error as Partial<DependencyError>).operation === "string" &&
    typeof (error as Partial<DependencyError>).errorType === "string"
  );
}

export function dependencyErrorLogFields(error: unknown): Record<string, unknown> {
  if (!isDependencyError(error)) {
    return {};
  }

  return {
    dependency: error.dependency,
    operation: error.operation,
    error_type: error.errorType,
    status_code: error.statusCode,
    is_timeout: error.isTimeout,
  };
}

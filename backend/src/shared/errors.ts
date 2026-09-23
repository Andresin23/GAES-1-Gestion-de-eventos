export class AppError extends Error {
  public readonly status: number;
  public readonly errores: string[];

  constructor(message: string, status = 500, errores: string[] = []) {
    super(message);
    this.status = status;
    this.errores = errores;
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Datos inválidos.', errores: string[] = []) {
    super(message, 400, errores);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado.', errores: string[] = []) {
    super(message, 401, errores);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para esta acción.', errores: string[] = []) {
    super(message, 403, errores);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado.', errores: string[] = []) {
    super(message, 404, errores);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el recurso actual.', errores: string[] = []) {
    super(message, 409, errores);
    this.name = 'ConflictError';
  }
}

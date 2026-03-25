import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>)?.message || 'Internal server error';

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerError';

    const requestId = request.headers['x-request-id'] as string || 'unknown';

    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} → ${status}: ${
        exception instanceof Error ? exception.message : 'Unknown error'
      }`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: errorName,
      message: Array.isArray(errorMessage)
        ? errorMessage.join(', ')
        : String(errorMessage),
    };

    response.status(status).json(body);
  }
}

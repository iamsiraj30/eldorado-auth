import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * All Exceptions Filter
 * Catches all unhandled exceptions
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Handle Database Errors (Prisma or Raw Postgres)
    const anyException = exception as any;
    const errorCode = anyException.code || anyException.error?.code;
    const errorMessage = anyException.message || '';

    const isForeignKeyViolation =
      errorCode === 'P2003' ||
      errorCode === '23503' ||
      errorMessage.includes('foreign key constraint');

    const isUniqueViolation =
      errorCode === 'P2002' ||
      errorCode === '23505' ||
      errorMessage.includes('unique constraint');

    if (isForeignKeyViolation) {
      status = HttpStatus.BAD_REQUEST;

      // Extract table name from Postgres message e.g: '...on table "purchases"'
      const tableMatch = errorMessage.match(/on table[:\s]+"?(\w+)"?/gi);
      const referencingTable = tableMatch
        ? tableMatch[tableMatch.length - 1]
            .replace(/on table[:\s]+"?/i, '')
            .replace(/"/g, '')
            .trim()
        : null;

      message = referencingTable
        ? `This record cannot be modified or deleted because it is still referenced by the "${referencingTable}" table.`
        : 'This record cannot be deleted or updated because it is referenced by other records.';
    } else if (isUniqueViolation) {
      status = HttpStatus.CONFLICT;

      // Extract field from Postgres unique constraint message e.g: '...Key (email)=...'
      const fieldMatch = errorMessage.match(/Key \((.+?)\)=/i);
      const conflictField = fieldMatch ? fieldMatch[1] : null;

      message = conflictField
        ? `A record with this "${conflictField}" already exists.`
        : 'A record with this information already exists.';
    } else if (errorCode === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }
}

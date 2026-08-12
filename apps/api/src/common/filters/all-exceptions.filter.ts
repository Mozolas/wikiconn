import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';

interface ErrorBody {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // WebSocket/RPC contexts handle their own errors; never touch a non-HTTP response.
      this.logger.error(
        'Unhandled non-HTTP exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (n: number) => { json: (b: ErrorBody) => unknown };
    }>();

    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${String(body.statusCode)} ${exception instanceof Error ? exception.message : 'error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${String(body.statusCode)} ${body.message}`);
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // Never leak internal detail for server-side failures.
      if (status >= 500) {
        return { statusCode: status, message: 'Internal server error' };
      }
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode: status, message: response };
      }
      const r = response as { message?: unknown; code?: unknown; details?: unknown };
      return {
        statusCode: status,
        message: typeof r.message === 'string' ? r.message : exception.message,
        ...(typeof r.code === 'string' ? { code: r.code } : {}),
        ...(r.details === undefined ? {} : { details: r.details }),
      };
    }

    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        details: exception.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}

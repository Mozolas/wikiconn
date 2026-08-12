import { HttpException, HttpStatus } from '@nestjs/common';

import type { ErrorCode } from '@wikiconn/shared';

interface ErrorBody {
  code: ErrorCode;
  message: string;
}

export class WsAppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'WsAppError';
  }

  toBody(): ErrorBody {
    return { code: this.code, message: this.message };
  }
}

export class RoomNotFoundError extends HttpException {
  constructor(roomCode: string) {
    super(
      { code: 'ROOM_NOT_FOUND' satisfies ErrorCode, message: `Room ${roomCode} does not exist` },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class RoomFullError extends HttpException {
  constructor(roomCode: string) {
    super(
      { code: 'ROOM_FULL' satisfies ErrorCode, message: `Room ${roomCode} is full` },
      HttpStatus.CONFLICT,
    );
  }
}

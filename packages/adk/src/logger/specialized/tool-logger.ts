import type { Logger as PinoLogger } from 'pino';
import type { ToolLogContext } from '../types';

export class ToolLogger {
  constructor(private pino: PinoLogger) {}
  
  executing(data?: ToolLogContext & { arguments?: any }) {
    this.pino.debug(data, 'Executing tool');
  }
  
  completed(data?: ToolLogContext & { result?: any; duration?: number }) {
    this.pino.debug(data, 'Tool completed');
  }
  
  longRunning(data?: ToolLogContext & { taskId?: string; estimatedDuration?: number }) {
    this.pino.info(data, 'Long-running tool started');
  }
  
  error(error: Error, data?: ToolLogContext) {
    this.pino.error({ err: error, ...data }, 'Tool error');
  }
  
  // Direct access to log levels
  trace(data: ToolLogContext, message: string): void;
  trace(message: string): void;
  trace(dataOrMessage: ToolLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.trace(dataOrMessage);
    } else {
      this.pino.trace(dataOrMessage, message);
    }
  }
  
  debug(data: ToolLogContext, message: string): void;
  debug(message: string): void;
  debug(dataOrMessage: ToolLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.debug(dataOrMessage);
    } else {
      this.pino.debug(dataOrMessage, message);
    }
  }
  
  info(data: ToolLogContext, message: string): void;
  info(message: string): void;
  info(dataOrMessage: ToolLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.info(dataOrMessage);
    } else {
      this.pino.info(dataOrMessage, message);
    }
  }
  
  warn(data: ToolLogContext, message: string): void;
  warn(message: string): void;
  warn(dataOrMessage: ToolLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.warn(dataOrMessage);
    } else {
      this.pino.warn(dataOrMessage, message);
    }
  }
}

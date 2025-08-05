import type { Logger as PinoLogger } from 'pino';
import type { LLMLogContext } from '../types';

export class LLMLogger {
  constructor(private pino: PinoLogger) {}
  
  request(data: {
    agent?: string;
    contentItems?: number;
    systemInstruction?: string;
    toolCount?: number;
    streaming?: boolean;
    requestId?: string;
  }) {
    this.pino.debug({
      content_items: data.contentItems,
      system_instruction: data.systemInstruction ? 'present' : 'none',
      tool_count: data.toolCount || 0,
      streaming: data.streaming || false,
      agent: data.agent,
      request_id: data.requestId
    }, 'LLM request');
  }
  
  response(data: {
    tokenCount?: number;
    functionCalls?: number;
    finishReason?: string;
    duration?: number;
    partial?: boolean;
    error?: string;
  }) {
    this.pino.debug({
      finish_reason: data.finishReason,
      token_count: data.tokenCount,
      duration_ms: data.duration,
      function_calls: data.functionCalls || 0,
      partial: data.partial || false,
      error: data.error || null
    }, 'LLM response');
  }
  
  toolCall(toolName: string, args: object) {
    this.pino.trace({ 
      tool: toolName, 
      args: JSON.stringify(args).substring(0, 100) 
    }, 'Tool call');
  }
  
  toolResult(toolName: string, result: any, duration: number) {
    this.pino.trace({ 
      tool: toolName, 
      result_type: typeof result, 
      duration_ms: duration 
    }, 'Tool result');
  }
  
  rateLimited(data: { retryAfter?: number; requestId?: string }) {
    this.pino.warn({
      retry_after: data.retryAfter,
      request_id: data.requestId
    }, 'LLM rate limited');
  }
  
  // Direct access to log levels
  trace(data: LLMLogContext, message: string): void;
  trace(message: string): void;
  trace(dataOrMessage: LLMLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.trace(dataOrMessage);
    } else {
      this.pino.trace(dataOrMessage, message);
    }
  }
  
  debug(data: LLMLogContext, message: string): void;
  debug(message: string): void;
  debug(dataOrMessage: LLMLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.debug(dataOrMessage);
    } else {
      this.pino.debug(dataOrMessage, message);
    }
  }
  
  info(data: LLMLogContext, message: string): void;
  info(message: string): void;
  info(dataOrMessage: LLMLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.info(dataOrMessage);
    } else {
      this.pino.info(dataOrMessage, message);
    }
  }
  
  warn(data: LLMLogContext, message: string): void;
  warn(message: string): void;
  warn(dataOrMessage: LLMLogContext | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.warn(dataOrMessage);
    } else {
      this.pino.warn(dataOrMessage, message);
    }
  }
  
  error(data: LLMLogContext & { err?: Error }, message: string): void;
  error(message: string): void;
  error(dataOrMessage: (LLMLogContext & { err?: Error }) | string, message?: string) {
    if (typeof dataOrMessage === 'string') {
      this.pino.error(dataOrMessage);
    } else {
      this.pino.error(dataOrMessage, message);
    }
  }
}

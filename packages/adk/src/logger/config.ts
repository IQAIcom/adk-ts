import type { LoggerOptions } from 'pino';

export function getLoggerConfig(): LoggerOptions {
  const level = process.env.ADK_LOG_LEVEL || (isDebugEnabled() ? 'debug' : 'info');
  const format = process.env.ADK_LOG_FORMAT || 'pretty';
  
  const config: LoggerOptions = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({ 
        ...bindings, 
        framework: 'adk',
        pid: undefined, // Remove pid for cleaner logs
        hostname: undefined // Remove hostname for cleaner logs
      })
    }
  };
  
  // Development: pretty printing
  if (format === 'pretty' && (process.env.NODE_ENV === 'development' || isDebugEnabled())) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:mm:ss',
        singleLine: false,
        messageFormat: '{component} | {msg}'
      }
    };
  }
  
  // Production file logging
  if (process.env.ADK_LOG_FILE) {
    config.transport = {
      target: 'pino/file',
      options: { 
        destination: process.env.ADK_LOG_FILE,
        mkdir: true
      }
    };
  }
  
  return config;
}

function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ADK_DEBUG === 'true';
}

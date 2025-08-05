export interface LogContext {
  [key: string]: any;
}

export interface LogMessage {
  message: string;
  context?: LogContext;
}

export interface AgentLogContext extends LogContext {
  agent?: string;
  invocationId?: string;
  model?: string;
  stepCount?: number;
  duration?: number;
}

export interface LLMLogContext extends LogContext {
  llm?: {
    model: string;
  };
  requestId?: string;
  tokenCount?: number;
  streaming?: boolean;
  functionCalls?: number;
  finishReason?: string;
}

export interface ToolLogContext extends LogContext {
  tool?: string;
  arguments?: any;
  duration?: number;
  result?: any;
}

export interface ContainerLogContext extends LogContext {
  container?: string;
  language?: string;
  operation?: string;
  exitCode?: number;
}

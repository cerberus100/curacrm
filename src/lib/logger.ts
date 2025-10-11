/**
 * Centralized logging utility for production CRM
 * Provides structured logging with context and levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      env: process.env.NODE_ENV,
    };

    // In production, use structured JSON logging
    if (!this.isDevelopment) {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use readable console output
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level];
      
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`, context || '');
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error)
    };
    
    this.log('error', message, errorContext);
  }

  // API request logging
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      method,
      endpoint,
      ...context
    });
  }

  apiResponse(method: string, endpoint: string, status: number, duration: number, context?: LogContext) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `API Response: ${method} ${endpoint} - ${status}`, {
      method,
      endpoint,
      status,
      duration,
      ...context
    });
  }

  // Database operation logging
  dbQuery(operation: string, model: string, duration?: number) {
    this.debug(`DB Query: ${operation} ${model}`, {
      operation,
      model,
      duration
    });
  }

  // Authentication logging
  authEvent(event: string, userId?: string, email?: string, success: boolean = true) {
    this.info(`Auth: ${event}`, {
      event,
      userId,
      email,
      success
    });
  }

  // Business logic events
  businessEvent(event: string, context?: LogContext) {
    this.info(`Business Event: ${event}`, context);
  }
}

export const logger = new Logger();

// Helper to generate request IDs
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

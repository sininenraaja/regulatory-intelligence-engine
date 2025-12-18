/**
 * Structured Logging Utility
 * Provides consistent logging across the application with context
 *
 * Usage:
 *   logger.info('Action completed', { regulation_id: 123, duration_ms: 500 });
 *   logger.error('API failed', { error, endpoint: '/api/monitor' });
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: string;
}

class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(5);
    const message = entry.message;

    let logStr = `[${timestamp}] ${level} ${message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      logStr += ` | ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      logStr += ` | Error: ${entry.error}`;
    }

    return logStr;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error instanceof Error ? error.message : undefined,
    };

    const formatted = this.formatLog(entry);

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        if (error instanceof Error && error.stack) {
          console.error(error.stack);
        }
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext, error?: any): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log function execution time
   * Usage:
   *   await logger.time('Regulation analysis', () => analyzeRegulation(reg))
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, { duration_ms: duration }, error);
      throw error;
    }
  }

  /**
   * Log multiple operations with context
   */
  batch(operation: string, results: any): void {
    this.info(`Batch operation: ${operation}`, results);
  }
}

// Export singleton logger instance
export const logger = new Logger(
  process.env.LOG_LEVEL ? (LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] ?? LogLevel.INFO) : LogLevel.INFO
);

/**
 * Create a scoped logger for a specific feature/module
 */
export function createScopedLogger(scope: string): Logger {
  const scopedLogger = new Logger();
  const originalLog = scopedLogger['log'].bind(scopedLogger);

  scopedLogger['log'] = function (level: LogLevel, message: string, context?: LogContext, error?: any) {
    const scopedMessage = `[${scope}] ${message}`;
    originalLog(level, scopedMessage, context, error);
  };

  return scopedLogger;
}

export default logger;

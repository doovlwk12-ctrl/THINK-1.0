/**
 * Logger utility for the application
 * In production, this can be connected to logging services like Sentry, LogRocket, etc.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
  errorId?: string
}

class Logger {
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error) {
    const errorId = error ? this.generateErrorId() : undefined
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        ...(error && {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }),
      },
      errorId,
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with Sentry or other logging service
      // Example: Sentry.captureMessage(message, { level, extra: metadata })
    } else {
      // In development, use console with colors
      const colors = {
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        debug: '\x1b[90m', // Gray
      }
      const reset = '\x1b[0m'
      
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `${colors[level]}[${level.toUpperCase()}]${reset} ${message}`,
        metadata || error ? JSON.stringify(entry, null, 2) : ''
      )
    }

    return errorId
  }

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, unknown>, error?: Error) {
    return this.log('error', message, metadata, error)
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, metadata)
    }
  }
}

export const logger = new Logger()

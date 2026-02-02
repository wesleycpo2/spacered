/**
 * LOGGER ESTRUTURADO
 * 
 * Sistema de logging para rastreamento de alertas e notificações
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogData {
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    const timestamp = this.formatTimestamp();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data }),
    };

    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
    }[level];

    console.log(`${emoji} [${level.toUpperCase()}]`, message, data || '');
    
    // Em produção, enviar para serviço de logging (Datadog, Sentry, etc)
    return logEntry;
  }

  info(message: string, data?: LogData) {
    return this.log('info', message, data);
  }

  warn(message: string, data?: LogData) {
    return this.log('warn', message, data);
  }

  error(message: string, data?: LogData) {
    return this.log('error', message, data);
  }

  success(message: string, data?: LogData) {
    return this.log('success', message, data);
  }
}

export const logger = new Logger();

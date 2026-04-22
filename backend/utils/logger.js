import fs from 'fs';
import path from 'path';

const LOG_DIR = 'logs';

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const LOG_FILE = path.join(LOG_DIR, 'app.log');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Logger Utility
 * Logs messages to both console and file
 */
class Logger {
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}${data ? ` ${JSON.stringify(data)}` : ''}`;

    // Log to console
    console.log(logMessage);

    // Log to file
    try {
      fs.appendFileSync(LOG_FILE, `${logMessage}\n`);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  error(message, data) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data) {
    if (process.env.NODE_ENV === 'development') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

export default new Logger();

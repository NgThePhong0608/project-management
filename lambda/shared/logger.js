/**
 * Shared CloudWatch JSON Structured Logger for Lambda functions.
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

function formatMessage(level, message, context = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'local',
    memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '128',
  });
}

const logger = {
  debug(message, context = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(formatMessage('DEBUG', message, context));
    }
  },

  info(message, context = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.info(formatMessage('INFO', message, context));
    }
  },

  warn(message, context = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  },

  error(message, error = null, context = {}) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      const errContext = error
        ? {
            ...context,
            errorMessage: error.message,
            stack: error.stack,
            name: error.name,
          }
        : context;
      console.error(formatMessage('ERROR', message, errContext));
    }
  },
};

module.exports = logger;


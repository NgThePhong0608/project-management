/**
 * Shared Helper utilities for Lambda functions.
 */

/**
 * Standard API Gateway / Lambda JSON success response.
 */
function successResponse(data, statusCode = 200, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

/**
 * Standard API Gateway / Lambda JSON error response.
 */
function errorResponse(message, statusCode = 500, details = null, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        ...(details && { details }),
      },
    }),
  };
}

/**
 * Safely parse incoming event body whether invoked via API Gateway, SQS, or direct invoke.
 */
function parseEventBody(event) {
  if (!event) return {};

  if (typeof event.body === 'string') {
    try {
      return JSON.parse(event.body);
    } catch {
      return { raw: event.body };
    }
  }

  if (typeof event.body === 'object' && event.body !== null) {
    return event.body;
  }

  return event;
}

/**
 * Validates presence of required fields in an object.
 */
function validateRequiredFields(payload, requiredFields = []) {
  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

module.exports = {
  successResponse,
  errorResponse,
  parseEventBody,
  validateRequiredFields,
};


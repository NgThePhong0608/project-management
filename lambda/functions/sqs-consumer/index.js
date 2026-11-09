const logger = require('../../shared/logger');

/**
 * AWS Lambda SQS Batch Consumer for Laravel Queued Jobs.
 *
 * Handles background notifications, comment alerts, and async tasks
 * dispatched by Laravel queue via AWS SQS.
 */

/**
 * Dispatches and processes a single Laravel queue job payload.
 *
 * Laravel SQS format:
 * {
 *   "uuid": "...",
 *   "displayName": "App\\Jobs\\SendCommentNotifications",
 *   "job": "Illuminate\\Queue\\CallQueuedHandler@call",
 *   "maxTries": 3,
 *   "timeout": 60,
 *   "data": {
 *     "commandName": "App\\Jobs\\SendCommentNotifications",
 *     "command": "..."
 *   }
 * }
 */
async function processLaravelJob(payload, messageId) {
  const jobName = payload.displayName || payload.job || 'UnknownJob';
  logger.info(`[Job ${messageId}] Starting processing for: ${jobName}`, { messageId, jobName });

  const workerUrl = process.env.LARAVEL_WORKER_URL;
  if (!workerUrl) {
    throw new Error(
      `[Job ${messageId}] LARAVEL_WORKER_URL is not configured; cannot execute ${jobName}. Reporting as failed to retain message in SQS.`
    );
  }

  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LARAVEL_WORKER_SECRET && {
        'X-Worker-Secret': process.env.LARAVEL_WORKER_SECRET,
      }),
    },
    body: JSON.stringify({ messageId, jobName, payload }),
  });

  if (!response.ok) {
    throw new Error(`[Job ${messageId}] Worker returned HTTP ${response.status} for ${jobName}`);
  }

  logger.info(`[Job ${messageId}] Completed successfully.`);
}

/**
 * Main Lambda Handler with partial batch failure reporting.
 */
exports.handler = async (event, context) => {
  logger.info('Received SQS event batch', { recordCount: event.Records ? event.Records.length : 0 });

  const batchItemFailures = [];

  if (!event.Records || !event.Records.length) {
    return { batchItemFailures };
  }

  for (const record of event.Records) {
    const messageId = record.messageId;
    logger.debug(`Processing SQS message: ${messageId}`, { messageId, attributes: record.attributes });

    try {
      let body;
      try {
        body = JSON.parse(record.body);
      } catch (parseError) {
        logger.warn(`[Message ${messageId}] Raw body is not JSON`, { raw: record.body });
        body = { raw: record.body };
      }

      await processLaravelJob(body, messageId);
    } catch (err) {
      logger.error(`[Message ${messageId}] Failed to process record`, err, { messageId });
      // Report failed message identifier for SQS Partial Batch Responses
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }

  logger.info(`Batch processing completed. Processed: ${event.Records.length}, Failures: ${batchItemFailures.length}`);

  // Return SQS partial batch failure structure (AWS standard)
  return {
    batchItemFailures,
  };
};


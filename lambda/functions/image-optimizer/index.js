const {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const logger = require('../../shared/logger');
const { successResponse } = require('../../shared/helpers');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
});

/**
 * Stream to Buffer helper for AWS SDK v3
 */
const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const isSourceMissingError = (err) => {
  const code = err?.name || err?.Code;
  const status = err?.$metadata?.httpStatusCode;
  return (
    code === 'NoSuchKey' ||
    code === 'NotFound' ||
    code === 'PreconditionFailed' ||
    status === 404 ||
    status === 412
  );
};

const buildTargetKey = (key) => {
  const lastSlash = key.lastIndexOf('/');
  const dir = lastSlash !== -1 ? key.substring(0, lastSlash) : '';
  const filename = lastSlash !== -1 ? key.substring(lastSlash + 1) : key;
  const dotIndex = filename.lastIndexOf('.');
  const baseName = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  return dir ? `${dir}/optimized/${baseName}.webp` : `optimized/${baseName}.webp`;
};

/**
 * AWS Lambda handler for S3 image optimization.
 * Listens to s3:ObjectCreated:* (and optional s3:ObjectRemoved:*) events,
 * resizes and converts images to WebP, and prevents orphaned derived images.
 */
exports.handler = async (event) => {
  logger.info('Received S3 event for image optimization', { recordCount: event?.Records?.length || 0 });

  if (!event?.Records?.length) {
    logger.warn('No records found in S3 event.');
    return successResponse({ message: 'No records to process' });
  }

  const results = [];

  for (const record of event.Records) {
    if (!record.s3) {
      logger.warn('Skipping non-S3 record', { record });
      continue;
    }

    const bucket = record.s3.bucket.name;
    const rawKey = record.s3.object.key.replace(/\+/g, ' ');
    const key = decodeURIComponent(rawKey);
    const eventName = record.eventName || '';

    // Prevent infinite recursion loops: ignore files already in optimized/ or .webp
    if (key.includes('/optimized/') || key.endsWith('.webp') || key.includes('-optimized.')) {
      logger.info('Skipping already optimized file', { key });
      results.push({ key, status: 'skipped', reason: 'already_optimized' });
      continue;
    }

    // Only process supported image formats
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    const lowerKey = key.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerKey.endsWith(ext));

    if (!hasValidExt) {
      logger.info('Skipping unsupported file extension', { key });
      results.push({ key, status: 'skipped', reason: 'unsupported_extension' });
      continue;
    }

    const targetKey = buildTargetKey(key);

    // Handle S3 ObjectRemoved events to clean up derived optimized image
    if (eventName.startsWith('ObjectRemoved:')) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: targetKey }));
        results.push({ sourceKey: key, targetKey, status: 'deleted' });
      } catch (error) {
        logger.error(`Error deleting derived image ${targetKey}`, error, { bucket, key });
        results.push({ key, status: 'error', error: error.message });
      }
      continue;
    }

    logger.info('Processing image optimization', { bucket, key });

    try {
      // 1. Download original image from S3
      const getResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const sourceETag = getResponse.ETag;
      const inputBuffer = await streamToBuffer(getResponse.Body);
      logger.debug('Downloaded original image', { key, sizeBytes: inputBuffer.length });

      // 2. Process image with Sharp: auto-orient, resize max width 1920, convert to WebP quality 80
      const optimizedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      // 3. Verify source still exists before writing derived image
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
          ...(sourceETag && { IfMatch: sourceETag }),
        })
      );

      // 4. Upload optimized image back to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: targetKey,
          Body: optimizedBuffer,
          ContentType: 'image/webp',
          CacheControl: 'max-age=31536000, public',
          Metadata: {
            'original-key': key,
            'optimized-by': 'pm-lambda-image-optimizer',
          },
        })
      );

      // 5. Re-verify source after upload to prevent orphan if source was deleted during PutObject
      try {
        await s3Client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
            ...(sourceETag && { IfMatch: sourceETag }),
          })
        );
      } catch (postCheckErr) {
        if (isSourceMissingError(postCheckErr)) {
          logger.warn('Source removed during optimization upload; rolling back derived image', {
            bucket,
            key,
            targetKey,
          });
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: targetKey }));
          results.push({ key, status: 'skipped', reason: 'source_deleted_during_upload' });
          continue;
        }
        throw postCheckErr;
      }

      logger.info('Uploaded optimized image to S3', { bucket, targetKey });
      results.push({
        sourceKey: key,
        targetKey,
        originalSize: inputBuffer.length,
        optimizedSize: optimizedBuffer.length,
        status: 'success',
      });
    } catch (error) {
      if (isSourceMissingError(error)) {
        logger.warn('Source image no longer exists; skipping optimization', { bucket, key });
        results.push({ key, status: 'skipped', reason: 'source_deleted' });
        continue;
      }
      logger.error(`Error processing image ${key}`, error, { bucket, key });
      results.push({ key, status: 'error', error: error.message });
    }
  }

  const failures = results.filter((r) => r.status === 'error');
  if (failures.length > 0) {
    throw new Error(
      `Failed to optimize ${failures.length} image(s): ${failures.map((f) => `${f.key} (${f.error})`).join('; ')}`
    );
  }

  return successResponse({ results });
};

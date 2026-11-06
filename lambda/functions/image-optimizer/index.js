const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const logger = require('../../shared/logger');
const { successResponse, errorResponse } = require('../../shared/helpers');

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

/**
 * AWS Lambda handler for S3 image optimization.
 * Listens to s3:ObjectCreated:* events, resizes and converts images to WebP.
 */
exports.handler = async (event, context) => {
  logger.info('Received S3 event for image optimization', { recordCount: event.Records?.length || 0 });

  if (!event.Records || !event.Records.length) {
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

    logger.info('Processing image optimization', { bucket, key });

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

    try {
      // 1. Download original image from S3
      const getResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const inputBuffer = await streamToBuffer(getResponse.Body);
      logger.debug('Downloaded original image', { key, sizeBytes: inputBuffer.length });

      // 2. Process image with Sharp: auto-orient, resize max width 1920, convert to WebP quality 80
      const optimizedBuffer = await sharp(inputBuffer)
        .rotate() // auto-orient based on EXIF
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      logger.info('Successfully optimized image with Sharp', {
        key,
        originalBytes: inputBuffer.length,
        optimizedBytes: optimizedBuffer.length,
        savingsPercent: `${(((inputBuffer.length - optimizedBuffer.length) / inputBuffer.length) * 100).toFixed(1)}%`,
      });

      // 3. Construct destination key (e.g. avatar/sample.jpg -> avatar/optimized/sample.webp)
      const lastSlash = key.lastIndexOf('/');
      const dir = lastSlash !== -1 ? key.substring(0, lastSlash) : '';
      const filename = lastSlash !== -1 ? key.substring(lastSlash + 1) : key;
      const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
      const targetKey = dir ? `${dir}/optimized/${baseName}.webp` : `optimized/${baseName}.webp`;

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

      logger.info('Uploaded optimized image to S3', { bucket, targetKey });
      results.push({
        sourceKey: key,
        targetKey,
        originalSize: inputBuffer.length,
        optimizedSize: optimizedBuffer.length,
        status: 'success',
      });
    } catch (error) {
      logger.error(`Error processing image ${key}`, error, { bucket, key });
      results.push({ key, status: 'error', error: error.message });
    }
  }

  return successResponse({ results });
};


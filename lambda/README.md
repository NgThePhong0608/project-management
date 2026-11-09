# AWS Lambda Serverless Microservices

A standalone serverless microservices package for the Project Management application, powered by AWS Lambda and Node.js.

---

## Directory Structure

```
lambda/
├── functions/
│   └── image-optimizer/      # S3 Image Optimization (Sharp, auto-orient, WebP q80)
│       ├── index.js
│       └── package.json
│
├── shared/
│   ├── database.js           # DynamoDB Document Client (AWS SDK v3)
│   ├── logger.js             # Structured JSON logger optimized for CloudWatch
│   └── helpers.js            # Event parser, standard response formatters, validation
│
├── scripts/
│   ├── package.js            # Node.js packaging script (bundles code + shared + Linux Sharp into .zip)
│   └── deploy.js             # Node.js deployment script (updates Lambda functions via AWS CLI)
│
├── package.json
└── README.md
```

---

## Functions

### `image-optimizer` (S3 Image Optimization & WebP Conversion)

- **Trigger:** Amazon S3 Object Created events (`s3:ObjectCreated:*`) when users upload avatars, cover images, or task/comment attachments.
- **Key Features:**
  - **Auto-Rotation:** Reads EXIF orientation and corrects image rotation (`.rotate()`).
  - **Smart Resizing:** Enforces a maximum width limit of 1920px (`withoutEnlargement: true`).
  - **WebP Compression:** Converts raw images into modern **WebP** format at quality 80 (`effort: 4`), saving 50%–80% storage and bandwidth.
  - **Infinite Loop Protection:** Automatically skips images already under `optimized/` prefixes or ending in `.webp`.
  - **Cache Optimization:** Attaches HTTP response headers `Cache-Control: max-age=31536000, public` upon S3 put.
  - **Orphan Cleanup:** Synchronizes with S3 removal events (`s3:ObjectRemoved:*`) to automatically delete derived `.webp` images when the original source image is deleted.
- **Dependencies:** `@aws-sdk/client-s3`, `sharp`.

---

## Shared Modules (`lambda/shared/`)

- **`logger.js`**: Structured JSON logging matching AWS CloudWatch standard formats (`DEBUG`, `INFO`, `WARN`, `ERROR` with error stacks and execution context).
- **`helpers.js`**: Reusable helpers such as `successResponse()`, `errorResponse()`, `parseEventBody()`, and `validateRequiredFields()`.
- **`database.js`**: Reusable `DynamoDBDocumentClient` initialization supporting both LocalStack and AWS Cloud environments.

---

## Packaging & Deployment (Pure Node.js)

All build and packaging steps are executed using pure Node.js scripts:

```bash
# 1. Package all functions into zip archives under lambda/dist/
# Automatically downloads Linux-compatible binary dependencies for Sharp
node lambda/scripts/package.js

# 2. Deploy functions to AWS Lambda
node lambda/scripts/deploy.js

# Optional: target specific stage and AWS region
ENVIRONMENT=dev AWS_REGION=ap-southeast-1 node lambda/scripts/deploy.js
```
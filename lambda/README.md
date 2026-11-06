# AWS Lambda Serverless Microservices

A standalone serverless microservices system for the Project Management project, running on AWS Lambda and Node.js.

---

## Directory Structure

```
lambda/
├── functions/
│   ├── image-optimizer/      # [Feature 1] S3 Image Optimization (Sharp, auto-orient, WebP q80)
│   │   ├── index.js
│   │   └── package.json
│   │
│   └── sqs-consumer/         # [Feature 2] SQS Queue Worker for Laravel background jobs
│       ├── index.js
│       └── package.json
│
├── shared/
│   ├── database.js           # DynamoDB Document SDK v3 client
│   ├── logger.js             # CloudWatch-standard structured JSON logger
│   └── helpers.js            # Event parser, response formatters, validation
│
├── scripts/
│   ├── package.js            # Node.js script that bundles code + shared + node_modules into a .zip
│   └── deploy.js             # Node.js script that updates function code on AWS Lambda
│
├── package.json
└── README.md
```

---

## Feature Details According to the Plan

### 1. `image-optimizer` (S3 Image Optimization & Compression) ⭐
- **Purpose:** When users upload avatars, cover images, or task/comment attachments to the S3 bucket, the `s3:ObjectCreated:*` event triggers the Lambda.
- **Features:**
  - Automatically rotates images to the correct orientation based on camera EXIF data (`.rotate()`).
  - Smart resizing with a maximum width limit of 1920px (`withoutEnlargement: true`).
  - Compresses to the modern **WebP** format at quality 80 (`effort: 4`), reducing file size by 50% - 80%.
  - Infinite-loop prevention mechanism (skips files already in the `optimized/` folder or with a `.webp` extension).
  - Attaches the HTTP header `Cache-Control: max-age=31536000, public` when saving back to S3.
- **Dependencies:** `@aws-sdk/client-s3`, `sharp`.

### 2. `sqs-consumer` (Queue Worker for Laravel) ⭐
- **Purpose:** Processes background jobs that Laravel pushes into Amazon SQS (e.g., `App\Jobs\SendCommentNotifications`, `App\Notifications\UnreadChatReminderNotification`, `App\Events\TaskActivityRecorded`).
- **Features:**
  - Replaces the 24/7 `php artisan queue:work` daemon, starting automatically when jobs arrive and scaling down to zero when the queue is empty.
  - Supports the standard **Partial Batch Failures** pattern (`batchItemFailures: [{ itemIdentifier }]`). If one message in a batch of 10 fails, only that message stays in the queue for retry or moves to the Dead-Letter Queue (DLQ); the 9 successful messages are deleted immediately.
- **Dependencies:** `@aws-sdk/client-sqs`.

---

## Shared Libraries (`lambda/shared/`)

- **`logger.js`**: Writes structured JSON logs that display cleanly in the CloudWatch Console (`DEBUG`, `INFO`, `WARN`, `ERROR`, including error stack and function information).
- **`helpers.js`**: `successResponse()`, `errorResponse()`, `parseEventBody()`, `validateRequiredFields()`.
- **`database.js`**: Initializes the `DynamoDBDocumentClient` SDK v3, supporting both LocalStack and AWS Cloud.

---

## Packaging & Deployment with Node.js

```bash
# 1. Package all functions into .zip files in lambda/dist/
node lambda/scripts/package.js

# 2. Deploy to AWS Lambda
node lambda/scripts/deploy.js

# Optional environment & region settings:
ENVIRONMENT=prod AWS_REGION=ap-southeast-1 node lambda/scripts/deploy.js
```
# Enterprise Project Management Platform

A modern, high-performance Project Management and Collaboration system built with **Laravel 12 (PHP 8.5)**, **Inertia.js (React 18)**, **Tailwind CSS**, and **shadcn/ui**. The system is architected for enterprise cloud deployments on **AWS (ECS, S3, DynamoDB, Bedrock, Lambda)** and **Cloudflare R2**.

---

## 🌟 Key Features

### 1. Modern CMS User Interface
- **Modern Sidebar & Dashboard:** Collapsible, responsive sidebar navigation built with **shadcn/ui** and Lucide icons.
- **Enterprise Data Tables:** Standardized tables with column sorting, status filtering, multi-user assignment, and pagination.
- **Real-Time Notification Center:** Centralized notification panel and full notification index page with instant read/unread tracking and category badges.

### 2. Amazon Bedrock AI Task Copilot
- **✨ AI Task Breakdown:** Decomposes complex tasks into 3–6 actionable subtasks categorized by priority (`high`, `medium`, `low`) using **Claude 3.5 Haiku / APAC Cross-Region Inference**. Includes an interactive preview card with one-click appending to task descriptions.
- **✨ AI Description Enhancer:** Polishes raw notes into structured Agile User Stories complete with **Context & Objective**, **Implementation Steps**, and **Definition of Done (DoD)**.
- **Security & Authorization:** Enforces project-level authorization gates (`ProjectPolicy::view`) before any context is passed to LLM prompts.

### 3. Serverless Image Processing (AWS Lambda)
- **Event-Driven Image Optimizer:** Dedicated Lambda microservice listening to S3 upload events (`s3:ObjectCreated:*`).
- **WebP Compression via Sharp:** Auto-orients images via EXIF, resizes to a maximum width of 1920px, converts to WebP (quality 80), and applies long-lived cache headers (`Cache-Control: max-age=31536000, public`).
- **Orphan Cleanup:** Listens to `s3:ObjectRemoved:*` to automatically remove derived images when source media is deleted.

### 4. Real-Time Collaboration & Messaging
- **Hybrid Real-Time Chat:** Low-latency team messaging powered by **Laravel Reverb (WebSockets)** and **Amazon DynamoDB** for scalable message storage.
- **Rich Comments & Mentions:** Interactive discussions with Quill rich-text editor, `@mention` user tagging, and secure short-lived temporary media URLs (5-minute expiration).

### 5. Multi-Tenant Architecture & Enterprise Security
- **Wildcard Subdomain Multi-Session:** Seamless tenant and session switching via Redis session registries across custom subdomains.
- **Two-Factor Authentication (2FA):** Time-based One-Time Password (TOTP) QR code setup with emergency recovery codes.
- **Social Login (OAuth 2.0):** Single sign-on with GitHub, GitLab, and X (Twitter).
- **Anti-Bot Defense:** Integrated Cloudflare Turnstile CAPTCHA.

---

## 🏗️ Architecture & Tech Stack

```
[Client (Inertia.js / React)]
         │
         ▼
[Application Load Balancer (ALB) + ACM SSL]
         │
         ▼
[Amazon ECS / EC2 (Nginx + PHP-FPM 8.5 App Container)]
   ├── MySQL 8.0 (Relational Entities: Projects, Tasks, Users)
   ├── Redis (Cache, Multi-Session Registry, Real-Time Presence)
   ├── Laravel Reverb (WebSocket Server on Port 8080)
   ├── Amazon DynamoDB (Chat Message Storage)
   ├── Cloudflare R2 / Amazon S3 (Media Storage)
   ├── Amazon Bedrock (Claude 3.5 Haiku Converse API)
   └── AWS Lambda (S3 Image Optimizer via Sharp)
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js 22+ (LTS)](https://nodejs.org/) & [NPM](https://www.npmjs.com/)
- [Composer](https://getcomposer.org/) (optional, included in Docker container)

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NgThePhong0608/project-management.git
   cd project-management
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Docker services:**
   ```bash
   docker compose up -d
   ```

4. **Initialize application:**
   ```bash
   # Generate application key
   docker compose exec app php artisan key:generate

   # Run database migrations and realistic enterprise seeders
   docker compose exec app php artisan migrate --seed --seeder=RealisticDataSeeder
   ```

5. **Start frontend assets (Vite dev server):**
   ```bash
   npm install
   npm run dev
   ```

6. **Access the application:**
   - Web App: `http://localhost:8088`
   - Reverb WebSocket: `ws://localhost:8080`
   - DynamoDB Local: `http://localhost:8000`

---

## ⚡ Serverless Microservices (`lambda/`)

The repository contains isolated AWS Lambda functions under the `lambda/` directory.

### Build and Package:
```bash
# Package functions into deployable zip archives under lambda/dist/
node lambda/scripts/package.js
```

### Deploy to AWS:
```bash
# Deploy to target AWS account and region
ENVIRONMENT=dev AWS_REGION=ap-southeast-1 node lambda/scripts/deploy.js
```

For more details, see [lambda/README.md](file:///home/phongnt/Desktop/personal/project-management/lambda/README.md).

---

## 🧪 Testing & Quality Assurance

Run the automated test suite and code style checkers:

```bash
# Run all PHPUnit tests inside Docker
docker compose exec -T app php artisan test

# Check code formatting with Laravel Pint
docker compose exec -T app ./vendor/bin/pint --test

# Run Prettier frontend linting
npm run lint

# Build production assets
npm run build
```

---

## 📄 License

This project is open-sourced software licensed under the [MIT License](LICENSE).

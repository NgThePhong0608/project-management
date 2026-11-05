<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RealisticDataSeeder extends Seeder
{
    /**
     * Run the realistic database seeds.
     */
    public function run(): void
    {
        $this->command?->info('Seeding realistic users, projects, tasks, and comments for Amazon Bedrock...');

        // 1. Setup Realistic Team Users
        $admin = User::firstOrCreate(
            ['email' => 'phongnt@example.com'],
            [
                'name' => 'PhongNT (Tech Lead)',
                'role' => 'admin',
                'password' => Hash::make('matkhau123Z@'),
                'email_verified_at' => now(),
            ]
        );

        $sarah = User::firstOrCreate(
            ['email' => 'sarah.jenkins@example.com'],
            [
                'name' => 'Sarah Jenkins (Engineering Manager)',
                'role' => 'manager',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $david = User::firstOrCreate(
            ['email' => 'david.tran@example.com'],
            [
                'name' => 'David Tran (Senior Backend)',
                'role' => 'member',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $elena = User::firstOrCreate(
            ['email' => 'elena.rostova@example.com'],
            [
                'name' => 'Elena Rostova (Frontend Lead)',
                'role' => 'member',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $alex = User::firstOrCreate(
            ['email' => 'alex.morgan@example.com'],
            [
                'name' => 'Alex Morgan (DevOps Architect)',
                'role' => 'member',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $lisa = User::firstOrCreate(
            ['email' => 'lisa.wang@example.com'],
            [
                'name' => 'Lisa Wang (QA Engineer)',
                'role' => 'member',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $michael = User::firstOrCreate(
            ['email' => 'michael.scott@example.com'],
            [
                'name' => 'Michael Scott (Product Manager)',
                'role' => 'manager',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $standardMember = User::firstOrCreate(
            ['email' => 'member@example.com'],
            [
                'name' => 'Member User (Fullstack)',
                'role' => 'member',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $team = [$admin, $sarah, $david, $elena, $alex, $lisa, $michael, $standardMember];

        // 2. Clear old dummy projects, tasks, and comments
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Comment::truncate();
        Task::truncate();
        DB::table('project_user')->truncate();
        Project::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 3. Realistic Projects Definition
        $projectsData = [
            [
                'name' => 'Enterprise Cloud Migration to AWS ECS & S3',
                'description' => 'Di chuyển toàn bộ kiến trúc hạ tầng từ monolithic EC2 sang cụm container hóa AWS ECS Fargate, phân tách lưu trữ asset tĩnh sang Amazon S3 & CloudFront CDN, và tối ưu hóa chi phí với Auto-scaling.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(35),
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
                'members' => [
                    [$admin->id, 'manager'],
                    [$alex->id, 'member'],
                    [$david->id, 'member'],
                    [$lisa->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'Setup Terraform modules for AWS VPC, ECS Cluster and ALB',
                        'description' => 'Viết mã Infrastructure as Code (Terraform) để khởi tạo mạng VPC 3-AZ, Private/Public Subnets, Application Load Balancer với SSL ACM và ECS Fargate Cluster.',
                        'status' => 'completed',
                        'priority' => 'high',
                        'due_date' => now()->subDays(5)->format('Y-m-d'),
                        'assigned_user_id' => $alex->id,
                    ],
                    [
                        'name' => 'Multi-stage Dockerfile optimization for PHP 8.2 & Nginx',
                        'description' => 'Tối ưu hóa Dockerfile 2-stage build để giảm dung lượng image từ 1.2GB xuống dưới 280MB. Thêm OPcache production settings và non-root user security.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(2)->format('Y-m-d'),
                        'assigned_user_id' => $alex->id,
                    ],
                    [
                        'name' => 'Implement S3 Presigned URLs for Direct Browser Uploads',
                        'description' => 'Tạo endpoint Laravel sinh Presigned URL từ S3 để client upload trực tiếp file đính kèm lớn (>20MB) mà không đi qua container Nginx/PHP, tránh nghẽn băng thông.',
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(6)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Migrate Session and Cache to AWS ElastiCache Redis Cluster',
                        'description' => 'Cấu hình SubdomainSessionManager kết nối cluster Redis ElastiCache có Multi-AZ Failover tự động và In-transit Encryption (TLS).',
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(10)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Configure CloudWatch Container Insights & Slack Alerting',
                        'description' => 'Thiết lập CloudWatch Alarms theo dõi CPU/Memory utilization > 80% và tỷ lệ lỗi 5xx trên ALB, tự động bắn thông báo khẩn cấp về kênh Slack DevOps.',
                        'status' => 'pending',
                        'priority' => 'medium',
                        'due_date' => now()->addDays(18)->format('Y-m-d'),
                        'assigned_user_id' => $alex->id,
                    ],
                    [
                        'name' => 'Load testing WebSocket Reverb with 5,000 concurrent connections',
                        'description' => 'Dùng k6 hoặc Artillery mô phỏng 5.000 user kết nối WebSocket đồng thời vào Reverb container để kiểm tra giới hạn RAM và độ trễ broadcast tin nhắn.',
                        'status' => 'pending',
                        'priority' => 'low',
                        'due_date' => now()->addDays(28)->format('Y-m-d'),
                        'assigned_user_id' => $lisa->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $alex->id,
                        'body' => '<p>Terraform modules for VPC and ALB have been applied successfully in <code>ap-southeast-1</code>. DNS wildcard <code>*.pm.ngthephong01.io.vn</code> is pointing to ALB correctly.</p>',
                    ],
                    [
                        'user_id' => $david->id,
                        'body' => '<p>Working on the presigned URL service now. I verified the CORS configuration on the S3 bucket to allow PUT requests from our subdomains.</p>',
                    ],
                ],
            ],

            [
                'name' => 'E-Commerce Mobile App & Checkout Experience v2',
                'description' => 'Phát triển ứng dụng mua sắm trực tuyến đa nền tảng với luồng thanh toán 1-click (Apple Pay, Google Pay, Stripe Elements), đồng bộ giỏ hàng thời gian thực và trải nghiệm UI/UX hiện đại.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(45),
                'created_by' => $sarah->id,
                'updated_by' => $sarah->id,
                'members' => [
                    [$sarah->id, 'manager'],
                    [$elena->id, 'member'],
                    [$david->id, 'member'],
                    [$standardMember->id, 'member'],
                    [$lisa->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'Figma Interactive Prototype for Mobile Checkout & Address Picker',
                        'description' => 'Thiết kế wireframe và prototype hoàn chỉnh trên Figma cho trang chi tiết giỏ hàng, chọn địa chỉ giao hàng và màn hình thanh toán nhanh.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(8)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                    [
                        'name' => 'Integrate Stripe Payment Sheet SDK & Apple Pay Webhook',
                        'description' => 'Tích hợp Stripe PaymentIntent API phía backend Laravel, xử lý webhook xác thực thanh toán thành công và tự động trừ tồn kho (inventory deduction).',
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(5)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Implement Real-time Cart Sync with Optimistic UI updates',
                        'description' => 'Sử dụng React Zustand store và Inertia để cập nhật số lượng giỏ hàng tức thì, tự động giải quyết xung đột khi khách mua hàng trên cả mobile app và desktop.',
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(12)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                    [
                        'name' => 'Automated Order Confirmation Email & SMS Notification via AWS SNS',
                        'description' => 'Tạo hàng đợi SQS để gửi email hóa đơn PDF tự động và gửi SMS mã vận đơn theo thời gian thực tới số điện thoại khách hàng.',
                        'status' => 'pending',
                        'priority' => 'medium',
                        'due_date' => now()->addDays(20)->format('Y-m-d'),
                        'assigned_user_id' => $standardMember->id,
                    ],
                    [
                        'name' => 'Fix Memory Leak in Infinite Product Scroll Grid',
                        'description' => 'Khắc phục hiện tượng giật lag và tràn RAM trên thiết bị Android tầm trung khi người dùng cuộn xem hơn 200 sản phẩm liên tục.',
                        'status' => 'pending',
                        'priority' => 'high',
                        'due_date' => now()->addDays(15)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $elena->id,
                        'body' => '<p>The checkout UI components are now integrated with shadcn/ui. Smooth transitions are confirmed on iOS simulator.</p>',
                    ],
                ],
            ],

            [
                'name' => 'AI-Powered Customer Support & Ticketing Copilot',
                'description' => 'Ứng dụng trí tuệ nhân tạo Amazon Bedrock vào quy trình chăm sóc khách hàng: Tự động phân loại mức độ khẩn cấp, tóm tắt nội dung khiếu nại và sinh câu trả lời mẫu cho nhân viên hỗ trợ.',
                'status' => 'pending',
                'due_date' => now()->addDays(60),
                'created_by' => $michael->id,
                'updated_by' => $michael->id,
                'members' => [
                    [$michael->id, 'manager'],
                    [$admin->id, 'manager'],
                    [$david->id, 'member'],
                    [$elena->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'Define REST API Specification for Support Ticket Lifecycle',
                        'description' => 'Soạn thảo OpenAPI (Swagger) spec cho luồng tạo ticket, assign agent, phản hồi trao đổi và cập nhật trạng thái (Open, Waiting on Customer, Resolved, Closed).',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(1)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Build Bedrock Converse Service for Sentiment & Intent Analysis',
                        'description' => 'Tích hợp AWS Bedrock (Claude 3.5 Haiku) để phân tích sắc thái khách hàng (Tức giận, Thắc mắc, Góp ý) và tự động gắn thẻ ưu tiên P1/P2/P3.',
                        'status' => 'pending',
                        'priority' => 'high',
                        'due_date' => now()->addDays(14)->format('Y-m-d'),
                        'assigned_user_id' => $admin->id,
                    ],
                    [
                        'name' => 'Interactive Customer Chat Widget with Echo WebSocket',
                        'description' => 'Xây dựng floating chat widget nhúng trên website khách hàng, kết nối kênh private channel Reverb để nhân viên và khách trò chuyện không độ trễ.',
                        'status' => 'pending',
                        'priority' => 'high',
                        'due_date' => now()->addDays(22)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                    [
                        'name' => 'Implement SLA Breach Warning & Automatic Escalation Rules',
                        'description' => 'Nếu ticket P1 không được phản hồi trong vòng 15 phút, hệ thống tự động bắn notification cảnh báo tới Manager và đổi màu cờ ưu tiên trên dashboard.',
                        'status' => 'pending',
                        'priority' => 'medium',
                        'due_date' => now()->addDays(30)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $michael->id,
                        'body' => '<p>Targeting to reduce first-response resolution time by 40% with Bedrock AI Copilot. Let’s focus on accuracy first.</p>',
                    ],
                ],
            ],

            [
                'name' => 'Cybersecurity Hardening & SOC 2 Compliance',
                'description' => 'Thực hiện rà soát lỗ hổng bảo mật toàn diện, kích hoạt xác thực hai yếu tố (2FA TOTP), mã hóa dữ liệu tĩnh (Encryption at Rest) và chuẩn hóa phân quyền RBAC.',
                'status' => 'completed',
                'due_date' => now()->subDays(5),
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
                'members' => [
                    [$admin->id, 'manager'],
                    [$alex->id, 'member'],
                    [$david->id, 'member'],
                    [$lisa->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'Two-Factor Authentication (2FA) via Google Authenticator & QR Code',
                        'description' => 'Triển khai luồng bật 2FA TOTP (RFC 6238), mã hóa secret key trong DB và sinh 8 mã khôi phục (recovery codes) dùng 1 lần.',
                        'status' => 'completed',
                        'priority' => 'high',
                        'due_date' => now()->subDays(20)->format('Y-m-d'),
                        'assigned_user_id' => $admin->id,
                    ],
                    [
                        'name' => 'Account Lockout Policy after 5 Failed Login Attempts',
                        'description' => 'Bảo vệ tài khoản người dùng trước tấn công Brute-force: tự động khóa tài khoản sau 5 lần nhập sai mật khẩu và gửi email hướng dẫn mở khóa.',
                        'status' => 'completed',
                        'priority' => 'high',
                        'due_date' => now()->subDays(15)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Enforce Content Security Policy (CSP) & Secure Cookies',
                        'description' => 'Cấu hình HTTP Security Headers: Strict-Transport-Security, X-Frame-Options: SAMEORIGIN, CSP ngăn chặn tấn công XSS và Clickjacking.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(10)->format('Y-m-d'),
                        'assigned_user_id' => $alex->id,
                    ],
                    [
                        'name' => 'Automated Vulnerability Scan with OWASP ZAP & Dependency Check',
                        'description' => 'Tích hợp bước quét bảo mật tự động vào GitHub Actions CI/CD để phát hiện các package lỗi thời hoặc có CVE nguy hiểm trước khi release.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(7)->format('Y-m-d'),
                        'assigned_user_id' => $lisa->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $admin->id,
                        'body' => '<p>All SOC 2 security controls passed verification. Security audit report has been filed and approved.</p>',
                    ],
                ],
            ],

            [
                'name' => 'Business Intelligence & Realtime KPI Dashboard',
                'description' => 'Xây dựng dashboard phân tích hiệu suất làm việc của team, tỷ lệ hoàn thành dự án, biểu đồ năng suất (Velocity Chart) và dự báo tiến độ theo thời gian thực.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(20),
                'created_by' => $sarah->id,
                'updated_by' => $sarah->id,
                'members' => [
                    [$sarah->id, 'manager'],
                    [$elena->id, 'member'],
                    [$david->id, 'member'],
                    [$michael->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'Build KPI Metric Cards with Tailwind & shadcn/ui',
                        'description' => 'Phát triển 3 thẻ KPI trực quan hiển thị nhiệm vụ Pending, In Progress, Completed kèm thanh đo phần trăm hoàn thành và tỷ số cá nhân/toàn team.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(1)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                    [
                        'name' => 'Optimize MySQL Aggregate Queries with Composite Indexes',
                        'description' => 'Thêm composite indexes cho các bảng `tasks(project_id, status)` và `comments(commentable_type, commentable_id)` để giảm query time dưới 15ms.',
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(4)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Export Workspace Monthly Summary to Excel & PDF',
                        'description' => 'Tạo chức năng xuất toàn bộ danh sách dự án, thành viên và trạng thái task ra file Excel (Laravel Excel) và PDF báo cáo cho ban giám đốc.',
                        'status' => 'pending',
                        'priority' => 'low',
                        'due_date' => now()->addDays(14)->format('Y-m-d'),
                        'assigned_user_id' => $standardMember->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $sarah->id,
                        'body' => '<p>The new shadcn KPI cards look fantastic on the Dashboard! Clean, responsive, and easy to read.</p>',
                    ],
                ],
            ],

            [
                'name' => 'Wildcard Subdomain Multi-Session & SSO Authentication',
                'description' => 'Hệ thống đăng nhập đồng thời nhiều tài khoản trên cùng trình duyệt qua wildcard subdomains (*.pm.example.com), chuyển đổi phiên tức thì không cần đăng xuất.',
                'status' => 'in_progress',
                'due_date' => now()->addDays(30),
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
                'members' => [
                    [$admin->id, 'manager'],
                    [$david->id, 'member'],
                    [$alex->id, 'member'],
                    [$elena->id, 'member'],
                ],
                'tasks' => [
                    [
                        'name' => 'SubdomainSessionManager driver fallback (Redis to Cookie/Database)',
                        'description' => 'Tách lớp quản lý session subdomain khỏi hardcoded Redis, tự động fallback an toàn sang cache store của môi trường hiện tại.',
                        'status' => 'completed',
                        'priority' => 'high',
                        'due_date' => now()->subDays(3)->format('Y-m-d'),
                        'assigned_user_id' => $admin->id,
                    ],
                    [
                        'name' => 'OAuth2 Socialite Login Integration (Google, GitHub, GitLab)',
                        'description' => 'Tích hợp Social Login cho phép liên kết tài khoản Google/GitHub vào user profile hiện tại, hỗ trợ đăng nhập 1-click.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(1)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                    [
                        'name' => 'Session Inactivity Auto-Logout Modal (Idle Timeout)',
                        'description' => 'Xây dựng popup cảnh báo khi người dùng không thao tác sau 15 phút, đếm ngược 60 giây trước khi tự động khóa phiên làm việc.',
                        'status' => 'completed',
                        'priority' => 'medium',
                        'due_date' => now()->subDays(2)->format('Y-m-d'),
                        'assigned_user_id' => $elena->id,
                    ],
                    [
                        'name' => 'Single Sign-Out across all active subdomain browser tabs',
                        'description' => "Khi người dùng chọn 'Đăng xuất tất cả thiết bị', hệ thống hủy toàn bộ session token trong cache và kích hoạt broadcast event đóng các tab khác.",
                        'status' => 'in_progress',
                        'priority' => 'high',
                        'due_date' => now()->addDays(8)->format('Y-m-d'),
                        'assigned_user_id' => $david->id,
                    ],
                ],
                'comments' => [
                    [
                        'user_id' => $david->id,
                        'body' => '<p>Multi-session switching is working seamlessly on wildcard subdomains. Testing edge case with 5 concurrent sessions.</p>',
                    ],
                ],
            ],
        ];

        // 4. Insert Projects, Members, Tasks, and Comments
        foreach ($projectsData as $pData) {
            $project = Project::create([
                'name' => $pData['name'],
                'description' => $pData['description'],
                'status' => $pData['status'],
                'due_date' => $pData['due_date'],
                'created_by' => $pData['created_by'],
                'updated_by' => $pData['updated_by'],
            ]);

            // Attach Members
            foreach ($pData['members'] as [$userId, $role]) {
                $project->members()->attach($userId, [
                    'role' => $role,
                    'added_by' => $pData['created_by'],
                ]);
            }

            // Create Tasks
            foreach ($pData['tasks'] as $tData) {
                Task::create([
                    'name' => $tData['name'],
                    'description' => $tData['description'],
                    'status' => $tData['status'],
                    'priority' => $tData['priority'],
                    'due_date' => $tData['due_date'],
                    'assigned_user_id' => $tData['assigned_user_id'],
                    'created_by' => $pData['created_by'],
                    'updated_by' => $pData['created_by'],
                    'project_id' => $project->id,
                ]);
            }

            // Create Project Comments
            if (! empty($pData['comments'])) {
                foreach ($pData['comments'] as $cData) {
                    Comment::create([
                        'user_id' => $cData['user_id'],
                        'commentable_type' => Project::class,
                        'commentable_id' => $project->id,
                        'body' => $cData['body'],
                    ]);
                }
            }
        }

        $this->command?->info('Realistic data seeded successfully! 6 realistic projects, 28 professional tasks, and comments created.');
    }
}

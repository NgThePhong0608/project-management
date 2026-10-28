<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class TurnstileService
{
    public function __construct(
        protected ?AwsNotificationService $awsNotificationService = null
    ) {}

    /**
     * Verify a Cloudflare Turnstile response token.
     */
    public function verify(?string $token, ?string $remoteIp = null): bool
    {
        if (! config('services.turnstile.enabled', true)) {
            return true;
        }

        $secretKey = config('services.turnstile.secret_key');
        if (empty($secretKey)) {
            Log::error('Cloudflare Turnstile is enabled but TURNSTILE_SECRET_KEY is not configured. Failing closed.');
            $this->awsNotificationService?->logToCloudWatch('TURNSTILE_MISCONFIGURED', [
                'reason' => 'MISSING_SECRET_KEY',
                'ip' => $remoteIp,
            ], 'ERROR');

            return false;
        }

        if (empty($token)) {
            $this->awsNotificationService?->logToCloudWatch('TURNSTILE_BOT_BLOCKED', [
                'reason' => 'MISSING_TOKEN',
                'ip' => $remoteIp,
            ], 'WARNING');

            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => $secretKey,
                    'response' => $token,
                    'remoteip' => $remoteIp,
                ]);

            $data = $response->json();
            $success = (bool) ($data['success'] ?? false);

            if (! $success) {
                $this->awsNotificationService?->logToCloudWatch('TURNSTILE_BOT_BLOCKED', [
                    'reason' => 'INVALID_TOKEN',
                    'error_codes' => $data['error-codes'] ?? [],
                    'ip' => $remoteIp,
                ], 'WARNING');
            }

            return $success;
        } catch (Throwable $e) {
            Log::warning('Cloudflare Turnstile verification request failed: '.$e->getMessage());

            return false;
        }
    }
}

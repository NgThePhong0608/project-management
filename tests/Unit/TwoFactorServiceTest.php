<?php

namespace Tests\Unit;

use App\Services\TwoFactorService;
use Tests\TestCase;

class TwoFactorServiceTest extends TestCase
{
    private TwoFactorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TwoFactorService;
    }

    public function test_generate_secret_key_returns_valid_base32_string(): void
    {
        $secret = $this->service->generateSecretKey(32);
        $this->assertEquals(32, strlen($secret));
        $this->assertMatchesRegularExpression('/^[A-Z2-7]{32}$/', $secret);
    }

    public function test_qr_code_url_format(): void
    {
        $url = $this->service->getQrCodeUrl('Project Management', 'user@example.com', 'JBSWY3DPEHPK3PXP');
        $this->assertStringStartsWith('otpauth://totp/Project%20Management:user%40example.com?', $url);
        $this->assertStringContainsString('secret=JBSWY3DPEHPK3PXP', $url);
        $this->assertStringContainsString('digits=6', $url);
    }

    public function test_generate_and_verify_code(): void
    {
        $secret = $this->service->generateSecretKey();

        // Calculate code using reflection or generate code directly
        $reflection = new \ReflectionClass($this->service);
        $method = $reflection->getMethod('calculateCode');
        $method->setAccessible(true);

        $decodeMethod = $reflection->getMethod('base32Decode');
        $decodeMethod->setAccessible(true);
        $binary = $decodeMethod->invoke($this->service, $secret);

        $timeSlice = (int) floor(time() / 30);
        $validCode = $method->invoke($this->service, $binary, $timeSlice);

        $this->assertTrue($this->service->verifyKey($secret, $validCode));
        $this->assertFalse($this->service->verifyKey($secret, $validCode === '000000' ? '999999' : '000000'));
        $this->assertFalse($this->service->verifyKey($secret, 'invalid'));
    }

    public function test_generate_recovery_codes(): void
    {
        $codes = $this->service->generateRecoveryCodes(8);
        $this->assertCount(8, $codes);
        foreach ($codes as $code) {
            $this->assertMatchesRegularExpression('/^[a-zA-Z0-9]{10}-[a-zA-Z0-9]{10}$/', $code);
        }
    }
}

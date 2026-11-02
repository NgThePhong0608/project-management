<?php

namespace Tests\Unit;

use Tests\TestCase;

class AwsModeConfigTest extends TestCase
{
    public function test_cloudflare_r2_disk_is_properly_configured(): void
    {
        $r2Config = config('filesystems.disks.r2');

        $this->assertIsArray($r2Config);
        $this->assertEquals('s3', $r2Config['driver']);
        $this->assertEquals('auto', $r2Config['region']);
        $this->assertFalse($r2Config['use_path_style_endpoint']);
    }

    public function test_s3_disk_is_properly_configured(): void
    {
        $s3Config = config('filesystems.disks.s3');

        $this->assertIsArray($s3Config);
        $this->assertEquals('s3', $s3Config['driver']);
        $this->assertEquals('ap-southeast-1', $s3Config['region']);
    }

    public function test_aws_service_mode_is_configured(): void
    {
        $this->assertNotEmpty(config('services.aws.mode'));
    }
}

<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SubdomainSessionManager
{
    public const MAX_SESSIONS = 5;

    public const CACHE_PREFIX = 'device_sessions:';

    public const REVOCATION_PREFIX = 'device_revoked_all:';

    public const ENABLED_PREFIX = 'multi_session_enabled:';

    public const TRANSFER_PREFIX = 'session_transfer:';

    public const TRANSFER_TTL = 60; // 60 seconds

    public const CACHE_TTL = 86400 * 7; // 7 days

    /**
     * Create a single-use authenticated transfer token for cross-subdomain handover.
     */
    public function createTransferToken(string $deviceId): string
    {
        $token = Str::random(40);
        $this->cache()->put(self::TRANSFER_PREFIX.$token, $deviceId, self::TRANSFER_TTL);

        return $token;
    }

    /**
     * Consume an authenticated transfer token and return the associated device ID.
     */
    public function consumeTransferToken(string $token): ?string
    {
        $deviceId = $this->cache()->pull(self::TRANSFER_PREFIX.$token);

        return is_string($deviceId) && ! empty($deviceId) ? $deviceId : null;
    }

    /**
     * Check if multi-session feature is currently enabled for this device.
     */
    public function isMultiSessionEnabled(string $deviceId): bool
    {
        return (bool) $this->cache()->get(self::ENABLED_PREFIX.$deviceId, false);
    }

    /**
     * Enable multi-session feature for this device.
     */
    public function enableMultiSession(string $deviceId): void
    {
        $this->cache()->put(self::ENABLED_PREFIX.$deviceId, true, self::CACHE_TTL);
    }

    /**
     * Disable multi-session feature for this device and revoke all existing sessions.
     */
    public function disableMultiSession(string $deviceId): void
    {
        $this->terminateAllSessions($deviceId);
        $this->cache()->put(self::ENABLED_PREFIX.$deviceId, false, self::CACHE_TTL);
    }

    /**
     * Generate a unique subdomain slug for a user, e.g. 1001-a1b2
     */
    public function generateSlug(User $user): string
    {
        return $user->id.'-'.Str::lower(Str::random(4));
    }

    /**
     * Get the Redis cache key for a specific device identifier.
     */
    protected function getCacheKey(string $deviceId): string
    {
        return self::CACHE_PREFIX.$deviceId;
    }

    /**
     * Check if the device has reached the maximum concurrent sessions limit (5).
     */
    public function isAtSessionLimit(string $deviceId): bool
    {
        return count($this->getActiveSessions($deviceId)) >= self::MAX_SESSIONS;
    }

    /**
     * Get cache store instance based on application configuration.
     */
    protected function cache()
    {
        return Cache::store();
    }

    /**
     * Retrieve all active subdomain sessions for a device from Redis.
     */
    public function getActiveSessions(string $deviceId): array
    {
        $sessions = $this->cache()->get($this->getCacheKey($deviceId));

        return is_array($sessions) ? $sessions : [];
    }

    /**
     * Check if a specific session slug is currently active for this device.
     */
    public function isSessionActive(string $deviceId, string $slug): bool
    {
        $sessions = $this->getActiveSessions($deviceId);

        return isset($sessions[$slug]);
    }

    /**
     * Check if a session was revoked either via terminate-all or individual termination.
     */
    public function isSessionRevoked(string $deviceId, string $slug, float|int|null $loginTime = null): bool
    {
        $revokedAllAt = $this->cache()->get(self::REVOCATION_PREFIX.$deviceId);
        if ($revokedAllAt !== null && $loginTime !== null && (float) $loginTime <= (float) $revokedAllAt) {
            return true;
        }

        $terminatedAt = $this->cache()->get("terminated_session:{$deviceId}:{$slug}");
        if ($terminatedAt !== null) {
            if ($terminatedAt === true) {
                return true;
            }
            if ($loginTime !== null && (float) $loginTime <= (float) $terminatedAt) {
                return true;
            }
        }

        return false;
    }

    /**
     * Clear termination marker for a session slug upon fresh authentication.
     */
    public function clearSessionTermination(string $deviceId, string $slug): void
    {
        $this->cache()->forget("terminated_session:{$deviceId}:{$slug}");
    }

    /**
     * Unregister a session slug upon voluntary logout without setting a termination tombstone.
     */
    public function unregisterSession(string $deviceId, string $slug): void
    {
        $sessions = $this->getActiveSessions($deviceId);
        unset($sessions[$slug]);

        $this->cache()->forget("terminated_session:{$deviceId}:{$slug}");
        $this->cache()->put($this->getCacheKey($deviceId), $sessions, self::CACHE_TTL);
    }

    /**
     * Register or update an active session under the device in Redis.
     * Enforces the MAX_SESSIONS limit by evicting the oldest session if exceeded.
     */
    public function registerSession(string $deviceId, string $slug, User $user, ?string $host = null): array
    {
        $sessions = $this->getActiveSessions($deviceId);

        // If at limit and registering a new session slug, evict the oldest
        if (! isset($sessions[$slug]) && count($sessions) >= self::MAX_SESSIONS) {
            // Sort by last_active_at ascending to find oldest
            uasort($sessions, fn ($a, $b) => ($a['last_active_at'] ?? 0) <=> ($b['last_active_at'] ?? 0));
            $oldestSlug = array_key_first($sessions);
            unset($sessions[$oldestSlug]);
        }

        $sessions[$slug] = [
            'slug' => $slug,
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'avatar_url' => $user->avatar_url,
            'host' => $host,
            'created_at' => $sessions[$slug]['created_at'] ?? time(),
            'last_active_at' => time(),
        ];

        $this->cache()->forget("terminated_session:{$deviceId}:{$slug}");
        $this->cache()->put($this->getCacheKey($deviceId), $sessions, self::CACHE_TTL);

        return $sessions[$slug];
    }

    /**
     * Terminate a specific session slug for this device.
     */
    public function terminateSession(string $deviceId, string $slug): void
    {
        $sessions = $this->getActiveSessions($deviceId);
        unset($sessions[$slug]);

        $this->cache()->put("terminated_session:{$deviceId}:{$slug}", microtime(true), self::CACHE_TTL);
        $this->cache()->put($this->getCacheKey($deviceId), $sessions, self::CACHE_TTL);
    }

    /**
     * Terminate all subdomain sessions for this device.
     */
    public function terminateAllSessions(string $deviceId): void
    {
        $this->cache()->put(self::REVOCATION_PREFIX.$deviceId, microtime(true), self::CACHE_TTL);
        $this->cache()->forget($this->getCacheKey($deviceId));
    }
}

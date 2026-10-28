import { useState, useEffect, useRef, useCallback } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import { ClockIcon } from "@heroicons/react/24/outline";

const STORAGE_KEY = "pm_last_activity_at";
const SERVER_PING_STORAGE_KEY = "pm_last_server_ping_at";

export default function IdleLogoutModal() {
  const { auth } = usePage().props;
  const idleTimeoutMinutes = Number(auth?.sessionIdleTimeout ?? 15);
  const totalIdleSeconds = idleTimeoutMinutes * 60;
  const warningThresholdSeconds = Math.min(
    60,
    Math.max(15, Math.floor(totalIdleSeconds / 3)),
  );
  // Ping server at most once every 2 minutes (or 1/3 of idle timeout if shorter) while user is active
  const serverPingIntervalMs = Math.max(
    15000,
    Math.min(120000, Math.floor((totalIdleSeconds * 1000) / 3)),
  );

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    warningThresholdSeconds,
  );

  const lastActivityRef = useRef(Date.now());
  const lastServerPingRef = useRef(Date.now());
  const isLoggingOutRef = useRef(false);
  const showWarningRef = useRef(false);

  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const pingServerKeepAlive = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastServerPingRef.current < serverPingIntervalMs) {
        return;
      }

      lastServerPingRef.current = now;
      try {
        localStorage.setItem(SERVER_PING_STORAGE_KEY, String(now));
      } catch {
        // Ignore storage errors
      }

      axios.post(route("session.keepAlive")).catch(() => {
        // Ignore transient network errors; next activity or interval will handle expiry
      });
    },
    [serverPingIntervalMs],
  );

  const recordActivity = useCallback(
    (forceServerPing = false) => {
      const now = Date.now();
      lastActivityRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // Ignore storage errors in private mode
      }

      pingServerKeepAlive(forceServerPing);
    },
    [pingServerKeepAlive],
  );

  const triggerIdleLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarning(false);

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SERVER_PING_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }

    router.post(
      route("logout"),
      { reason: "idle" },
      {
        onError: () => {
          window.location.href = route("login");
        },
      },
    );
  }, []);

  const handleStayLoggedIn = () => {
    recordActivity(true);
    setShowWarning(false);
    setRemainingSeconds(warningThresholdSeconds);
  };

  useEffect(() => {
    if (!auth?.user || idleTimeoutMinutes <= 0) {
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastServerPingRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
      localStorage.setItem(SERVER_PING_STORAGE_KEY, String(now));
    } catch {
      // Ignore storage errors
    }

    let lastThrottle = 0;
    const handleUserEvent = () => {
      // Once the warning modal is visible, require explicit button click to stay logged in
      if (showWarningRef.current || isLoggingOutRef.current) {
        return;
      }
      const currentTime = Date.now();
      if (currentTime - lastThrottle > 1000) {
        lastThrottle = currentTime;
        recordActivity(false);
      }
    };

    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const syncedTime = Number(event.newValue);
        if (!Number.isNaN(syncedTime) && syncedTime > lastActivityRef.current) {
          lastActivityRef.current = syncedTime;
          if (showWarningRef.current) {
            setShowWarning(false);
          }
        }
      } else if (event.key === SERVER_PING_STORAGE_KEY && event.newValue) {
        const syncedPing = Number(event.newValue);
        if (
          !Number.isNaN(syncedPing) &&
          syncedPing > lastServerPingRef.current
        ) {
          lastServerPingRef.current = syncedPing;
        }
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleUserEvent, { passive: true }),
    );
    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const elapsedSeconds = Math.floor(
        (Date.now() - lastActivityRef.current) / 1000,
      );
      const secondsLeft = totalIdleSeconds - elapsedSeconds;

      if (secondsLeft <= 0) {
        triggerIdleLogout();
      } else if (secondsLeft <= warningThresholdSeconds) {
        setRemainingSeconds(secondsLeft);
        if (!showWarningRef.current) {
          setShowWarning(true);
        }
      } else if (showWarningRef.current) {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleUserEvent),
      );
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [
    auth?.user,
    idleTimeoutMinutes,
    totalIdleSeconds,
    warningThresholdSeconds,
    recordActivity,
    triggerIdleLogout,
  ]);

  return (
    <Modal show={showWarning} maxWidth="md" closeable={false}>
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 p-3 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <ClockIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Session Expiring Soon
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              You have been inactive for a while. For your security, you will be
              automatically logged out in{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {remainingSeconds}s
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <SecondaryButton onClick={triggerIdleLogout}>
            Log Out Now
          </SecondaryButton>
          <PrimaryButton onClick={handleStayLoggedIn}>
            Stay Logged In
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

import { useEffect, useRef } from "react";
import { usePage } from "@inertiajs/react";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function TurnstileWidget({ onVerify, onExpire, resetKey = 0 }) {
  const { turnstile } = usePage().props;
  const enabled = turnstile?.enabled ?? true;
  const siteKey =
    turnstile?.siteKey || import.meta.env.VITE_TURNSTILE_SITE_KEY || null;

  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!enabled || !siteKey) {
      return;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) {
        return;
      }

      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => {
          onVerify?.(token);
        },
        "expired-callback": () => {
          onVerify?.("");
          onExpire?.();
        },
        "error-callback": () => {
          onVerify?.("");
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (!script) {
        script = document.createElement("script");
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const handleLoad = () => renderWidget();
      script.addEventListener("load", handleLoad);

      return () => {
        isMounted = false;
        script.removeEventListener("load", handleLoad);
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // Ignore cleanup errors
          }
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [enabled, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Ignore reset errors
      }
    }
  }, [resetKey]);

  if (!enabled || !siteKey) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col items-start">
      <div ref={containerRef} />
    </div>
  );
}

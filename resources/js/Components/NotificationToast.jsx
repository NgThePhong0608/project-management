import { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import axios from "axios";
import {
  BellAlertIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function NotificationToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleNotification = (event) => {
      const payload = event.detail;
      const data = payload?.data || payload;

      setToast({
        id: payload?.id,
        type: data?.type || "task",
        title: data?.title || "Task Assigned",
        taskId: data?.task_id,
        taskName: data?.task_name || data?.title || "New Notification",
        projectName: data?.project_name || "Project",
        assignedBy: data?.assigned_by || "Admin",
        priority: data?.priority,
        message: data?.message || "You have been assigned to a new task.",
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setToast(null);
      }, 6000);
    };

    window.addEventListener("app:notification-received", handleNotification);

    return () => {
      window.removeEventListener(
        "app:notification-received",
        handleNotification,
      );
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(null);
  };

  const handleView = async () => {
    if (!toast) return;

    if (toast.id) {
      try {
        await axios.post(route("notifications.read", toast.id));
        window.dispatchEvent(
          new CustomEvent("app:notification-marked-read", {
            detail: { id: toast.id },
          }),
        );
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    const taskId = toast.taskId;
    const notifId = toast.id;
    handleDismiss();

    if (taskId) {
      router.visit(route("task.show", taskId));
    } else if (notifId && !String(notifId).startsWith("realtime-")) {
      router.visit(route("notifications.show", notifId));
    }
  };

  if (!toast) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-blue-900/50 p-4 transition-all duration-300 transform translate-y-0"
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5 p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
          <BellAlertIcon className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {toast.title || "Task Assigned"}
            </p>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 truncate">
            {toast.taskName}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {toast.message}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate max-w-[150px]">
              {toast.projectName}
            </span>

            {(toast.taskId || toast.id) && (
              <button
                onClick={handleView}
                className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
              >
                <span>{toast.taskId ? "View Task" : "View Details"}</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

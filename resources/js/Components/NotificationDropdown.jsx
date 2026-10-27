import { useState, useEffect, useRef } from "react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import {
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function NotificationDropdown() {
  const { auth } = usePage().props;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(
    auth?.unreadNotificationsCount || 0,
  );
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const dropdownRef = useRef(null);

  // Sync unreadCount if auth props change
  useEffect(() => {
    if (auth?.unreadNotificationsCount !== undefined) {
      setUnreadCount(auth.unreadNotificationsCount);
    }
  }, [auth?.unreadNotificationsCount]);

  // Synchronize real-time events across dropdown instances
  useEffect(() => {
    const handleReceived = (event) => {
      const payload = event.detail;
      const data = payload?.data || payload;
      const newNotif = {
        id: payload?.id || `realtime-${Date.now()}`,
        data: data,
        read_at: payload?.read_at || null,
        created_at: payload?.created_at || new Date().toISOString(),
      };

      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) {
          return prev;
        }
        return [newNotif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      setHasNew(true);
      setTimeout(() => setHasNew(false), 2000);
    };

    const handleRead = (event) => {
      const readId = event.detail?.id;
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === readId
            ? { ...n, read_at: n.read_at || new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleReadAll = () => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    };

    window.addEventListener("app:notification-received", handleReceived);
    window.addEventListener("app:notification-marked-read", handleRead);
    window.addEventListener("app:notification-marked-all-read", handleReadAll);

    return () => {
      window.removeEventListener("app:notification-received", handleReceived);
      window.removeEventListener("app:notification-marked-read", handleRead);
      window.removeEventListener(
        "app:notification-marked-all-read",
        handleReadAll,
      );
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get(route("notifications.index"));
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id, taskId, event) => {
    event?.preventDefault();
    try {
      await axios.post(route("notifications.read", id));
      window.dispatchEvent(
        new CustomEvent("app:notification-marked-read", {
          detail: { id },
        }),
      );
      setOpen(false);
      if (taskId) {
        router.visit(route("task.show", taskId));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async (event) => {
    event?.stopPropagation();
    try {
      await axios.post(route("notifications.readAll"));
      window.dispatchEvent(new CustomEvent("app:notification-marked-all-read"));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full focus:outline-none transition duration-150 ease-in-out"
        aria-label="Notifications"
      >
        <BellIcon
          className={`h-6 w-6 transition-transform duration-300 ${
            hasNew ? "animate-bounce text-blue-500" : ""
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-gray-800 shadow-2xl ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50 overflow-hidden transition ease-out duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center">
                <CheckCircleIcon className="w-10 h-10 mb-2 stroke-1 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.read_at;
                return (
                  <div
                    key={item.id}
                    onClick={(e) =>
                      handleMarkAsRead(item.id, item.data?.task_id, e)
                    }
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150 flex items-start space-x-3 ${
                      isUnread
                        ? "bg-blue-50/50 dark:bg-blue-950/20"
                        : "bg-white dark:bg-gray-800"
                    }`}
                  >
                    {/* Unread indicator dot */}
                    <div className="mt-1.5 flex-shrink-0">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          isUnread
                            ? "bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900"
                            : "bg-transparent"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.data?.task_name || "New Task"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {item.data?.message ||
                          "You have been assigned to a task"}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {item.data?.project_name && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {item.data.project_name}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {item.created_at}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

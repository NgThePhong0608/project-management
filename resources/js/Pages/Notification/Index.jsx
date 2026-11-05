import React, { useState, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import Pagination from "@/Components/Pagination";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  Clock,
  Filter,
} from "lucide-react";
import axios from "axios";

export default function Index({
  auth,
  notifications,
  unreadCount: initialUnreadCount = 0,
  filter = "all",
  success,
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState(notifications?.data || []);

  useEffect(() => {
    setItems(notifications?.data || []);
  }, [notifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Real-time notification synchronization
  useEffect(() => {
    const handleReceived = (event) => {
      const payload = event.detail;
      const data = payload?.data || payload;
      const newNotif = {
        id: payload?.id || `realtime-${Date.now()}`,
        data: data,
        read_at: payload?.read_at || null,
        created_at: payload?.created_at || new Date().toISOString(),
        created_at_human: "Just now",
      };

      setItems((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleRead = (event) => {
      const readId = event.detail?.id;
      setItems((prev) =>
        prev.map((n) =>
          n.id === readId
            ? { ...n, read_at: n.read_at || new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleReadAll = () => {
      setItems((prev) =>
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

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const isPersistedId = id && !String(id).startsWith("realtime-");

    try {
      if (isPersistedId) {
        await axios.post(route("notifications.read", id));
      }
      setItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read_at: n.read_at || new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(
        new CustomEvent("app:notification-marked-read", {
          detail: { id },
        }),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = () => {
    router.post(
      route("notifications.readAll"),
      {},
      {
        preserveScroll: true,
        onSuccess: () => {
          setItems((prev) =>
            prev.map((n) => ({
              ...n,
              read_at: n.read_at || new Date().toISOString(),
            })),
          );
          setUnreadCount(0);
          window.dispatchEvent(
            new CustomEvent("app:notification-marked-all-read"),
          );
        },
      },
    );
  };

  const handleFilterChange = (newFilter) => {
    router.get(
      route("notifications.index", { filter: newFilter }),
      {},
      { preserveState: true },
    );
  };

  const getItemTargetUrl = (item) => {
    if (item.data?.target_url) return item.data.target_url;
    if (item.data?.task_id) return route("task.show", item.data.task_id);
    if (item.id && !String(item.id).startsWith("realtime-")) {
      return route("notifications.show", item.id);
    }
    return "#";
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center gap-2.5">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="rounded-full text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      }
    >
      <Head title="Notifications" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 py-2.5 px-4 rounded-lg text-sm font-medium">
            {success}
          </div>
        )}

        <Card className="shadow-sm overflow-hidden">
          {/* Card Header with Filters & Actions */}
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-semibold">
                  Notification Center
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Stay updated with task assignments, mentions, comments, and
                project activities.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Tabs */}
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleFilterChange("all")}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    filter === "all"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("unread")}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    filter === "unread"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("read")}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    filter === "read"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Read
                </button>
              </div>

              {/* Mark all as read button */}
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark all as read</span>
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Notifications List Content */}
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-3">
                  <BellOff className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  No notifications found
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                  {filter === "unread"
                    ? "You are all caught up! No unread notifications right now."
                    : "You do not have any notifications in this list yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {items.map((item) => {
                  const isUnread = !item.read_at;
                  const isSecurity = item.data?.type === "security";
                  const targetUrl = getItemTargetUrl(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (targetUrl !== "#") {
                          router.visit(targetUrl);
                        }
                      }}
                      className={`group relative p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition-all duration-150 ${
                        isUnread
                          ? "bg-indigo-50/50 dark:bg-indigo-950/25 border-l-4 border-l-indigo-600 dark:border-l-indigo-500 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40"
                          : "bg-white dark:bg-gray-800/60 border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/90"
                      }`}
                    >
                      {/* Left Status Icon / Dot */}
                      <div className="pt-0.5 shrink-0">
                        {isSecurity ? (
                          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                        ) : (
                          <div
                            className={`h-3 w-3 rounded-full mt-1.5 transition-transform group-hover:scale-110 ${
                              isUnread
                                ? "bg-indigo-600 ring-4 ring-indigo-200 dark:ring-indigo-900/60"
                                : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                        )}
                      </div>

                      {/* Notification Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                          <h4
                            className={`text-sm truncate ${
                              isUnread
                                ? "font-semibold text-gray-900 dark:text-white"
                                : "font-medium text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {item.data?.task_name ||
                              item.data?.title ||
                              "Workspace Notification"}
                          </h4>

                          <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>
                              {item.created_at_human || item.created_at}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                          {item.data?.message ||
                            "You have a new workspace activity update."}
                        </p>

                        {/* Badges / Context Tags */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {item.data?.project_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50">
                              {item.data.project_name}
                            </span>
                          )}

                          {isUnread ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Unread
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              Read
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Quick Actions (visible on hover) */}
                      <div className="shrink-0 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                            onClick={(e) => handleMarkAsRead(e, item.id)}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Mark read</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          title="Open details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {notifications?.links && notifications.links.length > 3 && (
          <div className="flex justify-center pt-2">
            <Pagination links={notifications.links} />
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

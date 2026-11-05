import { useState, useEffect } from "react";
import HeadlessSidebar from "@/Components/Sidebar/HeadlessSidebar";
import SubdomainAccountSwitcher from "@/Components/SubdomainAccountSwitcher";
import NotificationDropdown from "@/Components/NotificationDropdown";
import NotificationToast from "@/Components/NotificationToast";
import ChatToast from "@/Components/ChatToast";
import IdleLogoutModal from "@/Components/IdleLogoutModal";
import { Link, usePage } from "@inertiajs/react";
import {
  ChatBubbleLeftRightIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import axios from "axios";

export default function Authenticated({ user, header, children }) {
  const { auth } = usePage().props;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pm_sidebar_collapsed") === "true";
    }
    return false;
  });

  const [unreadChatCount, setUnreadChatCount] = useState(
    auth?.unreadChatCount || 0,
  );

  const currentUser = user || auth?.user;
  const currentUserId = currentUser?.id;

  // Initial fetch of unread chat messages count
  useEffect(() => {
    let isMounted = true;
    axios
      .get(route("chat.unreadCount"))
      .then((res) => {
        if (isMounted && typeof res.data?.unread_count === "number") {
          setUnreadChatCount(res.data.unread_count);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to unread count updates and active conversation change events
  useEffect(() => {
    const handleUnreadCountUpdated = (event) => {
      if (typeof event?.detail?.unread_count === "number") {
        setUnreadChatCount(event.detail.unread_count);
      } else if (typeof event?.detail?.count === "number") {
        setUnreadChatCount(event.detail.count);
      } else if (typeof event?.detail?.decrement === "number") {
        setUnreadChatCount((prev) =>
          Math.max(0, prev - event.detail.decrement),
        );
      } else {
        axios
          .get(route("chat.unreadCount"))
          .then((res) => {
            if (typeof res.data?.unread_count === "number") {
              setUnreadChatCount(res.data.unread_count);
            }
          })
          .catch(() => {});
      }
    };

    const handleConversationSelected = (event) => {
      if (event?.detail?.conversationId !== undefined) {
        window.__activeChatConversationId = event.detail.conversationId;
      }
    };

    window.addEventListener(
      "chat:unread-count-updated",
      handleUnreadCountUpdated,
    );
    window.addEventListener(
      "chat:conversation-selected",
      handleConversationSelected,
    );

    return () => {
      window.removeEventListener(
        "chat:unread-count-updated",
        handleUnreadCountUpdated,
      );
      window.removeEventListener(
        "chat:conversation-selected",
        handleConversationSelected,
      );
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !window.Echo) {
      return;
    }

    const channelName = `App.Models.User.${currentUserId}`;
    const channel = window.Echo.private(channelName);

    channel.notification((notification) => {
      window.dispatchEvent(
        new CustomEvent("app:notification-received", {
          detail: notification,
        }),
      );
    });

    channel.listen(".message.sent", (event) => {
      const messageSenderId =
        event?.message?.user_id || event?.message?.sender_id;
      if (
        messageSenderId &&
        Number(messageSenderId) === Number(currentUserId)
      ) {
        return;
      }

      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
      const isChatPage =
        currentPath.startsWith("/chat") ||
        (typeof route === "function" && route().current("chat.*"));

      const urlParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const urlConvId =
        urlParams?.get("conversation_id") || urlParams?.get("conversation");
      const activeConvId =
        (typeof window !== "undefined" && window.__activeChatConversationId) ||
        (urlConvId ? Number(urlConvId) : null);

      const messageConvId =
        event?.message?.conversation_id || event?.conversation?.id;
      const isViewingActiveConv = Boolean(
        isChatPage &&
        activeConvId &&
        messageConvId &&
        Number(activeConvId) === Number(messageConvId),
      );

      if (!isViewingActiveConv) {
        setUnreadChatCount((prev) => prev + 1);
        window.dispatchEvent(
          new CustomEvent("app:chat-toast", {
            detail: event,
          }),
        );
      }

      window.dispatchEvent(
        new CustomEvent("chat:message-received", {
          detail: event,
        }),
      );
    });

    channel.listen(".chat.member.removed", (event) => {
      window.dispatchEvent(
        new CustomEvent("chat:member-removed", {
          detail: event,
        }),
      );
    });

    return () => {
      channel.stopListening(".message.sent");
      channel.stopListening(".chat.member.removed");
      channel.stopListening(
        ".Illuminate\\Notifications\\Events\\BroadcastNotificationCreated",
      );
      window.Echo.leave(channelName);
    };
  }, [currentUserId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Headless UI Left Sidebar */}
      <HeadlessSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        unreadChatCount={unreadChatCount}
      />

      {/* Main Column */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur px-4 sm:px-6 lg:px-8 shadow-sm">
          {/* Left: Mobile Toggle & Page Title / Header */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {header ? (
              <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate">
                {header}
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Workspace Overview
              </div>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={route("chat.index")}
              className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Messages & Chat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                  {unreadChatCount > 9 ? "9+" : unreadChatCount}
                </span>
              )}
            </Link>

            <NotificationDropdown />

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            <SubdomainAccountSwitcher auth={auth} />
          </div>
        </header>

        {/* 2FA Warning Banner */}
        {currentUser && !currentUser.has_mfa && (
          <div className="bg-amber-600 text-white px-4 py-2.5 shadow-sm border-b border-amber-700">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
              <div className="flex items-center space-x-2.5">
                <svg
                  className="w-5 h-5 flex-shrink-0 text-amber-100"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  <strong className="font-semibold">Security Warning:</strong>{" "}
                  Two-Factor Authentication (2FA) is not enabled on your
                  account. You have logged in{" "}
                  {currentUser.mfa_unconfigured_login_count ?? 0}/5 times
                  without 2FA. Your account will be locked after 5 logins.
                </span>
              </div>
              <Link
                href={route("profile.edit")}
                className="inline-flex items-center px-3 py-1 bg-white text-amber-900 rounded font-semibold text-xs hover:bg-amber-50 uppercase tracking-wider transition shrink-0"
              >
                Set Up 2FA
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <NotificationToast />
      <ChatToast />
      <IdleLogoutModal />
    </div>
  );
}

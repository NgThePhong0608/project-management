import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/Components/ui/sidebar";
import ShadcnSidebar from "@/Components/Sidebar";
import SubdomainAccountSwitcher from "@/Components/SubdomainAccountSwitcher";
import NotificationDropdown from "@/Components/NotificationDropdown";
import NotificationToast from "@/Components/NotificationToast";
import ChatToast from "@/Components/ChatToast";
import IdleLogoutModal from "@/Components/IdleLogoutModal";
import { Link, usePage } from "@inertiajs/react";
import { MessageSquare } from "lucide-react";
import axios from "axios";

export default function Authenticated({ user, header, children }) {
  const { auth } = usePage().props;
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
        {/* shadcn/ui Sidebar */}
        <ShadcnSidebar unreadChatCount={unreadChatCount} />

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-sm">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              {/* Left Title / Breadcrumb */}
              <div className="flex items-center gap-3 min-w-0">
                <SidebarTrigger />
                {header ? (
                  <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {header}
                  </div>
                ) : (
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Workspace Overview
                  </div>
                )}
              </div>

              {/* Right: Quick Actions with balanced margins */}
              <div className="flex items-center gap-3">
                <Link
                  href={route("chat.index")}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  title="Messages & Chat"
                >
                  <MessageSquare className="h-4 w-4" />
                  {unreadChatCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                      {unreadChatCount > 9 ? "9+" : unreadChatCount}
                    </span>
                  )}
                </Link>

                <NotificationDropdown />

                <div className="h-5 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

                <SubdomainAccountSwitcher auth={auth} />
              </div>
            </div>
          </header>

          {/* 2FA Warning Banner */}
          {currentUser && !currentUser.has_mfa && (
            <div className="bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 px-4 py-2.5 text-xs">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>
                  <strong>Security Alert:</strong> Two-Factor Authentication is
                  not enabled. ({currentUser.mfa_unconfigured_login_count ?? 0}
                  /5 logins used).
                </span>
                <Link
                  href={route("profile.edit")}
                  className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 transition shrink-0"
                >
                  Enable 2FA
                </Link>
              </div>
            </div>
          )}

          {/* Page Content - clean without double padding */}
          <main className="flex-1">{children}</main>
        </div>
      </div>

      <NotificationToast />
      <ChatToast />
      <IdleLogoutModal />
    </SidebarProvider>
  );
}

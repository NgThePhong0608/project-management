import { useState, useEffect } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import Dropdown from "@/Components/Dropdown";
import NavLink from "@/Components/NavLink";
import NotificationDropdown from "@/Components/NotificationDropdown";
import NotificationToast from "@/Components/NotificationToast";
import ChatToast from "@/Components/ChatToast";
import IdleLogoutModal from "@/Components/IdleLogoutModal";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { Link, usePage } from "@inertiajs/react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import axios from "axios";

export default function Authenticated({ user, header, children }) {
  const { auth } = usePage().props;
  const [showingNavigationDropdown, setShowingNavigationDropdown] =
    useState(false);
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
      // Ignore messages sent by current user
      const messageSenderId =
        event?.message?.user_id || event?.message?.sender_id;
      if (
        messageSenderId &&
        Number(messageSenderId) === Number(currentUserId)
      ) {
        return;
      }

      // Check if user is actively viewing this specific conversation
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

      // Always dispatch chat:message-received so Chat/Index or other components can update
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="shrink-0 flex items-center">
                <Link href="/">
                  <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-gray-200" />
                </Link>
              </div>

              <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                <NavLink
                  href={route("dashboard")}
                  active={route().current("dashboard")}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  href={route("project.index")}
                  active={route().current("project.index")}
                >
                  Project
                </NavLink>
                <NavLink
                  href={route("task.index")}
                  active={route().current("task.index")}
                >
                  Tasks
                </NavLink>
                <NavLink
                  href={route("chat.index")}
                  active={route().current("chat.*")}
                >
                  Messages
                  {unreadChatCount > 0 && (
                    <span className="ms-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {unreadChatCount > 9 ? "9+" : unreadChatCount}
                    </span>
                  )}
                </NavLink>
                {auth?.can?.manageUsers && (
                  <NavLink
                    href={route("user.index")}
                    active={route().current("user.index")}
                  >
                    Users
                  </NavLink>
                )}
              </div>
            </div>

            <div className="hidden sm:flex sm:items-center sm:ms-6">
              <Link
                href={route("chat.index")}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition me-1"
                title="Messages & Chat"
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform duration-200">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </Link>
              <NotificationDropdown />
              <div className="ms-3 relative">
                <Dropdown>
                  <Dropdown.Trigger>
                    <span className="inline-flex rounded-md">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="h-7 w-7 rounded-full object-cover me-2 ring-1 ring-gray-200 dark:ring-gray-700"
                          />
                        ) : (
                          <span className="h-7 w-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center me-2 uppercase">
                            {user.name?.charAt(0) || "U"}
                          </span>
                        )}
                        {user.name}

                        <svg
                          className="ms-2 -me-0.5 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </span>
                  </Dropdown.Trigger>

                  <Dropdown.Content>
                    <Dropdown.Link href={route("profile.edit")}>
                      Profile
                    </Dropdown.Link>
                    <Dropdown.Link
                      href={route("logout")}
                      method="post"
                      as="button"
                    >
                      Log Out
                    </Dropdown.Link>
                  </Dropdown.Content>
                </Dropdown>
              </div>
            </div>

            <div className="-me-2 flex items-center sm:hidden space-x-2">
              <Link
                href={route("chat.index")}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Messages & Chat"
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {unreadChatCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform duration-200">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </Link>
              <NotificationDropdown />
              <button
                onClick={() =>
                  setShowingNavigationDropdown(
                    (previousState) => !previousState,
                  )
                }
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-900 focus:text-gray-500 dark:focus:text-gray-400 transition duration-150 ease-in-out"
              >
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    className={
                      !showingNavigationDropdown ? "inline-flex" : "hidden"
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                  <path
                    className={
                      showingNavigationDropdown ? "inline-flex" : "hidden"
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          className={
            (showingNavigationDropdown ? "block" : "hidden") + " sm:hidden"
          }
        >
          <div className="pt-2 pb-3 space-y-1">
            <ResponsiveNavLink
              href={route("dashboard")}
              active={route().current("dashboard")}
            >
              Dashboard
            </ResponsiveNavLink>
            <ResponsiveNavLink
              href={route("chat.index")}
              active={route().current("chat.*")}
            >
              <span className="flex items-center justify-between w-full">
                <span>Messages</span>
                {unreadChatCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </span>
            </ResponsiveNavLink>
          </div>

          <div className="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600">
            <div className="px-4">
              <div className="font-medium text-base text-gray-800 dark:text-gray-200">
                {user.name}
              </div>
              <div className="font-medium text-sm text-gray-500">
                {user.email}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <ResponsiveNavLink href={route("profile.edit")}>
                Profile
              </ResponsiveNavLink>
              <ResponsiveNavLink
                method="post"
                href={route("logout")}
                as="button"
              >
                Log Out
              </ResponsiveNavLink>
            </div>
          </div>
        </div>
      </nav>

      {/* 2FA Warning Banner if user has not configured MFA */}
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
                Two-Factor Authentication (2FA) is not enabled on your account.
                You have logged in{" "}
                {currentUser.mfa_unconfigured_login_count ?? 0}/5 times without
                2FA. Your account will be locked after 5 logins.
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

      {header && (
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {header}
          </div>
        </header>
      )}

      <main>{children}</main>

      <NotificationToast />
      <ChatToast />
      <IdleLogoutModal />
    </div>
  );
}

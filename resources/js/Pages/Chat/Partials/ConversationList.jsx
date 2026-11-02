import { useState, useMemo, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import CreateGroupModal from "./CreateGroupModal";

export default function ConversationList({
  conversations,
  setConversations,
  onConversationsChange,
  activeConversationId,
  onSelectConversation,
  colleagues,
  onStartDirect,
  onGroupCreated,
}) {
  const [search, setSearch] = useState("");
  const [showColleagues, setShowColleagues] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const updateConversations = setConversations || onConversationsChange;

  // Real-time Conversation Discovery & Ordering
  useEffect(() => {
    const handleMessageReceived = (event) => {
      const detail = event?.detail;
      const msg = detail?.message;
      const incomingConv = detail?.conversation;
      if (!msg && !incomingConv) return;

      const convId = Number(msg?.conversation_id || incomingConv?.id);
      if (!convId) return;

      if (typeof updateConversations === "function") {
        updateConversations((prev) => {
          const index = prev.findIndex((c) => Number(c.id) === convId);
          const isCurrentActive =
            activeConversationId && Number(activeConversationId) === convId;

          if (index !== -1) {
            const existing = prev[index];
            const newUnreadCount = isCurrentActive
              ? 0
              : (existing.unread_count || 0) + 1;

            const updated = {
              ...existing,
              ...(incomingConv || {}),
              last_message:
                msg?.body ||
                incomingConv?.last_message ||
                existing.last_message,
              last_message_at:
                msg?.created_at ||
                incomingConv?.last_message_at ||
                new Date().toISOString(),
              unread_count: newUnreadCount,
              is_unread: !isCurrentActive,
            };

            const remaining = prev.filter((c) => Number(c.id) !== convId);
            return [updated, ...remaining];
          } else if (incomingConv) {
            // New conversation discovered in real time: prepend to list
            const newConv = {
              ...incomingConv,
              last_message: msg?.body || incomingConv.last_message,
              last_message_at:
                msg?.created_at ||
                incomingConv.last_message_at ||
                new Date().toISOString(),
              unread_count: isCurrentActive ? 0 : 1,
              is_unread: !isCurrentActive,
            };
            return [newConv, ...prev];
          }
          return prev;
        });
      }
    };

    window.addEventListener("chat:message-received", handleMessageReceived);
    return () => {
      window.removeEventListener(
        "chat:message-received",
        handleMessageReceived,
      );
    };
  }, [activeConversationId, updateConversations]);

  // Filter conversations by partner, group name, or group members
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((conv) => {
      const name = conv.name || conv.partner?.name || "";
      const email = conv.partner?.email || "";
      const matchesMember = conv.users?.some(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        Boolean(matchesMember)
      );
    });
  }, [conversations, search]);

  // Filter colleagues to start new chat
  const filteredColleagues = useMemo(() => {
    if (!search.trim()) return colleagues;
    const q = search.toLowerCase();
    return colleagues.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [colleagues, search]);

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleGroupCreatedSuccess = (newConv) => {
    if (updateConversations) {
      updateConversations((prev) => [
        newConv,
        ...prev.filter((c) => Number(c.id) !== Number(newConv.id)),
      ]);
    }
    if (onGroupCreated) {
      onGroupCreated(newConv);
    }
    if (onSelectConversation) {
      onSelectConversation(newConv.id);
    }
    setShowGroupModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Top Header & Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Messages
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowGroupModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center gap-1.5"
              title="Create new group chat"
            >
              <UserGroupIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline text-xs font-semibold">
                New Group
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowColleagues(!showColleagues)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                showColleagues
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="Start direct conversation"
            >
              <UserPlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-semibold">
                New Chat
              </span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              showColleagues ? "Search colleagues..." : "Search messages..."
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
        {showColleagues ? (
          <div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Start chat with colleague
            </div>
            {filteredColleagues.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No colleagues found.
              </div>
            ) : (
              filteredColleagues.map((colleague) => (
                <button
                  key={colleague.id}
                  type="button"
                  onClick={() => {
                    onStartDirect(colleague.id);
                    setShowColleagues(false);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  {colleague.avatar_url ? (
                    <img
                      src={colleague.avatar_url}
                      alt={colleague.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {colleague.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {colleague.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {colleague.email}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {search
              ? "No matching conversations found."
              : "No conversations yet. Start a new chat!"}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = Number(conv.id) === Number(activeConversationId);
            const isGroup = conv.type === "group";
            const memberCount = conv.users?.length || 0;
            const displayName = isGroup
              ? conv.name || "Group Chat"
              : conv.partner?.name || "Direct Message";
            const avatarUrl = conv.partner?.avatar_url;
            const unreadCount = Number(conv.unread_count) || 0;
            const isUnread = unreadCount > 0 || Boolean(conv.is_unread);
            const subtitle = isGroup
              ? `${memberCount} ${memberCount === 1 ? "member" : "members"}`
              : conv.partner?.email || "Direct conversation";

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                  isActive
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600 dark:border-indigo-500"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-sm">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                  ) : avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-600 border-2 border-white dark:border-gray-800 rounded-full ring-1 ring-red-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isUnread
                            ? "text-gray-900 dark:text-white font-bold"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {displayName}
                      </p>
                      {isGroup && (
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 flex-shrink-0">
                          ({memberCount}{" "}
                          {memberCount === 1 ? "member" : "members"})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-1">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.last_message || subtitle}
                    </p>
                    {unreadCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-sm flex-shrink-0 ml-2">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : conv.is_unread ? (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-sm flex-shrink-0 ml-2">
                        1
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        show={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        colleagues={colleagues}
        onGroupCreated={handleGroupCreatedSuccess}
      />
    </div>
  );
}

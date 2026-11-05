import { useState, useEffect, useCallback, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import axios from "axios";
import ConversationList from "./Partials/ConversationList";
import ChatArea from "./Partials/ChatArea";
import { useChatChannel } from "@/hooks/useChatChannel";

export default function ChatIndex({
  auth,
  conversations: initialConversations,
  colleagues,
  initialConversationId,
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(
    initialConversationId
      ? Number(initialConversationId)
      : conversations.length > 0
        ? Number(conversations[0].id)
        : null,
  );
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state if props change (e.g. from redirect)
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (c) => Number(c.id) === Number(activeConversationId),
      ) || null,
    [conversations, activeConversationId],
  );

  // Handler for selecting an active conversation
  const handleSelectConversation = useCallback(
    (id) => {
      if (!id) {
        setActiveConversationId(null);
        window.dispatchEvent(
          new CustomEvent("chat:conversation-selected", {
            detail: { conversationId: null },
          }),
        );
        return;
      }

      const convId = Number(id);
      setActiveConversationId(convId);

      // Emit event so AuthenticatedLayout knows which conversation is active
      window.dispatchEvent(
        new CustomEvent("chat:conversation-selected", {
          detail: { conversationId: convId },
        }),
      );

      // Reset local unread_count and emit decrement to update global unread badge
      const target = conversations.find((c) => Number(c.id) === convId);
      const unreadCount =
        Number(target?.unread_count) || (target?.is_unread ? 1 : 0);

      if (unreadCount > 0) {
        window.dispatchEvent(
          new CustomEvent("chat:unread-count-updated", {
            detail: { decrement: unreadCount },
          }),
        );
      }

      setConversations((prev) =>
        prev.map((c) =>
          Number(c.id) === convId
            ? { ...c, unread_count: 0, is_unread: false }
            : c,
        ),
      );
    },
    [conversations],
  );

  // Support URL query param deep linking on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const queryConvId =
      urlParams.get("conversation_id") || urlParams.get("conversation");

    if (queryConvId) {
      const parsed = Number(queryConvId);
      if (!isNaN(parsed)) {
        handleSelectConversation(parsed);
        return;
      }
    }

    if (initialConversationId) {
      handleSelectConversation(Number(initialConversationId));
      return;
    }

    if (conversations.length > 0) {
      handleSelectConversation(Number(conversations[0].id));
    }
  }, []);

  // Clear active conversation in layout when unmounting chat page
  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("chat:conversation-selected", {
          detail: { conversationId: null },
        }),
      );
    };
  }, []);

  // Handle revocation when current user is removed from a conversation
  useEffect(() => {
    const handleMemberRemoved = (e) => {
      const { conversation_id, user_id } = e.detail || {};
      if (Number(user_id) === Number(auth.user.id)) {
        setConversations((prev) =>
          prev.filter((c) => Number(c.id) !== Number(conversation_id)),
        );
        if (Number(activeConversationId) === Number(conversation_id)) {
          setActiveConversationId(null);
          setMessages([]);
          setNextCursor(null);
          window.dispatchEvent(
            new CustomEvent("chat:conversation-selected", {
              detail: { conversationId: null },
            }),
          );
        }
      }
    };

    window.addEventListener("chat:member-removed", handleMemberRemoved);
    return () => {
      window.removeEventListener("chat:member-removed", handleMemberRemoved);
    };
  }, [activeConversationId, auth.user.id]);

  // Fetch messages when active conversation changes
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const response = await axios.get(route("chat.messages", conversationId));
      setMessages(response.data.messages || []);
      setNextCursor(response.data.next_cursor || null);

      // Mark conversation as read on backend
      axios.post(route("chat.markAsRead", conversationId)).catch(() => {});

      // Clear unread badge in local state
      setConversations((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(conversationId)
            ? { ...c, unread_count: 0, is_unread: false }
            : c,
        ),
      );
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [activeConversationId, fetchMessages]);

  // Load older messages (Cursor Pagination)
  const handleLoadMore = async () => {
    if (!activeConversationId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await axios.get(
        route("chat.messages", activeConversationId),
        { params: { cursor: nextCursor } },
      );
      const olderMessages = response.data.messages || [];
      setMessages((prev) => [...olderMessages, ...prev]);
      setNextCursor(response.data.next_cursor || null);
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle incoming real-time message from Reverb WebSocket for active conversation
  const handleNewMessage = useCallback(
    (newMsg) => {
      // If belongs to currently opened conversation, append to list
      if (Number(newMsg.conversation_id) === Number(activeConversationId)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        axios
          .post(route("chat.markAsRead", activeConversationId))
          .catch(() => {});
      }

      // Update conversations list ordering and last message preview
      setConversations((prev) => {
        const index = prev.findIndex(
          (c) => Number(c.id) === Number(newMsg.conversation_id),
        );
        if (index === -1) return prev;

        const isCurrentActive =
          Number(newMsg.conversation_id) === Number(activeConversationId);
        const updated = {
          ...prev[index],
          last_message: newMsg.body,
          last_message_at: newMsg.created_at,
          unread_count: isCurrentActive
            ? 0
            : (prev[index].unread_count || 0) + 1,
          is_unread: !isCurrentActive,
        };

        const remaining = prev.filter(
          (c) => Number(c.id) !== Number(newMsg.conversation_id),
        );
        return [updated, ...remaining];
      });
    },
    [activeConversationId],
  );

  // Reverb Hook
  const { isTyping, typingUser, sendTyping } = useChatChannel({
    conversationId: activeConversationId,
    currentUserId: auth.user.id,
    onNewMessage: handleNewMessage,
  });

  const handleConversationUpdated = useCallback((updatedConv) => {
    setConversations((prev) =>
      prev.map((c) =>
        Number(c.id) === Number(updatedConv.id) ? { ...c, ...updatedConv } : c,
      ),
    );
  }, []);

  const handleConversationDeleted = useCallback((convId) => {
    setConversations((prev) =>
      prev.filter((c) => Number(c.id) !== Number(convId)),
    );
    setActiveConversationId(null);
  }, []);

  // Send message with Optimistic UI update
  const handleSendMessage = async (body) => {
    if (!activeConversationId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: activeConversationId,
      user_id: auth.user.id,
      user_name: auth.user.name,
      avatar_url: auth.user.avatar_url,
      body,
      created_at: new Date().toISOString(),
      status: "sending",
    };

    // 1. Optimistic append
    setMessages((prev) => [...prev, optimisticMessage]);

    // Update conversation last_message & last_message_at locally
    setConversations((prev) => {
      const target = prev.find(
        (c) => Number(c.id) === Number(activeConversationId),
      );
      if (!target) return prev;
      const updated = {
        ...target,
        last_message: body,
        last_message_at: optimisticMessage.created_at,
      };
      return [
        updated,
        ...prev.filter((c) => Number(c.id) !== Number(activeConversationId)),
      ];
    });

    try {
      const response = await axios.post(
        route("chat.sendMessage", activeConversationId),
        { body },
      );
      const savedMessage = response.data;

      // 2. Replace temp message with server response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...savedMessage, status: "sent" } : m,
        ),
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    }
  };

  const handleStartDirect = (userId) => {
    router.post(
      route("chat.startDirect", userId),
      {},
      {
        preserveState: true,
        preserveScroll: true,
      },
    );
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            Messages
          </h2>
        </div>
      }
    >
      <Head title="Chat" />

      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex h-[78vh] min-h-[520px]">
            {/* Left Column: Conversation List */}
            <div
              className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
                activeConversationId ? "hidden md:block" : "block"
              }`}
            >
              <ConversationList
                conversations={conversations}
                setConversations={setConversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                colleagues={colleagues}
                onStartDirect={handleStartDirect}
                onGroupCreated={(newConv) => {
                  handleSelectConversation(newConv.id);
                }}
              />
            </div>

            {/* Right Column: Chat Box Area */}
            <div
              className={`flex-1 flex flex-col h-full ${
                !activeConversationId ? "hidden md:flex" : "flex"
              }`}
            >
              <ChatArea
                conversation={activeConversation}
                messages={messages}
                currentUserId={auth.user.id}
                currentUserName={auth.user.name}
                colleagues={colleagues}
                onSendMessage={handleSendMessage}
                onLoadMore={handleLoadMore}
                hasMore={Boolean(nextCursor)}
                loadingMore={loadingMore}
                loadingMessages={loadingMessages}
                isTyping={isTyping}
                typingUser={typingUser}
                onTyping={sendTyping}
                onBack={() => handleSelectConversation(null)}
                onConversationUpdated={handleConversationUpdated}
                onConversationDeleted={handleConversationDeleted}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

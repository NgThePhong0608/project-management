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
    initialConversationId ||
      (conversations.length > 0 ? conversations[0].id : null),
  );
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Sync state if props change (e.g. from redirect)
  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

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
          c.id === conversationId ? { ...c, is_unread: false } : c,
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

  // Handle incoming real-time message from Reverb WebSocket
  const handleNewMessage = useCallback(
    (newMsg) => {
      // If belongs to currently opened conversation, append to list
      if (Number(newMsg.conversation_id) === Number(activeConversationId)) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        axios
          .post(route("chat.markAsRead", activeConversationId))
          .catch(() => {});
      }

      // Update conversations list ordering and unread badge
      setConversations((prev) => {
        const index = prev.findIndex(
          (c) => Number(c.id) === Number(newMsg.conversation_id),
        );
        if (index === -1) return prev;

        const updated = {
          ...prev[index],
          last_message_at: newMsg.created_at,
          is_unread:
            Number(newMsg.conversation_id) !== Number(activeConversationId),
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

    // Update conversation last_message_at locally
    setConversations((prev) => {
      const target = prev.find((c) => c.id === activeConversationId);
      if (!target) return prev;
      const updated = {
        ...target,
        last_message_at: optimisticMessage.created_at,
      };
      return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
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
            Messages & Real-time Chat
          </h2>
        </div>
      }
    >
      <Head title="Chat" />

      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex h-[78vh] min-h-[520px]">
            {/* Left Column: Conversation List */}
            <div
              className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
                activeConversationId ? "hidden md:block" : "block"
              }`}
            >
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => setActiveConversationId(id)}
                colleagues={colleagues}
                onStartDirect={handleStartDirect}
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
                onSendMessage={handleSendMessage}
                onLoadMore={handleLoadMore}
                hasMore={Boolean(nextCursor)}
                loadingMore={loadingMore}
                isTyping={isTyping}
                typingUser={typingUser}
                onTyping={sendTyping}
                onBack={() => setActiveConversationId(null)}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

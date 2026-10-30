import { useRef, useEffect, useState } from "react";
import {
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function ChatArea({
  conversation,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  onLoadMore,
  hasMore,
  loadingMore,
  isTyping,
  typingUser,
  onTyping,
  onBack,
}) {
  const [inputBody, setInputBody] = useState("");
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInputBody(e.target.value);
    onTyping?.(currentUserName);

    // Auto-grow textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = inputBody.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInputBody("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!conversation) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-900/50 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 ring-1 ring-indigo-200 dark:ring-indigo-800 shadow-sm">
          <ChatBubbleLeftRightIcon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          No conversation selected
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Choose a conversation from the sidebar or start a new chat with a
          colleague.
        </p>
      </div>
    );
  }

  const partner = conversation.partner;
  const partnerName = conversation.name || partner?.name || "Direct Message";
  const partnerAvatar = partner?.avatar_url;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="relative">
            {partnerAvatar ? (
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {partnerName}
            </h2>
            <div className="h-4 flex items-center">
              {isTyping ? (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 animate-pulse">
                  <span>{typingUser || "Partner"} is typing</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </span>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {partner?.email || "Active conversation"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {loadingMore ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading older messages...</span>
                </>
              ) : (
                <span>Load older messages</span>
              )}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Say hello to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = Number(msg.user_id) === Number(currentUserId);
            const isOptimistic = msg.status === "sending";

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {!isMine && (
                  <div className="w-7 h-7 rounded-full flex-shrink-0 mb-1">
                    {msg.avatar_url ? (
                      <img
                        src={msg.avatar_url}
                        alt={msg.user_name || "User"}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-bold">
                        {(msg.user_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[78%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words ${
                    isMine
                      ? `bg-indigo-600 text-white rounded-br-none ${
                          isOptimistic ? "opacity-75" : ""
                        }`
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/80 dark:border-gray-700/80 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.body}
                  </p>
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMine ? "text-indigo-200" : "text-gray-400"
                    }`}
                  >
                    <span>{formatMessageTime(msg.created_at)}</span>
                    {isMine && (
                      <span>{isOptimistic ? "• sending..." : "✓"}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputBody}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 resize-none max-h-28 py-1.5 px-2 focus:outline-none placeholder-gray-400"
          />

          <button
            type="submit"
            disabled={!inputBody.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition flex-shrink-0"
            title="Send Message"
          >
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </button>
        </form>
      </div>
    </div>
  );
}

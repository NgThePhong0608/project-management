import { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function ChatToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleChatToast = (event) => {
      const payload = event.detail;
      const message = payload?.message || payload?.data?.message || payload;
      const conversation =
        payload?.conversation || payload?.data?.conversation || {};

      const conversationId = conversation?.id || message?.conversation_id;
      const isGroup =
        conversation?.type === "group" || Boolean(conversation?.name);
      const conversationName =
        conversation?.name || (isGroup ? "Group Chat" : null);

      const senderName =
        message?.user_name ||
        message?.sender?.name ||
        message?.user?.name ||
        conversation?.partner?.name ||
        "New Message";

      const senderAvatar =
        message?.avatar_url ||
        message?.sender?.avatar_url ||
        message?.user?.avatar_url ||
        conversation?.partner?.avatar_url ||
        null;

      const rawBody = message?.body || message?.text || "";
      const truncatedBody =
        rawBody.length > 60 ? `${rawBody.slice(0, 60)}…` : rawBody;

      setToast({
        id: message?.id || Date.now(),
        conversationId,
        conversationName,
        isGroup,
        senderName,
        senderAvatar,
        preview: truncatedBody || "Sent a message",
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setToast(null);
      }, 6000);
    };

    window.addEventListener("app:chat-toast", handleChatToast);

    return () => {
      window.removeEventListener("app:chat-toast", handleChatToast);
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

  const handleOpenChat = () => {
    if (!toast) return;
    const conversationId = toast.conversationId;
    handleDismiss();

    if (conversationId) {
      router.visit(
        route("chat.index", {
          conversation_id: conversationId,
          conversation: conversationId,
        }),
      );
    } else {
      router.visit(route("chat.index"));
    }
  };

  if (!toast) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-indigo-100 dark:border-indigo-900/50 p-4 transition-all duration-300 transform translate-y-0"
      role="alert"
    >
      <div className="flex items-start space-x-3">
        {/* Sender Avatar */}
        <div className="flex-shrink-0">
          {toast.senderAvatar ? (
            <img
              src={toast.senderAvatar}
              alt={toast.senderName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm ring-2 ring-indigo-500/20 uppercase">
              {toast.senderName?.charAt(0) || "U"}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {toast.senderName}
              </span>
              {toast.isGroup && toast.conversationName && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  in {toast.conversationName}
                </span>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition ms-2 flex-shrink-0"
              aria-label="Dismiss chat notification"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {toast.preview}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
              <span>{toast.isGroup ? "Group Chat" : "Direct Message"}</span>
            </span>

            <button
              onClick={handleOpenChat}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
            >
              <span>Open Chat</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useEffect, useState } from "react";
import axios from "axios";
import {
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  UserPlusIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import GroupMembersModal from "./GroupMembersModal";

export default function ChatArea({
  conversation,
  messages,
  currentUserId,
  currentUserName,
  colleagues = [],
  onSendMessage,
  onLoadMore,
  hasMore,
  loadingMore,
  loadingMessages = false,
  isTyping,
  typingUser,
  onTyping,
  onBack,
  onConversationUpdated,
  onConversationDeleted,
}) {
  const [inputBody, setInputBody] = useState("");
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [loadingKebabAction, setLoadingKebabAction] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const kebabRef = useRef(null);
  const prevConversationIdRef = useRef(conversation?.id);
  const prevLastMessageIdRef = useRef(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setShowKebabMenu(false);
      }
    };
    if (showKebabMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showKebabMenu]);

  // Auto-scroll to bottom on conversation switch or when a new message is appended at the bottom
  useEffect(() => {
    const isConvChanged = conversation?.id !== prevConversationIdRef.current;
    const currentLastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;
    const currentLastMessageId = currentLastMessage?.id;
    const isNewMessageAtBottom =
      Boolean(currentLastMessageId) &&
      currentLastMessageId !== prevLastMessageIdRef.current;

    if (isConvChanged || isNewMessageAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevConversationIdRef.current = conversation?.id;
    prevLastMessageIdRef.current = currentLastMessageId;
  }, [conversation?.id, messages]);

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

  const handleToggleTerminate = async () => {
    if (!conversation) return;
    const isTerminated = Boolean(conversation.is_terminated);
    const confirmText = isTerminated
      ? "Bạn có muốn mở khóa lại nhóm chat này để mọi người tiếp tục nhắn tin?"
      : "Bạn có chắc chắn muốn khóa (terminate) nhóm chat này? Sau khi khóa, chỉ Quản trị viên mới có quyền nhắn tin.";

    if (!window.confirm(confirmText)) return;

    setLoadingKebabAction(true);
    try {
      const response = await axios.post(`/chat/${conversation.id}/terminate`);
      if (response.data.conversation) {
        onConversationUpdated?.(response.data.conversation);
      }
      setShowKebabMenu(false);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Không thể thay đổi trạng thái nhóm chat.",
      );
    } finally {
      setLoadingKebabAction(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!conversation) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn nhóm "${conversation.name}"? Hành động này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    setLoadingKebabAction(true);
    try {
      await axios.delete(`/chat/${conversation.id}`);
      setShowKebabMenu(false);
      onConversationDeleted?.(conversation.id);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa nhóm chat.");
    } finally {
      setLoadingKebabAction(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversation) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn rời khỏi nhóm "${conversation.name}"?`,
      )
    ) {
      return;
    }

    setLoadingKebabAction(true);
    try {
      await axios.delete(`/chat/${conversation.id}/members/${currentUserId}`);
      setShowKebabMenu(false);
      onConversationDeleted?.(conversation.id);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể rời nhóm chat.");
    } finally {
      setLoadingKebabAction(false);
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
          Chưa chọn cuộc trò chuyện
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Hãy chọn một cuộc hội thoại từ danh sách bên trái hoặc tạo tin nhắn
          trực tiếp với đồng nghiệp.
        </p>
      </div>
    );
  }

  const isGroup = conversation.type === "group";
  const partner = conversation.partner;
  const partnerName = isGroup
    ? conversation.name || "Nhóm Chat"
    : conversation.name || partner?.name || "Tin nhắn trực tiếp";
  const partnerAvatar = partner?.avatar_url;

  const memberCount = conversation.users?.length || 0;
  const canManage = Boolean(conversation.can_manage);
  const isCreator = Boolean(conversation.is_creator);
  const isTerminated = Boolean(conversation.is_terminated);
  const canSendInGroup = !isTerminated || canManage;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div
            className={`relative flex-shrink-0 ${isGroup ? "cursor-pointer" : ""}`}
            onClick={() => isGroup && setShowMembersModal(true)}
          >
            {isGroup ? (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm hover:opacity-90 transition">
                <UserGroupIcon className="w-6 h-6" />
              </div>
            ) : partnerAvatar ? (
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
            {!isGroup && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isGroup ? (
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition"
                >
                  {partnerName}
                </button>
              ) : (
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                  {partnerName}
                </h2>
              )}
              {isGroup && isTerminated && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <LockClosedIcon className="w-2.5 h-2.5" />
                  Đã khóa
                </span>
              )}
            </div>

            <div className="h-4 flex items-center">
              {isTyping ? (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 animate-pulse truncate">
                  <span>{typingUser || "Có người"} đang nhập</span>
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </span>
              ) : isGroup ? (
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="text-xs text-gray-500 dark:text-gray-400 truncate hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition"
                >
                  {memberCount} thành viên
                </button>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {partner?.email || "Cuộc trò chuyện"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header: Kebab Menu for Groups */}
        {isGroup && (
          <div className="relative" ref={kebabRef}>
            <button
              type="button"
              onClick={() => setShowKebabMenu((prev) => !prev)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Tùy chọn nhóm"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>

            {showKebabMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowKebabMenu(false);
                    setShowMembersModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition"
                >
                  <UserGroupIcon className="w-4 h-4 text-gray-400" />
                  <span>Danh sách thành viên ({memberCount})</span>
                </button>

                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowKebabMenu(false);
                        setShowMembersModal(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2.5 transition"
                    >
                      <UserPlusIcon className="w-4 h-4 text-gray-400" />
                      <span>Thêm thành viên mới</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleTerminate}
                      disabled={loadingKebabAction}
                      className="w-full text-left px-3.5 py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition"
                    >
                      {isTerminated ? (
                        <>
                          <LockOpenIcon className="w-4 h-4 text-amber-500" />
                          <span>Mở khóa nhóm chat</span>
                        </>
                      ) : (
                        <>
                          <LockClosedIcon className="w-4 h-4 text-amber-500" />
                          <span>Khóa nhóm (Terminate)</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />

                {isCreator || canManage ? (
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={loadingKebabAction}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                    <span>Xóa nhóm chat</span>
                  </button>
                ) : null}

                {!isCreator && (
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    disabled={loadingKebabAction}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 text-red-500" />
                    <span>Rời khỏi nhóm</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terminated Warning Banner */}
      {isGroup && isTerminated && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-medium">
            <LockClosedIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Nhóm này đã bị tạm dừng nhắn tin bởi Quản trị viên.</span>
          </div>
          {canManage && (
            <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded font-semibold flex-shrink-0">
              Bạn có quyền Quản trị viên
            </span>
          )}
        </div>
      )}

      {/* Message List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-full font-medium transition disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải thêm...</span>
                </>
              ) : (
                <span>Tải tin nhắn cũ hơn</span>
              )}
            </button>
          </div>
        )}

        {loadingMessages ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            <ArrowPathIcon className="w-5 h-5 animate-spin mr-2 text-indigo-500" />
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
            Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = Number(msg.user_id) === Number(currentUserId);
            const isOptimistic = msg.status === "sending";

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine && (
                  <div className="flex-shrink-0">
                    {msg.avatar_url ? (
                      <img
                        src={msg.avatar_url}
                        alt={msg.user_name || "Colleague"}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        {(msg.user_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  {!isMine && (
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 ml-1">
                      {msg.user_name}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                      isMine
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/80 dark:border-gray-700 rounded-bl-sm"
                    } ${isOptimistic ? "opacity-70" : ""}`}
                  >
                    {msg.body}

                    <div
                      className={`text-[10px] mt-1 flex items-center gap-1 ${
                        isMine ? "text-indigo-200" : "text-gray-400"
                      }`}
                    >
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {isMine && (
                        <span>{isOptimistic ? "• đang gửi..." : "✓"}</span>
                      )}
                    </div>
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
          className={`flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 transition ${
            canSendInGroup
              ? "focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
              : "opacity-60 cursor-not-allowed"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={!canSendInGroup}
            value={inputBody}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              !canSendInGroup
                ? "Nhóm chat đã bị khóa nhắn tin bởi Quản trị viên."
                : isTerminated && canManage
                  ? "Nhóm đang khóa với thành viên (bạn có quyền Quản trị viên)..."
                  : "Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
            }
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-gray-100 resize-none max-h-28 py-1.5 px-2 focus:outline-none placeholder-gray-400 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={!inputBody.trim() || !canSendInGroup}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition flex-shrink-0"
            title="Gửi tin nhắn"
          >
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </button>
        </form>
      </div>

      {/* Group Members Modal */}
      {isGroup && (
        <GroupMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          conversation={conversation}
          currentUserId={currentUserId}
          colleagues={colleagues}
          onConversationUpdated={onConversationUpdated}
        />
      )}
    </div>
  );
}

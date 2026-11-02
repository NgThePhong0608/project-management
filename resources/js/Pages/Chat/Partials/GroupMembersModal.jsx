import { useState, useMemo } from "react";
import axios from "axios";
import {
  XMarkIcon,
  UserPlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

export default function GroupMembersModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  colleagues = [],
  onConversationUpdated,
}) {
  const [selectedColleagueId, setSelectedColleagueId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen || !conversation) return null;

  const users = conversation.users || [];
  const canManage = Boolean(conversation.can_manage);
  const isCreator = Boolean(conversation.is_creator);

  // Available colleagues who are not yet members
  const availableColleagues = useMemo(() => {
    const existingIds = new Set(users.map((u) => Number(u.id)));
    return colleagues.filter((c) => !existingIds.has(Number(c.id)));
  }, [colleagues, users]);

  // Filtered members by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedColleagueId) return;

    setLoadingAction("add");
    setErrorMessage("");

    try {
      const response = await axios.post(`/chat/${conversation.id}/members`, {
        user_id: Number(selectedColleagueId),
      });
      if (response.data.conversation) {
        onConversationUpdated?.(response.data.conversation);
      }
      setSelectedColleagueId("");
      setIsAddingMember(false);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Không thể thêm thành viên vào nhóm.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateRole = async (targetUser, newRole) => {
    const actionKey = `role-${targetUser.id}`;
    setLoadingAction(actionKey);
    setErrorMessage("");

    try {
      const response = await axios.patch(
        `/chat/${conversation.id}/members/${targetUser.id}/role`,
        { role: newRole },
      );
      if (response.data.conversation) {
        onConversationUpdated?.(response.data.conversation);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Không thể cập nhật quyền thành viên.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveMember = async (targetUser) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa "${targetUser.name}" khỏi nhóm chat này?`,
      )
    ) {
      return;
    }

    const actionKey = `remove-${targetUser.id}`;
    setLoadingAction(actionKey);
    setErrorMessage("");

    try {
      const response = await axios.delete(
        `/chat/${conversation.id}/members/${targetUser.id}`,
      );
      if (response.data.conversation) {
        onConversationUpdated?.(response.data.conversation);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Không thể xóa thành viên khỏi nhóm.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const formatJoinedDate = (isoString) => {
    if (!isoString) return "Gần đây";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Gần đây";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Thành viên nhóm
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {conversation.name} • {users.length} thành viên
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Add member section (for managers/admins) */}
          {canManage && (
            <div>
              {!isAddingMember ? (
                <button
                  type="button"
                  onClick={() => setIsAddingMember(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 font-medium text-xs hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Thêm thành viên mới vào nhóm
                </button>
              ) : (
                <form
                  onSubmit={handleAddMember}
                  className="p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Chọn đồng nghiệp để thêm
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingMember(false);
                        setSelectedColleagueId("");
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Hủy
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedColleagueId}
                      onChange={(e) => setSelectedColleagueId(e.target.value)}
                      className="flex-1 text-xs rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">-- Chọn đồng nghiệp --</option>
                      {availableColleagues.map((colleague) => (
                        <option key={colleague.id} value={colleague.id}>
                          {colleague.name} ({colleague.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedColleagueId || loadingAction === "add"}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition"
                    >
                      {loadingAction === "add" ? "Đang thêm..." : "Thêm"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Search filter if more than 5 members */}
          {users.length > 5 && (
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-100 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
            />
          )}

          {/* Member List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 pr-1">
            {filteredUsers.map((member) => {
              const isMemberCreator = member.role === "creator";
              const isMemberManager = member.role === "manager";
              const isSelf = Number(member.id) === Number(currentUserId);
              const isRoleLoading = loadingAction === `role-${member.id}`;
              const isRemoveLoading = loadingAction === `remove-${member.id}`;

              return (
                <div
                  key={member.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {member.name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-gray-400 font-normal">
                            (Bạn)
                          </span>
                        )}
                        {/* Role Badges */}
                        {isMemberCreator ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-purple-600/20">
                            <ShieldCheckIcon className="w-3 h-3" />
                            Trưởng nhóm
                          </span>
                        ) : isMemberManager ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ring-1 ring-blue-600/20">
                            <ShieldCheckIcon className="w-3 h-3" />
                            Quản trị viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            Thành viên
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {member.email} • Tham gia:{" "}
                        {formatJoinedDate(member.joined_at)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons (only for canManage, and not on the creator or self) */}
                  {canManage && !isMemberCreator && !isSelf && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isMemberManager ? (
                        <button
                          type="button"
                          disabled={isRoleLoading}
                          onClick={() => handleUpdateRole(member, "member")}
                          title="Hạ quyền xuống Thành viên"
                          className="p-1 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <ArrowDownIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isRoleLoading}
                          onClick={() => handleUpdateRole(member, "manager")}
                          title="Thăng cấp lên Quản trị viên"
                          className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition text-xs flex items-center gap-1 disabled:opacity-50"
                        >
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isRemoveLoading}
                        onClick={() => handleRemoveMember(member)}
                        title="Xóa thành viên khỏi nhóm"
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-xs disabled:opacity-50"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

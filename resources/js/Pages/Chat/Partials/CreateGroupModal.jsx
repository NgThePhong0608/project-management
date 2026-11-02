import { useState, useMemo } from "react";
import Modal from "@/Components/Modal";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import Checkbox from "@/Components/Checkbox";
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";

export default function CreateGroupModal({
  show = false,
  onClose,
  colleagues = [],
  users = [],
  onGroupCreated,
}) {
  const memberList = colleagues.length > 0 ? colleagues : users;
  const [name, setName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  // Filter colleagues by name or email
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return memberList;
    const q = search.toLowerCase();
    return memberList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [memberList, search]);

  const selectedMembers = useMemo(() => {
    return memberList.filter((u) => selectedUserIds.includes(u.id));
  }, [memberList, selectedUserIds]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
    if (errors.user_ids) {
      setErrors((prev) => ({ ...prev, user_ids: null }));
    }
  };

  const removeUser = (userId) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleClose = () => {
    if (processing) return;
    setName("");
    setSelectedUserIds([]);
    setSearch("");
    setErrors({});
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Group name is required.";
    }
    if (selectedUserIds.length === 0) {
      newErrors.user_ids = "Please select at least 1 colleague.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      const response = await axios.post(route("chat.createGroup"), {
        name: name.trim(),
        user_ids: selectedUserIds,
      });

      const newConversation = response.data?.conversation;
      if (onGroupCreated && newConversation) {
        onGroupCreated(newConversation);
      }
      handleClose();
    } catch (err) {
      console.error("Failed to create group:", err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({
          general:
            err.response?.data?.message ||
            "Failed to create group. Please try again.",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal show={show} onClose={handleClose} maxWidth="md">
      <form onSubmit={handleSubmit} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Create Group Chat
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Collaborate with multiple team members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {errors.general}
          </div>
        )}

        {/* Group Name */}
        <div className="mt-4">
          <InputLabel htmlFor="group-name" value="Group Name" />
          <TextInput
            id="group-name"
            type="text"
            className="mt-1 block w-full"
            placeholder="e.g. Project Launch Team"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: null }));
              }
            }}
            autoFocus
          />
          <InputError message={errors.name} className="mt-1" />
        </div>

        {/* Selected Members Chips */}
        {selectedMembers.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Selected ({selectedMembers.length}):
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  <span className="truncate max-w-[120px]">{member.name}</span>
                  <button
                    type="button"
                    onClick={() => removeUser(member.id)}
                    className="hover:text-indigo-900 dark:hover:text-white"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Member Selection Search & List */}
        <div className="mt-4">
          <InputLabel value="Select Members" />

          {/* Search */}
          <div className="relative mt-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter colleagues by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <InputError message={errors.user_ids} className="mt-1" />

          {/* User List */}
          <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {search
                  ? "No colleagues match your search."
                  : "No colleagues available."}
              </div>
            ) : (
              filteredMembers.map((colleague) => {
                const isSelected = selectedUserIds.includes(colleague.id);
                return (
                  <label
                    key={colleague.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                      isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleUser(colleague.id)}
                    />
                    {colleague.avatar_url ? (
                      <img
                        src={colleague.avatar_url}
                        alt={colleague.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {colleague.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {colleague.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {colleague.email}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <SecondaryButton
            type="button"
            onClick={handleClose}
            disabled={processing}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            disabled={
              processing || !name.trim() || selectedUserIds.length === 0
            }
          >
            {processing ? "Creating..." : "Create Group"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

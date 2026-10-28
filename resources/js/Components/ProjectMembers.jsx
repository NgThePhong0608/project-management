import { useState } from "react";
import { Link, router } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import {
  UserGroupIcon,
  UserPlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function Avatar({ user }) {
  return user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.name}
      className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700 shrink-0"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProjectMembers({
  project,
  members = [],
  candidates = [],
}) {
  const canManage = project.can?.manageMembers;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [role, setRole] = useState("member");
  const [search, setSearch] = useState("");

  const toggle = (id) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const add = () =>
    router.post(
      route("project.members.store", project.id),
      { user_ids: selected, role },
      {
        preserveScroll: true,
        onSuccess: () => {
          setOpen(false);
          setSelected([]);
          setSearch("");
        },
      },
    );

  const remove = (u) => {
    if (!confirm(`Remove ${u.name} from this project?`)) return;
    router.delete(route("project.members.destroy", [project.id, u.id]), {
      preserveScroll: true,
    });
  };

  const filtered = candidates.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-5 text-gray-900 dark:text-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
            Project Members
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">
            {members.length}
          </span>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <UserPlusIcon className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="mt-3 flex-1 overflow-y-auto max-h-[360px] divide-y divide-gray-100 dark:divide-gray-700/60 pr-1">
        {members.map((u) => (
          <div
            key={u.id}
            className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition"
          >
            <Link
              href={route("user.show", u.id)}
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
            >
              <Avatar user={u} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {u.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {u.email}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {u.role || "member"}
              </span>

              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(u)}
                  title={`Remove ${u.name}`}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No members added yet.
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      <Modal show={open} onClose={() => setOpen(false)} maxWidth="lg">
        <div className="p-6 text-gray-900 dark:text-gray-100">
          <h3 className="text-lg font-bold">Add Members to Project</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select users to invite to this project.
          </p>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="mt-3 w-full text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />

          <ul className="mt-3 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((u) => (
              <li key={u.id}>
                <label className="flex items-center gap-3 py-2 px-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block truncate">
                      {u.name}
                    </span>
                    <span className="text-xs text-gray-500 truncate block">
                      {u.email}
                    </span>
                  </div>
                </label>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-4 text-center text-sm text-gray-500">
                No users available to add.
              </li>
            )}
          </ul>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Assign Role:
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border-gray-300 dark:border-gray-700 dark:bg-gray-900 rounded-md text-xs py-1"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <SecondaryButton onClick={() => setOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton disabled={!selected.length} onClick={add}>
                Add {selected.length ? `(${selected.length})` : ""}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/ui/button";

export default function TaskSubtasks({
  taskId,
  subtasks = [],
  canUpdate = false,
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.is_completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    router.post(
      route("task.subtasks.store", taskId),
      { title: trimmed },
      {
        preserveScroll: true,
        onSuccess: () => setTitle(""),
        onFinish: () => setSubmitting(false),
      },
    );
  };

  const handleToggle = (subtaskId) => {
    if (!canUpdate) {
      return;
    }
    router.patch(
      route("task.subtasks.toggle", [taskId, subtaskId]),
      {},
      { preserveScroll: true },
    );
  };

  const handleDelete = (subtaskId) => {
    if (!canUpdate) {
      return;
    }
    router.delete(route("task.subtasks.destroy", [taskId, subtaskId]), {
      preserveScroll: true,
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Subtasks
          </h3>
          {total > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {completed}/{total} ({percent}%)
            </span>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {subtasks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3">
          No subtasks yet.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2"
            >
              <label
                className={`flex items-center gap-2.5 flex-1 min-w-0 ${
                  canUpdate ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(subtask.is_completed)}
                  disabled={!canUpdate}
                  onChange={() => handleToggle(subtask.id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <span
                  className={`text-sm break-words ${
                    subtask.is_completed
                      ? "line-through text-gray-400 dark:text-gray-500"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {subtask.title}
                </span>
              </label>

              {canUpdate && (
                <button
                  type="button"
                  onClick={() => handleDelete(subtask.id)}
                  title="Delete subtask"
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canUpdate && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a subtask..."
            maxLength={255}
            className="flex-1 rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !title.trim()}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </Button>
        </form>
      )}
    </div>
  );
}


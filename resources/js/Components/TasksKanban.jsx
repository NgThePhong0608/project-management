import React, { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
  TASK_PRIORITY_CLASS_MAP,
  TASK_PRIORITY_TEXT_MAP,
  TASK_STATUS_CLASS_MAP,
  TASK_STATUS_TEXT_MAP,
} from "@/constants.jsx";
import { Calendar, CheckSquare, User as UserIcon } from "lucide-react";

const STATUS_COLUMNS = ["pending", "in_progress", "completed", "closed"];

export default function TasksKanban({ tasks, hideProjectColumn = false }) {
  const { auth } = usePage().props;
  const user = auth?.user;
  const canClose =
    user?.role === "admin" ||
    user?.role === "manager" ||
    (user?.roles || []).some((r) => r === "admin" || r === "manager");

  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const items = tasks?.data || tasks || [];

  const moveTask = (task, nextStatus) => {
    if (!task?.can?.update || task.status === nextStatus) {
      return;
    }
    if (nextStatus === "closed" && !canClose) {
      return;
    }

    router.patch(
      route("task.updateStatus", task.id),
      { status: nextStatus },
      { preserveScroll: true },
    );
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((status) => {
        const columnTasks = items.filter((t) => t.status === status);
        const isDropTarget = dragOverColumn === status;
        const dropAllowed =
          draggedTask &&
          draggedTask.can?.update &&
          draggedTask.status !== status &&
          (status !== "closed" || canClose);

        return (
          <div
            key={status}
            onDragOver={(e) => {
              if (dropAllowed) {
                e.preventDefault();
                setDragOverColumn(status);
              }
            }}
            onDragLeave={() => {
              if (dragOverColumn === status) {
                setDragOverColumn(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              if (draggedTask) {
                moveTask(draggedTask, status);
                setDraggedTask(null);
              }
            }}
            className={`flex flex-col rounded-xl border p-3 min-h-[260px] transition-colors ${
              isDropTarget && dropAllowed
                ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20"
                : "border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${TASK_STATUS_CLASS_MAP[status]}`}
                />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {TASK_STATUS_TEXT_MAP[status]}
                </h3>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1">
              {columnTasks.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-500 italic py-6 text-center">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={Boolean(task.can?.update)}
                    onDragStart={() => setDraggedTask(task)}
                    onDragEnd={() => {
                      setDraggedTask(null);
                      setDragOverColumn(null);
                    }}
                    className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-xs space-y-2 ${
                      task.can?.update
                        ? "cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-700"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={route("task.show", task.id)}
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2"
                      >
                        {task.name}
                      </Link>
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${TASK_PRIORITY_CLASS_MAP[task.priority]}`}
                      >
                        {TASK_PRIORITY_TEXT_MAP[task.priority]}
                      </span>
                    </div>

                    {!hideProjectColumn && task.project && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        <Link
                          href={route("project.show", task.project.id)}
                          className="hover:underline"
                        >
                          {task.project.name}
                        </Link>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {task.assignedUser && (
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[110px]">
                            {task.assignedUser.name}
                          </span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{task.due_date.slice(0, 10)}</span>
                        </span>
                      )}
                      {task.subtasks_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                          <CheckSquare className="h-3.5 w-3.5" />
                          <span>
                            {task.completed_subtasks_count ?? 0}/
                            {task.subtasks_count}
                          </span>
                        </span>
                      )}
                    </div>

                    {task.can?.update && (
                      <div className="pt-1 border-t border-gray-100 dark:border-gray-700/70">
                        <select
                          aria-label={`Change status for ${task.name}`}
                          value={task.status}
                          onChange={(e) => moveTask(task, e.target.value)}
                          className="w-full rounded border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 text-xs py-1 px-2"
                        >
                          {STATUS_COLUMNS.map((opt) => (
                            <option
                              key={opt}
                              value={opt}
                              disabled={opt === "closed" && !canClose}
                            >
                              {TASK_STATUS_TEXT_MAP[opt]}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

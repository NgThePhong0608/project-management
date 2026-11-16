import React from "react";
import { History } from "lucide-react";

const ACTION_LABELS = {
  created: "created this task",
  status_updated: "changed task status",
  updated: "updated task details",
  attachment_added: "attached a file",
  attachment_removed: "removed an attachment",
};

const FIELD_LABELS = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  due_date: "Due Date",
  name: "Task Name",
  project: "Project",
  description: "Description",
  image: "Task Image",
  attachment: "Attachment",
};

export default function TaskActivityLog({ activities = [] }) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
          Activity Log
        </h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No activity recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {activity.user?.name || "System"}
                  </span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {ACTION_LABELS[activity.action] || activity.action}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {activity.created_at}
                </span>
              </div>

              {activity.changes && Object.keys(activity.changes).length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {Object.entries(activity.changes).map(([field, diff]) => (
                    <li key={field}>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {FIELD_LABELS[field] || field}:
                      </span>{" "}
                      {diff?.old !== null && diff?.old !== undefined && (
                        <>
                          <span className="line-through text-gray-400">
                            {String(diff.old)}
                          </span>{" "}
                          →{" "}
                        </>
                      )}
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {diff?.new !== null && diff?.new !== undefined
                          ? String(diff.new)
                          : "Removed"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

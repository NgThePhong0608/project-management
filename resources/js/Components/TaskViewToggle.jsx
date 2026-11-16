import React from "react";
import { router } from "@inertiajs/react";
import { LayoutGrid, List } from "lucide-react";

export default function TaskViewToggle({
  routeName,
  routeParams = {},
  queryParams = {},
}) {
  const currentView = queryParams?.view === "kanban" ? "kanban" : "list";

  const switchView = (nextView) => {
    if (nextView === currentView) {
      return;
    }

    const nextQuery = { ...(queryParams || {}) };
    if (nextView === "kanban") {
      nextQuery.view = "kanban";
      delete nextQuery.page;
    } else {
      delete nextQuery.view;
    }

    router.get(route(routeName, routeParams), nextQuery, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 p-0.5">
      <button
        type="button"
        onClick={() => switchView("list")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          currentView === "list"
            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xs"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <List className="h-3.5 w-3.5" />
        <span>List</span>
      </button>
      <button
        type="button"
        onClick={() => switchView("kanban")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          currentView === "kanban"
            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xs"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Kanban</span>
      </button>
    </div>
  );
}

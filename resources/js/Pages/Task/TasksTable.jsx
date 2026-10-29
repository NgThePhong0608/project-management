import React from "react";
import TableHeading from "@/Components/TableHeading";
import { router, Link } from "@inertiajs/react";
import Pagination from "@/Components/Pagination";
import { TASK_STATUS_CLASS_MAP, TASK_STATUS_TEXT_MAP } from "@/constants.jsx";
import TextInput from "@/Components/TextInput";
import SelectInput from "@/Components/SelectInput";

const TasksTable = ({
  tasks,
  queryParams = null,
  hideProjectColumn = false,
  routeName = "task.index",
  routeParams = {},
  success,
}) => {
  queryParams = queryParams || {};

  const quickAssignTask = (task, assignedUserId) => {
    if (
      !assignedUserId ||
      Number(assignedUserId) === Number(task.assigned_user_id)
    ) {
      return;
    }
    router.patch(
      route("task.quickAssign", task.id),
      { assigned_user_id: Number(assignedUserId) },
      { preserveScroll: true },
    );
  };

  const searchFieldChanged = (name, value) => {
    if (value) {
      queryParams[name] = value;
    } else {
      delete queryParams[name];
    }

    router.get(route(routeName, { ...routeParams, ...queryParams }));
  };

  const onKeyPress = (name, e) => {
    if (e.key === "Enter") {
      searchFieldChanged(name, e.target.value);
    }
  };

  const sortChanged = (name) => {
    if (queryParams.sort_field === name) {
      if (queryParams.sort_direction === "asc") {
        queryParams.sort_direction = "desc";
      } else {
        queryParams.sort_direction = "asc";
      }
    } else {
      queryParams.sort_field = name;
      queryParams.sort_direction = "asc";
    }

    router.get(route(routeName, { ...routeParams, ...queryParams }));
  };

  const deleteTask = (task) => {
    if (!window.confirm("Are you sure you want to delete the task?")) {
      return;
    }
    router.delete(route("task.destroy", task.id));
  };
  return (
    <>
      {success && (
        <div className="bg-emerald-500 py-2 px-4 text-white rounded mb-4">
          {success}
        </div>
      )}
      <div className="overflow-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
            <tr className="text-nowrap">
              <TableHeading
                name="id"
                sort_field={queryParams.sort_field}
                sort_direction={queryParams.sort_direction}
                sortChanged={sortChanged}
              >
                ID
              </TableHeading>
              <th className="px-3 py-3">Image</th>
              {!hideProjectColumn && (
                <th className="px-3 py-3">Project Name</th>
              )}
              <TableHeading
                name="name"
                sort_field={queryParams.sort_field}
                sort_direction={queryParams.sort_direction}
                sortChanged={sortChanged}
              >
                Name
              </TableHeading>

              <TableHeading
                name="status"
                sort_field={queryParams.sort_field}
                sort_direction={queryParams.sort_direction}
                sortChanged={sortChanged}
              >
                Status
              </TableHeading>

              <th className="px-3 py-3">Assigned</th>

              <TableHeading
                name="created_at"
                sort_field={queryParams.sort_field}
                sort_direction={queryParams.sort_direction}
                sortChanged={sortChanged}
              >
                Create Date
              </TableHeading>

              <TableHeading
                name="due_date"
                sort_field={queryParams.sort_field}
                sort_direction={queryParams.sort_direction}
                sortChanged={sortChanged}
              >
                Due Date
              </TableHeading>
              <th className="px-3 py-3">Created By</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
            <tr className="text-nowrap">
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3"></th>
              {!hideProjectColumn && <th className="px-3 py-3"></th>}
              <th className="px-3 py-3">
                <TextInput
                  className="w-full"
                  defaultValue={queryParams.name}
                  placeholder="Task Name"
                  onBlur={(e) => searchFieldChanged("name", e.target.value)}
                  onKeyPress={(e) => onKeyPress("name", e)}
                />
              </th>
              <th className="px-3 py-3">
                <SelectInput
                  className="w-full"
                  defaultValue={queryParams.status}
                  onChange={(e) => searchFieldChanged("status", e.target.value)}
                >
                  <option value="">Select Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </SelectInput>
              </th>
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3"></th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.data.map((task) => (
              <tr
                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                key={task.id}
              >
                <td className="px-3 py-2">{task.id}</td>
                <td className="px-3 py-2">
                  {task.image_path ? (
                    <img
                      src={task.image_path}
                      alt={task.name}
                      style={{ width: 60 }}
                      className="rounded object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      No image
                    </span>
                  )}
                </td>
                {!hideProjectColumn && (
                  <td className="px-3 py-2">{task.project.name}</td>
                )}
                <th className="px-3 py-2 text-gray-100 hover:underline">
                  <Link href={route("task.show", task.id)}>{task.name}</Link>
                </th>
                <td className="px-3 py-2">
                  <span
                    className={
                      "px-2 py-1 rounded text-nowrap text-white " +
                      TASK_STATUS_CLASS_MAP[task.status]
                    }
                  >
                    {TASK_STATUS_TEXT_MAP[task.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-nowrap">
                  <div className="flex flex-col gap-1.5">
                    {task.assignedUser ? (
                      <Link
                        href={route("user.show", task.assignedUser.id)}
                        className="inline-flex items-center gap-2 hover:underline text-gray-900 dark:text-gray-100"
                      >
                        {task.assignedUser.avatar_url ? (
                          <img
                            src={task.assignedUser.avatar_url}
                            alt={task.assignedUser.name}
                            className="h-6 w-6 rounded-full object-cover ring-1 ring-gray-300 dark:ring-gray-600"
                          />
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white">
                            {task.assignedUser.name?.charAt(0)?.toUpperCase() ||
                              "?"}
                          </span>
                        )}
                        <div>
                          <div className="font-medium leading-tight">
                            {task.assignedUser.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {task.assignedUser.email}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Unassigned
                      </span>
                    )}

                    {task.can?.quickAssign &&
                      (task.project?.assignable_members?.length || 0) > 0 && (
                        <select
                          value={
                            task.assigned_user_id || task.assignedUser?.id || ""
                          }
                          onChange={(e) =>
                            quickAssignTask(task, e.target.value)
                          }
                          className="text-xs rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 py-1 pl-2 pr-7 focus:ring-indigo-500 focus:border-indigo-500"
                          title="Quick assign task to a project member (Admin & Manager)"
                        >
                          <option value="">-- Reassign member --</option>
                          {task.project.assignable_members.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      )}
                  </div>
                </td>
                <td className="px-3 py-2 text-nowrap">{task.created_at}</td>
                <td className="px-3 py-2 text-nowrap">{task.due_date}</td>
                <td className="px-3 py-2">{task.createdBy.name}</td>
                <td className="px-3 py-2 text-nowrap">
                  {task.can?.update && (
                    <Link
                      href={route("task.edit", task.id)}
                      className="font-medium text-blue-600 dark:text-blue-500 hover:underline mx-1"
                    >
                      Edit
                    </Link>
                  )}
                  {task.can?.delete && (
                    <button
                      onClick={(e) => deleteTask(task)}
                      className="font-medium text-red-600 dark:text-red-500 hover:underline mx-1"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination links={tasks.meta.links} />
    </>
  );
};

export default TasksTable;

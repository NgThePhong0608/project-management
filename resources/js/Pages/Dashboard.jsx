import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  PROJECT_STATUS_CLASS_MAP,
  PROJECT_STATUS_TEXT_MAP,
  TASK_STATUS_CLASS_MAP,
  TASK_STATUS_TEXT_MAP,
} from "@/constants";
import { Head, Link } from "@inertiajs/react";

const ROLE_BADGE_MAP = {
  owner: {
    label: "Owner",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-400/30",
  },
  manager: {
    label: "Manager",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-400/30",
  },
  member: {
    label: "Joined",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-400/30",
  },
};

export default function Dashboard({
  auth,
  totalPendingTasks,
  myPendingTasks,
  totalProgressTasks,
  myProgressTasks,
  totalCompletedTasks,
  myCompletedTasks,
  activeTasks,
  projectsOverview = { data: [] },
}) {
  const projectsList = projectsOverview?.data || [];

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
          Dashboard
        </h2>
      }
    >
      <Head title="Dashboard" />

      <div className="py-12 space-y-4">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <h3 className="text-amber-500 text-2xl font-semibold">
                Pending Tasks
              </h3>
              <p className="text-xl mt-4">
                <span className="mr-2">{myPendingTasks}</span>/
                <span className="ml-2">{totalPendingTasks}</span>
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <h3 className="text-blue-500 text-2xl font-semibold">
                In Progress Tasks
              </h3>
              <p className="text-xl mt-4">
                <span className="mr-2">{myProgressTasks}</span>/
                <span className="ml-2">{totalProgressTasks}</span>
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <h3 className="text-green-500 text-2xl font-semibold">
                Completed Tasks
              </h3>
              <p className="text-xl mt-4">
                <span className="mr-2">{myCompletedTasks}</span>/
                <span className="ml-2">{totalCompletedTasks}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-gray-800 dark:text-gray-200 text-xl font-semibold">
                    {auth.user.role === "admin"
                      ? "All Projects Overview"
                      : "Projects Joined & Managed"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {auth.user.role === "admin"
                      ? "Overview of all projects, member counts, and task totals across the workspace."
                      : "Projects you created, manage, or joined as a team member."}
                  </p>
                </div>
                <Link
                  href={route("project.index")}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View all projects →
                </Link>
              </div>

              <div className="overflow-auto">
                <table className="mt-2 w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
                    <tr>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">Project Name</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Members</th>
                      <th className="px-3 py-3">Tasks</th>
                      <th className="px-3 py-3">My Access</th>
                      <th className="px-3 py-3">Created By</th>
                      <th className="px-3 py-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-6 text-center text-gray-400 italic"
                        >
                          No projects found.
                        </td>
                      </tr>
                    ) : (
                      projectsList.map((project) => {
                        const preview = project.members_preview || [];
                        const count = project.members_count ?? 0;
                        const remaining = Math.max(0, count - preview.length);
                        const roleBadge =
                          ROLE_BADGE_MAP[project.my_project_role] ||
                          (auth.user.role === "admin"
                            ? {
                                label: "Admin View",
                                className:
                                  "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-400/30",
                              }
                            : null);

                        return (
                          <tr
                            key={project.id}
                            className="border-b dark:border-gray-700"
                          >
                            <td className="px-3 py-2.5">{project.id}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white hover:underline">
                              <Link href={route("project.show", project.id)}>
                                {project.name}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-nowrap">
                              <span
                                className={
                                  "px-2 py-1 rounded text-white " +
                                  PROJECT_STATUS_CLASS_MAP[project.status]
                                }
                              >
                                {PROJECT_STATUS_TEXT_MAP[project.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {preview.map((member) =>
                                    member.avatar_url ? (
                                      <img
                                        key={member.id}
                                        src={member.avatar_url}
                                        alt={member.name}
                                        title={`${member.name}${member.role ? ` (${member.role})` : ""}`}
                                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover"
                                      />
                                    ) : (
                                      <span
                                        key={member.id}
                                        title={`${member.name}${member.role ? ` (${member.role})` : ""}`}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white ring-2 ring-white dark:ring-gray-800"
                                      >
                                        {member.name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "?"}
                                      </span>
                                    ),
                                  )}
                                  {remaining > 0 && (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-200 ring-2 ring-white dark:ring-gray-800">
                                      +{remaining}
                                    </span>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-nowrap">
                                  {count} {count === 1 ? "member" : "members"}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-nowrap">
                              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
                                {project.tasks_count ?? 0} tasks
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-nowrap">
                              {roleBadge && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.className}`}
                                >
                                  {roleBadge.label}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-nowrap">
                              {project.createdBy?.name}
                            </td>
                            <td className="px-3 py-2.5 text-nowrap">
                              {project.due_date}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              <h3 className="text-gray-800 dark:text-gray-200 text-xl font-semibold">
                My Active Tasks
              </h3>

              <table className="mt-3 w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b-2 border-gray-500">
                  <tr>
                    <th className="px-3 py-3">ID</th>
                    <th className="px-3 py-3">Project Name</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTasks.data.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2">{task.id}</td>
                      <td className="px-3 py-2 text-white hover:underline">
                        <Link href={route("project.show", task.project.id)}>
                          {task.project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-white hover:underline">
                        <Link href={route("task.show", task.id)}>
                          {task.name}
                        </Link>
                      </td>
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
                      <td className="px-3 py-2 text-nowrap">{task.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

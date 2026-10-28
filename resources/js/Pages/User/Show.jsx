import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import LoginHistoryList from "@/Pages/Profile/Partials/LoginHistoryList";
import TasksTable from "@/Pages/Task/TasksTable";

const Show = ({ auth, user, tasks, queryParams, loginHistories = [] }) => {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
            {`User "${user.name}"`}
          </h2>
          {auth.user.role === "admin" && (
            <Link
              href={route("user.edit", user.id)}
              className="bg-emerald-500 py-1.5 px-3 text-sm text-white rounded shadow transition-all hover:bg-emerald-600"
            >
              Edit User
            </Link>
          )}
          {auth.user.role !== "admin" && auth.user.id === user.id && (
            <Link
              href={route("profile.edit")}
              className="bg-indigo-600 py-1.5 px-3 text-sm text-white rounded shadow transition-all hover:bg-indigo-700"
            >
              Edit Profile
            </Link>
          )}
        </div>
      }
    >
      <Head title={`User "${user.name}"`} />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
          {/* User Profile Overview Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
            {user.cover_url ? (
              <div className="h-36 sm:h-44 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={user.cover_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
            )}

            <div className="p-6 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-end -mt-14 sm:-mt-16 mb-6 gap-4">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-800 shadow-lg bg-white dark:bg-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 ring-4 ring-white dark:ring-gray-800 shadow-lg flex items-center justify-center text-white text-3xl font-bold uppercase">
                    {user.name?.charAt(0) || "U"}
                  </div>
                )}

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs uppercase font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                    User ID
                  </label>
                  <p className="mt-1">{user.id}</p>
                </div>
                <div>
                  <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                    Role
                  </label>
                  <p className="mt-1 uppercase font-medium">{user.role}</p>
                </div>
                <div>
                  <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                    Created At
                  </label>
                  <p className="mt-1">{user.created_at}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Tasks Card */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Assigned Tasks
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tasks assigned to {user.name} in projects you participate in.
              </p>
            </div>
            {tasks &&
            tasks.data &&
            (tasks.data.length > 0 ||
              queryParams?.name ||
              queryParams?.status) ? (
              <TasksTable
                tasks={tasks}
                queryParams={queryParams}
                hideProjectColumn={false}
                routeName="user.show"
                routeParams={{ user: user.id }}
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No tasks assigned to this user in your shared projects.
              </p>
            )}
          </div>

          {/* User Login & Logout History Card - only visible to admin or self */}
          {loginHistories && loginHistories.length > 0 && (
            <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
              <LoginHistoryList
                title={`Login & Logout History — ${user.name}`}
                description="Audit trail of recent sign-in, sign-out, and automatic inactivity logout events for this user."
                histories={loginHistories}
                showUserColumn={false}
              />
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

export default Show;

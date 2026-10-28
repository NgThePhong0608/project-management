import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import {
  ShieldCheckIcon,
  BellIcon,
  ClockIcon,
  CheckBadgeIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function Show({ auth, notification }) {
  const data = notification?.data || {};
  const isSecurity = data.type === "security";
  const title = data.title || data.task_name || "Notification Detail";
  const category =
    data.project_name ||
    (isSecurity ? "Account Security" : "System Notification");

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
              {title}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isSecurity
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
              }`}
            >
              {category}
            </span>
          </div>
          <Link
            href={route("dashboard")}
            className="inline-flex items-center space-x-1.5 bg-gray-100 dark:bg-gray-700 py-1.5 px-3 text-sm text-gray-700 dark:text-gray-200 rounded shadow-sm transition-all hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      }
    >
      <Head title={`Notification - ${title}`} />

      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="p-6 sm:p-8 text-gray-900 dark:text-gray-100">
              {/* Top Banner */}
              <div className="flex items-start space-x-4 pb-6 border-b border-gray-100 dark:border-gray-700">
                <div
                  className={`p-3 rounded-xl flex-shrink-0 ${
                    isSecurity
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                      : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {isSecurity ? (
                    <ShieldCheckIcon className="w-7 h-7" />
                  ) : (
                    <BellIcon className="w-7 h-7" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {data.task_name || title}
                    </h3>
                    <span className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                      <CheckBadgeIcon className="w-4 h-4" />
                      <span>Read</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      Received {notification.created_at_human} (
                      {notification.created_at})
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="mt-6">
                <label className="font-semibold text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Message
                </label>
                <div className="mt-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/80 text-base leading-relaxed text-gray-800 dark:text-gray-200">
                  {data.message || "No additional message provided."}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid gap-6 sm:grid-cols-2 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Notification ID
                    </label>
                    <p className="mt-1 font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                      {notification.id}
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Category
                    </label>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">
                      {category}
                    </p>
                  </div>
                </div>

                <div>
                  <div>
                    <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                      Created At
                    </label>
                    <p className="mt-1 text-gray-800 dark:text-gray-200">
                      {notification.created_at}
                    </p>
                  </div>

                  {data.changed_at && (
                    <div className="mt-4">
                      <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                        Event Timestamp
                      </label>
                      <p className="mt-1 text-gray-800 dark:text-gray-200">
                        {data.changed_at}
                      </p>
                    </div>
                  )}

                  {notification.read_at && (
                    <div className="mt-4">
                      <label className="font-bold text-sm text-gray-500 dark:text-gray-400">
                        Read At
                      </label>
                      <p className="mt-1 text-gray-800 dark:text-gray-200">
                        {notification.read_at}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer for Security Notifications */}
              {isSecurity && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Want to review your account details or update your password
                    again?
                  </p>
                  <Link
                    href={route("profile.edit")}
                    className="bg-blue-600 py-2 px-4 text-sm font-medium text-white rounded-lg shadow transition-all hover:bg-blue-700"
                  >
                    Go to Profile Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

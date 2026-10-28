import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DeleteUserForm from "./Partials/DeleteUserForm";
import LoginHistoryList from "./Partials/LoginHistoryList";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";
import { Head } from "@inertiajs/react";
import {
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const ROLE_BADGE_MAP = {
  admin:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  manager:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  member:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

export default function Edit({
  auth,
  mustVerifyEmail,
  status,
  loginHistories = [],
  memberLoginHistories = [],
}) {
  const user = auth.user;
  const roleKey = (user.role || "member").toLowerCase();
  const roleBadgeClass = ROLE_BADGE_MAP[roleKey] || ROLE_BADGE_MAP.member;
  const isVerified = Boolean(user.email_verified_at);
  const idleTimeout = auth?.sessionIdleTimeout || 15;
  const isAdmin = roleKey === "admin";

  return (
    <AuthenticatedLayout
      user={user}
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
              Account Settings & Profile
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your personal details, avatar, cover photo, security
              preferences, and activity logs
            </p>
          </div>
        </div>
      }
    >
      <Head title="Profile" />

      <div className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
          {/* Hero Profile Banner Card */}
          <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {user.cover_url ? (
              <div className="h-36 sm:h-48 w-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={user.cover_url}
                  alt={`${user.name} cover`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-32 sm:h-40 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
            )}

            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end -mt-12 sm:-mt-14 gap-4 sm:gap-6">
                <div className="relative inline-block">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-800 shadow-lg bg-white dark:bg-gray-700"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 ring-4 ring-white dark:ring-gray-800 shadow-lg flex items-center justify-center text-white text-3xl sm:text-4xl font-bold uppercase">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                      {user.name}
                    </h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${roleBadgeClass}`}
                    >
                      {user.role || "member"}
                    </span>
                    {isVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        <span>Unverified Email</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Profile Info, Password & Activity Logs */}
            <div className="lg:col-span-8 space-y-6">
              <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
                <UpdateProfileInformationForm
                  mustVerifyEmail={mustVerifyEmail}
                  status={status}
                />
              </div>

              <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
                <UpdatePasswordForm />
              </div>

              <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
                <LoginHistoryList
                  title="My Login & Logout Activity"
                  description="Your recent sign-in, sign-out, and automatic inactivity logout events."
                  histories={loginHistories}
                  showUserColumn={false}
                />
              </div>

              {isAdmin && (
                <div className="p-6 sm:p-8 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <LoginHistoryList
                    title="Members Login & Logout Activity (Admin View)"
                    description="Audit trail of recent login and logout sessions across Manager and Member accounts."
                    histories={memberLoginHistories}
                    showUserColumn={true}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Security Summary & Danger Zone */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Security & Session Overview
                  </h3>
                </div>

                <div className="mt-4 space-y-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <UserCircleIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Role Permissions
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Signed in with{" "}
                        <span className="font-semibold uppercase">
                          {user.role || "member"}
                        </span>{" "}
                        privileges.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Auto-Logout Protection
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Your session automatically locks after{" "}
                        <span className="font-semibold">
                          {idleTimeout} minutes
                        </span>{" "}
                        of inactivity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CheckBadgeIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Security Alerts & Audit Logs
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Login/logout history and real-time password change
                        alerts are active.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 shadow-sm sm:rounded-2xl border border-red-100 dark:border-red-900/40">
                <DeleteUserForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

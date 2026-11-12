import React from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Button } from "@/Components/ui/button";
import {
  FileQuestion,
  ShieldAlert,
  Lock,
  ServerCrash,
  AlertTriangle,
  ArrowLeft,
  Home,
  RotateCcw,
  LogIn,
  FolderKanban,
  CheckSquare,
  Bell,
} from "lucide-react";

export default function Error({ status, message, auth }) {
  const statusCode = Number(status) || 404;

  const errorConfig = {
    401: {
      badge: "401 Unauthorized",
      title: "Authentication Required",
      subtitle:
        "Your session may have expired or you need to log in to access this page.",
      icon: LogIn,
      iconColor: "text-amber-500 dark:text-amber-400",
      iconBg:
        "bg-amber-100 dark:bg-amber-950/50 ring-amber-200 dark:ring-amber-900/50",
      glowColor: "from-amber-500/20 to-orange-500/0",
      primaryAction: {
        label: "Sign In",
        href: route("login"),
        icon: LogIn,
      },
    },
    403: {
      badge: "403 Forbidden",
      title: "Access Denied",
      subtitle:
        message ||
        "You do not have permission to view this resource or perform this action. If you believe this is a mistake, please reach out to your team manager or administrator.",
      icon: ShieldAlert,
      iconColor: "text-rose-500 dark:text-rose-400",
      iconBg:
        "bg-rose-100 dark:bg-rose-950/50 ring-rose-200 dark:ring-rose-900/50",
      glowColor: "from-rose-500/20 to-red-500/0",
      primaryAction: {
        label: "Back to Dashboard",
        href: route("dashboard"),
        icon: Home,
      },
    },
    404: {
      badge: "404 Not Found",
      title: "Page Not Found",
      subtitle:
        message ||
        "Sorry, we couldn’t find the page or resource you’re looking for. It might have been moved, renamed, or deleted.",
      icon: FileQuestion,
      iconColor: "text-indigo-500 dark:text-indigo-400",
      iconBg:
        "bg-indigo-100 dark:bg-indigo-950/50 ring-indigo-200 dark:ring-indigo-900/50",
      glowColor: "from-indigo-500/20 to-blue-500/0",
      primaryAction: {
        label: "Back to Dashboard",
        href: route("dashboard"),
        icon: Home,
      },
    },
    419: {
      badge: "419 Page Expired",
      title: "Page Has Expired",
      subtitle:
        "Your page session timed out due to inactivity. Please refresh the page and try again.",
      icon: Lock,
      iconColor: "text-sky-500 dark:text-sky-400",
      iconBg: "bg-sky-100 dark:bg-sky-950/50 ring-sky-200 dark:ring-sky-900/50",
      glowColor: "from-sky-500/20 to-cyan-500/0",
      primaryAction: {
        label: "Reload Page",
        onClick: () => window.location.reload(),
        icon: RotateCcw,
      },
    },
    500: {
      badge: "500 Server Error",
      title: "Something Went Wrong",
      subtitle:
        "Our servers encountered an unexpected issue while processing your request. Our team has been notified. Please try again shortly.",
      icon: ServerCrash,
      iconColor: "text-red-500 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-950/50 ring-red-200 dark:ring-red-900/50",
      glowColor: "from-red-500/20 to-rose-500/0",
      primaryAction: {
        label: "Reload Page",
        onClick: () => window.location.reload(),
        icon: RotateCcw,
      },
    },
    503: {
      badge: "503 Maintenance",
      title: "Service Under Maintenance",
      subtitle:
        "We are performing routine scheduled maintenance. We’ll be back up and running very shortly.",
      icon: AlertTriangle,
      iconColor: "text-amber-500 dark:text-amber-400",
      iconBg:
        "bg-amber-100 dark:bg-amber-950/50 ring-amber-200 dark:ring-amber-900/50",
      glowColor: "from-amber-500/20 to-yellow-500/0",
      primaryAction: {
        label: "Try Again",
        onClick: () => window.location.reload(),
        icon: RotateCcw,
      },
    },
  };

  const current = errorConfig[statusCode] || errorConfig[404];
  const IconComponent = current.icon;
  const PrimaryActionIcon = current.primaryAction.icon;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = auth?.user ? route("dashboard") : "/";
    }
  };

  const content = (
    <div className="relative overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-32 w-96 h-96 rounded-full bg-gradient-to-b ${current.glowColor} blur-3xl pointer-events-none opacity-60 dark:opacity-40`}
        aria-hidden="true"
      />

      {/* Status Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {current.badge}
      </span>

      {/* Main Illustration / Icon */}
      <div className="relative mb-6">
        <div
          className={`p-6 sm:p-7 rounded-3xl ring-8 ${current.iconBg} shadow-xl transition-transform hover:scale-105 duration-200`}
        >
          <IconComponent
            className={`h-16 w-16 sm:h-20 sm:w-20 ${current.iconColor}`}
          />
        </div>
      </div>

      {/* Text Content */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight max-w-xl">
        {current.title}
      </h1>

      <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
        {current.subtitle}
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={handleGoBack}
          className="gap-2 text-sm font-medium border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go Back</span>
        </Button>

        {current.primaryAction.onClick ? (
          <Button
            size="default"
            onClick={current.primaryAction.onClick}
            className="gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <PrimaryActionIcon className="h-4 w-4" />
            <span>{current.primaryAction.label}</span>
          </Button>
        ) : (
          <Link href={current.primaryAction.href}>
            <Button
              size="default"
              className="gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <PrimaryActionIcon className="h-4 w-4" />
              <span>{current.primaryAction.label}</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Helpful Quick Links (for authenticated users) */}
      {auth?.user && (
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800/80 w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Helpful Links
          </p>
          <div className="flex items-center justify-center gap-6 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Link
              href={route("project.index")}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Projects</span>
            </Link>
            <Link
              href={route("task.index")}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Tasks</span>
            </Link>
            <Link
              href={route("notifications.index")}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Notifications</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  // If user is authenticated, keep them inside the application layout with sidebar and navbar
  if (auth?.user) {
    return (
      <AuthenticatedLayout user={auth.user}>
        <Head title={`${statusCode} - ${current.title}`} />
        <div className="py-6 sm:py-12">{content}</div>
      </AuthenticatedLayout>
    );
  }

  // If guest, render clean standalone page
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-between">
      <Head title={`${statusCode} - ${current.title}`} />

      {/* Guest Topbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200/80 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <Link
          href="/"
          className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
            PM
          </div>
          <span>Project Management</span>
        </Link>
        <Link href={route("login")}>
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center">{content}</main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200/60 dark:border-gray-800">
        &copy; {new Date().getFullYear()} Project Management. All rights
        reserved.
      </footer>
    </div>
  );
}

import * as React from "react";
import { Link, usePage } from "@inertiajs/react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  useSidebar,
} from "@/Components/ui/sidebar";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  LogOut,
} from "lucide-react";

export default function ShadcnSidebar({ unreadChatCount = 0 }) {
  const { auth } = usePage().props;
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();

  const navigation = [
    {
      name: "Dashboard",
      href: route("dashboard"),
      icon: LayoutDashboard,
      active: route().current("dashboard"),
    },
    {
      name: "Projects",
      href: route("project.index"),
      icon: FolderKanban,
      active: route().current("project.index"),
    },
    {
      name: "Tasks",
      href: route("task.index"),
      icon: CheckSquare,
      active: route().current("task.index"),
    },
    {
      name: "Messages",
      href: route("chat.index"),
      icon: MessageSquare,
      active: route().current("chat.*"),
      badge:
        unreadChatCount > 0
          ? unreadChatCount > 9
            ? "9+"
            : unreadChatCount
          : null,
    },
    {
      name: "Notifications",
      href: route("notifications.index"),
      icon: Bell,
      active: route().current("notifications.*"),
    },
    ...(auth?.can?.manageUsers
      ? [
          {
            name: "Users",
            href: route("user.index"),
            icon: Users,
            active: route().current("user.index"),
          },
        ]
      : []),
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header with App Logo and Workspace badge */}
      <SidebarHeader>
        <Link
          href="/"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 overflow-hidden p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
            state === "collapsed" ? "justify-center" : ""
          }`}
        >
          <ApplicationLogo className="h-8 w-8 shrink-0 fill-current text-indigo-600 dark:text-indigo-400" />
          {state === "expanded" && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100 truncate">
                PM System
              </span>
              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">
                {auth?.subdomainSlug ? `sess:${auth.subdomainSlug}` : "primary"}
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className="block w-full"
                    >
                      <SidebarMenuButton
                        isActive={item.active}
                        tooltip={item.name}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {state === "expanded" && <span>{item.name}</span>}
                        {item.badge && (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        )}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Avatar, Logout, and Toggle Button */}
      <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-2 space-y-2">
        {state === "expanded" ? (
          <>
            {/* User Profile Card */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50">
              <Link
                href={route("profile.edit")}
                onClick={handleLinkClick}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition"
                title="Edit Profile"
              >
                {auth?.user?.avatar_url ? (
                  <img
                    src={auth.user.avatar_url}
                    alt={auth.user.name}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-300 dark:ring-gray-600 shrink-0"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white shrink-0">
                    {auth?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {auth?.user?.name}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {auth?.user?.email}
                  </span>
                </div>
              </Link>

              {/* Logout Button */}
              <Link
                href={route("logout")}
                method="post"
                as="button"
                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition shrink-0 ml-1"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </div>

            {/* Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex w-full items-center justify-between rounded-md p-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Collapse sidebar (Ctrl+B)"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Collapse Sidebar
              </span>
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* User Avatar with Tooltip */}
            <div className="relative group/user">
              <Link
                href={route("profile.edit")}
                onClick={handleLinkClick}
                className="block hover:opacity-80 transition"
                title={auth?.user?.name}
              >
                {auth?.user?.avatar_url ? (
                  <img
                    src={auth.user.avatar_url}
                    alt={auth.user.name}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-300 dark:ring-gray-600"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                    {auth?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </Link>
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/user:flex items-center z-50">
                <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap">
                  {auth?.user?.name} ({auth?.user?.role})
                </div>
              </div>
            </div>

            {/* Quick Logout with Tooltip */}
            <div className="relative group/logout">
              <Link
                href={route("logout")}
                method="post"
                as="button"
                className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </Link>
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/logout:flex items-center z-50">
                <div className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md dark:bg-gray-100 dark:text-gray-900 whitespace-nowrap">
                  Log Out
                </div>
              </div>
            </div>

            {/* Expand Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
              title="Expand sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

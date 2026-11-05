import * as React from "react";
import { Link, usePage } from "@inertiajs/react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
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
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
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

      {/* Footer with Toggle Button */}
      <SidebarFooter>
        <button
          type="button"
          onClick={toggleSidebar}
          className={`flex items-center rounded-md p-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
            state === "collapsed" ? "justify-center" : "justify-between"
          }`}
          title={
            state === "collapsed"
              ? "Expand sidebar (Ctrl+B)"
              : "Collapse sidebar (Ctrl+B)"
          }
        >
          {state === "expanded" && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Collapse Sidebar
            </span>
          )}
          {state === "collapsed" ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

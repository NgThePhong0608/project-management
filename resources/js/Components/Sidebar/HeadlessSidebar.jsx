import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Link, usePage } from "@inertiajs/react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import {
  Squares2X2Icon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

export default function HeadlessSidebar({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  unreadChatCount = 0,
}) {
  const { auth } = usePage().props;

  const navigation = [
    {
      name: "Dashboard",
      href: route("dashboard"),
      icon: Squares2X2Icon,
      active: route().current("dashboard"),
    },
    {
      name: "Projects",
      href: route("project.index"),
      icon: FolderIcon,
      active: route().current("project.index"),
    },
    {
      name: "Tasks",
      href: route("task.index"),
      icon: ClipboardDocumentListIcon,
      active: route().current("task.index"),
    },
    {
      name: "Messages",
      href: route("chat.index"),
      icon: ChatBubbleLeftRightIcon,
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
            icon: UsersIcon,
            active: route().current("user.index"),
          },
        ]
      : []),
  ];

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("pm_sidebar_collapsed", next ? "true" : "false");
      return next;
    });
  };

  return (
    <>
      {/* Mobile Drawer (Headless UI Dialog & Transition) */}
      <Transition.Root show={mobileOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setMobileOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-4 shadow-xl">
                  {/* Mobile Header */}
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700">
                    <Link
                      href="/"
                      className="flex items-center gap-3"
                      onClick={() => setMobileOpen(false)}
                    >
                      <ApplicationLogo className="h-8 w-auto fill-current text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-lg text-gray-900 dark:text-white">
                        PM System
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="-m-2.5 p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Navigation List */}
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-1.5">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`group flex items-center justify-between gap-x-3 rounded-lg p-2.5 text-sm font-semibold transition ${
                              item.active
                                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon
                                className={`h-5 w-5 shrink-0 ${
                                  item.active
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                }`}
                              />
                              <span>{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>

                  {/* Session Slug Badge */}
                  {auth?.subdomainSlug && (
                    <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                      Active Subdomain:{" "}
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {auth.subdomainSlug}
                      </span>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Persistent Collapsible Sidebar */}
      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        {/* Header / Brand */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700 px-4 justify-between">
          <Link
            href="/"
            className={`flex items-center gap-3 overflow-hidden ${
              isCollapsed ? "justify-center w-full" : ""
            }`}
          >
            <ApplicationLogo className="h-8 w-8 shrink-0 fill-current text-indigo-600 dark:text-indigo-400" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base text-gray-900 dark:text-white truncate">
                  PM System
                </span>
                {auth?.subdomainSlug && (
                  <span className="text-[11px] font-mono text-gray-400 truncate">
                    sess: {auth.subdomainSlug}
                  </span>
                )}
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <nav className="flex-1 space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-lg py-2.5 text-sm font-medium transition ${
                      isCollapsed
                        ? "justify-center px-2"
                        : "justify-between px-3"
                    } ${
                      item.active
                        ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-indigo-600 dark:hover:text-indigo-400"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          item.active
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-400 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        }`}
                      />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>

                    {/* Unread badge */}
                    {item.badge && (
                      <span
                        className={`inline-flex items-center justify-center rounded-full bg-red-500 font-bold text-white ${
                          isCollapsed
                            ? "absolute top-1 right-2 h-4 min-w-[16px] px-1 text-[10px]"
                            : "px-2 py-0.5 text-xs"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Tooltip on hover when collapsed */}
                  {isCollapsed && (
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex items-center z-50">
                      <div className="bg-gray-900 text-white text-xs font-medium rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap dark:bg-gray-700">
                        {item.name}
                        {item.badge && ` (${item.badge})`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer with Collapse Toggle */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center rounded-lg p-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && (
              <span className="text-xs font-semibold uppercase tracking-wider">
                Collapse
              </span>
            )}
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="h-5 w-5" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

import { useState } from "react";
import { Link } from "@inertiajs/react";
import {
  ArrowRightEndOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  ClockIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

const EVENT_BADGE_MAP = {
  login: {
    label: "Login",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: ArrowRightEndOnRectangleIcon,
  },
  logout: {
    label: "Logout",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
    icon: ArrowLeftStartOnRectangleIcon,
  },
  idle_logout: {
    label: "Auto Logout (Idle)",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: ClockIcon,
  },
};

function formatUserAgent(ua) {
  if (!ua) return "Unknown Device";
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/"))
    browser = "Safari";

  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return os ? `${browser} on ${os}` : browser;
}

export default function LoginHistoryList({
  title = "Login & Logout History",
  description = "Recent sign-in and sign-out activity for this account.",
  histories = [],
  showUserColumn = false,
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistories = histories.filter((item) => {
    if (showUserColumn && roleFilter !== "all") {
      if (item.user?.role !== roleFilter) return false;
    }
    if (showUserColumn && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.user?.name?.toLowerCase().includes(q);
      const emailMatch = item.user?.email?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch) return false;
    }
    return true;
  });

  return (
    <section>
      <header className="pb-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>

        {showUserColumn && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter member..."
              className="text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-indigo-500 focus:ring-indigo-500 py-1.5 px-2.5"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-indigo-500 focus:ring-indigo-500 py-1.5 px-2.5"
            >
              <option value="all">All Roles</option>
              <option value="manager">Manager</option>
              <option value="member">Member</option>
            </select>
          </div>
        )}
      </header>

      {filteredHistories.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No login or logout activity recorded yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {showUserColumn && <th className="py-3 px-4">Member</th>}
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Device / Browser</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {filteredHistories.map((item) => {
                const badge =
                  EVENT_BADGE_MAP[item.event] || EVENT_BADGE_MAP.login;
                const IconComponent = badge.icon;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition"
                  >
                    {showUserColumn && (
                      <td className="py-3 px-4">
                        {item.user ? (
                          <div className="flex items-center space-x-2.5">
                            {item.user.avatar_url ? (
                              <img
                                src={item.user.avatar_url}
                                alt={item.user.name}
                                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 uppercase">
                                {item.user.name?.charAt(0) || "U"}
                              </span>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={route("user.show", item.user.id)}
                                className="font-medium text-gray-900 dark:text-gray-100 hover:underline truncate block"
                              >
                                {item.user.name}
                              </Link>
                              <div className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <span className="uppercase font-semibold text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700">
                                  {item.user.role}
                                </span>
                                <span className="truncate">
                                  {item.user.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Deleted User</span>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      <span className="inline-flex items-center space-x-1 text-gray-700 dark:text-gray-300">
                        <GlobeAltIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.ip_address || "N/A"}</span>
                      </span>
                    </td>

                    <td
                      className="py-3 px-4 text-xs"
                      title={item.user_agent || ""}
                    >
                      <span className="inline-flex items-center space-x-1.5 text-gray-700 dark:text-gray-300">
                        <ComputerDesktopIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{formatUserAgent(item.user_agent)}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right text-xs">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.occurred_at_human}
                      </div>
                      <div className="text-gray-400 dark:text-gray-500">
                        {item.occurred_at}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

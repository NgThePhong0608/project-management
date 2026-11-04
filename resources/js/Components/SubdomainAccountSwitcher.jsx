import { useState } from "react";
import { Link, router } from "@inertiajs/react";
import Dropdown from "@/Components/Dropdown";
import Modal from "@/Components/Modal";
import DangerButton from "@/Components/DangerButton";
import SecondaryButton from "@/Components/SecondaryButton";
import axios from "axios";

export default function SubdomainAccountSwitcher({ auth }) {
  const currentUser = auth?.user;
  const currentSlug = auth?.subdomainSlug;
  const activeSessions = auth?.activeSubdomainSessions || [];
  const totalActiveCount =
    auth?.activeSubdomainSessionsCount ?? activeSessions.length;
  const maxSessions = auth?.maxSubdomainSessions || 5;
  const isMultiSessionEnabled = auth?.multiSessionEnabled ?? false;
  const canSwitch =
    auth?.canSwitchSubdomainSessions ?? currentUser?.role === "admin";

  const otherSessions = activeSessions.filter((s) => s.slug !== currentSlug);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const handleEnableMultiSession = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await axios.post(route("auth.multi-session.enable"));
      router.reload();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to enable multi-session.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDisable = async () => {
    setDisabling(true);
    try {
      const res = await axios.post(route("auth.multi-session.disable"));
      window.location.href = res.data?.redirect_url || route("login");
    } catch {
      window.location.href = route("login");
    }
  };

  const handleCreateSession = async () => {
    if (!isMultiSessionEnabled) {
      setErrorMsg("Please enable multi-session mode first.");
      return;
    }

    if (activeSessions.length >= maxSessions) {
      setErrorMsg("Maximum 5 sessions reached. Close an active session first.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.post(route("auth.multi-session.create"));
      if (res.data?.url) {
        const newTab = window.open(res.data.url, "_blank");
        if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
          window.location.href = res.data.url;
        }
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Failed to create new session.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (slug, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.post(route("auth.multi-session.terminate"), { slug });
      if (slug === currentSlug) {
        window.location.href = route("login");
      } else {
        router.reload();
      }
    } catch {
      // Ignore
    }
  };

  const handleTerminateAll = () => {
    router.post(
      route("auth.multi-session.terminate-all"),
      {},
      {
        onFinish: () => {
          window.location.href = route("login");
        },
      },
    );
  };

  if (!currentUser) return null;

  return (
    <div className="ms-3 relative">
      <Dropdown>
        <Dropdown.Trigger>
          <span className="inline-flex rounded-md">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="h-7 w-7 rounded-full object-cover me-2 ring-1 ring-gray-200 dark:ring-gray-700"
                />
              ) : (
                <span className="h-7 w-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center me-2 uppercase">
                  {currentUser.name?.charAt(0) || "U"}
                </span>
              )}
              <div className="flex flex-col text-left">
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {currentUser.name}
                </span>
                <div className="flex items-center space-x-1 -mt-0.5">
                  {currentUser.role && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                      {currentUser.role}
                    </span>
                  )}
                  {currentSlug && (
                    <span className="text-[9px] px-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono rounded">
                      {currentSlug}
                    </span>
                  )}
                </div>
              </div>

              <svg
                className="ms-2 -me-0.5 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        </Dropdown.Trigger>

        <Dropdown.Content contentClasses="py-1 bg-white dark:bg-gray-800 w-80 shadow-xl border border-gray-100 dark:border-gray-700">
          {/* Header Info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                Current Session
              </p>
              {currentSlug && (
                <span className="text-[10px] font-mono bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
                  {currentSlug}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">
              {currentUser.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {currentUser.email}
            </p>
          </div>

          <Dropdown.Link href={route("profile.edit")}>
            Profile Settings
          </Dropdown.Link>

          {/* Multi-Session Mode Toggle & Quota */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMultiSessionEnabled
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  Multi-Session Mode
                </span>
              </div>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                {isMultiSessionEnabled
                  ? `${Math.min(totalActiveCount, maxSessions)} / ${maxSessions}`
                  : "Off"}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              {isMultiSessionEnabled ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDisable(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  Turn OFF Multi-Session
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnableMultiSession}
                  disabled={loading}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  {loading ? "Enabling..." : "Turn ON Multi-Session"}
                </button>
              )}
            </div>
          </div>

          {/* Other Active Subdomain Sessions (Admins only) */}
          {isMultiSessionEnabled && canSwitch && otherSessions.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 py-1">
              <div className="px-4 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Switch Subdomain Session
              </div>
              {otherSessions.map((s) => (
                <div
                  key={s.slug}
                  className="px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group transition duration-150"
                >
                  <a
                    href={
                      s.host
                        ? `${window.location.protocol}//${s.host}/dashboard${auth?.deviceId ? `?device_id=${encodeURIComponent(auth.deviceId)}` : ""}`
                        : "#"
                    }
                    className="flex-1 truncate mr-2"
                  >
                    <div className="flex items-center space-x-1.5">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {s.name}
                      </p>
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {s.role}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-400 truncate">
                      {s.slug}
                    </p>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => handleTerminateSession(s.slug, e)}
                    className="text-gray-400 hover:text-red-500 text-xs px-1.5 py-0.5 rounded opacity-80 hover:opacity-100"
                    title="Close session"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Another Session (Subdomain) (Only if enabled) */}
          {isMultiSessionEnabled && (
            <div className="border-t border-gray-100 dark:border-gray-700 py-1.5 px-3">
              {errorMsg && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-1 px-1">
                  {errorMsg}
                </p>
              )}
              <button
                type="button"
                disabled={loading || activeSessions.length >= maxSessions}
                onClick={handleCreateSession}
                className={`w-full text-left px-3 py-1.5 text-sm rounded flex items-center justify-between transition duration-150 ${
                  activeSessions.length >= maxSessions
                    ? "text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>
                    {loading ? "Allocating session..." : "Add another account"}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Logout Actions */}
          <div className="border-t border-gray-100 dark:border-gray-700 py-1">
            <Dropdown.Link
              href={route("logout")}
              method="post"
              as="button"
              className="w-full text-left"
            >
              Sign out of this session
            </Dropdown.Link>
            {isMultiSessionEnabled && (
              <button
                type="button"
                onClick={handleTerminateAll}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition duration-150 font-medium flex items-center justify-between"
              >
                <span>Sign out of all sessions</span>
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-mono px-1.5 py-0.5 rounded">
                  {totalActiveCount}
                </span>
              </button>
            )}
          </div>
        </Dropdown.Content>
      </Dropdown>

      {/* Confirmation Modal for Disabling Multi-Session */}
      <Modal
        show={confirmingDisable}
        onClose={() => !disabling && setConfirmingDisable(false)}
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Disable Multi-Session Mode?
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Disabling multi-session will immediately sign out all active
            sessions ({totalActiveCount}) across all tabs on this browser.
          </p>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center">
              <span className="mr-1">⚠️</span> Warning: Any unsaved form inputs
              or ongoing tasks in other open tabs will be lost.
            </p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <SecondaryButton
              onClick={() => setConfirmingDisable(false)}
              disabled={disabling}
            >
              Cancel
            </SecondaryButton>
            <DangerButton onClick={handleConfirmDisable} disabled={disabling}>
              {disabling ? "Disabling..." : "Disable & Sign Out All"}
            </DangerButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

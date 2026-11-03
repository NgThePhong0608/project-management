import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import DangerButton from "@/Components/DangerButton";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import { router } from "@inertiajs/react";
import axios from "axios";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  KeyIcon,
  ArrowPathIcon,
  EyeIcon,
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

export default function TwoFactorAuthenticationForm({ user }) {
  const [hasMfa, setHasMfa] = useState(Boolean(user?.has_mfa));
  const [enabling, setEnabling] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Recovery codes display
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Password confirmation modals for privileged actions
  const [activeModalAction, setActiveModalAction] = useState(null); // 'viewCodes' | 'regenerateCodes' | 'disable'
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const startEnabling = async () => {
    setEnabling(true);
    setConfirmError("");
    try {
      const res = await axios.post(route("profile.two-factor.enable"));
      setQrCodeData(res.data);
    } catch (err) {
      setConfirmError(
        err.response?.data?.message ||
          "Failed to initialize two-factor authentication.",
      );
    } finally {
      setEnabling(false);
    }
  };

  const cancelEnabling = () => {
    setQrCodeData(null);
    setConfirmCode("");
    setConfirmError("");
  };

  const confirmTwoFactor = async (e) => {
    e.preventDefault();
    if (!confirmCode) {
      setConfirmError("Please enter the 6-digit verification code.");
      return;
    }

    setConfirming(true);
    setConfirmError("");

    try {
      const res = await axios.post(route("profile.two-factor.confirm"), {
        code: confirmCode,
      });

      setHasMfa(true);
      setQrCodeData(null);
      setConfirmCode("");
      if (res.data?.recovery_codes) {
        setRecoveryCodes(res.data.recovery_codes);
        setShowCodesModal(true);
      }
      router.reload({ only: ["auth"] });
    } catch (err) {
      const msg =
        err.response?.data?.errors?.code?.[0] ||
        err.response?.data?.message ||
        "Invalid authentication code.";
      setConfirmError(msg);
    } finally {
      setConfirming(false);
    }
  };

  const openActionModal = (action) => {
    setActiveModalAction(action);
    setPassword("");
    setPasswordError("");
  };

  const closeActionModal = () => {
    setActiveModalAction(null);
    setPassword("");
    setPasswordError("");
    setActionLoading(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setPasswordError("Please enter your password to continue.");
      return;
    }

    setActionLoading(true);
    setPasswordError("");

    try {
      if (activeModalAction === "viewCodes") {
        const res = await axios.post(
          route("profile.two-factor.recovery-codes"),
          {
            password,
          },
        );
        setRecoveryCodes(res.data?.recovery_codes || []);
        closeActionModal();
        setShowCodesModal(true);
      } else if (activeModalAction === "regenerateCodes") {
        const res = await axios.post(
          route("profile.two-factor.regenerate-recovery-codes"),
          { password },
        );
        setRecoveryCodes(res.data?.recovery_codes || []);
        closeActionModal();
        setShowCodesModal(true);
      } else if (activeModalAction === "disable") {
        await axios.delete(route("profile.two-factor.disable"), {
          data: { password },
        });
        setHasMfa(false);
        setRecoveryCodes([]);
        closeActionModal();
        router.reload({ only: ["auth"] });
      }
    } catch (err) {
      const msg =
        err.response?.data?.errors?.password?.[0] ||
        err.response?.data?.message ||
        "Authentication failed. Please verify your password.";
      setPasswordError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section>
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {hasMfa ? (
              <ShieldCheckIcon className="w-6 h-6 text-emerald-500" />
            ) : (
              <ShieldExclamationIcon className="w-6 h-6 text-amber-500" />
            )}
            Two-Factor Authentication (2FA)
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Add additional security to your account using time-based one-time
            passwords (TOTP) from an authenticator application.
          </p>
        </div>

        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            hasMfa
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
          }`}
        >
          {hasMfa ? "Enabled" : "Not Configured"}
        </span>
      </header>

      {/* When MFA is not configured */}
      {!hasMfa && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">Security Warning:</p>
            <p>
              Two-Factor Authentication is required for account security. If you
              log in 5 consecutive times without setting up 2FA, your account
              will be temporarily locked and will require administrator
              assistance to unlock.
            </p>
          </div>

          {!qrCodeData ? (
            <div>
              <PrimaryButton onClick={startEnabling} disabled={enabling}>
                {enabling
                  ? "Initializing..."
                  : "Enable Two-Factor Authentication"}
              </PrimaryButton>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Step 1: Scan the QR Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Scan this QR code using Google Authenticator, Microsoft
                  Authenticator, 1Password, or any standard TOTP app.
                </p>

                <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                    <QRCodeSVG
                      value={qrCodeData.qr_code_url}
                      size={180}
                      level="M"
                    />
                  </div>

                  <div className="text-sm space-y-2">
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      Can't scan? Use manual setup key:
                    </p>
                    <code className="inline-block px-3 py-1.5 bg-gray-100 dark:bg-gray-800 font-mono text-xs rounded border border-gray-300 dark:border-gray-700 select-all font-semibold tracking-wider text-indigo-600 dark:text-indigo-400">
                      {qrCodeData.secret}
                    </code>
                    <p className="text-xs text-gray-500">
                      Account: <span className="font-medium">{user.email}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Step 2: Enter the 6-Digit Code
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enter the confirmation code generated by your authenticator
                  app to activate 2FA.
                </p>

                <form onSubmit={confirmTwoFactor} className="mt-3 max-w-sm">
                  <div className="flex gap-2">
                    <TextInput
                      type="text"
                      className="font-mono text-center tracking-widest text-lg w-44"
                      placeholder="123456"
                      maxLength={6}
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                    />
                    <PrimaryButton disabled={confirming}>
                      {confirming ? "Verifying..." : "Activate"}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={cancelEnabling}
                      disabled={confirming}
                    >
                      Cancel
                    </SecondaryButton>
                  </div>

                  {confirmError && (
                    <InputError message={confirmError} className="mt-2" />
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* When MFA is enabled */}
      {hasMfa && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
            Two-factor authentication is active. You will be prompted for a
            secure token or recovery code during every sign-in.
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <SecondaryButton
              onClick={() => openActionModal("viewCodes")}
              className="flex items-center gap-2"
            >
              <EyeIcon className="w-4 h-4" />
              Show Recovery Codes
            </SecondaryButton>

            <SecondaryButton
              onClick={() => openActionModal("regenerateCodes")}
              className="flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Regenerate Recovery Codes
            </SecondaryButton>

            <DangerButton
              onClick={() => openActionModal("disable")}
              className="flex items-center gap-2"
            >
              Disable 2FA
            </DangerButton>
          </div>
        </div>
      )}

      {/* Password Confirmation Modal for View / Regenerate / Disable */}
      <Modal
        show={Boolean(activeModalAction)}
        onClose={closeActionModal}
        maxWidth="md"
      >
        <form onSubmit={handleModalSubmit} className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-indigo-500" />
            Confirm Password
          </h2>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            For your security, please confirm your current password to continue.
          </p>

          <div className="mt-4">
            <InputLabel htmlFor="confirm_password" value="Current Password" />
            <TextInput
              id="confirm_password"
              type="password"
              className="mt-1 block w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isFocused
              autoComplete="current-password"
            />
            <InputError message={passwordError} className="mt-2" />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <SecondaryButton
              onClick={closeActionModal}
              disabled={actionLoading}
            >
              Cancel
            </SecondaryButton>

            {activeModalAction === "disable" ? (
              <DangerButton disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Disable 2FA"}
              </DangerButton>
            ) : (
              <PrimaryButton disabled={actionLoading}>
                {actionLoading ? "Verifying..." : "Confirm"}
              </PrimaryButton>
            )}
          </div>
        </form>
      </Modal>

      {/* Recovery Codes Display Modal */}
      <Modal
        show={showCodesModal}
        onClose={() => setShowCodesModal(false)}
        maxWidth="lg"
      >
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-emerald-500" />
            Two-Factor Recovery Codes
          </h2>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Store these emergency recovery codes in a secure password manager.
            Each code may only be used once if you lose access to your
            authenticator app.
          </p>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 font-mono text-sm rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2 text-center select-all">
            {recoveryCodes.map((code, idx) => (
              <div
                key={idx}
                className="py-1 px-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-semibold"
              >
                {code}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <SecondaryButton
              type="button"
              onClick={copyRecoveryCodes}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy Codes
                </>
              )}
            </SecondaryButton>

            <PrimaryButton onClick={() => setShowCodesModal(false)}>
              Done
            </PrimaryButton>
          </div>
        </div>
      </Modal>
    </section>
  );
}

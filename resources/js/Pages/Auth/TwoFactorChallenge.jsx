import { useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Head, useForm } from "@inertiajs/react";

export default function TwoFactorChallenge() {
  const [recovery, setRecovery] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    code: "",
    recovery_code: "",
  });

  const toggleRecovery = (e) => {
    e.preventDefault();
    const isRecovery = !recovery;
    setRecovery(isRecovery);
    reset();
  };

  const submit = (e) => {
    e.preventDefault();
    post(route("two-factor.login"));
  };

  return (
    <GuestLayout>
      <Head title="Two-Factor Confirmation" />

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {recovery
          ? "Please confirm access to your account by entering one of your emergency recovery codes."
          : "Please confirm access to your account by entering the authentication code provided by your authenticator application."}
      </div>

      <form onSubmit={submit}>
        {!recovery ? (
          <div>
            <InputLabel htmlFor="code" value="Authentication Code" />

            <TextInput
              id="code"
              type="text"
              name="code"
              value={data.code}
              className="mt-1 block w-full text-center tracking-widest text-lg font-mono"
              isFocused={!recovery}
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              onChange={(e) => setData("code", e.target.value)}
            />

            <InputError message={errors.code} className="mt-2" />
          </div>
        ) : (
          <div>
            <InputLabel htmlFor="recovery_code" value="Recovery Code" />

            <TextInput
              id="recovery_code"
              type="text"
              name="recovery_code"
              value={data.recovery_code}
              className="mt-1 block w-full font-mono text-center tracking-wider"
              isFocused={recovery}
              placeholder="abcdef-123456"
              autoComplete="one-time-code"
              onChange={(e) => setData("recovery_code", e.target.value)}
            />

            <InputError message={errors.recovery_code} className="mt-2" />
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={toggleRecovery}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline cursor-pointer"
          >
            {recovery ? "Use an authentication code" : "Use a recovery code"}
          </button>

          <PrimaryButton className="ms-4" disabled={processing}>
            Log in
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}

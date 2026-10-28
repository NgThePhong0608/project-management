import { useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import TurnstileWidget from "@/Components/TurnstileWidget";
import { Head, Link, useForm } from "@inertiajs/react";

export default function ForgotPassword({ status }) {
  const [resetKey, setResetKey] = useState(0);
  const { data, setData, post, processing, errors } = useForm({
    email: "",
    cf_turnstile_response: "",
  });

  const submit = (e) => {
    e.preventDefault();

    post(route("password.email"), {
      onFinish: () => {
        setData("cf_turnstile_response", "");
        setResetKey((prev) => prev + 1);
      },
    });
  };

  return (
    <GuestLayout>
      <Head title="Forgot Password" />

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Forgot your password? No problem. Just let us know your email address
        and we will email you a password reset link that will allow you to
        choose a new one.
      </div>

      {status && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 font-medium text-sm text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
          {status}
        </div>
      )}

      <form onSubmit={submit}>
        <div>
          <InputLabel htmlFor="email" value="Email Address" />

          <TextInput
            id="email"
            type="email"
            name="email"
            value={data.email}
            className="mt-1 block w-full"
            placeholder="Enter your registered email"
            isFocused={true}
            onChange={(e) => setData("email", e.target.value)}
          />

          <InputError message={errors.email} className="mt-2" />
        </div>

        <TurnstileWidget
          resetKey={resetKey}
          onVerify={(token) => setData("cf_turnstile_response", token)}
        />
        <InputError message={errors.cf_turnstile_response} className="mt-2" />

        <div className="flex items-center justify-between mt-4">
          <Link
            href={route("login")}
            className="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            Back to Log in
          </Link>

          <PrimaryButton className="ms-4" disabled={processing}>
            {processing ? "Sending..." : "Email Password Reset Link"}
          </PrimaryButton>
        </div>
      </form>
    </GuestLayout>
  );
}

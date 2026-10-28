import { useRef, useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import { Link, useForm, usePage } from "@inertiajs/react";
import { Transition } from "@headlessui/react";
import {
  CameraIcon,
  PhotoIcon,
  TrashIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function UpdateProfileInformation({
  mustVerifyEmail,
  status,
  className = "",
}) {
  const user = usePage().props.auth.user;
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(null);

  const { data, setData, post, errors, processing, recentlySuccessful } =
    useForm({
      _method: "patch",
      name: user.name,
      email: user.email,
      avatar: null,
      remove_avatar: false,
      cover: null,
      remove_cover: false,
    });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setData((prev) => ({
      ...prev,
      avatar: file,
      remove_avatar: false,
    }));

    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setData((prev) => ({
      ...prev,
      avatar: null,
      remove_avatar: true,
    }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setData((prev) => ({
      ...prev,
      cover: file,
      remove_cover: false,
    }));

    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveCover = () => {
    setData((prev) => ({
      ...prev,
      cover: null,
      remove_cover: true,
    }));
    setCoverPreviewUrl(null);
    if (coverInputRef.current) {
      coverInputRef.current.value = "";
    }
  };

  const submit = (e) => {
    e.preventDefault();

    post(route("profile.update"), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setPreviewUrl(null);
        setCoverPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (coverInputRef.current) {
          coverInputRef.current.value = "";
        }
      },
    });
  };

  const displayedAvatar =
    previewUrl || (!data.remove_avatar ? user.avatar_url : null);
  const displayedCover =
    coverPreviewUrl || (!data.remove_cover ? user.cover_url : null);

  return (
    <section className={className}>
      <header className="pb-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Profile Information & Media
        </h2>

        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your profile photo, cover banner, display name, and primary
          email address.
        </p>
      </header>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* Cover Photo Upload Section */}
        <div>
          <InputLabel value="Cover Photo Banner" />
          <div className="mt-2 space-y-3">
            <div className="relative h-32 sm:h-40 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
              {displayedCover ? (
                <img
                  src={displayedCover}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center">
                  <span className="text-xs font-medium text-white/80 tracking-wide">
                    Default Gradient Cover
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
                <SecondaryButton
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <PhotoIcon className="w-4 h-4 me-1.5" />
                  Choose Cover Photo
                </SecondaryButton>

                {displayedCover && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="inline-flex items-center px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-md transition"
                  >
                    <TrashIcon className="w-4 h-4 me-1" />
                    Remove Cover
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recommended 1200x320px (JPG, PNG, WEBP up to 4MB).
              </p>
            </div>
            <InputError className="mt-1" message={errors.cover} />
          </div>
        </div>

        {/* Avatar Upload Section */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <InputLabel value="Profile Avatar" />
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative group w-20 h-20 flex-shrink-0">
              {displayedAvatar ? (
                <img
                  src={displayedAvatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/20 dark:ring-indigo-400/30 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-sm">
                  {data.name?.charAt(0) || user.name?.charAt(0) || "U"}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 focus:outline-none transition"
                title="Change avatar"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <SecondaryButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CameraIcon className="w-4 h-4 me-1.5" />
                  Choose Avatar
                </SecondaryButton>

                {displayedAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-md transition"
                  >
                    <TrashIcon className="w-4 h-4 me-1" />
                    Remove Avatar
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allowed JPG, PNG, GIF or WEBP. Maximum file size 2MB.
              </p>
              <InputError className="mt-1" message={errors.avatar} />
            </div>
          </div>
        </div>

        {/* Name & Email Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <div>
            <InputLabel htmlFor="name" value="Full Name" />

            <TextInput
              id="name"
              className="mt-1 block w-full"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              required
              autoComplete="name"
            />

            <InputError className="mt-2" message={errors.name} />
          </div>

          <div>
            <InputLabel htmlFor="email" value="Email Address" />

            <TextInput
              id="email"
              type="email"
              className="mt-1 block w-full"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              required
              autoComplete="username"
            />

            <InputError className="mt-2" message={errors.email} />
          </div>
        </div>

        {mustVerifyEmail && user.email_verified_at === null && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your email address is unverified.{" "}
              <Link
                href={route("verification.send")}
                method="post"
                as="button"
                className="underline font-medium text-amber-900 dark:text-amber-100 hover:text-amber-700 rounded-md focus:outline-none"
              >
                Click here to re-send the verification email.
              </Link>
            </p>

            {status === "verification-link-sent" && (
              <div className="mt-2 font-medium text-sm text-green-600 dark:text-green-400">
                A new verification link has been sent to your email address.
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <PrimaryButton disabled={processing}>
            {processing ? "Saving..." : "Save Changes"}
          </PrimaryButton>

          <Transition
            show={recentlySuccessful}
            enter="transition ease-in-out"
            enterFrom="opacity-0"
            leave="transition ease-in-out"
            leaveTo="opacity-0"
          >
            <p className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="w-4 h-4 me-1" />
              Profile updated successfully.
            </p>
          </Transition>
        </div>
      </form>
    </section>
  );
}

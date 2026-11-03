export default function SocialLoginButtons({ label = "Or continue with" }) {
  return (
    <div className="mt-5">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          href={route("auth.social.redirect", "x")}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>X</span>
        </a>

        <a
          href={route("auth.social.redirect", "github")}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>GitHub</span>
        </a>

        <a
          href={route("auth.social.redirect", "gitlab")}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.65 14.39L20.61 8.12C20.47 7.7 19.92 7.7 19.78 8.12L17.74 14.39H22.65Z"
              fill="#E24329"
            />
            <path
              d="M1.35 14.39L3.39 8.12C3.53 7.7 4.08 7.7 4.22 8.12L6.26 14.39H1.35Z"
              fill="#E24329"
            />
            <path d="M12 21.43L17.74 14.39H6.26L12 21.43Z" fill="#E24329" />
            <path d="M1.35 14.39L12 21.43L6.26 14.39H1.35Z" fill="#FC6D26" />
            <path d="M22.65 14.39L12 21.43L17.74 14.39H22.65Z" fill="#FC6D26" />
            <path
              d="M12 21.43L17.74 14.39L16.27 9.87C16.14 9.47 15.58 9.47 15.45 9.87L12 21.43Z"
              fill="#FCA326"
            />
            <path
              d="M12 21.43L6.26 14.39L7.73 9.87C7.86 9.47 8.42 9.47 8.55 9.87L12 21.43Z"
              fill="#FCA326"
            />
          </svg>
          <span>GitLab</span>
        </a>
      </div>
    </div>
  );
}


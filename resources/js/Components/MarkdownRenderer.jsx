import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-xl font-bold text-gray-900 dark:text-gray-100 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-base font-semibold text-gray-900 dark:text-gray-100 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2.5 mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-2.5 leading-relaxed text-gray-700 dark:text-gray-300 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children, className }) => {
    const isTaskList = className?.includes("contains-task-list");
    return (
      <ul
        className={`mb-3 space-y-1 text-gray-700 dark:text-gray-300 ${
          isTaskList ? "list-none pl-1" : "list-disc pl-5"
        }`}
      >
        {children}
      </ul>
    );
  },
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300">
      {children}
    </ol>
  ),
  li: ({ children, className }) => {
    const isTaskItem = className?.includes("task-list-item");
    return (
      <li
        className={`leading-relaxed ${
          isTaskItem ? "flex items-start gap-2" : ""
        }`}
      >
        {children}
      </li>
    );
  },
  input: ({ type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          readOnly
          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 pointer-events-none"
        />
      );
    }
    return <input type={type} {...props} />;
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-indigo-400 bg-gray-50 dark:bg-gray-900/50 pl-4 py-1.5 italic text-gray-600 dark:text-gray-400 rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ inline, className, children, ...props }) => {
    // ReactMarkdown v9+ omits `inline`; block code sits inside <pre> or has a language- class
    const isBlock =
      Boolean(className?.includes("language-")) || inline === false;
    if (!isBlock) {
      return (
        <code
          className="rounded bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-400"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={`block font-mono text-xs text-gray-100 ${className || ""}`}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-3.5 text-xs text-gray-100 border border-gray-700">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-gray-200 dark:border-gray-700" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-gray-50 dark:bg-gray-900 px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      {children}
    </td>
  ),
};

export default function MarkdownRenderer({
  content,
  fallback = "No description provided.",
  className = "",
}) {
  if (!content || !content.trim()) {
    return fallback ? (
      <p className="text-sm italic text-gray-400 dark:text-gray-500">
        {fallback}
      </p>
    ) : null;
  }

  return (
    <div className={`text-sm break-words ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

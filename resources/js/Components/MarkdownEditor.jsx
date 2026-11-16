import React, { useState } from "react";
import TextAreaInput from "@/Components/TextAreaInput";
import MarkdownRenderer from "@/Components/MarkdownRenderer";

export default function MarkdownEditor({
  id,
  name,
  value,
  onChange,
  disabled = false,
  rows = 6,
  className = "",
}) {
  const [preview, setPreview] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={`px-3 py-1 text-xs font-medium rounded-t border-b-2 transition-colors ${
            !preview
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={`px-3 py-1 text-xs font-medium rounded-t border-b-2 transition-colors ${
            preview
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Preview
        </button>
      </div>

      {preview ? (
        <div className="min-h-[148px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
          <MarkdownRenderer
            content={value}
            fallback="Nothing to preview yet."
          />
        </div>
      ) : (
        <TextAreaInput
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          className={className}
          rows={rows}
          onChange={onChange}
        />
      )}
    </div>
  );
}

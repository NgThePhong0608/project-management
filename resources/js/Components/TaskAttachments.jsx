import React, { useRef } from "react";
import { useForm, router } from "@inertiajs/react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/Components/ui/button";
import InputError from "@/Components/InputError";

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) {
    return `${bytes || 0} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function TaskAttachments({
  taskId,
  attachments = [],
  canUpdate = false,
}) {
  const fileInputRef = useRef(null);
  const { data, setData, post, processing, errors, reset } = useForm({
    file: null,
  });

  const handleUpload = (e) => {
    e.preventDefault();
    if (!data.file || processing) {
      return;
    }

    post(route("task.attachments.store", taskId), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        reset();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const handleDelete = (attachmentId) => {
    if (!canUpdate) {
      return;
    }
    router.delete(route("task.attachments.destroy", [taskId, attachmentId]), {
      preserveScroll: true,
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-5 w-5 text-indigo-500" />
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
          Attachments
        </h3>
        {attachments.length > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {attachments.length}
          </span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3">
          No attachments yet.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={route("task.attachments.download", [taskId, att.id])}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                >
                  {att.original_name}
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(att.size)}
                  {att.user ? ` • Uploaded by ${att.user.name}` : ""}
                  {att.created_at ? ` • ${att.created_at}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={route("task.attachments.download", [taskId, att.id])}
                  title="Download attachment"
                  className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id)}
                    title="Delete attachment"
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpdate && (
        <form onSubmit={handleUpload} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setData("file", e.target.files?.[0] || null)}
              className="block text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
            />
            <Button
              type="submit"
              size="sm"
              disabled={processing || !data.file}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{processing ? "Uploading..." : "Upload"}</span>
            </Button>
          </div>
          <InputError message={errors.file} />
        </form>
      )}
    </div>
  );
}

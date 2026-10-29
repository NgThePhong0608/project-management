import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import axios from "axios";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import PrimaryButton from "@/Components/PrimaryButton";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

const INLINE_TOKEN_RE =
  /@\[([^\]]*)\]\((\d+)\)|(?:(?:📎|🎬)\s*)?\[([^\]]+)\]\(attachment:([^)\s]+)\)|!\[([^\]]*)\]\(([^)\s]+)\)|`([^`\n]+)`/g;

function isSafeUrl(url, allowRelative = true) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (allowRelative && trimmed.startsWith("/")) return true;
  return /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed);
}

function MentionBadge({
  name,
  userId,
  commentMentions = [],
  mentionable = [],
}) {
  const [showPopup, setShowPopup] = useState(false);
  const timeoutRef = useRef(null);

  const numId = Number(userId);
  const matchedUser = commentMentions.find((m) => Number(m.id) === numId) ||
    mentionable.find((m) => Number(m.id) === numId) || {
      id: userId,
      name: name,
    };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 250);
  };

  const profileUrl = route("user.show", userId);

  return (
    <span
      className="relative inline-block my-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={profileUrl}
        className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded px-1.5 py-0.5 inline-flex items-center gap-1 transition"
      >
        <span>@{name}</span>
      </Link>

      {showPopup && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-4 border border-gray-100 dark:border-gray-700 pointer-events-auto transition-all"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-start gap-3">
            {matchedUser.avatar_url ? (
              <img
                src={matchedUser.avatar_url}
                alt={matchedUser.name || name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500/20 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0 uppercase shadow-sm">
                {(matchedUser.name || name).charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link
                href={profileUrl}
                className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
              >
                {matchedUser.name || name}
              </Link>
              {matchedUser.role && (
                <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {matchedUser.role}
                </span>
              )}
              {matchedUser.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {matchedUser.email}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex justify-end">
            <Link
              href={profileUrl}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View profile &rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </span>
  );
}

function AttachmentBadge({ name, path, onOpenAttachment }) {
  const [loading, setLoading] = useState(false);
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(path || name || "");

  const handleClick = async () => {
    if (loading || !onOpenAttachment) return;
    setLoading(true);
    try {
      await onOpenAttachment(path, name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/70 border border-indigo-200/80 dark:border-indigo-800/70 transition cursor-pointer disabled:opacity-60"
      title="Click to generate a 5-minute temporary S3 URL and view attachment"
    >
      <span>{isVideo ? "🎬" : "📎"}</span>
      <span className="underline decoration-indigo-400/60 underline-offset-2">
        {name}
      </span>
      {loading && (
        <span className="text-[10px] text-indigo-500 animate-pulse">
          (loading...)
        </span>
      )}
    </button>
  );
}

function CommentImage({ src, alt, onPreview }) {
  if (!isSafeUrl(src)) return null;
  return (
    <span className="inline-flex flex-col items-start my-1.5 mr-2 align-middle">
      <button
        type="button"
        onClick={() => onPreview?.({ src, alt: alt || "Comment image" })}
        className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm hover:ring-2 hover:ring-indigo-500 transition focus:outline-none"
        title="Click to enlarge"
      >
        <img
          src={src}
          alt={alt || "Comment image"}
          loading="lazy"
          className="max-h-40 max-w-xs object-cover rounded-lg group-hover:opacity-95 transition"
        />
      </button>
      {alt && alt !== "Comment image" && (
        <span className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {alt}
        </span>
      )}
    </span>
  );
}

function renderInlineText(
  text,
  commentMentions = [],
  mentionable = [],
  onPreview,
  onOpenAttachment,
  keyPrefix = "t",
) {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let idx = 0;

  for (const m of text.matchAll(INLINE_TOKEN_RE)) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    if (m[1] !== undefined && m[2] !== undefined) {
      parts.push(
        <MentionBadge
          key={`${keyPrefix}-m-${idx++}`}
          name={m[1]}
          userId={m[2]}
          commentMentions={commentMentions}
          mentionable={mentionable}
        />,
      );
    } else if (m[3] !== undefined && m[4] !== undefined) {
      parts.push(
        <AttachmentBadge
          key={`${keyPrefix}-att-${idx++}`}
          name={m[3]}
          path={m[4]}
          onOpenAttachment={onOpenAttachment}
        />,
      );
    } else if (m[6] !== undefined) {
      parts.push(
        <CommentImage
          key={`${keyPrefix}-img-${idx++}`}
          alt={m[5]}
          src={m[6]}
          onPreview={onPreview}
        />,
      );
    } else if (m[7] !== undefined) {
      parts.push(
        <code
          key={`${keyPrefix}-code-${idx++}`}
          className="px-1.5 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 border border-gray-200 dark:border-gray-700"
        >
          {m[7]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

function isHtmlComment(body) {
  return /^\s*<(p|ul|ol|blockquote|pre|h[1-6]|div)\b/i.test(body || "");
}

function renderDomNode(
  node,
  commentMentions,
  mentionable,
  onPreview,
  onOpenAttachment,
  key,
) {
  if (node.nodeType === Node.TEXT_NODE) {
    return renderInlineText(
      node.textContent,
      commentMentions,
      mentionable,
      onPreview,
      onOpenAttachment,
      key,
    );
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map((child, i) =>
    renderDomNode(
      child,
      commentMentions,
      mentionable,
      onPreview,
      onOpenAttachment,
      `${key}-${i}`,
    ),
  );

  switch (tag) {
    case "p":
      return (
        <p key={key} className="mb-1.5 last:mb-0 leading-relaxed">
          {children}
        </p>
      );
    case "br":
      return <br key={key} />;
    case "strong":
    case "b":
      return (
        <strong key={key} className="font-semibold">
          {children}
        </strong>
      );
    case "em":
    case "i":
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case "u":
      return (
        <u key={key} className="underline">
          {children}
        </u>
      );
    case "s":
    case "strike":
      return (
        <s key={key} className="line-through">
          {children}
        </s>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc pl-5 my-1.5 space-y-0.5">
          {children}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal pl-5 my-1.5 space-y-0.5">
          {children}
        </ol>
      );
    case "li":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-3 py-0.5 my-1.5 italic text-gray-600 dark:text-gray-300 bg-gray-50/60 dark:bg-gray-800/40 rounded-r"
        >
          {children}
        </blockquote>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="p-2.5 my-1.5 rounded-lg bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto"
        >
          {children}
        </pre>
      );
    case "code":
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-300"
        >
          {children}
        </code>
      );
    case "a": {
      const href = node.getAttribute("href");
      if (href && href.startsWith("attachment:")) {
        const path = href.slice("attachment:".length);
        const label = node.textContent?.replace(/^📎\s*/, "") || path;
        return (
          <AttachmentBadge
            key={key}
            name={label}
            path={path}
            onOpenAttachment={onOpenAttachment}
          />
        );
      }
      if (!isSafeUrl(href)) return <span key={key}>{children}</span>;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500"
        >
          {children}
        </a>
      );
    }
    case "img": {
      const src = node.getAttribute("src");
      const alt = node.getAttribute("alt") || "Comment image";
      return (
        <CommentImage key={key} src={src} alt={alt} onPreview={onPreview} />
      );
    }
    default:
      return <span key={key}>{children}</span>;
  }
}

function renderBody(
  body,
  commentMentions = [],
  mentionable = [],
  onPreview = null,
  onOpenAttachment = null,
) {
  if (!body) return null;

  if (isHtmlComment(body) && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(body, "text/html");
    return Array.from(doc.body.childNodes).map((node, i) =>
      renderDomNode(
        node,
        commentMentions,
        mentionable,
        onPreview,
        onOpenAttachment,
        `node-${i}`,
      ),
    );
  }

  return renderInlineText(
    body,
    commentMentions,
    mentionable,
    onPreview,
    onOpenAttachment,
    "raw",
  );
}

function CommentForm({
  type,
  id,
  parentId = null,
  mentionable,
  onCreated,
  onDone,
  autoFocus,
}) {
  const [body, setBody] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [query, setQuery] = useState(null); // { start, text, caret } while typing @...
  const [active, setActive] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState(null);

  const editorContainerRef = useRef(null);
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const pendingFilesRef = useRef(new Map());
  const pendingCounterRef = useRef(0);
  const stateRef = useRef({ matches: [], active: 0, query: null });

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.text.toLowerCase();
    return mentionable
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query, mentionable]);

  const pick = useCallback((user) => {
    const quill = quillRef.current;
    const currentQuery = stateRef.current.query;
    if (!quill || !currentQuery) return;

    const range = quill.getSelection(true);
    const caret = range
      ? Math.max(range.index, currentQuery.caret)
      : currentQuery.caret;
    const token = `@[${user.name}](${user.id}) `;

    quill.deleteText(
      currentQuery.start,
      Math.max(1, caret - currentQuery.start),
      "user",
    );
    quill.insertText(currentQuery.start, token, "user");
    quill.setSelection(currentQuery.start + token.length, 0, "user");
    setQuery(null);
  }, []);

  useEffect(() => {
    stateRef.current = { matches, active, query };
  }, [matches, active, query]);

  const uploadAndInsertAttachment = useCallback((file) => {
    if (!file) return;
    setError(null);

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      setError(
        "Only images (JPEG, PNG, GIF, WEBP) and videos (MP4, WEBM, OGG, MOV) are allowed.",
      );
      return;
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxLabel = isVideo ? "10MB" : "2MB";

    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(
        `${isVideo ? "Video" : "Image"} size must not exceed ${maxLabel} (selected: ${sizeMb}MB).`,
      );
      return;
    }

    // Stage file in browser memory ONLY; actual S3 upload happens when user clicks Comment/Reply
    pendingCounterRef.current += 1;
    const pendingId = `pending_${pendingCounterRef.current}`;
    const safeDisplayName =
      file.name.replace(/[\[\]()]/g, "_") ||
      (isVideo ? "video.mp4" : "image.png");
    pendingFilesRef.current.set(pendingId, {
      file,
      name: safeDisplayName,
      isVideo,
    });

    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      const index = range ? range.index : Math.max(0, quill.getLength() - 1);
      const icon = isVideo ? "🎬" : "📎";
      const token = `${icon} [${safeDisplayName}](pending:${pendingId}) `;
      quill.insertText(index, token, "user");
      quill.setSelection(index + token.length, 0, "user");
    }
  }, []);

  useEffect(() => {
    if (!editorContainerRef.current || quillRef.current) return;

    const wrapper = editorContainerRef.current;
    wrapper.innerHTML = "";
    const editorEl = document.createElement("div");
    wrapper.appendChild(editorEl);

    const quill = new Quill(editorEl, {
      theme: "snow",
      placeholder:
        "Write a comment... Type @ to mention a member, or attach image (2MB) / video (10MB)",
      modules: {
        toolbar: {
          container: [
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            ["link", "image", "video"],
            ["clean"],
          ],
          handlers: {
            image: () => {
              fileInputRef.current?.click();
            },
            video: () => {
              videoInputRef.current?.click();
            },
          },
        },
      },
    });

    quillRef.current = quill;

    if (autoFocus) {
      quill.focus();
    }

    const detectMentionAtCaret = (caretIndex) => {
      if (typeof caretIndex !== "number" || caretIndex < 0) {
        setQuery(null);
        return;
      }
      const textBefore = quill.getText(0, caretIndex).replace(/\u00a0/g, " ");
      const m = /(?:^|\s)@([^\s@\[\]]*)$/.exec(textBefore);
      if (m) {
        setQuery({
          start: caretIndex - m[1].length - 1,
          text: m[1],
          caret: caretIndex,
        });
        setActive(0);
      } else {
        setQuery(null);
      }
    };

    const getCaretFromDelta = (delta) => {
      if (!delta || !Array.isArray(delta.ops)) return null;
      let pos = 0;
      let changed = false;
      for (const op of delta.ops) {
        if (typeof op.retain === "number") {
          pos += op.retain;
        } else if (typeof op.insert === "string") {
          pos += op.insert.length;
          changed = true;
        } else if (op.insert && typeof op.insert === "object") {
          pos += 1;
          changed = true;
        } else if (typeof op.delete === "number") {
          changed = true;
        }
      }
      return changed ? pos : null;
    };

    const syncEditorState = (delta) => {
      const html = quill.root.innerHTML;
      const text = quill.getText().trim();
      const hasImg = /<img\b[^>]*src=/i.test(html);
      const empty = text.length === 0 && !hasImg;
      setIsEmpty(empty);
      setBody(empty ? "" : html);

      // Compute caret directly from Delta so typing '@' at index 0 triggers immediately
      // without waiting for Quill's asynchronous selection update
      const deltaCaret = getCaretFromDelta(delta);
      if (deltaCaret !== null) {
        detectMentionAtCaret(deltaCaret);
        return;
      }

      const range = quill.getSelection() || quill.selection?.getRange?.()?.[0];
      if (range && range.length === 0) {
        detectMentionAtCaret(range.index);
      } else {
        setQuery(null);
      }
    };

    const handleSelectionCheck = () => {
      setTimeout(() => {
        if (!quillRef.current) return;
        const range =
          quill.getSelection() || quill.selection?.getRange?.()?.[0];
        if (range && range.length === 0) {
          detectMentionAtCaret(range.index);
        }
      }, 0);
    };

    quill.on("text-change", syncEditorState);
    quill.on("selection-change", handleSelectionCheck);

    const handleKeyDown = (e) => {
      const { matches: currentMatches, active: currentActive } =
        stateRef.current;
      if (!currentMatches.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setActive((a) => (a + 1) % currentMatches.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setActive(
          (a) => (a - 1 + currentMatches.length) % currentMatches.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        pick(currentMatches[currentActive]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setQuery(null);
      }
    };

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
          e.preventDefault();
          e.stopPropagation();
          const file = item.getAsFile();
          if (file) uploadAndInsertAttachment(file);
          return;
        }
      }
    };

    const handleDrop = (e) => {
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;
      for (const file of files) {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          e.preventDefault();
          e.stopPropagation();
          uploadAndInsertAttachment(file);
          return;
        }
      }
    };

    quill.root.addEventListener("keydown", handleKeyDown, true);
    quill.root.addEventListener("keyup", handleSelectionCheck);
    quill.root.addEventListener("click", handleSelectionCheck);
    quill.root.addEventListener("paste", handlePaste, true);
    quill.root.addEventListener("drop", handleDrop, true);

    return () => {
      quill.off("text-change", syncEditorState);
      quill.off("selection-change", handleSelectionCheck);
      quill.root.removeEventListener("keydown", handleKeyDown, true);
      quill.root.removeEventListener("keyup", handleSelectionCheck);
      quill.root.removeEventListener("click", handleSelectionCheck);
      quill.root.removeEventListener("paste", handlePaste, true);
      quill.root.removeEventListener("drop", handleDrop, true);
      quillRef.current = null;
    };
  }, [autoFocus, pick, uploadAndInsertAttachment]);

  const submit = async (e) => {
    e.preventDefault();
    if (isEmpty || !body.trim() || processing || uploadingImage) return;

    setError(null);
    setProcessing(true);

    try {
      let finalBody = body;

      // Find all pending attachments that are STILL present in the comment body
      const pendingRegex = /\[([^\]]+)\]\(pending:(pending_\d+)\)/g;
      const matchesInBody = [...finalBody.matchAll(pendingRegex)];

      if (matchesInBody.length > 0) {
        setUploadingImage(true);
        const uploadedMap = new Map();

        for (const match of matchesInBody) {
          const pendingId = match[2];
          if (uploadedMap.has(pendingId)) continue;

          const staged = pendingFilesRef.current.get(pendingId);
          if (!staged) continue;

          const formData = new FormData();
          formData.append("image", staged.file);
          formData.append("commentable_type", type);
          formData.append("commentable_id", id);

          const uploadRes = await axios.post(
            route("comments.uploadImage", {}, false),
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          if (uploadRes.data?.path && uploadRes.data?.name) {
            uploadedMap.set(pendingId, {
              name: uploadRes.data.name,
              path: uploadRes.data.path,
            });
          }
        }

        finalBody = finalBody.replace(
          pendingRegex,
          (full, origLabel, pendingId) => {
            const uploaded = uploadedMap.get(pendingId);
            if (!uploaded) return origLabel;
            return `[${uploaded.name}](attachment:${uploaded.path})`;
          },
        );
        setUploadingImage(false);
      }

      const res = await axios.post(
        route("comments.store", {}, false),
        {
          commentable_type: type,
          commentable_id: id,
          body: finalBody,
          parent_id: parentId,
        },
        {
          headers: { Accept: "application/json" },
        },
      );

      if (quillRef.current) {
        quillRef.current.setText("");
      }
      pendingFilesRef.current.clear();
      setBody("");
      setIsEmpty(true);
      setError(null);

      if (res.data?.comment) {
        onCreated?.(res.data.comment);
      }
      onDone?.();
    } catch (err) {
      setUploadingImage(false);
      const errs = err.response?.data?.errors;
      const firstErr = errs ? Object.values(errs).flat()[0] : null;
      setError(
        firstErr || err.response?.data?.message || "Failed to post comment.",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={submit} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) uploadAndInsertAttachment(file);
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) uploadAndInsertAttachment(file);
        }}
      />

      <div
        ref={editorContainerRef}
        className={`comment-quill ${parentId ? "comment-quill-reply" : ""}`}
      />

      {matches.length > 0 && (
        <ul className="absolute z-30 left-0 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg overflow-hidden">
          {matches.map((u, i) => (
            <li
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              className={`px-3 py-2 cursor-pointer text-sm ${
                i === active
                  ? "bg-indigo-50 dark:bg-indigo-900/40"
                  : "hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {u.email}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {uploadingImage ? (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
              Uploading attachment...
            </span>
          ) : (
            <span>
              Tip: Type @ to mention members. Images up to 2MB, videos up to
              10MB.
            </span>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          )}
          <PrimaryButton disabled={processing || uploadingImage || isEmpty}>
            {parentId ? "Reply" : "Comment"}
          </PrimaryButton>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </form>
  );
}

function CommentItem({
  comment,
  replies,
  type,
  id,
  mentionable,
  canDelete,
  onDelete,
  onCreated,
  onPreviewImage,
  onOpenAttachment,
  depth = 0,
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className={depth ? "ml-8 mt-3" : "mt-4"}>
      <div className="flex gap-3">
        {comment.author.avatar_url ? (
          <img
            src={comment.author.avatar_url}
            alt={comment.author.name}
            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {comment.author.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <Link
              href={route("user.show", comment.author.id)}
              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {comment.author.name}
            </Link>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {comment.created_at_human}
            </span>
          </div>
          <div
            className={`mt-1 text-sm text-gray-800 dark:text-gray-200 break-words ${
              isHtmlComment(comment.body) ? "" : "whitespace-pre-wrap"
            }`}
          >
            {renderBody(
              comment.body,
              comment.mentions,
              mentionable,
              onPreviewImage,
              onOpenAttachment,
            )}
          </div>
          <div className="mt-1 text-xs flex gap-3 text-gray-500 dark:text-gray-400">
            {depth === 0 && (
              <button
                onClick={() => setReplying(!replying)}
                className="hover:underline"
              >
                Reply
              </button>
            )}
            {canDelete(comment) && (
              <button
                onClick={() => onDelete(comment)}
                className="hover:underline text-red-500"
              >
                Delete
              </button>
            )}
          </div>
          {replying && (
            <div className="mt-2">
              <CommentForm
                type={type}
                id={id}
                parentId={comment.id}
                mentionable={mentionable}
                onCreated={onCreated}
                autoFocus
                onDone={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
      {replies.map((r) => (
        <CommentItem
          key={r.id}
          comment={r}
          replies={[]}
          type={type}
          id={id}
          mentionable={mentionable}
          canDelete={canDelete}
          onDelete={onDelete}
          onCreated={onCreated}
          onPreviewImage={onPreviewImage}
          onOpenAttachment={onOpenAttachment}
          depth={1}
        />
      ))}
    </div>
  );
}

export default function CommentSection({
  type,
  id,
  comments: initial = [],
  mentionable = [],
}) {
  const { auth } = usePage().props;
  const [comments, setComments] = useState(initial);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => setComments(initial), [initial]);

  // Realtime: new comments delivered via the user's currently authorized private channel
  useEffect(() => {
    if (!window.Echo || !auth?.user?.id) return;
    const channelName = `App.Models.User.${auth.user.id}`;
    const channel = window.Echo.private(channelName);
    const handleCommentCreated = (e) => {
      if (
        e?.comment?.commentable_type === type &&
        Number(e?.comment?.commentable_id) === Number(id)
      ) {
        if (e.comment.truncated) {
          // Payload was too large to broadcast; fetch the comments from the server.
          router.reload({ only: ["comments"], preserveScroll: true });
          return;
        }
        setComments((prev) =>
          prev.some((c) => c.id === e.comment.id) ? prev : [...prev, e.comment],
        );
      }
    };
    channel.listen(".comment.created", handleCommentCreated);
    return () => {
      channel.stopListening(".comment.created", handleCommentCreated);
    };
  }, [type, id, auth?.user?.id]);

  const handleOpenAttachment = useCallback(
    async (path, fallbackName) => {
      try {
        const res = await axios.get(
          route("comments.attachmentUrl", {}, false),
          {
            params: {
              commentable_type: type,
              commentable_id: id,
              path,
            },
          },
        );
        if (res.data?.url) {
          const isVideo =
            res.data.media_type === "video" ||
            /\.(mp4|webm|ogg|mov)$/i.test(path || fallbackName || "");
          setPreviewImage({
            src: res.data.url,
            alt: res.data.name || fallbackName || "Attachment",
            mediaType: isVideo ? "video" : "image",
            isTemporary: true,
            expiresAt: res.data.expires_at,
          });
        }
      } catch (err) {
        alert(
          err.response?.data?.message ||
            "Could not generate temporary URL for this attachment.",
        );
      }
    },
    [type, id],
  );

  const handleCommentAdded = useCallback((newComment) => {
    if (!newComment) return;
    setComments((prev) =>
      prev.some((c) => c.id === newComment.id) ? prev : [...prev, newComment],
    );
  }, []);

  const isPrivileged = ["admin", "manager"].includes(auth.user.role);
  const canDelete = (c) => isPrivileged || c.author.id === auth.user.id;

  const onDelete = async (c) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await axios.delete(route("comments.destroy", c.id, false), {
        headers: { Accept: "application/json" },
      });
      setComments((prev) =>
        prev.filter((x) => x.id !== c.id && x.parent_id !== c.id),
      );
    } catch {
      router.delete(route("comments.destroy", c.id, false), {
        preserveScroll: true,
      });
    }
  };

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (cid) => comments.filter((c) => c.parent_id === cid);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h3 className="text-lg font-bold">Comments ({comments.length})</h3>
      <div className="mt-3">
        <CommentForm
          type={type}
          id={id}
          mentionable={mentionable}
          onCreated={handleCommentAdded}
        />
      </div>
      {roots.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No comments yet.</p>
      )}
      {roots.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={repliesOf(c.id)}
          type={type}
          id={id}
          mentionable={mentionable}
          canDelete={canDelete}
          onDelete={onDelete}
          onCreated={handleCommentAdded}
          onPreviewImage={setPreviewImage}
          onOpenAttachment={handleOpenAttachment}
        />
      ))}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center bg-gray-900/95 p-4 rounded-xl border border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImage.mediaType === "video" ? (
              <video
                src={previewImage.src}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-lg bg-black"
              />
            ) : (
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="max-h-[75vh] max-w-full rounded-lg object-contain bg-black/40"
              />
            )}
            <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-4 text-xs text-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate">
                  {previewImage.alt}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={previewImage.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-indigo-300 hover:text-indigo-200 font-medium"
                >
                  Open temporary URL &rarr;
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

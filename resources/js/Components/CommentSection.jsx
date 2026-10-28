import { useEffect, useMemo, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import PrimaryButton from "@/Components/PrimaryButton";

const MENTION_RE = /@\[([^\]]*)\]\((\d+)\)/g;

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

function renderBody(body, commentMentions = [], mentionable = []) {
  const parts = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <MentionBadge
        key={m.index}
        name={m[1]}
        userId={m[2]}
        commentMentions={commentMentions}
        mentionable={mentionable}
      />,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

function CommentForm({
  type,
  id,
  parentId = null,
  mentionable,
  onDone,
  autoFocus,
}) {
  const [body, setBody] = useState("");
  const [query, setQuery] = useState(null); // { start, text } while typing @...
  const [active, setActive] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const ref = useRef(null);

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

  const detect = (value, caret) => {
    const m = /(?:^|\s)@([^\s@\[\]]*)$/.exec(value.slice(0, caret));
    if (m) {
      setQuery({ start: caret - m[1].length - 1, text: m[1] });
      setActive(0);
    } else {
      setQuery(null);
    }
  };

  const pick = (user) => {
    const caret = ref.current.selectionStart;
    const token = `@[${user.name}](${user.id}) `;
    const next = body.slice(0, query.start) + token + body.slice(caret);
    setBody(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = query.start + token.length;
      ref.current.focus();
      ref.current.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e) => {
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    router.post(
      route("comments.store"),
      { commentable_type: type, commentable_id: id, body, parent_id: parentId },
      {
        preserveScroll: true,
        onStart: () => setProcessing(true),
        onFinish: () => setProcessing(false),
        onSuccess: () => {
          setBody("");
          setError(null);
          onDone?.();
        },
        onError: (errs) => setError(Object.values(errs)[0]),
      },
    );
  };

  return (
    <form onSubmit={submit} className="relative">
      <textarea
        ref={ref}
        value={body}
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        placeholder="Write a comment... type @ to mention a member"
        onChange={(e) => {
          setBody(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        className="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
      />
      {matches.length > 0 && (
        <ul className="absolute z-20 left-0 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg overflow-hidden">
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
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      <div className="mt-2 flex gap-2 justify-end">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        )}
        <PrimaryButton disabled={processing || !body.trim()}>
          {parentId ? "Reply" : "Comment"}
        </PrimaryButton>
      </div>
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
          <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {renderBody(comment.body, comment.mentions, mentionable)}
          </p>
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

  const isPrivileged = ["admin", "manager"].includes(auth.user.role);
  const canDelete = (c) => isPrivileged || c.author.id === auth.user.id;

  const onDelete = (c) => {
    if (!confirm("Delete this comment?")) return;
    router.delete(route("comments.destroy", c.id), {
      preserveScroll: true,
      onSuccess: () =>
        setComments((prev) =>
          prev.filter((x) => x.id !== c.id && x.parent_id !== c.id),
        ),
    });
  };

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (cid) => comments.filter((c) => c.parent_id === cid);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h3 className="text-lg font-bold">Comments ({comments.length})</h3>
      <div className="mt-3">
        <CommentForm type={type} id={id} mentionable={mentionable} />
      </div>
      {roots.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No comments yet.</p>
      )}
      {[...roots].reverse().map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={repliesOf(c.id)}
          type={type}
          id={id}
          mentionable={mentionable}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

import { memo } from "react";
import { discussionTime } from "../../utils/discussions";

const Message = memo(function Message({ message, own }) {
  return <li className={`discussion-message flex gap-2 sm:gap-3 ${own ? "flex-row-reverse" : ""}`}>
    <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${own ? "bg-brand-100 text-brand-700" : "bg-violet-100 text-violet-700"}`}>{message.author.name.slice(0, 1).toUpperCase()}</span>
    <article className={`min-w-0 max-w-[85%] rounded-2xl border px-4 py-3 ${own ? "rounded-tr-sm border-brand-200 bg-brand-50" : "rounded-tl-sm border-slate-200 bg-white"}`}>
      <header className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"><span className="break-words font-bold text-slate-800">{message.author.name}{own ? " (you)" : ""}</span><time dateTime={message.createdAt} className="text-slate-500">{discussionTime(message.createdAt)}</time></header>
      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 [overflow-wrap:anywhere]">{message.body}</p>
    </article>
  </li>;
});

// Draft edits, scroll-state changes and empty polls don't need to redraw history.
const DiscussionMessages = memo(function DiscussionMessages({ messages, userId }) {
  return <ol className="space-y-5" aria-label="Messages">{messages.map(message =>
    <Message key={message.id} message={message} own={message.author.id === userId} />
  )}</ol>;
});

export default DiscussionMessages;

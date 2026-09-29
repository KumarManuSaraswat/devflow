export const DISCUSSION_CATEGORIES = { PROBLEM: "Problem", FEEDBACK: "Feedback", DISCUSSION: "Discussion" };
// Reuse the formatter: creating one for every bubble on every keystroke/poll is
// expensive in Android WebView, especially after loading older messages.
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
export const discussionTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid Date" : timeFormatter.format(date);
};
export const mergeMessages = (current = [], incoming = []) => {
  // Empty catch-up polls must not invalidate the memoized conversation.
  if (!incoming.length) return current;
  return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.sequence - b.sequence);
};
export const mergeDiscussion = (current, incoming) => ({ ...incoming,
  messages: mergeMessages(current?.messages, incoming.messages), hasOlder: current ? current.hasOlder : incoming.hasOlder,
});

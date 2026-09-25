export const DISCUSSION_CATEGORIES = { PROBLEM: "Problem", FEEDBACK: "Feedback", DISCUSSION: "Discussion" };
export const discussionTime = value => new Date(value).toLocaleString(undefined, {
  year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});
export const mergeMessages = (current = [], incoming = []) =>
  [...new Map([...current, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.sequence - b.sequence);
export const mergeDiscussion = (current, incoming) => ({ ...incoming,
  messages: mergeMessages(current?.messages, incoming.messages), hasOlder: current ? current.hasOlder : incoming.hasOlder,
});

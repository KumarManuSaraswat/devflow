// Android uses one page viewport, including chat history. On the website the
// discussion can still use its bounded history panel.
export function discussionScrollContainer(messages) {
  return messages?.closest('.native-app .app-scroll') || messages;
}

export function isNearScrollEnd(element, threshold = 80) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}

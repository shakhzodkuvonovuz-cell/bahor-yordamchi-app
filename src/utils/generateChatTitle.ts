/**
 * Generate a chat title from the first user message
 * @param messageContent - The content of the first user message
 * @param mode - The chat mode (optional, for prepending mode name)
 * @returns A truncated title string (max 50 chars)
 */
export function generateChatTitle(messageContent: string, mode?: string): string {
  // Clean the message content
  const cleaned = messageContent
    .trim()
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .replace(/\s+/g, " "); // Normalize multiple spaces

  if (!cleaned) {
    return "Yangi suhbat"; // Fallback to default
  }

  // Max length for the title
  const maxLength = 50;

  // Truncate the cleaned message if needed
  let title = cleaned;
  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 1).trim() + "…";
  }

  return title;
}

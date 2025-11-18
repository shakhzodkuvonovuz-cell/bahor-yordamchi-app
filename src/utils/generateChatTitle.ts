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

  // Optional mode prefix mapping
  const modePrefixes: Record<string, string> = {
    ielts: "IELTS",
    english: "English",
    coding: "Kod",
    tech: "Texnologiya",
    technology: "Texnologiya",
    business: "Biznes",
    homework: "Dars",
    finance: "Moliya",
    financial: "Moliya",
    daily: "Kundalik",
    health: "Salomatlik",
    math_science: "Matematika",
  };

  // Get mode prefix if available
  const prefix = mode && modePrefixes[mode.toLowerCase()] 
    ? `${modePrefixes[mode.toLowerCase()]}: ` 
    : "";

  // Max length for the title (including prefix)
  const maxLength = 50;
  const prefixLength = prefix.length;
  const availableLength = maxLength - prefixLength;

  // Truncate the cleaned message if needed
  let title = cleaned;
  if (title.length > availableLength) {
    title = title.substring(0, availableLength - 1).trim() + "…";
  }

  return prefix + title;
}

/**
 * Chat Session Management Utility
 * 
 * Handles "first question after fresh open = new chat" behavior like ChatGPT.
 * Uses sessionStorage which clears when tab/app closes.
 */

const SESSION_INITIALIZED_KEY = "bahor_session_chat_initialized";

/**
 * Check if this is a fresh session (tab/app just opened)
 * Returns true if NO chat has been started in this session yet.
 */
export function isFreshSession(): boolean {
  return sessionStorage.getItem(SESSION_INITIALIZED_KEY) !== "1";
}

/**
 * Mark session as initialized (a chat has been started)
 * Call this after first message is sent in the session.
 */
export function markSessionInitialized(): void {
  sessionStorage.setItem(SESSION_INITIALIZED_KEY, "1");
}

/**
 * Clear session flag - for testing/debugging only
 */
export function clearSessionFlag(): void {
  sessionStorage.removeItem(SESSION_INITIALIZED_KEY);
}

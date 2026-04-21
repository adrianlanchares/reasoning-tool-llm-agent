const BASE_URL = 'http://agent-backend:8010'

/**
 * Sends a message to the agent's /chat endpoint.
 *
 * @param {string} prompt - The user's current message.
 * @param {Array<{role: string, content: string}>} context - Previous messages in the conversation.
 *   The agent's `run()` method prepends the system prompt and the current user message internally,
 *   so we only send the prior turns as context (not the current prompt again).
 * @returns {Promise<{ response: string, trace: Array }>}
 */
export async function sendMessage(prompt, context = []) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, context }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error ${response.status}: ${text}`)
  }

  return response.json()
}

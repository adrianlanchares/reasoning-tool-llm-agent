const BASE_URL = '/api'

export const MODEL_ENDPOINTS = {
  full: '/chat',
  'reason-only': '/phase1/reasoning',
  'tool-only': '/phase2/tools',
  'rag-only': '/phase3/rag',
}

/**
 * Sends a message to the selected model endpoint.
 *
 * @param {string} prompt
 * @param {Array<{role: string, content: string}>} context
 * @param {'full' | 'reason-only' | 'tool-only' | 'rag-only'} model
 * @returns {Promise<{ response: string, trace: Array }>}
 */
export async function sendMessage(prompt, context = [], model = 'full') {
  const endpoint = MODEL_ENDPOINTS[model] ?? MODEL_ENDPOINTS.full

  const response = await fetch(`${BASE_URL}${endpoint}`, {
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
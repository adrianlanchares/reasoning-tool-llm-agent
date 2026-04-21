import { useState, useCallback } from 'react'

/**
 * A single message shape:
 *   { id, role: 'user'|'assistant', content: string, trace?: Array, error?: boolean, loading?: boolean }
 *
 * A conversation shape:
 *   { id, title, messages: Message[], createdAt }
 *
 * The `context` sent to the API is derived from the messages array:
 *   we send all prior user/assistant turns (excluding the current one being sent),
 *   formatted as { role, content } pairs.
 */

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function makeConversation(title = 'New conversation') {
  return { id: makeId(), title, messages: [], createdAt: Date.now() }
}

/**
 * Builds the `context` array to send to the API.
 * We send all completed message pairs so the agent has full history.
 * The agent's run() receives (prompt, context) and internally does:
 *   history = [system_prompt, ...context, { role: 'user', content: prompt }]
 */
function buildContext(messages) {
  return messages
    .filter((m) => !m.loading && !m.error && (m.role === 'user' || m.role === 'assistant'))
    .map(({ role, content }) => ({ role, content }))
}

export function useConversations() {
  const [conversations, setConversations] = useState(() => {
    const initial = makeConversation('New conversation')
    return [initial]
  })
  const [activeId, setActiveId] = useState(() => conversations[0].id)

  // Derived: currently active conversation
  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const createConversation = useCallback(() => {
    const conv = makeConversation('New conversation')
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    return conv
  }, [])

  const selectConversation = useCallback((id) => {
    setActiveId(id)
  }, [])

  const deleteConversation = useCallback(
    (id) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (next.length === 0) {
          const fresh = makeConversation('New conversation')
          setActiveId(fresh.id)
          return [fresh]
        }
        if (id === activeId) {
          setActiveId(next[0].id)
        }
        return next
      })
    },
    [activeId]
  )

  const renameConversation = useCallback((id, title) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    )
  }, [])

  /**
   * Appends a user message and a placeholder loading assistant message,
   * returning { userMsgId, assistantMsgId, context } so the caller can
   * later resolve the assistant message with the real response.
   */
  const addUserMessage = useCallback(
    (content) => {
      const userMsgId = makeId()
      const assistantMsgId = makeId()

      let contextSnapshot = []

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c
          contextSnapshot = buildContext(c.messages)
          const newTitle =
            c.messages.length === 0 && c.title === 'New conversation'
              ? content.slice(0, 40) + (content.length > 40 ? '…' : '')
              : c.title
          return {
            ...c,
            title: newTitle,
            messages: [
              ...c.messages,
              { id: userMsgId, role: 'user', content },
              { id: assistantMsgId, role: 'assistant', content: '', loading: true },
            ],
          }
        })
      )

      return { userMsgId, assistantMsgId, context: contextSnapshot }
    },
    [activeId]
  )

  const resolveAssistantMessage = useCallback((assistantMsgId, response, trace, error = false) => {
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: response, trace: trace ?? [], loading: false, error }
            : m
        ),
      }))
    )
  }, [])

  return {
    conversations,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    addUserMessage,
    resolveAssistantMessage,
  }
}

import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { useConversations } from './hooks/useConversations.js'
import { sendMessage } from './services/agentApi.js'

export default function App() {
  const {
    conversations,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    addUserMessage,
    resolveAssistantMessage,
  } = useConversations()

  const [isLoading, setIsLoading] = useState(false)

  async function handleSend(content) {
    if (isLoading) return

    const { assistantMsgId, context } = addUserMessage(content)
    setIsLoading(true)

    try {
      // context = all prior messages in the conversation (already formatted for the API).
      // The current user `content` is sent as `prompt`, separate from `context`.
      const result = await sendMessage(content, context)
      resolveAssistantMessage(
        assistantMsgId,
        result.response ?? result.final_answer ?? JSON.stringify(result),
        result.trace ?? []
      )
    } catch (err) {
      resolveAssistantMessage(
        assistantMsgId,
        `Error: ${err.message}`,
        [],
        true
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
      />

      <ChatWindow
        conversation={activeConversation}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  )
}

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
}

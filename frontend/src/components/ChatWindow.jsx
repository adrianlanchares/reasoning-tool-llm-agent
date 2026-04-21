import React, { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import ChatInput from './ChatInput.jsx'

const EMPTY_SVG = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="39" height="39" rx="3.5" stroke="#2a2a2a"/>
    <path d="M10 20h20M20 10v20" stroke="#3d3d3d" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function ChatWindow({
  conversation,
  onSend,
  isLoading,
  selectedModel,
  onSelectModel,
  brainrotMode,
  onToggleBrainrotMode,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation.messages])

  const isEmpty = conversation.messages.length === 0

  return (
    <div style={styles.wrapper}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <span style={styles.topbarTitle}>{conversation.title}</span>

        <div style={styles.topbarRight}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={brainrotMode}
              onChange={onToggleBrainrotMode}
            />
            Brainrot Mode
          </label>

          <span style={styles.topbarCount}>
            {conversation.messages.filter((m) => m.role === 'user').length} messages
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {isEmpty ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>{EMPTY_SVG}</div>
            <p style={styles.emptyTitle}>Start a conversation</p>
            <p style={styles.emptyHint}>
              Send a message to interact with the ReAct reasoning agent.
            </p>
          </div>
        ) : (
          <>
            {conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput 
        onSend={onSend} 
        disabled={isLoading} 
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
      />
    </div>
  )
}

const styles = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
  },
  topbarTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    letterSpacing: '0.03em',
    maxWidth: '600px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  topbarCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },

  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.03em',
    userSelect: 'none',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '80px',
  },
  emptyIcon: {
    opacity: 0.6,
  },
  emptyTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  emptyHint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    maxWidth: '320px',
    lineHeight: 1.6,
  },
}

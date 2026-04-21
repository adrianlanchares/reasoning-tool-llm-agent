import React, { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import ChatInput from './ChatInput.jsx'

const EMPTY_SVG = (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="52" height="52" rx="14" fill="#e8f1fb"/>
    <rect x="23" y="12" width="6" height="28" rx="2.5" fill="#1a6fc4" opacity="0.7"/>
    <rect x="12" y="23" width="28" height="6" rx="2.5" fill="#1a6fc4" opacity="0.7"/>
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
        <div style={styles.topbarLeft}>
          <div style={styles.topbarTitle}>{conversation.title}</div>
          <div style={styles.topbarMeta}>
            {conversation.messages.filter((m) => m.role === 'user').length} messages in session
          </div>
        </div>

        <div style={styles.topbarRight}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={brainrotMode}
              onChange={onToggleBrainrotMode}
            />
            Brainrot Mode
          </label>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {isEmpty ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>{EMPTY_SVG}</div>
            <p style={styles.emptyTitle}>Begin a clinical consultation</p>
            <p style={styles.emptyHint}>
              Ask a medical question, describe symptoms, or request evidence-based guidance from the AI agent.
            </p>
            <div style={styles.emptyTags}>
              <span style={styles.tag}>Diagnosis support</span>
              <span style={styles.tag}>Drug interactions</span>
              <span style={styles.tag}>Clinical guidelines</span>
            </div>
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
    padding: '14px 28px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-panel)',
    flexShrink: 0,
  },
  topbarLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  topbarTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    maxWidth: '500px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  topbarMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.01em',
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
    fontSize: '12px',
    color: 'var(--text-muted)',
    userSelect: 'none',
    cursor: 'pointer',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
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
    gap: '14px',
    marginTop: '60px',
  },
  emptyIcon: {
    marginBottom: '4px',
  },
  emptyTitle: {
    fontFamily: 'var(--font-serif)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  emptyHint: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    maxWidth: '380px',
    lineHeight: 1.65,
  },
  emptyTags: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    padding: '5px 12px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-panel)',
    fontWeight: 500,
  },
}

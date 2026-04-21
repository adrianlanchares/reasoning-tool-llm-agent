import React from 'react'
import TraceViewer from './TraceViewer.jsx'

function LoadingDots() {
  return (
    <span style={styles.loadingDots}>
      <span style={{ ...styles.dot, animationDelay: '0ms' }} />
      <span style={{ ...styles.dot, animationDelay: '160ms' }} />
      <span style={{ ...styles.dot, animationDelay: '320ms' }} />
      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.15; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  )
}

const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g

function renderWithLinks(text) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        {part}
      </a>
    ) : (
      part
    )
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.wrapperUser : styles.wrapperAgent) }}>
      <div style={{ ...styles.roleTag, ...(isUser ? styles.roleTagUser : styles.roleTagAgent) }}>
        {isUser ? 'YOU' : 'AGENT'}
      </div>

      <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleAgent), ...(message.error ? styles.bubbleError : {}) }}>
        {message.loading ? (
          <LoadingDots />
        ) : (
          <p style={styles.content}>{renderWithLinks(message.content)}</p>
        )}
      </div>

      {!isUser && !message.loading && message.trace?.length > 0 && (
        <TraceViewer trace={message.trace} />
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '780px',
    width: '100%',
    animation: 'fadeInUp 0.2s ease',
  },
  wrapperUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapperAgent: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  roleTag: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    fontWeight: 600,
  },
  roleTagUser: {
    color: 'var(--text-muted)',
  },
  roleTagAgent: {
    color: 'var(--accent)',
  },
  bubble: {
    padding: '12px 16px',
    borderRadius: '4px',
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  bubbleUser: {
    background: 'var(--user-bubble)',
    border: '1px solid var(--border)',
    borderBottomRightRadius: '2px',
  },
  bubbleAgent: {
    background: 'var(--agent-bubble)',
    border: '1px solid var(--border)',
    borderBottomLeftRadius: '2px',
    width: '100%',
  },
  bubbleError: {
    borderColor: 'var(--error)',
    color: 'var(--error)',
  },
  content: {
    fontSize: '14px',
    lineHeight: 1.65,
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(200,240,96,0.4)',
    wordBreak: 'break-all',
  },
  loadingDots: {
    display: 'inline-flex',
    gap: '5px',
    alignItems: 'center',
    padding: '2px 0',
  },
  dot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'blink 1.2s infinite',
  },
}
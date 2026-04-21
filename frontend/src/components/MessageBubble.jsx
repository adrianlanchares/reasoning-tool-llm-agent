import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

function MarkdownContent({ content }) {
  return (
    <div style={styles.content}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" style={styles.link} />
          ),
          p: ({ children }) => <p style={styles.paragraph}>{children}</p>,
          ul: ({ children }) => <ul style={styles.list}>{children}</ul>,
          ol: ({ children }) => <ol style={styles.list}>{children}</ol>,
          li: ({ children }) => <li style={styles.listItem}>{children}</li>,
          code: ({ inline, children, ...props }) =>
            inline ? (
              <code style={styles.inlineCode} {...props}>{children}</code>
            ) : (
              <pre style={styles.codeBlock}><code {...props}>{children}</code></pre>
            ),
          h1: ({ children }) => <h1 style={styles.h1}>{children}</h1>,
          h2: ({ children }) => <h2 style={styles.h2}>{children}</h2>,
          h3: ({ children }) => <h3 style={styles.h3}>{children}</h3>,
          strong: ({ children }) => <strong style={styles.strong}>{children}</strong>,
          blockquote: ({ children }) => <blockquote style={styles.blockquote}>{children}</blockquote>,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div style={{ ...styles.wrapper, ...(isUser ? styles.wrapperUser : styles.wrapperAgent) }}>
      <div style={{ ...styles.roleTag, ...(isUser ? styles.roleTagUser : styles.roleTagAgent) }}>
        {isUser ? (
          <>
            <span style={styles.roleIcon}>👤</span> You
          </>
        ) : (
          <>
            <span style={styles.roleIconMed}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4.5" y="1" width="3" height="10" rx="1" fill="#1a6fc4"/>
                <rect x="1" y="4.5" width="10" height="3" rx="1" fill="#1a6fc4"/>
              </svg>
            </span>
            MedAgent
          </>
        )}
      </div>

      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleAgent),
          ...(message.error ? styles.bubbleError : {}),
        }}
      >
        {message.loading ? <LoadingDots /> : <MarkdownContent content={message.content} />}
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
    gap: '5px',
    maxWidth: '800px',
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
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  roleTagUser: {
    color: 'var(--text-muted)',
  },
  roleTagAgent: {
    color: 'var(--accent)',
  },
  roleIcon: {
    fontSize: '12px',
  },
  roleIconMed: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  bubble: {
    padding: '13px 18px',
    borderRadius: 'var(--radius)',
    maxWidth: '100%',
    wordBreak: 'break-word',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  bubbleUser: {
    background: 'var(--user-bubble)',
    color: '#ffffff',
    borderBottomRightRadius: '3px',
  },
  bubbleAgent: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderBottomLeftRadius: '3px',
    width: '100%',
  },
  bubbleError: {
    borderColor: 'var(--error)',
    background: '#fdf2f2',
    color: 'var(--error)',
  },
  content: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: 'var(--text-primary)',
  },
  paragraph: {
    margin: '0 0 8px',
  },
  list: {
    margin: '8px 0',
    paddingLeft: '22px',
  },
  listItem: {
    margin: '4px 0',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(26,111,196,0.4)',
    wordBreak: 'break-all',
  },
  inlineCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9em',
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    padding: '1px 5px',
    borderRadius: '4px',
  },
  codeBlock: {
    margin: '10px 0',
    padding: '14px 16px',
    overflowX: 'auto',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--trace-bg)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
  },
  h1: {
    fontFamily: 'var(--font-serif)',
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '4px 0 10px',
    letterSpacing: '-0.01em',
  },
  h2: {
    fontFamily: 'var(--font-serif)',
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '4px 0 8px',
  },
  h3: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '4px 0 6px',
  },
  strong: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  blockquote: {
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '14px',
    margin: '8px 0',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  loadingDots: {
    display: 'inline-flex',
    gap: '5px',
    alignItems: 'center',
    padding: '2px 0',
  },
  dot: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'blink 1.2s infinite',
  },
}

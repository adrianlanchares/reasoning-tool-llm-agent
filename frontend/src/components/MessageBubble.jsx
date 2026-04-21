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
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            />
          ),
          p: ({ children }) => <p style={styles.paragraph}>{children}</p>,
          ul: ({ children }) => <ul style={styles.list}>{children}</ul>,
          ol: ({ children }) => <ol style={styles.list}>{children}</ol>,
          li: ({ children }) => <li style={styles.listItem}>{children}</li>,
          code: ({ inline, children, ...props }) =>
            inline ? (
              <code style={styles.inlineCode} {...props}>
                {children}
              </code>
            ) : (
              <pre style={styles.codeBlock}>
                <code {...props}>{children}</code>
              </pre>
            ),
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
        {isUser ? 'YOU' : 'AGENT'}
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
  },
  paragraph: {
    margin: 0,
  },
  list: {
    margin: '8px 0',
    paddingLeft: '20px',
  },
  listItem: {
    margin: '4px 0',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(200,240,96,0.4)',
    wordBreak: 'break-all',
  },
  inlineCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.95em',
    background: 'rgba(255,255,255,0.06)',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  codeBlock: {
    margin: '8px 0 0',
    padding: '12px',
    overflowX: 'auto',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: 1.5,
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
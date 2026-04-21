import React, { useRef, useEffect } from 'react'

export default function ChatInput({ onSend, disabled, selectedModel, onSelectModel }) {
  const textareaRef = useRef(null)

  // Auto-grow textarea
  function handleInput(e) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const value = textareaRef.current?.value?.trim()
    if (!value || disabled) return
    onSend(value)
    textareaRef.current.value = ''
    textareaRef.current.style.height = 'auto'
  }

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [disabled])

  return (
    <div style={styles.wrapper}>
      <div style={styles.inner}>
        <select
          value={selectedModel}
          onChange={(e) => onSelectModel(e.target.value)}
          disabled={disabled}
          style={styles.modelSelect}
          title="Select model"
        >
          <option value="full">full</option>
          <option value="reason-only">reason-only</option>
          <option value="tool-only">tool-only</option>
          <option value="rag-only">rag-only</option>
        </select>

        <textarea
          ref={textareaRef}
          style={styles.textarea}
          placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <button
          style={{ ...styles.sendBtn, ...(disabled ? styles.sendBtnDisabled : {}) }}
          onClick={submit}
          disabled={disabled}
          title="Send"
        >
          ▶
        </button>
      </div>
      <p style={styles.hint}>
        {disabled ? (
          <span style={{ color: 'var(--accent)' }}>agent is thinking…</span>
        ) : (
          <span>Enter ↵ to send · Shift+Enter for newline</span>
        )}
      </p>
    </div>
  )
}

const styles = {
  wrapper: {
    padding: '12px 24px 16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  inner: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-bright)',
    borderRadius: '6px',
    padding: '8px 12px',
    transition: 'border-color 0.15s',
  },
  modelSelect: {
    flexShrink: 0,
    alignSelf: 'flex-end',
    height: '32px',
    padding: '0 10px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'var(--font-sans)',
  },
  sendBtn: {
    padding: '4px 8px',
    background: 'var(--accent)',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    alignSelf: 'flex-end',
    marginBottom: '1px',
    transition: 'opacity 0.15s',
    fontFamily: 'var(--font-mono)',
  },
  sendBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: '6px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
    paddingLeft: '2px',
  },
}

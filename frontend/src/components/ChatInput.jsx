import React, { useRef, useEffect } from 'react'

export default function ChatInput({ onSend, disabled, selectedModel, onSelectModel }) {
  const textareaRef = useRef(null)

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
          <option value="full">Full Agent</option>
          <option value="reason-only">Reasoning Only</option>
          <option value="tool-only">Tool Only</option>
          <option value="rag-only">RAG Only</option>
        </select>

        <div style={styles.inputDivider} />

        <textarea
          ref={textareaRef}
          style={styles.textarea}
          placeholder="Describe the clinical question or patient presentation…"
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <p style={styles.hint}>
        {disabled ? (
          <span style={styles.hintActive}>
            <span style={styles.hintPulse} />
            Agent is processing your query…
          </span>
        ) : (
          <span>Press Enter to send · Shift + Enter for new line</span>
        )}
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: {
    padding: '14px 28px 18px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-panel)',
  },
  inner: {
    display: 'flex',
    gap: '0',
    alignItems: 'flex-end',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 10px 8px 14px',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: '0 1px 3px rgba(26,111,196,0.04)',
  },
  modelSelect: {
    flexShrink: 0,
    alignSelf: 'flex-end',
    height: '32px',
    padding: '0 8px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  },
  inputDivider: {
    width: '1px',
    height: '20px',
    background: 'var(--border)',
    alignSelf: 'flex-end',
    marginBottom: '6px',
    marginLeft: '6px',
    marginRight: '10px',
    flexShrink: 0,
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
    padding: '7px 10px',
    background: 'var(--accent)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    alignSelf: 'flex-end',
    transition: 'opacity 0.15s, background 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  hint: {
    marginTop: '7px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    paddingLeft: '2px',
  },
  hintActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    color: 'var(--accent)',
    fontWeight: 500,
  },
  hintPulse: {
    display: 'inline-block',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'pulse 1.4s infinite',
  },
}

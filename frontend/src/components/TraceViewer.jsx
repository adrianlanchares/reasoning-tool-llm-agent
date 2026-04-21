import React, { useState } from 'react'

function TraceStep({ step, index }) {
  const [open, setOpen] = useState(false)

  const roleLabel = {
    user: 'User Input',
    assistant: 'Reasoning',
    tool: `Tool: ${step.tool_name ?? ''}`,
    system: 'System',
  }[step.role] ?? step.role?.toUpperCase()

  const roleColor = {
    user: '#4a7fb5',
    assistant: '#1a6fc4',
    tool: '#7a4fc4',
    system: '#8a97aa',
  }[step.role] ?? '#8a97aa'

  const roleBg = {
    user: '#eef4fb',
    assistant: '#e8f1fb',
    tool: '#f0ecfb',
    system: '#f4f6f9',
  }[step.role] ?? '#f4f6f9'

  const preview =
    typeof step.content === 'string'
      ? step.content.slice(0, 90).replace(/\n/g, ' ')
      : JSON.stringify(step).slice(0, 90)

  return (
    <div style={styles.step}>
      <button style={styles.stepHeader} onClick={() => setOpen((o) => !o)}>
        <span style={styles.stepIndex}>{String(index).padStart(2, '0')}</span>
        <span style={{ ...styles.stepRole, color: roleColor, background: roleBg }}>{roleLabel}</span>
        <span style={styles.stepPreview}>{preview}{step.content?.length > 90 ? '…' : ''}</span>
        <span style={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <pre style={styles.stepBody}>
          {step.tool_args && (
            <span style={styles.toolArgs}>
              {'// args\n'}
              {JSON.stringify(step.tool_args, null, 2)}
              {'\n\n// result\n'}
            </span>
          )}
          {step.content}
        </pre>
      )}
    </div>
  )
}

export default function TraceViewer({ trace }) {
  const [open, setOpen] = useState(false)

  if (!trace || trace.length === 0) return null

  const steps = trace.filter((s) => s.role !== 'user')

  return (
    <div style={styles.container}>
      <button style={styles.toggle} onClick={() => setOpen((o) => !o)}>
        <span style={styles.toggleIcon}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#1a6fc4" strokeWidth="1.5"/>
            <path d="M6 4v2l1.5 1.5" stroke="#1a6fc4" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <span style={styles.toggleText}>Reasoning Trace</span>
        <span style={styles.count}>{steps.length} steps</span>
        <span style={styles.chevronMain}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={styles.body}>
          {steps.map((step, i) => (
            <TraceStep key={i} step={step} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    marginTop: '10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    width: '100%',
  },
  toggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 14px',
    background: 'var(--trace-bg)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    border: 'none',
    transition: 'background 0.1s',
  },
  toggleIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  toggleText: {
    color: 'var(--accent)',
    fontWeight: 600,
  },
  count: {
    marginLeft: 'auto',
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--border)',
    padding: '1px 8px',
    borderRadius: '10px',
  },
  chevronMain: {
    fontSize: '9px',
    color: 'var(--text-muted)',
  },
  body: {
    background: 'var(--bg-panel)',
    borderTop: '1px solid var(--border)',
  },
  step: {
    borderBottom: '1px solid var(--border)',
  },
  stepHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: 'var(--text-secondary)',
    fontSize: '12px',
  },
  stepIndex: {
    flexShrink: 0,
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    opacity: 0.7,
  },
  stepRole: {
    flexShrink: 0,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    minWidth: '90px',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  stepPreview: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  chevron: {
    flexShrink: 0,
    fontSize: '9px',
    color: 'var(--text-muted)',
  },
  stepBody: {
    padding: '12px 16px',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.7,
    background: 'var(--trace-bg)',
    maxHeight: '320px',
    overflowY: 'auto',
    borderTop: '1px solid var(--border)',
  },
  toolArgs: {
    color: 'var(--text-muted)',
  },
}

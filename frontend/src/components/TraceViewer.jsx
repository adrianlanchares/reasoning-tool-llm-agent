import React, { useState } from 'react'

function TraceStep({ step, index }) {
  const [open, setOpen] = useState(false)

  const roleLabel = {
    user: 'USER',
    assistant: 'THINK',
    tool: `TOOL: ${step.tool_name ?? ''}`,
    system: 'SYS',
  }[step.role] ?? step.role?.toUpperCase()

  const roleColor = {
    user: '#7a9cc0',
    assistant: '#c8f060',
    tool: '#f0a060',
    system: '#888',
  }[step.role] ?? '#888'

  const preview =
    typeof step.content === 'string'
      ? step.content.slice(0, 80).replace(/\n/g, ' ')
      : JSON.stringify(step).slice(0, 80)

  return (
    <div style={styles.step}>
      <button style={styles.stepHeader} onClick={() => setOpen((o) => !o)}>
        <span style={styles.stepIndex}>{String(index).padStart(2, '0')}</span>
        <span style={{ ...styles.stepRole, color: roleColor }}>{roleLabel}</span>
        <span style={styles.stepPreview}>{preview}{step.content?.length > 80 ? '…' : ''}</span>
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
        <span style={styles.toggleIcon}>◈</span>
        <span>reasoning trace</span>
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
    borderRadius: '4px',
    overflow: 'hidden',
  },
  toggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 12px',
    background: 'var(--trace-bg)',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
    textAlign: 'left',
    cursor: 'pointer',
    border: 'none',
  },
  toggleIcon: {
    color: 'var(--accent)',
    fontSize: '12px',
  },
  count: {
    marginLeft: 'auto',
    fontSize: '10px',
  },
  chevronMain: {
    fontSize: '9px',
  },
  body: {
    background: 'var(--trace-bg)',
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
    padding: '6px 12px',
    background: 'transparent',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
  },
  stepIndex: {
    flexShrink: 0,
    fontSize: '10px',
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  stepRole: {
    flexShrink: 0,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    minWidth: '80px',
  },
  stepPreview: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  chevron: {
    flexShrink: 0,
    fontSize: '9px',
  },
  stepBody: {
    padding: '10px 14px',
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.7,
    background: '#080808',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  toolArgs: {
    color: 'var(--text-muted)',
  },
}

import React, { useState } from 'react'

export default function Sidebar({
  conversations,
  activeConversation,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  function startEdit(conv) {
    setEditingId(conv.id)
    setEditValue(conv.title)
  }

  function commitEdit(id) {
    if (editValue.trim()) onRename(id, editValue.trim())
    setEditingId(null)
  }

  return (
    <aside style={styles.sidebar}>
      {/* Header with medical cross logo */}
      <div style={styles.header}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="2" width="4" height="16" rx="1.5" fill="#1a6fc4"/>
              <rect x="2" y="8" width="16" height="4" rx="1.5" fill="#1a6fc4"/>
            </svg>
          </div>
          <div>
            <div style={styles.logoName}>MedAgent</div>
            <div style={styles.logoSub}>Clinical AI Assistant</div>
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      <button style={styles.newBtn} onClick={onCreate}>
        <span style={styles.newBtnPlus}>+</span>
        New Consultation
      </button>

      <div style={styles.navLabel}>Recent Sessions</div>

      <nav style={styles.nav}>
        {conversations.map((conv) => {
          const isActive = conv.id === activeConversation.id
          const isHovered = hoveredId === conv.id
          const isEditing = editingId === conv.id

          return (
            <div
              key={conv.id}
              style={{
                ...styles.convItem,
                ...(isActive ? styles.convItemActive : {}),
                ...(isHovered && !isActive ? styles.convItemHover : {}),
              }}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => !isEditing && onSelect(conv.id)}
            >
              <span style={styles.convDot} />
              {isEditing ? (
                <input
                  autoFocus
                  style={styles.editInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(conv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(conv.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span style={styles.convTitle}>{conv.title}</span>
              )}

              {(isHovered || isActive) && !isEditing && (
                <div style={styles.convActions} onClick={(e) => e.stopPropagation()}>
                  <button style={styles.actionBtn} title="Rename" onClick={() => startEdit(conv)}>
                    ✎
                  </button>
                  <button
                    style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                    title="Delete"
                    onClick={() => onDelete(conv.id)}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div style={styles.footer}>
        <div style={styles.footerBadge}>
          <span style={styles.footerDot} />
          System Active
        </div>
        <div style={styles.footerVersion}>reasoning-tool-llm-agent v1</div>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    minWidth: 'var(--sidebar-width)',
    height: '100%',
    background: 'var(--bg-panel)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 18px 18px',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    background: 'var(--accent-light)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoName: {
    fontFamily: 'var(--font-serif)',
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
    marginTop: '1px',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
    margin: '0 0 12px 0',
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 12px 16px',
    padding: '9px 14px',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius)',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s',
    cursor: 'pointer',
    width: 'calc(100% - 24px)',
  },
  newBtnPlus: {
    fontSize: '18px',
    lineHeight: 1,
    fontWeight: 300,
  },
  navLabel: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    padding: '0 18px 8px',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.1s',
    minHeight: '36px',
    gap: '8px',
    marginBottom: '2px',
  },
  convItemActive: {
    background: 'var(--accent-light)',
    borderLeft: '3px solid var(--accent)',
    paddingLeft: '7px',
  },
  convItemHover: {
    background: 'var(--bg-hover)',
  },
  convDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--border-bright)',
    flexShrink: 0,
  },
  convTitle: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convActions: {
    display: 'flex',
    gap: '2px',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '2px 5px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    borderRadius: '3px',
    lineHeight: 1.2,
    transition: 'color 0.1s',
  },
  deleteBtn: {
    fontSize: '16px',
    color: 'var(--error)',
    opacity: 0.6,
  },
  editInput: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 6px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  footer: {
    padding: '14px 18px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  footerBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--success)',
    fontWeight: 500,
  },
  footerDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: 'var(--success)',
    flexShrink: 0,
  },
  footerVersion: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '0.03em',
  },
}

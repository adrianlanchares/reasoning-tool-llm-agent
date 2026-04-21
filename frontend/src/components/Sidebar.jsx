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
      <div style={styles.header}>
        <span style={styles.logo}>
          <span style={styles.logoAccent}>⬡</span> AGENT
        </span>
      </div>

      <button style={styles.newBtn} onClick={onCreate}>
        <span style={styles.newBtnPlus}>+</span>
        New conversation
      </button>

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
                  <button
                    style={styles.actionBtn}
                    title="Rename"
                    onClick={() => startEdit(conv)}
                  >
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
        <span style={styles.footerText}>reasoning-tool-llm-agent</span>
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
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--text-primary)',
  },
  logoAccent: {
    color: 'var(--accent)',
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 10px',
    padding: '8px 12px',
    border: '1px solid var(--border-bright)',
    borderRadius: '4px',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    letterSpacing: '0.02em',
    transition: 'all 0.15s',
    cursor: 'pointer',
    width: 'calc(100% - 20px)',
  },
  newBtnPlus: {
    fontSize: '16px',
    lineHeight: 1,
    color: 'var(--accent)',
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 8px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    minHeight: '34px',
    gap: '6px',
  },
  convItemActive: {
    background: 'var(--bg-active)',
    borderLeft: '2px solid var(--accent)',
    paddingLeft: '8px',
  },
  convItemHover: {
    background: 'var(--bg-hover)',
  },
  convTitle: {
    flex: 1,
    fontSize: '12px',
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
  },
  editInput: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--accent)',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
  },
  footerText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
}

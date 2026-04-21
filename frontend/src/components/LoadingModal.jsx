import React from 'react'

export default function LoadingModal({ visible, brainrotMode }) {
  if (!visible || !brainrotMode) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <p style={styles.label}>Agent is thinking…</p>
        <video
          style={styles.video}
          src="/loading.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-bright)',
    borderRadius: '8px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '420px',
    width: '90%',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--accent)',
    letterSpacing: '0.08em',
  },
  video: {
    width: '100%',
    borderRadius: '4px',
  },
}
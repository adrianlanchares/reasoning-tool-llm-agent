import React from 'react'

export default function LoadingModal({ visible, brainrotMode }) {
  if (!visible || !brainrotMode) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.spinner}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="16" stroke="#e3edf8" strokeWidth="3"/>
            <circle cx="20" cy="20" r="16" stroke="#1a6fc4" strokeWidth="3" strokeDasharray="60 40" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <p style={styles.label}>Analyzing clinical data…</p>
        <p style={styles.sub}>The agent is processing your query using medical knowledge bases.</p>
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
    background: 'rgba(26, 36, 52, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
  },
  modal: {
    background: 'var(--bg-panel)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
  },
  spinner: {
    marginBottom: '4px',
  },
  label: {
    fontFamily: 'var(--font-serif)',
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  sub: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  video: {
    width: '100%',
    borderRadius: '8px',
    marginTop: '8px',
    border: '1px solid var(--border)',
  },
}

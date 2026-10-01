'use client'

import { useEffect, useRef, useState } from 'react'

export default function WalletDropdown({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [open])

  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4)
  const hue = parseInt(address.slice(2, 6), 16) % 360
  const itemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 10px', borderRadius: 9, textDecoration: 'none', transition: 'background 0.1s' } as const
  const iconBox = { width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
  const chevron = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, background: open ? 'var(--accent-bg)' : 'var(--bg-subtle)', border: `1px solid ${open ? 'rgba(110,84,245,0.4)' : 'var(--border-strong)'}`, borderRadius: 8, padding: '4px 10px 4px 5px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${hue},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: 0.5 }}>
          {address.slice(2, 4).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{shortAddr}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div style={{ position: 'fixed', top: 58, right: 20, width: 320, background: 'var(--bg-dropdown)', border: '1px solid var(--border-strong)', borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, hsl(${hue},60%,38%), hsl(${(hue + 40) % 360},55%,30%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0, letterSpacing: 1 }}>
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>{shortAddr}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Connected wallet</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500) }} title={copied ? 'Copied!' : 'Copy address'}
              style={{ width: 34, height: 34, background: copied ? 'var(--accent-bg)' : 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
              {copied
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
            </button>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <a href={`/profile/${address}`} onClick={() => setOpen(false)} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconBox}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-icon)" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>My profile</span>
              </div>{chevron}
            </a>
            <a href={`https://scan.pulsechain.com/address/${address}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={iconBox}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-icon)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>View on explorer</span>
              </div>{chevron}
            </a>
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
            <button onClick={() => { onDisconnect(); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', borderRadius: 9 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ ...iconBox, background: 'var(--danger-bg)' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
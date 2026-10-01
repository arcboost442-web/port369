'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import SearchModal from './SearchModal'
import WalletDropdown from './WalletDropdown'

// Uses the same global theme variables as the homepage (--bg-nav, --border, ...),
// so it follows data-theme="light" | "dark" automatically.
const CSS = `
@keyframes nb-blink{0%,100%{opacity:1;}50%{opacity:.3;}}
.nb{height:50px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:12px;position:sticky;top:0;z-index:100;background:var(--bg-nav);backdrop-filter:blur(14px);font-family:'Inter',sans-serif;}
.nb *,.nb *::before,.nb *::after{box-sizing:border-box;}
.nb a{text-decoration:none;}
.nb .nb-logo{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.nb .nb-mark{width:26px;height:26px;border:1.5px solid var(--accent);border-radius:5px;display:flex;align-items:center;justify-content:center;}
.nb .nb-mark svg{width:13px;height:13px;stroke:var(--accent);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}
.nb .nb-logo-text{font-size:14px;font-weight:800;letter-spacing:-0.4px;color:var(--text-primary);}
.nb .nb-search-wrap{position:absolute;left:50%;transform:translateX(-50%);width:360px;display:flex;align-items:center;gap:6px;}
.nb .nb-search{flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;height:32px;display:flex;align-items:center;padding:0 10px;gap:7px;color:var(--text-faint);font-size:13px;cursor:pointer;}
.nb .nb-search svg{width:13px;height:13px;stroke:var(--text-faint);fill:none;stroke-width:2;flex-shrink:0;}
.nb .nb-kbd{font-size:10px;color:var(--text-faint);background:var(--bg-subtle);border:1px solid var(--border);padding:1px 5px;border-radius:3px;font-family:monospace;margin-left:auto;}
.nb .nb-theme{background:var(--bg-subtle);border:1px solid var(--border);border-radius:7px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);flex-shrink:0;transition:background .15s;}
.nb .nb-theme:hover{background:var(--bg-item-hover);}
.nb .nb-r{display:flex;align-items:center;gap:8px;margin-left:auto;}
.nb .nb-count{font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:20px;padding:4px 10px;}
.nb .nb-chain{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:4px 10px;}
.nb .nb-dot{width:5px;height:5px;border-radius:50%;background:#F5A623;animation:nb-blink 2s ease-in-out infinite;}
.nb .nb-ghost{background:transparent;color:var(--text-muted);border:1px solid var(--border-strong);border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
.nb .nb-create{background:var(--accent);color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;display:inline-block;}
.nb .nb-create:hover{opacity:.88;}
@media(max-width:900px){.nb{padding:0 16px;}.nb .nb-search-wrap{display:none;}.nb .nb-count{display:none;}}
`

function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    const theme = next ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }

  return (
    <button className="nb-theme" onClick={toggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
    </button>
  )
}

export default function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => setMounted(true), [])
  const walletOn = mounted && isConnected

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const { data: topTokens } = useReadContract({
    address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI,
    functionName: 'getTokensPaginated', args: [BigInt(0), BigInt(20)],
  })

  return (
    <>
      <style>{CSS}</style>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} tokens={topTokens} />

      <nav className="nb">
        <a href="/" className="nb-logo">
          <div className="nb-mark"><svg viewBox="0 0 13 13"><polyline points="1,10 4,6 7,8 10,3 12,4.5"/></svg></div>
          <span className="nb-logo-text">Port369</span>
        </a>

        <div className="nb-search-wrap">
          <div className="nb-search" onClick={() => setSearchOpen(true)}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span style={{ flex: 1 }}>Search tokens</span>
            <span className="nb-kbd">⌘K</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="nb-r">
          {topTokens && topTokens.length > 0 && <div className="nb-count">• {topTokens.length} tokens</div>}
          <div className="nb-chain"><span className="nb-dot" />PulseChain</div>
          {walletOn && address
            ? <WalletDropdown address={address} onDisconnect={() => disconnect()} />
            : <button className="nb-ghost" onClick={() => connect({ connector: injected() })}>Connect wallet</button>}
          <a href="/create" className="nb-create">+ Create</a>
        </div>
      </nav>
    </>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'

const CLAIM_CONTRACT = '0x0000000000000000000000000000000000000000' as `0x${string}`
const CLAIM_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'hasClaimed', type: 'function', stateMutability: 'view', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'claimableAmount', type: 'function', stateMutability: 'view', inputs: [{ name: 'wallet', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

const CATEGORIES = [
  { label: 'Early Burners', desc: 'Burned PLS prior to the snapshot' },
  { label: 'Diamond Hands', desc: 'Held PLS for 6 months or longer' },
  { label: 'Whale Wallets', desc: 'Maintained a balance of 100M PLS or more' },
  { label: 'Liquidity Providers', desc: 'Provided liquidity on PulseX for 30+ days' },
  { label: 'Sacrifice Participants', desc: 'Participated in the PLS sacrifice phase' },
  { label: 'Builders', desc: 'Deployed smart contracts on PulseChain' },
  { label: 'DeFi Users', desc: 'Completed more than 50 DeFi transactions' },
  { label: 'Port369 Users', desc: 'Interacted with the bonding curve' },
  { label: 'Bridge Users', desc: 'Bridged from Ethereum to PulseChain multiple times' },
  { label: 'OG Holders', desc: 'Held PLS since the early blocks' },
  { label: 'High Volume Traders', desc: 'Generated significant swap volume' },
]

const FAQ = [
  { q: 'What is $PORT369?', a: '$PORT369 is a fair-launch token on PulseChain with a unique burn mechanism. 100% of the supply is distributed to the community — no team allocation, no VC, no insiders.' },
  { q: 'How do I claim?', a: 'Connect your PulseChain wallet. The system automatically checks eligibility against 11 snapshot categories. If eligible, the Claim button will activate.' },
  { q: 'When does the claim window close?', a: 'The claim window is open for 30 days after TGE. Tokens that are not claimed will be permanently burned.' },
  { q: 'How much will I receive?', a: 'The amount depends on which eligibility categories your wallet qualifies for. Wallets that meet more categories receive a larger allocation.' },
  { q: 'Is there a fee to claim?', a: 'There is no claim fee. You only need PLS to cover the on-chain transaction gas cost.' },
  { q: 'How does the burn mechanism work?', a: 'A portion of every $PORT369 transaction is burned automatically. Unclaimed tokens after the deadline are also permanently burned, creating deflationary pressure from day one.' },
  { q: 'How do I verify there is no scam?', a: 'Only port369.com is official. We never DM first, there is no presale, and there are no hidden fees. Always verify the contract address on this page before interacting.' },
]

// ── SVG icon set ──────────────────────────────────────────────────────────────
const Icon = {
  warning: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevronDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevronRight: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  wallet: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
  disconnect: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  moon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  sun: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  externalLink: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  grid: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  flame: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>,
}

// ── Category icon (index-based, clean geometric SVG) ──────────────────────────
function CategoryIcon({ index }: { index: number }) {
  const icons = [
    <svg key={0} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>,
    <svg key={1} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    <svg key={2} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
    <svg key={3} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    <svg key={4} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    <svg key={5} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    <svg key={6} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    <svg key={7} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    <svg key={8} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    <svg key={9} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    <svg key={10} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    <svg key={11} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    <svg key={12} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    <svg key={13} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    <svg key={14} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  ]
  return icons[index % icons.length]
}

// ── Wallet button ─────────────────────────────────────────────────────────────
function WalletButton({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4)
  const hue = parseInt(address.slice(2, 6), 16) % 360
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: open ? 'var(--accent-bg)' : 'var(--bg-subtle)', border: `1px solid ${open ? 'rgba(110,84,245,0.4)' : 'var(--border-strong)'}`, borderRadius: 8, padding: '4px 10px 4px 5px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${hue},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>{address.slice(2, 4).toUpperCase()}</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{shortAddr}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--text-faint)', display: 'flex' }}>{Icon.chevronDown}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{ position: 'absolute', top: 44, right: 0, width: 190, background: 'var(--bg-dropdown)', border: '1px solid var(--border-strong)', borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 999, padding: 6 }}>
            <button onClick={() => { onDisconnect(); setOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 7, fontFamily: 'Inter, sans-serif', color: 'var(--danger)', fontSize: 13, fontWeight: 600 }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: 'var(--danger)' }}>{Icon.disconnect}</span> Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
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
    const next = !dark; setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return (
    <button onClick={toggle} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}>
      {dark ? Icon.moon : Icon.sun}
    </button>
  )
}

// ── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{q}</span>
        <span style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex', flexShrink: 0 }}>{Icon.chevronDown}</span>
      </button>
      {open && <div style={{ padding: '0 18px 14px', paddingTop: 12, fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>{a}</div>}
    </div>
  )
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 2 }} />
      {children}
    </div>
  )
}

function statusCard(bg: string, border: string) {
  return { display: 'flex' as const, alignItems: 'center' as const, gap: 14, padding: '16px 18px', background: bg, border: `1px solid ${border}`, borderRadius: 10, flexWrap: 'wrap' as const }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClaimPage() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const connected = mounted && isConnected

  type ClaimStatus = 'idle' | 'checking' | 'eligible' | 'not-eligible' | 'already-claimed' | 'claiming' | 'claimed' | 'error'
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle')
  const [claimAmount, setClaimAmount] = useState('')
  const [claimedCategories, setClaimedCategories] = useState<number[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract()
  const { isSuccess: txConfirmed, isLoading: txConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const checkEligibility = useCallback(async () => {
    if (!address) return
    setClaimStatus('checking')
    setClaimedCategories([])
    await new Promise(r => setTimeout(r, 1400))
    // TODO: replace with actual contract call after deploy
    // const claimed = await readContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'hasClaimed', args: [address] })
    // const amount = await readContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'claimableAmount', args: [address] })
    const isEligible = parseInt(address.slice(-1), 16) % 2 === 0
    if (isEligible) {
      const cats = [0, 2, 6].filter(() => Math.random() > 0.4)
      setClaimedCategories(cats.length ? cats : [0])
      setClaimAmount('24,500')
      setClaimStatus('eligible')
    } else {
      setClaimStatus('not-eligible')
    }
  }, [address])

  useEffect(() => {
    if (connected && address && claimStatus === 'idle') checkEligibility()
  }, [connected, address, claimStatus, checkEligibility])

  useEffect(() => {
    if (txConfirmed) setClaimStatus('claimed')
    if (txError) { setClaimStatus('error'); setErrorMsg(txError.message?.slice(0, 120) ?? 'Transaction failed') }
  }, [txConfirmed, txError])

  const handleClaim = () => {
    if (!address) return
    setClaimStatus('claiming')
    writeContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'claim' })
  }

  const statusBox = () => {
    if (!connected) return null

    if (claimStatus === 'checking') return (
      <div style={statusCard('var(--bg-subtle)', 'var(--border)')}>
        <div style={{ width: 16, height: 16, border: '2px solid var(--accent-bg)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Verifying <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span> against snapshot data…</span>
      </div>
    )

    if (claimStatus === 'eligible') return (
      <div style={statusCard('rgba(23,201,116,0.05)', 'rgba(23,201,116,0.2)')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(23,201,116,0.12)', border: '1px solid rgba(23,201,116,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#17C974', flexShrink: 0 }}>{Icon.check}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
            Wallet eligible — <span style={{ color: '#17C974' }}>amount TBA</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {claimedCategories.length} {claimedCategories.length === 1 ? 'category' : 'categories'} matched: {claimedCategories.map(i => CATEGORIES[i].label).join(', ')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Claimable amount will be shown once the snapshot is finalized.
          </div>
        </div>
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Claim opens at TGE
        </div>
      </div>
    )

    if (claimStatus === 'not-eligible') return (
      <div style={statusCard('var(--bg-subtle)', 'var(--border)')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', flexShrink: 0 }}>{Icon.x}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Not eligible</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This address did not qualify for any snapshot category.</div>
        </div>
        <button onClick={checkEligibility}
          style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          Try another wallet
        </button>
      </div>
    )

    if (claimStatus === 'already-claimed') return (
      <div style={statusCard('var(--accent-bg)', 'var(--accent-border)')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>{Icon.check}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Already claimed</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This wallet has already successfully claimed $PORT369.</div>
        </div>
      </div>
    )

    if (claimStatus === 'claimed') return (
      <div style={statusCard('rgba(23,201,116,0.05)', 'rgba(23,201,116,0.25)')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(23,201,116,0.12)', border: '1px solid rgba(23,201,116,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#17C974', flexShrink: 0 }}>{Icon.check}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Claim successful</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {claimAmount} $PORT369 sent to your wallet.{' '}
            {txHash && <a href={`https://scan.pulsechain.com/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>View on explorer {Icon.externalLink}</a>}
          </div>
        </div>
      </div>
    )

    if (claimStatus === 'error') return (
      <div style={statusCard('var(--danger-bg)', 'rgba(240,69,90,0.25)')}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-bg)', border: '1px solid rgba(240,69,90,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', flexShrink: 0 }}>{Icon.warning}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>Transaction failed</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{errorMsg}</div>
        </div>
        <button onClick={() => setClaimStatus('eligible')}
          style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          Retry
        </button>
      </div>
    )

    return null
  }

  return (
    <main style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Security notice */}
      <div style={{ background: 'rgba(240,69,90,0.1)', borderBottom: '1px solid rgba(240,69,90,0.2)', padding: '7px 20px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span style={{ color: 'var(--danger)', display: 'flex' }}>{Icon.warning}</span>
        Official site only: <strong style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>port369.com</strong>
        <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>—</span>
        We never DM first. No presale. No hidden fees.
      </div>

      {/* Navbar */}
      <nav style={{ height: 50, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-nav)', backdropFilter: 'blur(14px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, height: '100%' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, border: '1.5px solid var(--accent)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,10 4,6 7,8 10,3 12,4.5"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.4, color: 'var(--text-primary)' }}>Port369</span>
          </a>
          <span style={{ color: 'var(--text-dim)', display: 'flex' }}>{Icon.chevronRight}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Claim</span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5A623', display: 'inline-block', animation: 'blink 2s infinite' }} />
              PulseChain
            </div>
            <ThemeToggle />
            {connected && address
              ? <WalletButton address={address} onDisconnect={() => { disconnect(); setClaimStatus('idle') }} />
              : <button onClick={() => connect({ connector: injected() })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Connect Wallet</button>
            }
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 20px 80px', animation: 'fadeUp 0.3s ease' }}>

        {/* Hero */}
        <div style={{ marginBottom: 44, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(23,201,116,0.08)', border: '1px solid rgba(23,201,116,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 22, fontSize: 11, fontWeight: 700, color: '#17C974', letterSpacing: 0.3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#17C974', display: 'inline-block', animation: 'blink 2s infinite' }} />
            CLAIMS OPEN — 29 DAYS REMAINING
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.5, color: 'var(--text-primary)', lineHeight: 1.08, marginBottom: 16 }}>
            $PORT369<br />
            <span style={{ color: 'var(--accent)' }}>Airdrop</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: 520, marginBottom: 10 }}>
            100% of the total supply is allocated to the PulseChain community. No team allocation. No venture capital. No insider distribution.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.75, maxWidth: 520, marginBottom: 32 }}>
            Unclaimed tokens will be permanently burned after the claim period ends.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { label: 'Total Supply', value: '1,000,000,000' },
              { label: 'Community', value: '100%' },
              { label: 'Team / VC', value: '0%' },
              { label: 'Eligible Wallets', value: 'TBA' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', minWidth: 110, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Claim box */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', marginBottom: 36 }}>
          {!connected ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>{Icon.wallet}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Connect your wallet to check eligibility</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.65 }}>$PORT369 is distributed entirely through an on-chain airdrop. Eligibility is determined solely by historical activity on PulseChain. There is no whitelist, no private sale, and no preferential allocation.</div>
              <button onClick={() => connect({ connector: injected() })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {statusBox()}
              {(claimStatus === 'eligible' || claimStatus === 'not-eligible') && (
                <div style={{ marginTop: 10, textAlign: 'right' }}>
                  <button onClick={checkEligibility} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    Recheck
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* How it works */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>How It Works</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))', gap: 10 }}>
            {[
              { n: '01', title: 'Snapshot', desc: 'On-chain PulseChain data was analyzed at a fixed block height.' },
              { n: '02', title: 'Eligibility Check', desc: 'Connect your wallet to automatically verify against all eligibility categories.' },
              { n: '03', title: 'Claim', desc: 'Approve the transaction to receive $PORT369 directly in your wallet.' },
              { n: '04', title: 'Burn Mechanism', desc: 'Any tokens not claimed within 30 days of TGE will be permanently burned.' },
            ].map(s => (
              <div key={s.n} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 10, letterSpacing: 1 }}>{s.n}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>Eligibility Criteria</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.65 }}>
            Eligibility is based on verifiable on-chain activity. Wallets that meet multiple criteria will receive a proportionally higher allocation. All data is publicly auditable.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
            {CATEGORIES.map((cat, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-icon)', flexShrink: 0 }}>
                  <CategoryIcon index={i} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Token details */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>Token Details</SectionTitle>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { label: 'Token Name', value: 'PORT369' },
              { label: 'Symbol', value: '$PORT369' },
              { label: 'Network', value: 'PulseChain' },
              { label: 'Total Supply', value: '1,000,000,000' },
              { label: 'Community Allocation', value: '100%' },
              { label: 'Team / Investor Allocation', value: '0%' },
              { label: 'Contract Address', value: 'To be announced at TGE', mono: true },
              { label: 'Claim Period', value: '30 days following TGE' },
              { label: 'Unclaimed Tokens', value: 'Permanently burned after deadline' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right', fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>FAQ</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* Security Notice */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>Security Notice</SectionTitle>
          <div style={{ background: 'rgba(240,69,90,0.05)', border: '1px solid rgba(240,69,90,0.18)', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
              <span style={{ display: 'flex' }}>{Icon.warning}</span>
              Official domain: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-primary)', marginLeft: 2 }}>port369.com</span>
            </div>
            {[
              'We will never contact you first via direct message.',
              'Never connect your wallet or enter your seed phrase on any other website.',
              'Always verify the URL before interacting.',
            ].map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--danger)', display: 'flex', marginTop: 1, flexShrink: 0 }}>{Icon.chevronRight}</span>
                {line}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, rgba(110,84,245,0.08) 0%, rgba(110,84,245,0.03) 100%)', border: '1px solid var(--accent-border)', borderRadius: 14, padding: '28px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: -0.3 }}>Connect your wallet to check eligibility and claim your allocation.</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.7 }}>
            Tokens that remain unclaimed after 30 days will be burned permanently.
          </div>
          {!connected
            ? <button onClick={() => connect({ connector: injected() })} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Connect &amp; Check Eligibility</button>
            : <a href="/" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 22px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>← Back to homepage</a>
          }
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 700 }}>Port369</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Always verify: <strong style={{ color: 'var(--text-dim)' }}>port369.com/claim</strong></span>
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <a href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Home</a>
            <a href="/create" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Create Token</a>
          </div>
        </div>
      </div>
    </main>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'

// ─── Ganti dengan contract address + ABI setelah deploy ──────────────────────
const CLAIM_CONTRACT = '0x0000000000000000000000000000000000000000' as `0x${string}`
const CLAIM_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'claimableAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// ─── Kategori airdrop — 15 kategori ──────────────────────────────────────────
const CATEGORIES = [
  { icon: '🔥', label: 'Early Burners', desc: 'Burned PLS before snapshot' },
  { icon: '💎', label: 'Diamond Hands', desc: 'Held PLS ≥ 6 bulan' },
  { icon: '🐋', label: 'Whale Wallets', desc: 'Balance ≥ 1M PLS' },
  { icon: '🌊', label: 'Liquidity Providers', desc: 'LP PulseX ≥ 30 hari' },
  { icon: '⚡', label: 'Sacrifice Participants', desc: 'PLS sacrifice phase' },
  { icon: '🏗️', label: 'Builders', desc: 'Deploy contract di PulseChain' },
  { icon: '📊', label: 'DeFi Users', desc: '>50 transaksi DeFi' },
  { icon: '🎯', label: 'Port369 Users', desc: 'Beli/jual via bonding curve' },
  { icon: '🤝', label: 'Community Members', desc: 'Aktif di Discord/Telegram' },
  { icon: '🗳️', label: 'Governance Voters', desc: 'Vote di proposal PulseChain' },
  { icon: '🔗', label: 'Bridge Users', desc: 'Bridge ETH → PLS ≥ 3x' },
  { icon: '🎲', label: 'OG Holders', desc: 'Hold PLS sejak block < 100k' },
  { icon: '🌱', label: 'Ecosystem Supporters', desc: 'Interaksi ≥ 10 protokol' },
  { icon: '📈', label: 'Traders', desc: 'Volume swap > 10k PLS' },
  { icon: '🛡️', label: 'Stakers', desc: 'Stake PLS ≥ 90 hari' },
]

const FAQ = [
  {
    q: 'Apa itu $PORT369?',
    a: '$PORT369 adalah token fair-launch di PulseChain dengan mekanisme burn unik. 100% supply didistribusikan ke komunitas — tidak ada alokasi tim, VC, atau insider.'
  },
  {
    q: 'Bagaimana cara claim?',
    a: 'Connect wallet PulseChain kamu, sistem otomatis cek eligibility berdasarkan 15 kategori snapshot. Kalau eligible, tombol Claim akan aktif.'
  },
  {
    q: 'Kapan deadline claim?',
    a: 'Claim window terbuka 30 hari setelah TGE. Token yang tidak diklaim akan di-burn permanen.'
  },
  {
    q: 'Berapa yang akan saya dapat?',
    a: 'Jumlah tergantung kategori eligibility dan tier kamu. Wallet yang masuk lebih banyak kategori mendapat alokasi lebih besar.'
  },
  {
    q: 'Apakah ada biaya untuk claim?',
    a: 'Tidak ada biaya claim. Kamu hanya perlu bayar gas PLS untuk transaksi on-chain.'
  },
  {
    q: 'Bagaimana dengan mekanisme burn?',
    a: 'Setiap transaksi $PORT369 membakar sebagian supply. Token yang tidak diklaim juga di-burn — deflasi otomatis dari hari pertama.'
  },
  {
    q: 'Bagaimana cara tahu kalau ada scam?',
    a: 'HANYA port369.com yang resmi. Kami tidak pernah DM duluan, tidak ada presale, tidak ada fee tersembunyi. Selalu verify contract address di halaman ini.'
  },
]

// ─── Wallet button / dropdown ringkas (reuse pola dari WalletDropdown) ────────
function WalletButton({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  const shortAddr = address.slice(0, 6) + '...' + address.slice(-4)
  const hue = parseInt(address.slice(2, 6), 16) % 360

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: open ? 'var(--accent-bg)' : 'var(--bg-subtle)',
          border: `1px solid ${open ? 'rgba(110,84,245,0.4)' : 'var(--border-strong)'}`,
          borderRadius: 8, padding: '4px 10px 4px 5px',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `hsl(${hue},60%,42%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fff',
        }}>
          {address.slice(2, 4).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{shortAddr}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: 44, right: 0, width: 200,
            background: 'var(--bg-dropdown)', border: '1px solid var(--border-strong)',
            borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            zIndex: 999, overflow: 'hidden', padding: 6,
          }}>
            <button
              onClick={() => { onDisconnect(); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 10px', background: 'none', border: 'none',
                cursor: 'pointer', borderRadius: 7, fontFamily: 'Inter, sans-serif',
                color: 'var(--danger)', fontSize: 13, fontWeight: 600,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Theme toggle (identik dengan homepage) ────────────────────────────────────
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
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return (
    <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'}
      style={{
        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        borderRadius: 7, width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
    >
      {dark
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      }
    </button>
  )
}

// ─── FAQ item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10,
      overflow: 'hidden', transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{q}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
          strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{
          padding: '0 18px 14px',
          fontSize: 13, lineHeight: 1.7,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 12,
        }}>
          {a}
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ClaimPage() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const connected = mounted && isConnected

  // Claim state machine
  type ClaimStatus = 'idle' | 'checking' | 'eligible' | 'not-eligible' | 'already-claimed' | 'claiming' | 'claimed' | 'error'
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle')
  const [claimAmount, setClaimAmount] = useState<string>('')
  const [claimedCategories, setClaimedCategories] = useState<number[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract()
  const { isSuccess: txConfirmed, isLoading: txConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  // Simulate eligibility check (ganti dengan readContract setelah contract deploy)
  const checkEligibility = useCallback(async () => {
    if (!address) return
    setClaimStatus('checking')
    setClaimedCategories([])

    await new Promise(r => setTimeout(r, 1400)) // simulasi RPC

    // TODO: ganti dengan actual contract call:
    // const claimed = await readContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'hasClaimed', args: [address] })
    // const amount = await readContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'claimableAmount', args: [address] })
    // Demo: eligible kalau address ends dengan digit genap
    const lastChar = address.slice(-1)
    const isEligible = parseInt(lastChar, 16) % 2 === 0

    if (isEligible) {
      const mockCategories = [0, 2, 6].filter(() => Math.random() > 0.4)
      setClaimedCategories(mockCategories.length ? mockCategories : [0])
      setClaimAmount('24,500')
      setClaimStatus('eligible')
    } else {
      setClaimStatus('not-eligible')
    }
  }, [address])

  // Handle wallet connect → auto check
  useEffect(() => {
    if (connected && address && claimStatus === 'idle') {
      checkEligibility()
    }
  }, [connected, address, claimStatus, checkEligibility])

  // Handle tx confirmed
  useEffect(() => {
    if (txConfirmed) setClaimStatus('claimed')
    if (txError) { setClaimStatus('error'); setErrorMsg(txError.message?.slice(0, 120) ?? 'Transaction failed') }
  }, [txConfirmed, txError])

  const handleClaim = () => {
    if (!address) return
    setClaimStatus('claiming')
    writeContract({ address: CLAIM_CONTRACT, abi: CLAIM_ABI, functionName: 'claim' })
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const statusBox = () => {
    if (!connected) return null

    if (claimStatus === 'checking') return (
      <div style={statusCard('#3E3E55', 'var(--bg-subtle)', 'var(--border)')}>
        <div style={{ width: 16, height: 16, border: '2px solid var(--accent-bg)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Checking eligibility for <strong style={{ color: 'var(--text-primary)' }}>{address.slice(0, 6)}...{address.slice(-4)}</strong>…</span>
      </div>
    )

    if (claimStatus === 'eligible') return (
      <div style={statusCard('var(--green)', 'rgba(23,201,116,0.06)', 'rgba(23,201,116,0.2)')}>
        <div style={{ fontSize: 22 }}>✅</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Wallet eligible — <span style={{ color: 'var(--green)' }}>{claimAmount} $PORT369</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {claimedCategories.length} kategori terpenuhi: {claimedCategories.map(i => CATEGORIES[i].label).join(', ')}
          </div>
        </div>
        <button onClick={handleClaim}
          disabled={isTxPending || txConfirming}
          style={{
            marginLeft: 'auto', background: 'var(--green)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 22px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            opacity: isTxPending || txConfirming ? 0.6 : 1,
            fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}
        >
          {isTxPending || txConfirming ? 'Confirming…' : 'Claim Now'}
        </button>
      </div>
    )

    if (claimStatus === 'not-eligible') return (
      <div style={statusCard('var(--text-dim)', 'var(--bg-subtle)', 'var(--border)')}>
        <div style={{ fontSize: 22 }}>❌</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Wallet tidak eligible</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Alamat ini tidak memenuhi syarat snapshot manapun.</div>
        </div>
        <button onClick={checkEligibility}
          style={{
            marginLeft: 'auto', background: 'var(--bg-card)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '9px 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}
        >
          Coba wallet lain
        </button>
      </div>
    )

    if (claimStatus === 'already-claimed') return (
      <div style={statusCard('var(--accent)', 'var(--accent-bg)', 'var(--accent-border)')}>
        <div style={{ fontSize: 22 }}>🎉</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sudah diklaim!</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wallet ini sudah berhasil claim $PORT369.</div>
        </div>
      </div>
    )

    if (claimStatus === 'claimed') return (
      <div style={statusCard('var(--green)', 'rgba(23,201,116,0.06)', 'rgba(23,201,116,0.25)')}>
        <div style={{ fontSize: 28 }}>🎉</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Claim berhasil!</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {claimAmount} $PORT369 sudah masuk ke wallet kamu.{' '}
            {txHash && (
              <a href={`https://scan.pulsechain.com/tx/${txHash}`} target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent)', fontWeight: 600 }}>Lihat di explorer →</a>
            )}
          </div>
        </div>
      </div>
    )

    if (claimStatus === 'error') return (
      <div style={statusCard('var(--danger)', 'var(--danger-bg)', 'rgba(240,69,90,0.25)')}>
        <div style={{ fontSize: 22 }}>⚠️</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Transaksi gagal</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{errorMsg}</div>
        </div>
        <button onClick={() => setClaimStatus('eligible')}
          style={{
            marginLeft: 'auto', background: 'var(--danger)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '9px 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', flexShrink: 0,
          }}
        >Coba lagi</button>
      </div>
    )

    return null
  }

  return (
    <main style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── Scam warning banner ──────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(240,69,90,0.12)', borderBottom: '1px solid rgba(240,69,90,0.25)',
        padding: '8px 20px', textAlign: 'center',
        fontSize: 12, fontWeight: 600, color: 'var(--danger)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        ⚠️ Hanya <strong style={{ color: '#fff' }}>port369.com</strong> yang resmi. Kami tidak pernah DM, tidak ada presale, tidak ada fee tersembunyi.
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav style={{
        height: 50, borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--bg-nav)',
        backdropFilter: 'blur(14px)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, height: '100%', position: 'relative' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, border: '1.5px solid var(--accent)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,10 4,6 7,8 10,3 12,4.5"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.4, color: 'var(--text-primary)' }}>Port369</span>
          </a>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Claim</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5A623', display: 'inline-block', animation: 'blink 2s infinite' }}></span>
              PulseChain
            </div>
            <ThemeToggle />
            {connected && address
              ? <WalletButton address={address} onDisconnect={() => { disconnect(); setClaimStatus('idle') }} />
              : (
                <button onClick={() => connect({ connector: injected() })}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '6px 14px', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Connect wallet
                </button>
              )
            }
          </div>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px', animation: 'fadeUp 0.35s ease' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(23,201,116,0.1)', border: '1px solid rgba(23,201,116,0.25)',
            borderRadius: 20, padding: '5px 14px', marginBottom: 20,
            fontSize: 11, fontWeight: 700, color: '#17C974',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#17C974', display: 'inline-block', animation: 'blink 2s infinite' }}></span>
            CLAIMS OPEN — 29 hari lagi
          </div>
          <h1 style={{
            fontSize: 42, fontWeight: 900, letterSpacing: -1.5,
            color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 14,
          }}>
            Claim $PORT369<br />
            <span style={{ color: 'var(--accent)' }}>Airdrop</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto', marginBottom: 32 }}>
            100% supply didistribusikan ke komunitas PulseChain. Tidak ada tim, tidak ada VC.
            Token yang tidak diklaim akan di-burn permanen.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {[
              { label: 'Total Supply', value: '1,000,000,000' },
              { label: 'Komunitas', value: '100%' },
              { label: 'Tim / VC', value: '0%' },
              { label: 'Eligible wallets', value: '48,250' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 20px', minWidth: 120,
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status box / CTA ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          {!connected ? (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '32px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Connect wallet untuk cek eligibility
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                Sistem akan otomatis cek apakah wallet kamu memenuhi syarat untuk mendapat $PORT369.
              </div>
              <button
                onClick={() => connect({ connector: injected() })}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '12px 28px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 24px',
            }}>
              {statusBox()}
              {/* Recheck button kalau sudah checking selesai */}
              {(claimStatus === 'eligible' || claimStatus === 'not-eligible') && (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button onClick={checkEligibility}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-dim)', fontSize: 11,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600,
                    }}
                  >
                    ↻ Recheck
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>Cara Kerja</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { num: '01', title: 'Snapshot diambil', desc: 'Data on-chain PulseChain dianalisis pada block tertentu' },
              { num: '02', title: 'Check eligibility', desc: 'Connect wallet — sistem otomatis cek 15 kategori' },
              { num: '03', title: 'Claim token', desc: 'Approve transaksi — $PORT369 langsung masuk ke wallet' },
              { num: '04', title: 'Token di-burn', desc: 'Yang tidak diklaim dalam 30 hari di-burn permanen' },
            ].map(s => (
              <div key={s.num} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '16px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 8, letterSpacing: 1 }}>STEP {s.num}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 15 Kategori ───────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>15 Kategori Eligibility</SectionTitle>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Wallet yang masuk lebih banyak kategori mendapat alokasi lebih besar. Semua data diambil dari on-chain PulseChain — transparan dan verifiable.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {CATEGORIES.map((cat, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 9, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{cat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Token details ─────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>Token Details</SectionTitle>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { label: 'Token Name', value: 'PORT369' },
              { label: 'Symbol', value: '$PORT369' },
              { label: 'Network', value: 'PulseChain' },
              { label: 'Total Supply', value: '1,000,000,000' },
              { label: 'Airdrop Allocation', value: '100% (1B tokens)' },
              { label: 'Team / VC', value: '0%' },
              { label: 'Contract Address', value: 'TBA — akan diumumkan saat TGE' },
              { label: 'Claim Window', value: '30 hari setelah TGE' },
              { label: 'Unclaimed tokens', value: 'Di-burn permanen setelah deadline' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 18px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: 12,
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right', fontFamily: row.label === 'Contract Address' ? 'monospace' : 'inherit' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionTitle>FAQ</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* ── Footer CTA ────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(110,84,245,0.1) 0%, rgba(110,84,245,0.04) 100%)',
          border: '1px solid var(--accent-border)',
          borderRadius: 14, padding: '28px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Jangan lewatkan window claim
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Token yang tidak diklaim dalam 30 hari akan di-burn selamanya. Tidak ada second chance.
          </div>
          {!connected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '12px 28px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Connect & Check Eligibility
            </button>
          ) : (
            <a href="/" style={{
              background: 'var(--bg-card)', color: 'var(--text-muted)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 24px', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', display: 'inline-block',
            }}>
              ← Kembali ke homepage
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 700 }}>Port369</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', flex: 1 }}>
            Selalu verify URL: <strong style={{ color: 'var(--text-dim)' }}>port369.com/claim</strong>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-dim)' }}>
            <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</a>
            <a href="/create" style={{ color: 'inherit', textDecoration: 'none' }}>Create token</a>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Util ──────────────────────────────────────────────────────────────────────
function statusCard(borderColor: string, bg: string, border: string) {
  return {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 14,
    padding: '16px 18px',
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 10,
    flexWrap: 'wrap' as const,
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 2 }} />
      {children}
    </div>
  )
}
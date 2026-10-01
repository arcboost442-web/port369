'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useReadContract } from 'wagmi'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import { useRouter } from 'next/navigation'

const IPFS_GW = 'https://gateway.pinata.cloud/ipfs/'

function ipfsToHttp(uri?: string): string {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice(7)
  return uri
}

function useTokenImage(metaURI?: string) {
  const [imgSrc, setImgSrc] = useState('')
  useEffect(() => {
    if (!metaURI) return
    if (metaURI.startsWith('data:application/json,')) {
      try {
        const meta = JSON.parse(decodeURIComponent(metaURI.slice(22)))
        setImgSrc(ipfsToHttp(meta.image))
      } catch {}
      return
    }
    if (metaURI.startsWith('ipfs://')) {
      fetch(IPFS_GW + metaURI.slice(7))
        .then(r => r.json())
        .then(d => setImgSrc(ipfsToHttp(d.image)))
        .catch(() => {})
    }
  }, [metaURI])
  return imgSrc
}

type TabFilter = 'all' | 'live' | 'graduating' | 'graduated'

interface SearchModalProps {
  open: boolean
  onClose: () => void
  tokens?: readonly `0x${string}`[]
}

function TokenRow({
  address,
  query,
  tabFilter,
  isActive,
  onHover,
  onClick,
}: {
  address: string
  query: string
  tabFilter: TabFilter
  isActive: boolean
  onHover: () => void
  onClick: () => void
}) {
  const { data: info } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'getTokenInfo',
    args: [address as `0x${string}`],
  })

  const { data: pct } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'milestone',
    args: [address as `0x${string}`],
  })

  const imgSrc = useTokenImage(info?.metaURI)

  if (!info) return null

  // Tab filter
  const isGraduated = info.graduated
  const milestoneNum = Number(pct?.toString() ?? '0')
  const isGraduating = !isGraduated && milestoneNum >= 80
  const isLive = !isGraduated && !isGraduating

  if (tabFilter === 'graduated' && !isGraduated) return null
  if (tabFilter === 'graduating' && !isGraduating) return null
  if (tabFilter === 'live' && !isLive) return null

  // Text filter
  const q = query.toLowerCase().trim()
  if (
    q &&
    !info.name.toLowerCase().includes(q) &&
    !info.symbol.toLowerCase().includes(q) &&
    !address.toLowerCase().includes(q)
  ) {
    return null
  }

  // Market cap estimate (reservePLS * 2 as rough proxy, simplified)
  const reservePLS = Number(info.reservePLS) / 1e18
  const mcLabel = reservePLS > 1000
    ? `$${(reservePLS / 1000).toFixed(0)}K MC`
    : `$${reservePLS.toFixed(0)} MC`

  const statusLabel = isGraduated ? 'Graduated' : isGraduating ? 'Graduating' : 'Live'
  const statusColor = isGraduated ? '#17C974' : isGraduating ? '#F5A623' : '#6E54F5'

  const shortAddr = `${address.slice(0, 6)}Df...${address.slice(-4)}`

  return (
    <div
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isActive ? 'rgba(110,84,245,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(110,84,245,0.25)' : '1px solid transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Token image */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#1a1133,#120e33)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={info.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.18)' }}>{info.symbol.slice(0, 3)}</span>
        )}
      </div>

      {/* Name + contract */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F5' }}>{info.name}</span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: '#7A7A90',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            padding: '1px 5px',
          }}>V2</span>
          <span style={{ fontSize: 12, color: '#7A7A90' }}>${info.symbol}</span>
        </div>
        <div style={{ fontSize: 10, color: '#3E3E55', fontFamily: 'monospace' }}>
          Contract {shortAddr}
        </div>
      </div>

      {/* MC + status */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F2F2F5', marginBottom: 3 }}>{mcLabel}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: statusColor }}>{statusLabel}</div>
      </div>
    </div>
  )
}

export default function SearchModal({ open, onClose, tokens }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setTab('all')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard: Esc to close, arrows to navigate, Enter to open
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActiveIdx(i => i + 1); e.preventDefault() }
    if (e.key === 'ArrowUp') { setActiveIdx(i => Math.max(0, i - 1)); e.preventDefault() }
  }, [open, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!open) return null

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All tokens' },
    { key: 'live', label: 'Live' },
    { key: 'graduating', label: 'Graduating' },
    { key: 'graduated', label: 'Graduated' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 620,
        background: '#131318',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        zIndex: 1000,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>

        {/* Search input row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4A6A" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, ticker, or contract address"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F2F2F5',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: 'none',
                color: '#7A7A90',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                padding: '3px 8px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A4A6A',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.055)',
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setActiveIdx(0) }}
              style={{
                background: tab === t.key ? '#6E54F5' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#fff' : '#7A7A90',
                border: tab === t.key ? 'none' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {t.key === 'graduated' && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {t.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={{ padding: '8px 8px', maxHeight: 360, overflowY: 'auto' }}>
          {!tokens || tokens.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#3E3E55', fontSize: 13 }}>
              No tokens found
            </div>
          ) : (
            <>
              <ResultList
                tokens={tokens}
                query={query}
                tabFilter={tab}
                activeIdx={activeIdx}
                onHover={setActiveIdx}
                onNavigate={(addr) => { router.push(`/token/${addr}`); onClose() }}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderTop: '1px solid rgba(255,255,255,0.055)',
        }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#3E3E55' }}>
            <span>↑ ↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc to close</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6E54F5',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View all matches →
          </button>
        </div>
      </div>
    </>
  )
}

function ResultList({
  tokens,
  query,
  tabFilter,
  activeIdx,
  onHover,
  onNavigate,
}: {
  tokens: readonly `0x${string}`[]
  query: string
  tabFilter: TabFilter
  activeIdx: number
  onHover: (i: number) => void
  onNavigate: (addr: string) => void
}) {
  // We render all and let each decide to show or not
  // For keyboard nav we need a visible index counter
  let visibleCount = 0

  return (
    <>
      {tokens.map((addr) => {
        const myIdx = visibleCount
        visibleCount++ // optimistic, actual filtering happens inside TokenRow
        return (
          <TokenRow
            key={addr}
            address={addr}
            query={query}
            tabFilter={tabFilter}
            isActive={myIdx === activeIdx}
            onHover={() => onHover(myIdx)}
            onClick={() => onNavigate(addr)}
          />
        )
      })}
    </>
  )
}
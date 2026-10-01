'use client'

import { useCallback, useEffect, useState } from 'react'
import { useReadContract, usePublicClient } from 'wagmi'
import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatUnits } from 'viem'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import SearchModal from './components/SearchModal'

const IPFS_GW = 'https://gateway.pinata.cloud/ipfs/'
const TOTAL_SUPPLY = 1_000_000_000
const GRAD_TARGET = 10_000_000_000

function ipfsToHttp(uri?: string) {
  if (!uri) return ''
  if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice(7)
  return uri
}

function num(v?: bigint) {
  return v === undefined ? 0 : Number(formatUnits(v, 18))
}

function fmtK(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K'
  return '$' + n.toFixed(0)
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

// ─── types ────────────────────────────────────────────────────────────────────
interface TokenData {
  address: string
  name: string
  symbol: string
  metaURI: string
  reservePLS: number
  tokensSold: number
  graduated: boolean
  creator: string
  createdAt: number
  price: number
  marketCap: number
  milestone: number
  volume: number
  imgSrc: string
}

// ─── hook: fetch all token data ───────────────────────────────────────────────
function useAllTokens(addresses?: readonly `0x${string}`[]) {
  const client = usePublicClient()
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!addresses || addresses.length === 0 || !client) return
    try {
      const results = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const [info, price, milestone] = await Promise.all([
              client.readContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getTokenInfo', args: [addr] }),
              client.readContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'currentPrice', args: [addr] }),
              client.readContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'milestone', args: [addr] }),
            ])
            const priceN = num(price as bigint)
            const reserveN = num((info as any).reservePLS)
            const mc = priceN * TOTAL_SUPPLY

            let volume = 0
            try {
              const head = await client.getBlockNumber()
              const from = head > BigInt(100000) ? head - BigInt(100000) : BigInt(0)
              const [buys, sells] = await Promise.all([
                client.getContractEvents({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, eventName: 'TokensBought', args: { tokenAddr: addr }, fromBlock: from, toBlock: head }),
                client.getContractEvents({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, eventName: 'TokensSold', args: { tokenAddr: addr }, fromBlock: from, toBlock: head }),
              ])
              volume = [...buys, ...sells].reduce((s, e: any) => s + num(e.args.plsIn ?? e.args.plsOut ?? BigInt(0)), 0)
            } catch {}

            let imgSrc = ''
            const uri = (info as any).metaURI
            if (uri?.startsWith('data:application/json,')) {
              try { imgSrc = ipfsToHttp(JSON.parse(decodeURIComponent(uri.slice(22))).image) } catch {}
            } else if (uri?.startsWith('ipfs://')) {
              try {
                const d = await fetch(IPFS_GW + uri.slice(7)).then(r => r.json())
                imgSrc = ipfsToHttp(d.image)
              } catch {}
            }

            return {
              address: addr,
              name: (info as any).name,
              symbol: (info as any).symbol,
              metaURI: uri,
              reservePLS: reserveN,
              tokensSold: num((info as any).tokensSold),
              graduated: (info as any).graduated,
              creator: (info as any).creator,
              createdAt: Number((info as any).createdAt),
              price: priceN,
              marketCap: mc,
              milestone: Number(milestone as bigint),
              volume,
              imgSrc,
            } as TokenData
          } catch { return null }
        })
      )
      setTokens(results.filter(Boolean) as TokenData[])
    } finally {
      setLoading(false)
    }
  }, [addresses, client])

  useEffect(() => { load() }, [load])
  return { tokens, loading, reload: load }
}

// ─── mini sparkline ───────────────────────────────────────────────────────────
function MiniChart({ address, color = '#6E54F5' }: { address: string; color?: string }) {
  const client = usePublicClient()
  const [pts, setPts] = useState<number[]>([])

  useEffect(() => {
    if (!client) return
    ;(async () => {
      try {
        const head = await client.getBlockNumber()
        const from = head > BigInt(200000) ? head - BigInt(200000) : BigInt(0)
        const [b, s] = await Promise.all([
          client.getContractEvents({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, eventName: 'TokensBought', args: { tokenAddr: address as `0x${string}` }, fromBlock: from, toBlock: head }),
          client.getContractEvents({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, eventName: 'TokensSold', args: { tokenAddr: address as `0x${string}` }, fromBlock: from, toBlock: head }),
        ])
        const all = [...b, ...s].sort((a, b) => (a.blockNumber ?? 0n) < (b.blockNumber ?? 0n) ? -1 : 1)
        const prices = all.map((e: any) => {
          const pls = num(e.args.plsIn ?? e.args.plsOut ?? 0n)
          const tk = num(e.args.tokensOut ?? e.args.tokensIn ?? 0n)
          return tk ? pls / tk : 0
        }).filter(Boolean)
        setPts(prices.slice(-30))
      } catch {}
    })()
  }, [address, client])

  if (pts.length < 2) return (
    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 11 }}>
      No chart yet
    </div>
  )

  const mn = Math.min(...pts)
  const mx = Math.max(...pts)
  const span = mx - mn || 1
  const W = 280, H = 60
  const coords = pts.map((p, i) => ({ x: (i / (pts.length - 1)) * W, y: H - 4 - ((p - mn) / span) * (H - 8) }))
  const line = coords.map((c, i) => (i ? 'L' : 'M') + c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ')
  const area = line + ` L${W},${H} L0,${H}Z`
  const last = coords[coords.length - 1]

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`cg-${address.slice(-4)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#cg-${address.slice(-4)})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  )
}

// ─── token avatar ─────────────────────────────────────────────────────────────
function TokenAvatar({ token, size = 40 }: { token: TokenData; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden', background: 'linear-gradient(135deg,#1a1133,#120e33)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
      {token.imgSrc
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={token.imgSrc} alt={token.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.28, fontWeight: 900, color: 'var(--text-faint)' }}>{token.symbol.slice(0, 3)}</span>
      }
    </div>
  )
}

// ─── contenders hero ──────────────────────────────────────────────────────────
function ContendersHero({ tokens }: { tokens: TokenData[] }) {
  const active = tokens.filter(t => !t.graduated).sort((a, b) => b.milestone - a.milestone)
  const featured = active[0]
  const leaderboard = active.slice(0, 5)

  if (!featured) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, marginBottom: 16 }}>
      {/* Featured */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Contenders</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
              {featured.milestone >= 80 ? '🔥 Almost graduating' : 'Closest to $' + (GRAD_TARGET / 1000).toFixed(0) + 'K'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Closest to ${(GRAD_TARGET / 1000).toFixed(0)}K</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <TokenAvatar token={featured} size={48} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, color: 'var(--text-primary)' }}>${featured.symbol}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{featured.name}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{fmtK(featured.marketCap)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Market cap</div>
          </div>
        </div>

        <MiniChart address={featured.address} color="#6E54F5" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>Price</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{featured.price > 0 ? featured.price.toFixed(6) : '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>PLS</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>Volume</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{featured.volume > 0 ? fmtK(featured.volume) : '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>PLS recent</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 3 }}>Bonding</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{featured.milestone}%</div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>to graduation</div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Contenders</span>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Closest to ${(GRAD_TARGET / 1000).toFixed(0)}K</span>
        </div>
        {leaderboard.map((t, i) => (
          <a key={t.address} href={`/token/${t.address}`} style={{ textDecoration: 'none' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', width: 14, textAlign: 'center' }}>{i + 1}</span>
              <TokenAvatar token={t} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{t.symbol}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtK(t.marketCap)}</div>
                <div style={{ fontSize: 9, color: t.milestone >= 80 ? '#F5A623' : 'var(--text-faint)', marginTop: 2 }}>{t.milestone}% bonded</div>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </div>
          </a>
        ))}
        {leaderboard.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>No active tokens yet</div>
        )}
      </div>
    </div>
  )
}

// ─── top by market cap ────────────────────────────────────────────────────────
function TopByMcap({ tokens }: { tokens: TokenData[] }) {
  const top = [...tokens].sort((a, b) => b.marketCap - a.marketCap).slice(0, 4)
  if (top.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Top by market cap</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {top.map(t => (
          <a key={t.address} href={`/token/${t.address}`} style={{ textDecoration: 'none' }}>
            <div
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(135deg,#110f23,#1a1133)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.imgSrc
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={t.imgSrc} alt={t.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 32, fontWeight: 900, color: 'rgba(255,255,255,0.07)' }}>{t.symbol.slice(0, 3)}</span>
                }
                <div style={{ position: 'absolute', top: 7, left: 7, background: 'var(--overlay-dark)', backdropFilter: 'blur(4px)', borderRadius: 3, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: t.graduated ? 'var(--green)' : 'var(--text-muted)' }}>
                  {t.graduated ? 'GRAD' : 'V2'}
                </div>
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>${t.symbol}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5, color: 'var(--text-primary)', marginBottom: 6 }}>{fmtK(t.marketCap)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)' }}>
                  <span style={{ color: t.volume > 0 ? 'var(--text-muted)' : 'var(--text-faint)' }}>{t.volume > 0 ? fmtK(t.volume) + ' vol' : 'No volume'}</span>
                  <span>{(t.reservePLS).toFixed(0)} PLS liq</span>
                </div>
                <div style={{ marginTop: 8, height: 2, background: 'var(--bg-subtle)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: t.milestone + '%', background: t.graduated ? 'var(--green)' : 'var(--accent)', borderRadius: 1 }} />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── token list section ───────────────────────────────────────────────────────
type TabKey = 'trending' | 'new' | 'graduated'

function TokenListSection({ tokens }: { tokens: TokenData[] }) {
  const [tab, setTab] = useState<TabKey>('new')
  const [sortBy, setSortBy] = useState<'last_trade' | 'mcap' | 'volume'>('last_trade')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'trending', label: 'Trending', icon: '⚡' },
    { key: 'new',      label: 'New',      icon: '🌱' },
    { key: 'graduated',label: 'Graduated',icon: '🎓' },
  ]

  const filtered = tokens
    .filter(t => {
      if (tab === 'graduated') return t.graduated
      if (tab === 'new') return !t.graduated
      if (tab === 'trending') return !t.graduated && t.volume > 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'mcap') return b.marketCap - a.marketCap
      if (sortBy === 'volume') return b.volume - a.volume
      return b.createdAt - a.createdAt
    })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? 'var(--text-primary)' : 'var(--text-faint)', fontFamily: 'Inter, sans-serif', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent', transition: 'all 0.13s', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}
          >
            <option value="last_trade">Newest</option>
            <option value="mcap">Market cap</option>
            <option value="volume">Volume</option>
          </select>
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            {(['grid', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ background: view === v ? 'var(--accent-bg)' : 'transparent', border: 'none', color: view === v ? 'var(--accent)' : 'var(--text-faint)', padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {v === 'grid'
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                }
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 12 }}>
            {tab === 'graduated' ? 'No graduated tokens yet' : tab === 'trending' ? 'No trending tokens yet' : 'No tokens yet'}
          </div>
          {tab !== 'graduated' && (
            <a href="/create" style={{ background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>+ Create first token</a>
          )}
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {filtered.map(t => <GridCard key={t.address} token={t} />)}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {filtered.map((t, i) => <ListRow key={t.address} token={t} last={i === filtered.length - 1} />)}
        </div>
      )}
    </div>
  )
}

function GridCard({ token: t }: { token: TokenData }) {
  return (
    <a href={`/token/${t.address}`} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ width: '100%', aspectRatio: '1', background: 'linear-gradient(160deg,#110f23,#1a1133,#120e33)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {t.imgSrc
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={t.imgSrc} alt={t.symbol} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
            : <span style={{ fontSize: 48, fontWeight: 900, letterSpacing: -2, color: 'rgba(255,255,255,0.07)', userSelect: 'none' }}>{t.symbol}</span>
          }
          <div style={{ position: 'absolute', top: 7, left: 7, background: 'var(--overlay-dark)', backdropFilter: 'blur(4px)', borderRadius: 3, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', zIndex: 1 }}>
            {t.graduated ? 'GRAD' : 'V2'}
          </div>
          <div style={{ position: 'absolute', bottom: 7, left: 7, background: 'var(--overlay-dark)', backdropFilter: 'blur(4px)', borderRadius: 3, padding: '2px 6px', fontSize: 9, color: 'var(--text-muted)', zIndex: 1 }}>
            {t.milestone}% bonded
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)', zIndex: 1 }}>
            <div style={{ height: '100%', width: t.milestone + '%', background: t.graduated ? 'var(--green)' : 'var(--accent)' }} />
          </div>
        </div>
        <div style={{ padding: '9px 11px 11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.name}</span>
            <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>MC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, color: 'var(--text-primary)' }}>${t.symbol}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtK(t.marketCap)}</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 4 }}>{t.creator.slice(0, 6)}...{t.creator.slice(-4)}</div>
        </div>
      </div>
    </a>
  )
}

function ListRow({ token: t, last }: { token: TokenData; last: boolean }) {
  return (
    <a href={`/token/${t.address}`} style={{ textDecoration: 'none' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: last ? 'none' : '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <TokenAvatar token={t} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.name} <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>${t.symbol}</span></div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'monospace' }}>{t.address.slice(0, 10)}...{t.address.slice(-6)}</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 80 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtK(t.marketCap)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>mcap</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 70 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.volume > 0 ? 'var(--text-muted)' : 'var(--text-faint)' }}>{t.volume > 0 ? fmtK(t.volume) : '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>volume</div>
        </div>
        <div style={{ textAlign: 'right', minWidth: 70 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.graduated ? 'var(--green)' : 'var(--accent)' }}>{t.milestone}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>bonded</div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: t.graduated ? 'rgba(23,201,116,0.08)' : 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.graduated ? 'var(--green)' : 'var(--accent)'} strokeWidth="2.5" strokeLinecap="round">
            <path d="M7 17L17 7M17 7H7M17 7v10"/>
          </svg>
        </div>
      </div>
    </a>
  )
}

// ─── wallet dropdown ──────────────────────────────────────────────────────────
function WalletDropdown({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open, ref])

  const short = address.slice(0, 6) + '...' + address.slice(-4)
  const explorerUrl = `https://scan.pulsechain.com/address/${address}`
  const hue = parseInt(address.slice(2, 6), 16) % 360

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ position: 'relative' }} ref={r => { ref.current = r }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, background: open ? 'var(--accent-bg)' : 'var(--bg-subtle)', border: `1px solid ${open ? 'rgba(110,84,245,0.4)' : 'var(--border-strong)'}`, borderRadius: 8, padding: '4px 10px 4px 5px', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif' }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `hsl(${hue},60%,42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: 0.5 }}>
          {address.slice(2, 4).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{short}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'fixed', top: 58, right: 20, width: 320, background: 'var(--bg-dropdown)', border: '1px solid var(--border-strong)', borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.5)', zIndex: 9999, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, hsl(${hue},60%,38%), hsl(${(hue+40)%360},55%,30%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0, letterSpacing: 1 }}>
              {address.slice(2, 4).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>{short}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Connected wallet</div>
            </div>
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy address'}
              style={{ width: 34, height: 34, background: copied ? 'var(--accent-bg)' : 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.background = 'var(--bg-item-hover)' }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.background = 'var(--bg-subtle)' }}
            >
              {copied
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              }
            </button>
          </div>

          {/* Menu items */}
          <div style={{ padding: '8px 10px' }}>
            <a
              href={`/profile/${address}`}
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 10px', borderRadius: 9, textDecoration: 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-icon)" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>My profile</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>

            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 10px', borderRadius: 9, textDecoration: 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-icon)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>View on explorer</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>

            <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />

            <button
              onClick={() => { onDisconnect(); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', borderRadius: 9, transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── appearance toggle ────────────────────────────────────────────────────────
function AppearanceToggle() {
  const [dark, setDark] = useState(true)

  // Read saved preference on mount
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
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 7,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-item-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
    >
      {dark
        ? /* Moon */ <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        : /* Sun  */ <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      }
    </button>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { address, isConnected: walletConnected } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => setMounted(true), [])
  const isConnected = mounted && walletConnected
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const { data: totalTokens } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'totalTokens' })
  const { data: topTokens } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getTokensPaginated', args: [BigInt(0), BigInt(20)] })

  const { tokens, loading } = useAllTokens(topTokens)

  return (
    <main style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} tokens={topTokens} />

      {/* Nav */}
      <nav style={{ height: 50, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-nav)', backdropFilter: 'blur(14px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, height: '100%', position: 'relative' }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, border: '1.5px solid var(--accent)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,10 4,6 7,8 10,3 12,4.5"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.4, color: 'var(--text-primary)' }}>Port369</span>
          </a>

          {/* Search — centered */}
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 360, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              onClick={() => setSearchOpen(true)}
              style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, height: 32, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 7, fontSize: 13, cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ color: 'var(--text-faint)', flex: 1 }}>Search tokens</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace' }}>⌘K</span>
            </div>
            <AppearanceToggle />
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {tokens.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 20, padding: '4px 10px' }}>
                • {tokens.length} tokens
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F5A623', display: 'inline-block', animation: 'blink 2s infinite' }}></span>
              PulseChain
            </div>
            {isConnected && address ? (
              <WalletDropdown address={address} onDisconnect={() => disconnect()} />
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Connect wallet
              </button>
            )}
            <a href="/create" style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
              + Create
            </a>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '20px 20px 40px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10, color: 'var(--text-faint)', fontSize: 13 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--accent-bg)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-faint)', marginBottom: 12 }}>No tokens launched yet</div>
            <a href="/create" style={{ background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Launch the first token</a>
          </div>
        ) : (
          <>
            <ContendersHero tokens={tokens} />
            <TopByMcap tokens={tokens} />
            <TokenListSection tokens={tokens} />
          </>
        )}
      </div>
    </main>
  )
}
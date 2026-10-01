'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAccount, useBalance, usePublicClient, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits, isAddress } from 'viem'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import Navbar from '../../components/Navbar'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.pp{--bg:var(--bg-page);--bg2:var(--bg-card);--bg3:var(--bg-subtle);--bg4:var(--bg-item-hover);--border2:var(--border-strong);--text:var(--text-primary);--text2:var(--text-muted);--text3:var(--text-faint);--purple:var(--accent);--purple-dim:var(--accent-bg);--yellow:#F5A623;--r:6px;--r2:12px;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh;font-size:14px;font-variant-numeric:tabular-nums;}
.pp *,.pp *::before,.pp *::after{box-sizing:border-box;margin:0;padding:0;}
.pp a{color:inherit;text-decoration:none;}
@keyframes spin{to{transform:rotate(360deg);}}

/* page */
.pp .wrap{max-width:1260px;margin:0 auto;padding:28px 20px 56px;}
.pp .ph{display:flex;align-items:center;gap:20px;margin-bottom:22px;}
.pp .ph-av{width:84px;height:84px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;letter-spacing:1px;flex-shrink:0;border:1px solid var(--border2);}
.pp .ph-main{flex:1;min-width:0;}
.pp .ph-name{font-size:36px;font-weight:900;letter-spacing:-1.4px;line-height:1.05;}
.pp .ph-sub{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;color:var(--text2);flex-wrap:wrap;}
.pp .ph-addr{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;}
.pp .ph-you{font-size:10px;font-weight:700;color:var(--purple);background:var(--purple-dim);border:1px solid rgba(110,84,245,.22);padding:2px 7px;border-radius:4px;}
.pp .icobtn{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;cursor:pointer;color:var(--text2);border:none;background:transparent;transition:all .13s;}
.pp .icobtn:hover{color:var(--text);background:var(--bg3);}
.pp .icobtn svg{width:13px;height:13px;}
.pp .ph-actions{display:flex;gap:8px;align-self:flex-start;}
.pp .sq{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--text);cursor:pointer;transition:background .13s;}
.pp .sq:hover{background:var(--bg4);}
.pp .sq svg{width:15px;height:15px;}

/* summary */
.pp .sum{display:flex;align-items:stretch;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);padding:24px 28px;margin-bottom:26px;}
.pp .sum-l{flex:1;}
.pp .sum-lbl{font-size:10px;font-weight:800;color:var(--purple);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;}
.pp .sum-val{font-size:46px;font-weight:900;letter-spacing:-1.8px;line-height:1;}
.pp .sum-unit{font-size:15px;font-weight:700;color:var(--text2);letter-spacing:0;margin-left:8px;}
.pp .sum-r{display:flex;gap:40px;border-left:1px solid var(--border2);padding-left:40px;}
.pp .sum-stat-lbl{font-size:10px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;}
.pp .sum-stat-val{font-size:18px;font-weight:800;letter-spacing:-.4px;}
.pp .sum-stat-sub{font-size:11px;color:var(--text2);margin-top:3px;}

/* tabs */
.pp .tabs{display:flex;gap:6px;border-bottom:1px solid var(--border2);margin-bottom:16px;}
.pp .tab{background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;padding:10px 14px;font-size:13px;font-weight:600;color:var(--text2);cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:7px;transition:color .13s;}
.pp .tab:hover{color:var(--text);}
.pp .tab.on{color:var(--text);border-bottom-color:var(--text);}
.pp .tab-n{font-size:11px;font-weight:700;color:var(--text2);}
.pp .tab.on .tab-n{color:var(--text);}

/* cards / rows */
.pp .card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden;}
.pp .cash{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px dashed var(--border2);}
.pp .cash-ic{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6E54F5,#17C974);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#fff;flex-shrink:0;}
.pp .cash-name{font-size:13px;font-weight:700;}
.pp .cash-sub{font-size:11px;color:var(--text2);margin-top:1px;}
.pp .cash-r{margin-left:auto;text-align:left;}
.pp .lbl{font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.08em;}
.pp .cash-v{font-size:13px;font-weight:800;margin-top:2px;}
.pp .th,.pp .tr{display:grid;align-items:center;gap:14px;padding:0 18px;}
.pp .grid-pos{grid-template-columns:minmax(180px,2.2fr) 1fr 1fr 1fr 1fr 24px;}
.pp .grid-lau{grid-template-columns:minmax(180px,2.2fr) 1fr 1fr 1fr 1fr 24px;}
.pp .th{height:36px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;}
.pp .tr{min-height:58px;border-bottom:1px solid var(--border);transition:background .1s;}
.pp .tr:last-child{border-bottom:none;}
.pp .tr:hover{background:var(--bg3);}
.pp .r{text-align:right;}
.pp .tk{display:flex;align-items:center;gap:11px;min-width:0;}
.pp .tk-av{width:34px;height:34px;border-radius:9px;overflow:hidden;background:linear-gradient(135deg,#1a1133,#120e33);border:1px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:var(--text3);}
.pp .tk-av img{width:100%;height:100%;object-fit:cover;}
.pp .tk-sym{font-size:13px;font-weight:800;}
.pp .tk-name{font-size:11px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pp .cell{font-size:13px;font-weight:700;}
.pp .cell-sub{font-size:10px;color:var(--text3);margin-top:2px;}
.pp .bond{color:var(--purple);}
.pp .bond.done{color:var(--green);}
.pp .arrow{color:var(--text3);width:12px;height:12px;}
.pp .empty{padding:56px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;}
.pp .empty-ic{width:36px;height:36px;border-radius:10px;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;color:var(--text2);margin-bottom:8px;}
.pp .empty-ic svg{width:16px;height:16px;}
.pp .empty-t{font-size:13px;font-weight:700;}
.pp .empty-s{font-size:12px;color:var(--text2);}
.pp .empty-btn{margin-top:14px;background:var(--purple);color:#fff;border-radius:var(--r);padding:8px 16px;font-size:12px;font-weight:700;}
.pp .loading{display:flex;align-items:center;justify-content:center;gap:10px;height:180px;color:var(--text2);font-size:13px;}
.pp .spin{width:16px;height:16px;border:2px solid var(--purple-dim);border-top-color:var(--purple);border-radius:50%;animation:spin .7s linear infinite;}
.pp .notfound{max-width:520px;margin:100px auto;text-align:center;color:var(--text2);}
@media(max-width:900px){
  .pp .wrap{padding:20px 16px 48px;}
  .pp .ph-name{font-size:26px;}.pp .ph-av{width:64px;height:64px;font-size:22px;border-radius:16px;}
  .pp .sum{flex-direction:column;gap:20px;padding:20px;}.pp .sum-r{border-left:none;border-top:1px solid var(--border2);padding:16px 0 0;gap:28px;}
  .pp .sum-val{font-size:36px;}
  .pp .card{overflow-x:auto;}.pp .th,.pp .tr{min-width:640px;}
}
`

const TOTAL_SUPPLY = 1_000_000_000
const IPFS_GW = 'https://gateway.pinata.cloud/ipfs/'
const MAX_TOKENS = 100
const GRAD = 10000

type Row = {
  address: string; name: string; symbol: string; creator: string
  createdAt: number; graduated: boolean; price: number; balance: number
  marketCap: number; milestone: number; imgSrc: string
}

function num(v?: bigint) { return v === undefined ? 0 : Number(formatUnits(v, 18)) }
function fmt(v: number, dp = 2) { return v.toLocaleString('en-US', { maximumFractionDigits: dp }) }
function fmtK(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}
function ipfsToHttp(uri?: string) { if (!uri) return ''; if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice(7); return uri }
function ago(s: number) {
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
const hueOf = (a: string) => parseInt(a.slice(2, 6), 16) % 360

// ── small pieces ─────────────────────────────────────────────────────────────
function Avatar({ t }: { t: Row }) {
  return (
    <div className="tk-av">
      {t.imgSrc
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={t.imgSrc} alt={t.symbol} />
        : t.symbol.slice(0, 3)}
    </div>
  )
}
const Arrow = () => <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>

function Empty({ title, sub, cta }: { title: string; sub: string; cta?: boolean }) {
  return (
    <div className="empty">
      <div className="empty-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <div className="empty-t">{title}</div>
      <div className="empty-s">{sub}</div>
      {cta && <a href="/create" className="empty-btn">+ Create token</a>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const params = useParams()
  const raw = params?.address
  const profileAddr = (Array.isArray(raw) ? raw[0] : raw) as string
  const valid = !!profileAddr && isAddress(profileAddr)

  const { address, isConnected } = useAccount()
  const client = usePublicClient()

  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<'positions' | 'launches'>('positions')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => setMounted(true), [])
  const walletOn = mounted && isConnected
  const isOwner = walletOn && !!address && !!profileAddr && address.toLowerCase() === profileAddr.toLowerCase()


  const { data: total } = useReadContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'totalTokens' })
  const count = total ? Math.min(Number(total), MAX_TOKENS) : 0
  const { data: list } = useReadContract({
    address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getTokensPaginated',
    args: [BigInt(0), BigInt(count)], query: { enabled: count > 0 },
  })
  const { data: plsBal } = useBalance({ address: valid ? (profileAddr as `0x${string}`) : undefined })

  const load = useCallback(async () => {
    if (!client || !valid) return
    if (!list) { if (total !== undefined) setLoading(false); return }
    const owner = profileAddr as `0x${string}`
    try {
      const out = await Promise.all(list.map(async (addr): Promise<Row | null> => {
        try {
          const [info, price, bal] = await Promise.all([
            client.readContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'getTokenInfo', args: [addr] }) as Promise<any>,
            client.readContract({ address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI, functionName: 'currentPrice', args: [addr] }) as Promise<bigint>,
            client.readContract({ address: addr, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }) as Promise<bigint>,
          ])
          const isCreator = String(info.creator).toLowerCase() === owner.toLowerCase()
          if (bal === BigInt(0) && !isCreator) return null

          // same calculation as the token page: reserve PLS / graduation target
          const milestone = Math.min(100, (num(info.reservePLS) / GRAD) * 100)

          let imgSrc = ''
          const uri: string | undefined = info.metaURI
          if (uri?.startsWith('data:application/json,')) {
            try { imgSrc = ipfsToHttp(JSON.parse(decodeURIComponent(uri.slice(22))).image) } catch {}
          } else if (uri?.startsWith('ipfs://')) {
            try { imgSrc = ipfsToHttp((await fetch(IPFS_GW + uri.slice(7)).then(r => r.json())).image) } catch {}
          }

          const p = num(price)
          return {
            address: addr, name: info.name, symbol: info.symbol, creator: info.creator,
            createdAt: Number(info.createdAt), graduated: !!info.graduated,
            price: p, balance: num(bal), marketCap: p * TOTAL_SUPPLY, milestone, imgSrc,
          }
        } catch { return null }
      }))
      setRows(out.filter(Boolean) as Row[])
    } finally { setLoading(false) }
  }, [client, list, total, profileAddr, valid])

  useEffect(() => { load() }, [load])

  if (!valid) {
    return <div className="pp"><style>{CSS}</style><div className="notfound">Invalid wallet address. <a href="/" style={{ color: 'var(--purple)' }}>Back to homepage</a></div></div>
  }

  const positions = rows.filter(r => r.balance > 0).sort((a, b) => b.balance * b.price - a.balance * a.price)
  const launches = rows.filter(r => r.creator.toLowerCase() === profileAddr.toLowerCase()).sort((a, b) => b.createdAt - a.createdAt)
  const positionsValue = positions.reduce((s, r) => s + r.balance * r.price, 0)
  const plsN = plsBal ? Number(formatUnits(plsBal.value, plsBal.decimals)) : 0
  const totalValue = positionsValue + plsN
  const nowSec = Date.now() / 1000

  const hue = hueOf(profileAddr)
  const short = profileAddr.slice(0, 6) + '...' + profileAddr.slice(-4)

  return (
    <div className="pp">
      <style>{CSS}</style>
      <Navbar />

      <div className="wrap">
        {/* Profile header */}
        <div className="ph">
          <div className="ph-av" style={{ background: `linear-gradient(135deg, hsl(${hue},60%,42%), hsl(${(hue + 40) % 360},55%,30%))` }}>
            {profileAddr.slice(2, 4).toUpperCase()}
          </div>
          <div className="ph-main">
            <div className="ph-name">{short}</div>
            <div className="ph-sub">
              <span className="ph-addr">{profileAddr.slice(0, 10)}…{profileAddr.slice(-6)}</span>
              <button className="icobtn" title="Copy address" onClick={() => { navigator.clipboard.writeText(profileAddr); setCopied(true); setTimeout(() => setCopied(false), 1400) }}>
                {copied
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
              </button>
              <a className="icobtn" href={`https://scan.pulsechain.com/address/${profileAddr}`} target="_blank" rel="noreferrer" title="View on explorer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              {isOwner && <span className="ph-you">You</span>}
            </div>
          </div>
          <div className="ph-actions">
            <button className="sq" title={shared ? 'Link copied' : 'Share profile'} onClick={() => { navigator.clipboard.writeText(window.location.href); setShared(true); setTimeout(() => setShared(false), 1400) }}>
              {shared
                ? <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>}
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="sum">
          <div className="sum-l">
            <div className="sum-lbl">Total value</div>
            <div className="sum-val">{loading ? '—' : fmt(totalValue, 2)}<span className="sum-unit">PLS</span></div>
          </div>
          <div className="sum-r">
            <div>
              <div className="sum-stat-lbl">PLS balance</div>
              <div className="sum-stat-val">{fmt(plsN, 2)}</div>
              <div className="sum-stat-sub">native wallet</div>
            </div>
            <div>
              <div className="sum-stat-lbl">Tokens held</div>
              <div className="sum-stat-val">{fmt(positionsValue, 2)}</div>
              <div className="sum-stat-sub">PLS in {positions.length} position{positions.length === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>

        {/* Tabs — only Positions and Launches */}
        <div className="tabs">
          <button className={'tab' + (tab === 'positions' ? ' on' : '')} onClick={() => setTab('positions')}>Positions <span className="tab-n">{positions.length}</span></button>
          <button className={'tab' + (tab === 'launches' ? ' on' : '')} onClick={() => setTab('launches')}>Launches <span className="tab-n">{launches.length}</span></button>
        </div>

        {loading ? (
          <div className="card"><div className="loading"><div className="spin" />Loading…</div></div>
        ) : tab === 'positions' ? (
          <div className="card">
            <div className="cash">
              <div className="cash-ic">PLS</div>
              <div><div className="cash-name">PLS</div><div className="cash-sub">Native</div></div>
              <div className="cash-r"><div className="lbl">Value</div><div className="cash-v">{fmt(plsN, 2)} PLS</div></div>
            </div>
            {positions.length === 0 ? (
              <Empty title="No token positions" sub="Tokens this wallet holds show up here." />
            ) : (
              <>
                <div className="th grid-pos"><span>Token</span><span className="r">Balance</span><span className="r">Price (PLS)</span><span className="r">Value (PLS)</span><span className="r">Bonded</span><span /></div>
                {positions.map(t => (
                  <a key={t.address} href={`/token/${t.address}`} className="tr grid-pos">
                    <div className="tk"><Avatar t={t} /><div style={{ minWidth: 0 }}><div className="tk-sym">${t.symbol}</div><div className="tk-name">{t.name}</div></div></div>
                    <div className="r cell">{fmt(t.balance, 0)}</div>
                    <div className="r cell">{t.price > 0 ? t.price.toFixed(8) : '—'}</div>
                    <div className="r cell">{fmt(t.balance * t.price, 2)}</div>
                    <div className={'r cell bond' + (t.graduated ? ' done' : '')}>{t.graduated ? 'Graduated' : t.milestone.toFixed(1) + '%'}</div>
                    <Arrow />
                  </a>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="card">
            {launches.length === 0 ? (
              <Empty title="No launches" sub="Tokens this wallet creates show up here." cta={isOwner} />
            ) : (
              <>
                <div className="th grid-lau"><span>Token</span><span className="r">Market cap</span><span className="r">Price (PLS)</span><span className="r">Bonded</span><span className="r">Created</span><span /></div>
                {launches.map(t => (
                  <a key={t.address} href={`/token/${t.address}`} className="tr grid-lau">
                    <div className="tk"><Avatar t={t} /><div style={{ minWidth: 0 }}><div className="tk-sym">${t.symbol}</div><div className="tk-name">{t.name}</div></div></div>
                    <div className="r cell">{fmtK(t.marketCap)}</div>
                    <div className="r cell">{t.price > 0 ? t.price.toFixed(8) : '—'}</div>
                    <div className={'r cell bond' + (t.graduated ? ' done' : '')}>{t.graduated ? 'Graduated' : t.milestone.toFixed(1) + '%'}</div>
                    <div className="r cell">{ago(nowSec - t.createdAt)}</div>
                    <Arrow />
                  </a>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
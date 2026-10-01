'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  useAccount,
  useConnect,
  useReadContract,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { injected } from 'wagmi/connectors'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import Navbar from '../../components/Navbar'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.tp{--bg:var(--bg-page);--bg2:var(--bg-card);--bg3:var(--bg-subtle);--bg4:var(--bg-item-hover);--border2:var(--border-strong);--border-focus:rgba(110,84,245,0.45);--text:var(--text-primary);--text2:var(--text-muted);--text3:var(--text-faint);--green-dim:rgba(23,201,116,0.12);--red:var(--danger);--red-dim:var(--danger-bg);--purple:var(--accent);--purple-dim:var(--accent-bg);--yellow:#F5A623;--r:6px;--r2:10px;--gutter:20px;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh;font-size:14px;font-variant-numeric:tabular-nums;}
.tp *,.tp *::before,.tp *::after{box-sizing:border-box;margin:0;padding:0;}
.tp a{color:inherit;text-decoration:none;}
.tp input[type=number]::-webkit-outer-spin-button,.tp input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.tp input[type=number]{-moz-appearance:textfield;}

/* ── Token Header Bar ── */
.tp .tok-header-bar{border-bottom:1px solid var(--border);background:var(--bg2);width:100%;}
.tp .tok-header-main{display:flex;align-items:center;gap:14px;padding:14px var(--gutter);}
.tp .tok-avatar{width:44px;height:44px;border-radius:11px;overflow:hidden;border:1px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1133,#120e33);}
.tp .tok-avatar img{width:100%;height:100%;object-fit:cover;}
.tp .tok-avatar-fb{font-size:12px;font-weight:900;color:var(--text3);}
.tp .tok-name-col{display:flex;flex-direction:column;gap:3px;min-width:0;}
.tp .tok-name-row{display:flex;align-items:center;gap:8px;}
.tp .tok-sym{font-size:21px;font-weight:900;letter-spacing:-.6px;color:var(--text);line-height:1.1;}
.tp .tok-v-badge{font-size:10px;font-weight:700;color:var(--purple);background:var(--purple-dim);border:1px solid rgba(110,84,245,.22);padding:2px 6px;border-radius:4px;}
.tp .tok-socials{display:flex;gap:6px;align-items:center;margin-left:4px;}
.tp .tok-soc{width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--text2);background:var(--bg3);border:1px solid var(--border);border-radius:7px;transition:all .13s;flex-shrink:0;}
.tp .tok-soc:hover{color:var(--text);border-color:var(--border2);background:var(--bg4);}
.tp .tok-soc svg{width:15px;height:15px;}
.tp .tok-fullname{font-size:12px;color:var(--text2);}
.tp .tok-mcap-col{margin-left:auto;text-align:right;flex-shrink:0;}
.tp .tok-mcap-top{display:flex;align-items:baseline;gap:5px;justify-content:flex-end;}
.tp .tok-mcap-val{font-size:24px;font-weight:900;letter-spacing:-.8px;line-height:1.1;}
.tp .tok-mcap-lbl{font-size:11px;color:var(--text3);font-weight:600;}
.tp .tok-mcap-bot{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:3px;}
.tp .tok-chg{font-size:12px;font-weight:700;}
.tp .tok-chg.up{color:var(--green);}
.tp .tok-chg.dn{color:var(--red);}
.tp .tok-pair{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text3);}
.tp .tok-pair-ico{width:15px;height:15px;border-radius:50%;background:var(--purple-dim);border:1px solid rgba(110,84,245,.2);display:flex;align-items:center;justify-content:center;}

/* meta row */
.tp .tok-meta-row{display:flex;align-items:center;padding:0 var(--gutter);border-top:1px solid var(--border);overflow-x:auto;}
.tp .tok-meta-item{display:flex;align-items:center;gap:7px;padding:9px 18px 9px 0;font-size:11px;white-space:nowrap;flex-shrink:0;}
.tp .tok-meta-item+.tok-meta-item{border-left:1px solid var(--border);padding-left:18px;}
.tp .tok-meta-lbl{color:var(--text3);font-weight:500;}
.tp .tok-meta-val{color:var(--text2);font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;}
.tp .tok-meta-val.plain{font-family:'Inter',sans-serif;font-size:11px;}
.tp .tok-creator-wrap{display:flex;align-items:center;gap:7px;}
.tp .tok-creator-av{width:18px;height:18px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#fff;}
.tp .icobtn{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;cursor:pointer;color:var(--text3);border:none;background:transparent;padding:0;transition:all .13s;flex-shrink:0;}
.tp .icobtn:hover{color:var(--text);background:var(--bg3);}
.tp .icobtn svg{width:12px;height:12px;}

/* ── Layout ── */
.tp .layout{display:grid;grid-template-columns:1fr 330px;gap:16px;padding:20px var(--gutter) 48px;align-items:start;}

/* ── Chart & stats ── */
.tp .token-desc{font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px;max-width:720px;}
.tp .price-row{display:flex;align-items:baseline;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.tp .price-main{font-size:32px;font-weight:900;letter-spacing:-1.5px;line-height:1;}
.tp .price-unit{font-size:13px;color:var(--text2);font-weight:600;margin-left:6px;letter-spacing:0;}
.tp .price-ath{font-size:11px;color:var(--text3);}
.tp .chart-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:12px;}
.tp .chart-area{height:240px;}
.tp .chart-svg{width:100%;height:100%;}
.tp .chart-empty{height:100%;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text3);}
.tp .chart-title{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;}
.tp .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;}
.tp .sc{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;}
.tp .sc-label{font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.tp .sc-val{font-size:20px;font-weight:800;letter-spacing:-.5px;}
.tp .sc-sub{font-size:10px;color:var(--text3);margin-top:3px;}
.tp .ms-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:12px;}
.tp .ms-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.tp .ms-title{font-size:13px;font-weight:700;color:var(--text);}
.tp .ms-sub{font-size:11px;color:var(--text2);margin-top:2px;}
.tp .ms-pct{font-size:20px;font-weight:900;letter-spacing:-.5px;color:var(--green);}
.tp .ms-bar-bg{height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:8px;}
.tp .ms-bar-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--purple),var(--green));}
.tp .ms-labs{display:flex;justify-content:space-between;font-size:10px;color:var(--text3);}
.tp .ms-note{font-size:11px;color:var(--text2);margin-top:12px;padding-top:12px;border-top:1px solid var(--border);line-height:1.55;}
.tp .trades-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;}
.tp .trades-head{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.tp .trades-title{font-size:13px;font-weight:700;color:var(--text);}
.tp .trades-filters{display:flex;gap:4px;}
.tp .tfil{font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;cursor:pointer;color:var(--text3);border:1px solid transparent;background:transparent;font-family:'Inter',sans-serif;transition:color .13s;}
.tp .tfil:hover{color:var(--text2);}
.tp .tfil.active{background:var(--bg3);color:var(--text);border-color:var(--border);}
.tp table{width:100%;border-collapse:collapse;}
.tp th{font-size:10px;color:var(--text3);font-weight:600;text-align:left;padding:8px 16px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.06em;}
.tp td{font-size:11px;padding:9px 16px;border-bottom:1px solid var(--border);font-weight:500;color:var(--text2);}
.tp tr:last-child td{border-bottom:none;}
.tp tbody tr:hover td{background:var(--bg3);}
.tp .buy-c{color:var(--green)!important;font-weight:700;}
.tp .sell-c{color:var(--red)!important;font-weight:700;}
.tp .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;}

/* ── Right sidebar ── */
.tp .bs-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:12px;}
.tp .bs-tabs{display:flex;margin-bottom:16px;background:var(--bg3);border-radius:var(--r);overflow:hidden;padding:3px;gap:3px;}
.tp .bs-tab{flex:1;text-align:center;padding:7px;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;color:var(--text3);transition:all .14s;border:1px solid transparent;user-select:none;}
.tp .bs-tab:hover{color:var(--text2);}
.tp .bs-tab.buy.on{background:var(--green-dim);color:var(--green);border-color:rgba(23,201,116,.22);}
.tp .bs-tab.sell.on{background:var(--red-dim);color:var(--red);border-color:rgba(240,69,90,.18);}
.tp .inp-label{font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.tp .inp-wrap{background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r);padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:7px;}
.tp .inp-wrap:focus-within{border-color:var(--border-focus);}
.tp .inp{background:transparent;border:none;outline:none;font-size:16px;font-weight:700;color:var(--text);font-family:'Inter',sans-serif;flex:1;width:0;}
.tp .inp::placeholder{color:var(--text3);}
.tp .inp-cur{font-size:12px;font-weight:700;color:var(--text2);white-space:nowrap;}
.tp .quick-btns{display:flex;gap:6px;margin-bottom:14px;}
.tp .qbtn{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:6px;font-size:11px;font-weight:600;color:var(--text2);cursor:pointer;text-align:center;font-family:'Inter',sans-serif;transition:all .13s;}
.tp .qbtn:hover{border-color:var(--border2);color:var(--text);}
.tp .info-row{display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:9px;}
.tp .info-row span{color:var(--text2);}
.tp .btn-buy{width:100%;background:var(--green);color:#0C0C0E;border:none;border-radius:var(--r);padding:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:-.2px;transition:opacity .14s;margin-top:4px;}
.tp .btn-buy:hover{opacity:.88;}
.tp .btn-buy:disabled{opacity:.35;cursor:not-allowed;}
.tp .btn-sell-active{background:var(--red)!important;color:#fff!important;}
.tp .inp-disc{font-size:10px;color:var(--text3);text-align:center;margin-top:10px;line-height:1.5;}
.tp .info-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;margin-bottom:12px;}
.tp .ic-title{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;}
.tp .ic-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);}
.tp .ic-row:last-child{border-bottom:none;padding-bottom:0;}
.tp .ic-key{font-size:11px;color:var(--text3);}
.tp .ic-val{font-size:11px;font-weight:600;color:var(--text);}
.tp .ic-val.green{color:var(--green);}
.tp .ic-val.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;}
.tp .holders-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;}
.tp .hc-head{padding:12px 16px;border-bottom:1px solid var(--border);font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;}
.tp .hr{display:flex;align-items:center;gap:8px;padding:9px 16px;border-bottom:1px solid var(--border);}
.tp .hr:last-child{border-bottom:none;}
.tp .hr-n{font-size:10px;color:var(--text3);width:14px;text-align:center;font-weight:700;}
.tp .hr-addr{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:var(--text2);flex:1;}
.tp .hr-you{font-size:9px;color:var(--purple);margin-left:4px;font-family:'Inter',sans-serif;font-weight:700;}
.tp .hr-bar-bg{width:48px;height:3px;background:var(--bg4);border-radius:2px;overflow:hidden;}
.tp .hr-bar-fill{height:100%;border-radius:2px;background:var(--purple);opacity:.65;}
.tp .hr-pct{font-size:11px;font-weight:700;color:var(--text);min-width:40px;text-align:right;}
.tp .msg{font-size:11px;margin-top:8px;line-height:1.5;word-break:break-word;}
.tp .msg.err{color:var(--red);}
.tp .msg.ok{color:var(--green);}
.tp .tbl-wrap{overflow-x:auto;}
.tp .empty{padding:24px 16px;font-size:12px;color:var(--text3);text-align:center;}
.tp .notfound{max-width:520px;margin:80px auto;text-align:center;color:var(--text2);}
@media(max-width:900px){.tp{--gutter:16px;}.tp .layout{grid-template-columns:1fr;}.tp .stats-grid{grid-template-columns:repeat(2,1fr);}.tp .nav-search-wrap{display:none;}}
`

const TOTAL_SUPPLY = 1_000_000_000
const GRAD = 10_000_000_000
const ZERO = '0x0000000000000000000000000000000000000000'
const IPFS_GW = 'https://gateway.pinata.cloud/ipfs/'

type Trade = { type: 'buy' | 'sell'; pls: number; tokens: number; price: number; wallet: string; block: bigint; idx: number }

function toWei(v: string): bigint | undefined {
  try { if (!v || Number(v) <= 0) return undefined; return parseUnits(v, 18) } catch { return undefined }
}
function num(v?: bigint) { return v === undefined ? 0 : Number(formatUnits(v, 18)) }
function fmt(v: number, dp = 2) { return v.toLocaleString('en-US', { maximumFractionDigits: dp }) }
function fmtK(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}
// Consistent address format everywhere: 0xAe26…ade4
function short(a?: string) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : '—' }
function ipfsToHttp(uri?: string) { if (!uri) return ''; if (uri.startsWith('ipfs://')) return IPFS_GW + uri.slice(7); return uri }
function agoSeconds(s: number) {
  if (s < 60) return Math.max(0, Math.floor(s)) + 's ago'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'
  return Math.floor(s / 86400) + 'd ago'
}
function agoFull(s: number) {
  const d = Math.floor(s / 86400)
  if (d >= 1) return d + (d === 1 ? ' day ago' : ' days ago')
  const h = Math.floor(s / 3600)
  if (h >= 1) return h + (h === 1 ? ' hour ago' : ' hours ago')
  const m = Math.floor(s / 60)
  return m + (m === 1 ? ' minute ago' : ' minutes ago')
}
function addrHue(a?: string) { return a ? parseInt(a.slice(2, 6), 16) % 360 : 200 }

// ── Copy icon button ──────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button className="icobtn" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1400) }} title="Copy">
      {ok
        ? <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  )
}

// ── Explorer link button ──────────────────────────────────────────────────────
function ExplorerBtn({ href }: { href: string }) {
  return (
    <a className="icobtn" href={href} target="_blank" rel="noreferrer" title="View on explorer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  )
}

// ── Token Header Bar ──────────────────────────────────────────────────────────
function TokenHeaderBar({ info, meta, tokenAddr, priceN, trades, symbol }: {
  info: any; meta: any; tokenAddr: string; priceN: number; trades: Trade[]; symbol: string
}) {
  const nowSec = Date.now() / 1000
  const launched = info ? agoFull(nowSec - Number(info.createdAt)) : '—'
  const mcap = priceN * TOTAL_SUPPLY
  const hue = addrHue(info?.creator)
  const imgSrc = meta.image ? ipfsToHttp(meta.image) : ''

  const firstPrice = trades.length > 0 ? trades[0].price : 0
  const chg24 = firstPrice > 0 && priceN > 0 ? ((priceN - firstPrice) / firstPrice) * 100 : null

  return (
    <div className="tok-header-bar">
      {/* Row 1 */}
      <div className="tok-header-main">
        <div className="tok-avatar">
          {imgSrc
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imgSrc} alt={symbol} />
            : <span className="tok-avatar-fb">{symbol.slice(0, 3)}</span>
          }
        </div>

        <div className="tok-name-col">
          <div className="tok-name-row">
            <span className="tok-sym">${symbol || '…'}</span>
            <span className="tok-v-badge">V2</span>
            <div className="tok-socials">
              {meta.website && (
                <a className="tok-soc" href={meta.website} target="_blank" rel="noreferrer" title="Website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </a>
              )}
              {meta.twitter && (
                <a className="tok-soc" href={'https://x.com/' + meta.twitter.replace(/^@/, '')} target="_blank" rel="noreferrer" title="X / Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {meta.telegram && (
                <a className="tok-soc" href={meta.telegram} target="_blank" rel="noreferrer" title="Telegram">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.7 8.02c-.12.55-.46.69-.93.43l-2.57-1.89-1.24 1.19c-.14.13-.26.25-.53.25l.19-2.63 4.83-4.36c.21-.19-.05-.29-.32-.1L7.9 14.47l-2.52-.79c-.55-.17-.56-.55.11-.81l9.85-3.8c.46-.17.86.11.7.73z"/></svg>
                </a>
              )}
            </div>
          </div>
          <div className="tok-fullname">{info?.name || '…'}</div>
        </div>

        <div className="tok-mcap-col">
          <div className="tok-mcap-top">
            <span className="tok-mcap-val">{mcap > 0 ? fmtK(mcap) : '—'}</span>
            <span className="tok-mcap-lbl">mcap</span>
          </div>
          <div className="tok-mcap-bot">
            {chg24 !== null && (
              <span className={'tok-chg ' + (chg24 >= 0 ? 'up' : 'dn')}>
                {chg24 >= 0 ? '+' : ''}{chg24.toFixed(1)}% 24h
              </span>
            )}
            <div className="tok-pair">
              <div className="tok-pair-ico">
                <svg width="8" height="8" viewBox="0 0 13 13" fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,10 4,6 7,8 10,3 12,4.5"/></svg>
              </div>
              <span>WPLS pair</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — meta */}
      <div className="tok-meta-row">
        <div className="tok-meta-item">
          <span className="tok-meta-lbl">Contract</span>
          <span className="tok-meta-val">{short(tokenAddr)}</span>
          <CopyBtn text={tokenAddr} />
          <ExplorerBtn href={`https://scan.pulsechain.com/address/${tokenAddr}`} />
        </div>

        <div className="tok-meta-item">
          <span className="tok-meta-lbl">Creator</span>
          <div className="tok-creator-wrap">
            <div className="tok-creator-av" style={{ background: `hsl(${hue},55%,38%)` }}>
              {info?.creator ? info.creator.slice(2, 4).toUpperCase() : '?'}
            </div>
            <span className="tok-meta-val">{short(info?.creator)}</span>
            {info?.creator && <CopyBtn text={info.creator} />}
            {info?.creator && <ExplorerBtn href={`https://scan.pulsechain.com/address/${info.creator}`} />}
          </div>
        </div>

        <div className="tok-meta-item">
          <span className="tok-meta-lbl">Launched</span>
          <span className="tok-meta-val plain">{launched}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TokenDetail() {
  const params = useParams()
  const raw = params?.address
  const tokenAddr = (Array.isArray(raw) ? raw[0] : raw) as `0x${string}`

  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const client = usePublicClient()

  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [fetchedMeta, setFetchedMeta] = useState<{ description?: string; website?: string; twitter?: string; telegram?: string; image?: string }>({})
  const [amt, setAmt] = useState('')
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'mine'>('all')
  const [trades, setTrades] = useState<Trade[]>([])
  const [headBlock, setHeadBlock] = useState<bigint>(BigInt(0))

  const common = { address: BONDING_CURVE_ADDRESS, abi: BONDING_CURVE_ABI } as const

  const { data: info, refetch: refetchInfo } = useReadContract({ ...common, functionName: 'getTokenInfo', args: [tokenAddr] })
  const { data: price, refetch: refetchPrice } = useReadContract({ ...common, functionName: 'currentPrice', args: [tokenAddr], query: { enabled: !!info && info.tokenAddr !== ZERO } })
  const { data: bal, refetch: refetchBal } = useReadContract({
    address: tokenAddr, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`],
    query: { enabled: !!address && !!info && info.tokenAddr !== ZERO },
  })

  const amtWei = toWei(amt)
  const { data: buyQuote } = useReadContract({ ...common, functionName: 'quoteTokensOut', args: [tokenAddr, amtWei ?? BigInt(0)], query: { enabled: mode === 'buy' && !!amtWei && !!info && info.tokenAddr !== ZERO } })
  const { data: sellQuote } = useReadContract({ ...common, functionName: 'quotePlsOut', args: [tokenAddr, amtWei ?? BigInt(0)], query: { enabled: mode === 'sell' && !!amtWei && !!info && info.tokenAddr !== ZERO } })

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (!info?.metaURI) return
    const uri = info.metaURI
    if (uri.startsWith('data:application/json,')) { try { setFetchedMeta(JSON.parse(decodeURIComponent(uri.slice(22)))) } catch {}; return }
    if (uri.startsWith('ipfs://')) { fetch(IPFS_GW + uri.slice(7)).then(r => r.json()).then(d => setFetchedMeta(d)).catch(() => {}) }
  }, [info?.metaURI])

  const loadTrades = useCallback(async () => {
    if (!client || !tokenAddr) return
    try {
      const head = await client.getBlockNumber()
      setHeadBlock(head)
      for (const r of [200000, 50000, 10000]) {
        try {
          const from = head > BigInt(r) ? head - BigInt(r) : BigInt(0)
          const [b, s] = await Promise.all([
            client.getContractEvents({ ...common, eventName: 'TokensBought', args: { tokenAddr }, fromBlock: from, toBlock: head }),
            client.getContractEvents({ ...common, eventName: 'TokensSold', args: { tokenAddr }, fromBlock: from, toBlock: head }),
          ])
          const list: Trade[] = []
          for (const l of b) { const pls = num(l.args.plsIn), tk = num(l.args.tokensOut); list.push({ type: 'buy', pls, tokens: tk, price: tk ? pls / tk : 0, wallet: String(l.args.buyer), block: l.blockNumber ?? BigInt(0), idx: l.logIndex ?? 0 }) }
          for (const l of s) { const pls = num(l.args.plsOut), tk = num(l.args.tokensIn); list.push({ type: 'sell', pls, tokens: tk, price: tk ? pls / tk : 0, wallet: String(l.args.seller), block: l.blockNumber ?? BigInt(0), idx: l.logIndex ?? 0 }) }
          list.sort((x, y) => x.block === y.block ? x.idx - y.idx : x.block < y.block ? -1 : 1)
          setTrades(list); return
        } catch {}
      }
    } catch {}
  }, [client, tokenAddr])

  useEffect(() => { loadTrades(); const t = setInterval(loadTrades, 20000); return () => clearInterval(t) }, [loadTrades])
  useEffect(() => { if (isSuccess) { refetchInfo(); refetchPrice(); refetchBal(); loadTrades(); setAmt('') } }, [isSuccess])

  const notFound = info && info.tokenAddr === ZERO
  const meta = fetchedMeta
  const reserve = num(info?.reservePLS)
  const sold = num(info?.tokensSold)
  const priceN = num(price)
  const pct = Math.min(100, (reserve / GRAD) * 100)
  const balN = num(bal)
  const graduated = !!info?.graduated
  const nowSec = Date.now() / 1000
  const created = info ? agoSeconds(nowSec - Number(info.createdAt)) : '—'
  const symbol = info?.symbol ?? ''
  const ath = trades.reduce((m, t) => Math.max(m, t.price), 0)
  const volume = trades.reduce((m, t) => m + t.pls, 0)

  const tokensOut = buyQuote ? buyQuote[0] : undefined
  const buyFee = buyQuote ? buyQuote[1] : undefined
  const priceAfter = buyQuote ? buyQuote[2] : undefined
  const plsOut = sellQuote ? sellQuote[0] : undefined
  const sellFee = sellQuote ? sellQuote[1] : undefined
  const impact = mode === 'buy' && priceAfter && price ? ((Number(priceAfter) - Number(price)) / Number(price)) * 100 : undefined

  function switchMode(m: 'buy' | 'sell') { setMode(m); setAmt(''); reset() }
  function trade() {
    if (!amtWei) return
    if (mode === 'buy') { if (!tokensOut) return; writeContract({ ...common, functionName: 'buy', args: [tokenAddr, (tokensOut * BigInt(98)) / BigInt(100)], value: amtWei }) }
    else { if (!plsOut) return; writeContract({ ...common, functionName: 'sell', args: [tokenAddr, amtWei, (plsOut * BigInt(98)) / BigInt(100)] }) }
  }

  const overBalance = mode === 'sell' && !!amtWei && !!bal && amtWei > bal
  const busy = isPending || confirming
  const canTrade = !!amtWei && !busy && !graduated && !overBalance && (mode === 'buy' ? !!tokensOut : !!plsOut)
  const shown = trades.filter(t => filter === 'all' || (filter === 'mine' ? !!address && t.wallet.toLowerCase() === address.toLowerCase() : t.type === filter)).slice().reverse().slice(0, 15)

  const pts = trades.slice(-60).map(t => t.price)
  let linePath = '', areaPath = '', lastPt = { x: 0, y: 0 }
  if (pts.length >= 2) {
    const mn = Math.min(...pts), mx = Math.max(...pts), span = mx - mn || 1
    const coords = pts.map((p, i) => ({ x: (i / (pts.length - 1)) * 680, y: 185 - ((p - mn) / span) * 170 }))
    linePath = coords.map((c, i) => (i ? 'L' : 'M') + c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ')
    areaPath = linePath + ' L680,200 L0,200Z'
    lastPt = coords[coords.length - 1]
  }

  const sellPercent = (p: number) => { if (!bal) return; setAmt(formatUnits((bal * BigInt(p)) / BigInt(100), 18)) }

  return (
    <div className="tp">
      <style>{CSS}</style>

      <Navbar />

      {notFound ? (
        <div className="notfound">Token not found. <a href="/">Back to homepage</a></div>
      ) : (
        <>
          <TokenHeaderBar info={info} meta={meta} tokenAddr={tokenAddr} priceN={priceN} trades={trades} symbol={symbol} />

          <div className="layout">
            {/* ── Left ── */}
            <div>
              {meta.description && <p className="token-desc">{meta.description}</p>}

              <div className="price-row">
                <span className="price-main">{price ? priceN.toFixed(8) : '—'}<span className="price-unit">PLS</span></span>
                {ath > 0 && <span className="price-ath">ATH {ath.toFixed(8)} PLS</span>}
              </div>

              <div className="chart-card">
                <div className="chart-title">Price per trade</div>
                <div className="chart-area">
                  {pts.length >= 2 ? (
                    <svg className="chart-svg" viewBox="0 0 680 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6E54F5" stopOpacity=".2"/><stop offset="100%" stopColor="#6E54F5" stopOpacity="0"/></linearGradient>
                        <linearGradient id="cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6E54F5"/><stop offset="100%" stopColor="#17C974"/></linearGradient>
                      </defs>
                      {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="680" y2={y} stroke="var(--border)" strokeWidth="1"/>)}
                      <path d={linePath} fill="none" stroke="url(#cl)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
                      <path d={areaPath} fill="url(#cf)"/>
                      <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="#17C974"/>
                    </svg>
                  ) : (
                    <div className="chart-empty">Chart appears after the first trades</div>
                  )}
                </div>
              </div>

              <div className="stats-grid">
                <div className="sc"><div className="sc-label">Market cap</div><div className="sc-val">{price ? fmt(priceN * TOTAL_SUPPLY, 0) : '—'}</div><div className="sc-sub">PLS · {pct.toFixed(1)}% to grad.</div></div>
                <div className="sc"><div className="sc-label">Volume</div><div className="sc-val">{fmt(volume, 0)}</div><div className="sc-sub">PLS · recent trades</div></div>
                <div className="sc"><div className="sc-label">Tokens sold</div><div className="sc-val">{fmt(sold / 1e6, 2)}M</div><div className="sc-sub">{fmt((sold / TOTAL_SUPPLY) * 100, 1)}% of supply</div></div>
                <div className="sc"><div className="sc-label">Liquidity</div><div className="sc-val">{fmt(reserve, 0)}</div><div className="sc-sub">PLS in curve</div></div>
              </div>

              <div className="ms-card">
                <div className="ms-head">
                  <div>
                    <div className="ms-title">Bonding curve progress</div>
                    <div className="ms-sub">{graduated ? 'Graduated' : fmt(Math.max(0, GRAD - reserve), 0) + ' PLS remaining to graduation'}</div>
                  </div>
                  <div className="ms-pct">{pct.toFixed(1)}%</div>
                </div>
                <div className="ms-bar-bg"><div className="ms-bar-fill" style={{ width: pct + '%' }}/></div>
                <div className="ms-labs"><span>0 PLS</span><span>Graduation at {fmt(GRAD, 0)} PLS</span></div>
                <div className="ms-note">When this token hits 100%, the bonding curve closes and its liquidity is set aside for a PulseChain DEX.</div>
              </div>

              <div className="trades-card">
                <div className="trades-head">
                  <span className="trades-title">Recent trades</span>
                  <div className="trades-filters">
                    {(['all','buy','sell','mine'] as const).map(f => (
                      <button key={f} className={'tfil' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>
                        {f[0].toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {shown.length === 0
                  ? <div className="empty">No trades yet</div>
                  : <div className="tbl-wrap"><table>
                      <thead><tr><th>Type</th><th>PLS</th><th>${symbol}</th><th>Price</th><th>Wallet</th><th>Time</th></tr></thead>
                      <tbody>
                        {shown.map((t, i) => (
                          <tr key={i}>
                            <td className={t.type === 'buy' ? 'buy-c' : 'sell-c'}>{t.type === 'buy' ? 'Buy' : 'Sell'}</td>
                            <td>{fmt(t.pls, 2)}</td><td>{fmt(t.tokens, 0)}</td>
                            <td>{t.price.toFixed(8)}</td>
                            <td className="mono">{short(t.wallet)}</td>
                            <td>~{agoSeconds(Number(headBlock - t.block) * 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                }
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <div>
              <div className="bs-card">
                <div className="bs-tabs">
                  <div className={'bs-tab buy' + (mode === 'buy' ? ' on' : '')} onClick={() => switchMode('buy')}>Buy</div>
                  <div className={'bs-tab sell' + (mode === 'sell' ? ' on' : '')} onClick={() => switchMode('sell')}>Sell</div>
                </div>
                <div className="inp-label">Amount</div>
                <div className="inp-wrap">
                  <input className="inp" type="number" placeholder="0.00" value={amt} onChange={e => setAmt(e.target.value)}/>
                  <span className="inp-cur">{mode === 'buy' ? 'PLS' : '$' + symbol}</span>
                </div>
                <div className="quick-btns">
                  {mode === 'buy'
                    ? [[100,'100'],[500,'500'],[1000,'1K'],[5000,'5K']].map(([v,l]) => <button key={l} className="qbtn" onClick={() => setAmt(String(v))}>{l}</button>)
                    : [25,50,75,100].map(p => <button key={p} className="qbtn" onClick={() => sellPercent(p)}>{p}%</button>)
                  }
                </div>
                {mode === 'sell' && <div className="info-row"><span style={{color:'var(--text3)'}}>Your balance</span><span>{fmt(balN, 2)} ${symbol}</span></div>}
                <div className="info-row"><span style={{color:'var(--text3)'}}>You receive</span><span>{mode === 'buy' ? (tokensOut ? fmt(num(tokensOut), 0) + ' $' + symbol : '—') : (plsOut ? fmt(num(plsOut), 4) + ' PLS' : '—')}</span></div>
                <div className="info-row"><span style={{color:'var(--text3)'}}>Price impact</span><span style={{color:'var(--yellow)'}}>{impact !== undefined ? '~' + impact.toFixed(2) + '%' : '—'}</span></div>
                <div className="info-row"><span style={{color:'var(--text3)'}}>Platform fee (1%)</span><span>{mode === 'buy' ? (buyFee ? fmt(num(buyFee), 4) + ' PLS' : '—') : (sellFee ? fmt(num(sellFee), 4) + ' PLS' : '—')}</span></div>
                {isConnected
                  ? <button className={'btn-buy' + (mode === 'sell' ? ' btn-sell-active' : '')} onClick={trade} disabled={!canTrade}>
                      {graduated ? 'Trading closed' : isPending ? 'Confirm in wallet…' : confirming ? 'Waiting…' : (mode === 'buy' ? 'Buy $' : 'Sell $') + symbol}
                    </button>
                  : <button className="btn-buy" onClick={() => connect({ connector: injected() })}>Connect wallet</button>
                }
                {overBalance && <div className="msg err">Amount exceeds your balance.</div>}
                {error && <div className="msg err">{((error as {shortMessage?:string}).shortMessage ?? error.message).slice(0, 200)}</div>}
                {isSuccess && <div className="msg ok">Transaction confirmed.</div>}
                <div className="inp-disc">Slippage tolerance 2%. DYOR — meme tokens carry significant risk.</div>
              </div>

              <div className="info-card">
                <div className="ic-title">Token info</div>
                <div className="ic-row"><span className="ic-key">Contract</span><span className="ic-val mono">{short(tokenAddr)}</span></div>
                <div className="ic-row"><span className="ic-key">Creator</span><span className="ic-val mono">{short(info?.creator)}</span></div>
                <div className="ic-row"><span className="ic-key">Created</span><span className="ic-val">{created}</span></div>
                <div className="ic-row"><span className="ic-key">Total supply</span><span className="ic-val">{fmt(TOTAL_SUPPLY, 0)}</span></div>
                <div className="ic-row"><span className="ic-key">Decimals</span><span className="ic-val">18</span></div>
                <div className="ic-row"><span className="ic-key">Status</span><span className={'ic-val' + (graduated ? '' : ' green')}>{graduated ? 'Graduated' : 'Active — bonding'}</span></div>
              </div>

              <div className="holders-card">
                <div className="hc-head">Supply</div>
                <div className="hr">
                  <span className="hr-n">1</span>
                  <span className="hr-addr">Bonding curve</span>
                  <div className="hr-bar-bg"><div className="hr-bar-fill" style={{width: 100-(sold/TOTAL_SUPPLY)*100+'%', background:'var(--green)'}}/></div>
                  <span className="hr-pct">{fmt(100-(sold/TOTAL_SUPPLY)*100, 1)}%</span>
                </div>
                {isConnected && (
                  <div className="hr">
                    <span className="hr-n">2</span>
                    <span className="hr-addr">{short(address)}<span className="hr-you">you</span></span>
                    <div className="hr-bar-bg"><div className="hr-bar-fill" style={{width: Math.min(100,(balN/TOTAL_SUPPLY)*100)+'%'}}/></div>
                    <span className="hr-pct">{fmt((balN/TOTAL_SUPPLY)*100, 2)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
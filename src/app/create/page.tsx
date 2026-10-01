'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseEther } from 'viem'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import Navbar from '../components/Navbar'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.cr{--bg:var(--bg-page);--bg2:var(--bg-card);--bg3:var(--bg-subtle);--bg4:var(--bg-item-hover);--border2:var(--border-strong);--border-focus:rgba(110,84,245,0.45);--text:var(--text-primary);--text2:var(--text-muted);--text3:var(--text-faint);--green-dim:rgba(23,201,116,0.12);--red:var(--danger);--red-dim:var(--danger-bg);--purple:var(--accent);--purple-dim:var(--accent-bg);--yellow:#F5A623;--yellow-dim:rgba(245,166,35,0.12);--r:6px;--r2:10px;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh;font-size:14px;}
.cr *,.cr *::before,.cr *::after{box-sizing:border-box;margin:0;padding:0;}
.cr a{color:inherit}
.cr input[type=number]::-webkit-outer-spin-button,.cr input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.cr input[type=number]{-moz-appearance:textfield;}
.cr .page{max-width:820px;margin:0 auto;padding:32px 20px 60px;}
.cr .page-h{margin-bottom:24px;}
.cr .page-title{font-size:24px;font-weight:900;letter-spacing:-.8px;margin-bottom:4px;}
.cr .page-sub{font-size:13px;color:var(--text2);}
.cr .steps{display:flex;align-items:center;gap:0;margin-bottom:28px;}
.cr .si{display:flex;align-items:center;gap:7px;}
.cr .sc{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
.cr .sc.active{background:var(--purple-dim);border:1.5px solid var(--purple);color:var(--purple);}
.cr .sc.idle{background:var(--bg3);border:1.5px solid var(--border2);color:var(--text3);}
.cr .sl{font-size:12px;font-weight:600;}
.cr .sl.active{color:var(--text);}
.cr .sl.idle{color:var(--text3);}
.cr .sline{flex:1;height:1px;background:var(--border);margin:0 10px;min-width:20px;}
.cr .fl{display:grid;grid-template-columns:1fr 256px;gap:16px;align-items:start;}
.cr .card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:20px;margin-bottom:12px;}
.cr .ct{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;}
.cr .field{margin-bottom:16px;}
.cr .field:last-child{margin-bottom:0;}
.cr .fl-label{font-size:11px;font-weight:600;color:var(--text2);margin-bottom:5px;display:flex;align-items:center;gap:5px;}
.cr .req{color:var(--red);}
.cr .hint{color:var(--text3);font-weight:400;font-size:10px;}
.cr .finp{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r);padding:9px 12px;font-size:13px;font-weight:500;color:var(--text);font-family:'Inter',sans-serif;outline:none;transition:border-color .14s;}
.cr .finp:focus{border-color:var(--border-focus);}
.cr .finp::placeholder{color:var(--text3);}
.cr .finp-wrap{position:relative;}
.cr .fpfx{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:var(--text3);}
.cr .finp.pfx{padding-left:22px;}
.cr .fsfx{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text3);}
.cr .fcc{font-size:10px;color:var(--text3);text-align:right;margin-top:4px;}
.cr .fta{resize:vertical;min-height:72px;line-height:1.55;}
.cr .fhint{font-size:10px;color:var(--text3);margin-top:4px;line-height:1.5;}
.cr .upl{border:1.5px dashed var(--border2);border-radius:var(--r2);padding:24px 16px;text-align:center;cursor:pointer;transition:border-color .14s,background .14s;position:relative;background:var(--bg3);}
.cr .upl:hover{border-color:var(--purple);background:var(--purple-dim);}
.cr .upl input{position:absolute;inset:0;opacity:0;cursor:pointer;}
.cr .upl-title{font-size:12px;font-weight:600;color:var(--text2);margin-bottom:3px;}
.cr .upl-sub{font-size:10px;color:var(--text3);}
.cr .upl-preview{width:64px;height:64px;border-radius:50%;object-fit:cover;border:1.5px solid var(--border2);margin:0 auto 8px;}
.cr .trow{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);}
.cr .trow:last-child{border-bottom:none;padding-bottom:0;}
.cr .tname{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px;}
.cr .tdesc{font-size:10px;color:var(--text3);}
.cr .tog{width:32px;height:18px;background:var(--bg4);border-radius:9px;position:relative;cursor:pointer;border:1px solid var(--border2);transition:background .18s;flex-shrink:0;}
.cr .tog.on{background:var(--purple);border-color:var(--purple);}
.cr .tok{width:12px;height:12px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,.3);}
.cr .tog.on .tok{left:16px;}
.cr .psticky{position:sticky;top:66px;}
.cr .prev-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;margin-bottom:10px;}
.cr .prev-label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;padding:11px 13px;border-bottom:1px solid var(--border);}
.cr .prev-img{width:100%;aspect-ratio:1;background:var(--bg3);position:relative;display:flex;align-items:center;justify-content:center;}
.cr .prev-img-bg{position:absolute;inset:0;background:linear-gradient(160deg,#110f23 0%,#1a1133 60%,#120e33 100%);}
.cr .prev-sym-text{position:relative;font-size:52px;font-weight:900;letter-spacing:-2px;color:rgba(255,255,255,.07);user-select:none;z-index:1;padding-top:10px;}
.cr .prev-v2{position:absolute;top:7px;left:7px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);border-radius:3px;padding:2px 6px;font-size:9px;font-weight:700;color:var(--text2);}
.cr .prev-ms{position:absolute;bottom:7px;left:7px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);border-radius:3px;padding:2px 6px;font-size:9px;color:var(--text2);}
.cr .prev-bar{height:2px;background:var(--bg4);}
.cr .prev-body{padding:9px 12px 11px;}
.cr .prev-nr{display:flex;justify-content:space-between;align-items:baseline;}
.cr .prev-name{font-size:10px;color:var(--text3);}
.cr .prev-mcl{font-size:9px;color:var(--text3);}
.cr .prev-sym{font-size:16px;font-weight:800;letter-spacing:-.4px;color:var(--text);}
.cr .prev-mc{font-size:16px;font-weight:800;letter-spacing:-.4px;color:var(--text);}
.cr .prev-meta{font-size:9px;color:var(--text3);margin-top:4px;}
.cr .fee-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:14px;margin-bottom:10px;}
.cr .fee-row{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;}
.cr .fee-k{color:var(--text2);}
.cr .fee-v{font-weight:700;color:var(--text);}
.cr .fee-div{border:none;border-top:1px solid var(--border);margin:7px 0;}
.cr .fee-tk{font-size:13px;font-weight:700;color:var(--text);}
.cr .fee-tv{font-size:13px;font-weight:800;color:var(--green);}
.cr .warn{background:var(--yellow-dim);border:1px solid rgba(245,166,35,.18);border-radius:var(--r);padding:10px 12px;margin-bottom:10px;font-size:11px;color:var(--yellow);line-height:1.55;}
.cr .btn-deploy{width:100%;background:var(--purple);color:#fff;border:none;border-radius:var(--r);padding:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:-.2px;transition:opacity .14s;}
.cr .btn-deploy:hover{opacity:.88;}
.cr .btn-deploy:disabled{opacity:.35;cursor:not-allowed;}
.cr .deploy-sub{font-size:10px;color:var(--text3);text-align:center;margin-top:7px;line-height:1.5;}
.cr .modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(6px);z-index:999;display:none;align-items:center;justify-content:center;}
.cr .modal-ov.show{display:flex;}
.cr .modal{background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:32px 28px;max-width:380px;width:90%;text-align:center;}
.cr .modal-title{font-size:20px;font-weight:900;letter-spacing:-.6px;margin-bottom:6px;}
.cr .modal-sub{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:18px;}
.cr .modal-addr{font-family:monospace;font-size:11px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;color:var(--text2);margin-bottom:16px;word-break:break-all;text-align:left;}
.cr .modal-btns{display:flex;gap:8px;}
.cr .mbtn-s{flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r);padding:10px;font-size:12px;font-weight:600;color:var(--text2);cursor:pointer;font-family:'Inter',sans-serif;}
.cr .mbtn-p{flex:1;background:var(--green);border:none;border-radius:var(--r);padding:10px;font-size:12px;font-weight:800;color:#0C0C0E;cursor:pointer;font-family:'Inter',sans-serif;}
.cr .err{font-size:11px;color:var(--red);margin-top:8px;word-break:break-word;line-height:1.5;}
@media(max-width:700px){.cr .fl{grid-template-columns:1fr;}.cr .psticky{position:static;}}
`

const DEPLOY_FEE = 500
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT ?? ''

export default function CreateToken() {
  const { isConnected: walletConnected } = useAccount()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isConnected = mounted && walletConnected
  const { connect } = useConnect()
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [desc, setDesc] = useState('')
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imgName, setImgName] = useState('')
  const [buyOn, setBuyOn] = useState(true)
  const [buyAmt, setBuyAmt] = useState('100')
  const [antiSnipe, setAntiSnipe] = useState(false)
  const [maxCap, setMaxCap] = useState(false)
  const [modalClosed, setModalClosed] = useState(false)
  const [formError, setFormError] = useState('')

  const buyNum = buyOn ? parseFloat(buyAmt) || 0 : 0
  const total = DEPLOY_FEE + buyNum
  const busy = isPending || confirming

  function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setFormError('Image must be under 5MB.'); return }
    setFormError('')
    const rd = new FileReader()
    rd.onload = (ev) => {
      setImgSrc(ev.target?.result as string)
      setImgName(file.name)
      setImgFile(file)
    }
    rd.readAsDataURL(file)
  }

  async function handleDeploy() {
    if (!name.trim() || !ticker.trim()) { setFormError('Token name and ticker are required.'); return }
    setFormError('')
    setModalClosed(false)
    setUploading(true)
    try {
      let imageURI = ''
      if (imgFile) {
        const form = new FormData()
        form.append('file', imgFile)
        const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: { Authorization: `Bearer ${PINATA_JWT}` },
          body: form,
        })
        if (!imgRes.ok) throw new Error('Image upload failed: ' + await imgRes.text())
        const imgData = await imgRes.json()
        imageURI = `ipfs://${imgData.IpfsHash}`
      }
      const metaJson = {
        name: name.trim(), symbol: ticker.trim(), description: desc.trim(),
        image: imageURI, website: website.trim(), twitter: twitter.trim(), telegram: telegram.trim(),
      }
      const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PINATA_JWT}` },
        body: JSON.stringify({ pinataContent: metaJson }),
      })
      if (!metaRes.ok) throw new Error('Metadata upload failed: ' + await metaRes.text())
      const metaData = await metaRes.json()
      const metaURI = `ipfs://${metaData.IpfsHash}`
      const initialBuy = parseEther(String(buyNum))
      writeContract({
        address: BONDING_CURVE_ADDRESS,
        abi: BONDING_CURVE_ABI,
        functionName: 'deployToken',
        args: [name.trim(), ticker.trim(), metaURI, antiSnipe, maxCap, initialBuy],
        value: parseEther(String(DEPLOY_FEE)) + initialBuy,
      })
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cr">
      <style>{CSS}</style>
      <Navbar />

      <div className="page">
        <div className="page-h">
          <div className="page-title">Launch a token</div>
          <div className="page-sub">Fair launch on PulseChain. No presale, no team allocation — bonding curve only.</div>
        </div>
        <div className="steps">
          <div className="si"><div className="sc active">1</div><span className="sl active">Token info</span></div>
          <div className="sline" />
          <div className="si"><div className="sc idle">2</div><span className="sl idle">Review</span></div>
          <div className="sline" />
          <div className="si"><div className="sc idle">3</div><span className="sl idle">Deploy</span></div>
        </div>

        <div className="fl">
          <div>
            <div className="card">
              <div className="ct">Basic info</div>
              <div className="field">
                <div className="fl-label">Token name <span className="req">*</span></div>
                <input className="finp" type="text" placeholder="e.g. VoltPulse" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} />
                <div className="fcc">{name.length}/32</div>
              </div>
              <div className="field">
                <div className="fl-label">Ticker <span className="req">*</span> <span className="hint">— shown as $TICKER</span></div>
                <div className="finp-wrap">
                  <span className="fpfx">$</span>
                  <input className="finp pfx" type="text" placeholder="VOLT" maxLength={8} value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                  <span className="fsfx">{ticker.length}/8</span>
                </div>
              </div>
              <div className="field">
                <div className="fl-label">Description <span className="hint">— optional</span></div>
                <textarea className="finp fta" placeholder="What is this token about?" maxLength={280} value={desc} onChange={(e) => setDesc(e.target.value)} />
                <div className="fcc">{desc.length}/280</div>
              </div>
            </div>

            <div className="card">
              <div className="ct">Token image</div>
              <div className="field">
                <div className="fl-label">Upload image <span className="hint">— PNG, JPG, GIF · max 5MB</span></div>
                <div className="upl" style={imgSrc ? { borderStyle: 'solid' } : undefined}>
                  <input type="file" accept="image/*" onChange={handleImg} />
                  {imgSrc ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc} alt="" className="upl-preview" />
                      <div className="upl-title">{imgName}</div>
                      <div className="upl-sub">Click to change</div>
                    </div>
                  ) : (
                    <div>
                      <div className="upl-title">Click or drag to upload</div>
                      <div className="upl-sub">Square image, 500×500px min</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="ct">Social links <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text3)', letterSpacing: 0 }}>— optional</span></div>
              <div className="field">
                <div className="fl-label">Website</div>
                <input className="finp" type="url" placeholder="https://yourtoken.xyz" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="field">
                <div className="fl-label">Twitter / X</div>
                <div className="finp-wrap">
                  <span className="fpfx">@</span>
                  <input className="finp pfx" type="text" placeholder="handle" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <div className="fl-label">Telegram</div>
                <input className="finp" type="url" placeholder="https://t.me/group" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div className="ct">Options</div>
              <div className="trow">
                <div><div className="tname">Buy on deploy</div><div className="tdesc">Be the first buyer when the contract goes live</div></div>
                <div className={`tog${buyOn ? ' on' : ''}`} onClick={() => setBuyOn(!buyOn)}><div className="tok" /></div>
              </div>
              {buyOn && (
                <div style={{ padding: '12px 0 0' }}>
                  <div className="fl-label">Initial buy amount</div>
                  <div className="finp-wrap">
                    <input className="finp" type="number" placeholder="0" value={buyAmt} onChange={(e) => setBuyAmt(e.target.value)} />
                    <span className="fsfx">PLS</span>
                  </div>
                  <div className="fhint">Minimum recommended: 100 PLS to signal intent.</div>
                </div>
              )}
              <div className="trow" style={{ marginTop: 12 }}>
                <div><div className="tname">Anti-snipe delay</div><div className="tdesc">Block all buys for 30 sec after deploy</div></div>
                <div className={`tog${antiSnipe ? ' on' : ''}`} onClick={() => setAntiSnipe(!antiSnipe)}><div className="tok" /></div>
              </div>
              <div className="trow">
                <div><div className="tname">Max wallet cap (2%)</div><div className="tdesc">No single wallet can hold more than 2% on launch</div></div>
                <div className={`tog${maxCap ? ' on' : ''}`} onClick={() => setMaxCap(!maxCap)}><div className="tok" /></div>
              </div>
            </div>
          </div>

          <div className="psticky">
            <div className="prev-card">
              <div className="prev-label">Live preview</div>
              <div className="prev-img">
                <div className="prev-img-bg" />
                {imgSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, opacity: 0.85 }} />
                ) : (
                  <div className="prev-sym-text">{ticker || 'TOKEN'}</div>
                )}
                <div className="prev-v2" style={{ zIndex: 2 }}>V2</div>
                <div className="prev-ms" style={{ zIndex: 2 }}>0% of milestone</div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--bg4)', zIndex: 2 }}>
                  <div style={{ height: '100%', width: 0, background: 'var(--purple)' }} />
                </div>
              </div>
              <div className="prev-bar" />
              <div className="prev-body">
                <div className="prev-nr"><span className="prev-name">{name || 'Token name'}</span><span className="prev-mcl">Liquidity</span></div>
                <div className="prev-nr"><span className="prev-sym">{ticker ? '$' + ticker : '$TICKER'}</span><span className="prev-mc">0 PLS</span></div>
                <div className="prev-meta">@you · just now</div>
              </div>
            </div>

            <div className="fee-box">
              <div className="fee-row"><span className="fee-k">Deploy fee</span><span className="fee-v">{DEPLOY_FEE} PLS</span></div>
              <div className="fee-row"><span className="fee-k">Initial buy</span><span className="fee-v">{buyOn ? buyNum + ' PLS' : '—'}</span></div>
              <hr className="fee-div" />
              <div className="fee-row"><span className="fee-tk">Total</span><span className="fee-tv">{total} PLS</span></div>
            </div>

            <div className="warn">Once deployed, token details cannot be changed. Verify everything before signing.</div>

            {isConnected ? (
              <button className="btn-deploy" onClick={handleDeploy} disabled={busy || uploading}>
                {uploading ? 'Uploading to IPFS…' : isPending ? 'Signing…' : confirming ? 'Broadcasting…' : 'Deploy token'}
              </button>
            ) : (
              <button className="btn-deploy" onClick={() => connect({ connector: injected() })}>Connect wallet</button>
            )}
            <div className="deploy-sub">Wallet signature required</div>
            {formError && <div className="err">{formError}</div>}
            {error && <div className="err">{((error as {shortMessage?:string}).shortMessage ?? error.message).slice(0, 220)}</div>}
          </div>
        </div>
      </div>

      <div className={`modal-ov${isSuccess && !modalClosed ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalClosed(true) }}>
        <div className="modal">
          <div className="modal-title">Token deployed</div>
          <div className="modal-sub">Your token is live on PulseChain and trading on the bonding curve.</div>
          <div className="modal-addr">Tx: {hash}</div>
          <div className="modal-btns">
            <button className="mbtn-s" onClick={() => { setModalClosed(true); reset() }}>Close</button>
            <a href="/" className="mbtn-p" style={{ textDecoration: 'none', textAlign: 'center' }}>View tokens</a>
          </div>
        </div>
      </div>
    </div>
  )
}
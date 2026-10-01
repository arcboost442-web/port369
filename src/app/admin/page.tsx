'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseEther, formatEther } from 'viem'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { data: owner } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'owner',
  })

  const { data: treasury } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'treasury',
  })

  const { data: deployFee } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'DEPLOY_FEE',
  })

  const { data: defaultGradTarget } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'defaultGradTarget',
  })

  const { data: summary } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'adminSummary',
  })

  const isOwner = mounted && isConnected && address?.toLowerCase() === (owner as string)?.toLowerCase()

if (!mounted || !isConnected) {
    return (
      <main style={{ background: '#0C0C0E', minHeight: '100vh', color: '#F2F2F5', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#7A7A90', marginBottom: 16 }}>Connect wallet to access admin</div>
          <button onClick={() => connect({ connector: injected() })} style={{ background: '#6E54F5', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Connect wallet
          </button>
        </div>
      </main>
    )
  }

  if (!isOwner) {
    return (
      <main style={{ background: '#0C0C0E', minHeight: '100vh', color: '#F2F2F5', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--red, #F0455A)' }}>Access denied — not owner</div>
          <div style={{ fontSize: 11, color: '#3E3E55', marginTop: 8, fontFamily: 'monospace' }}>
            Connected: {address}<br/>
            Owner: {owner as string}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0C0C0E', minHeight: '100vh', color: '#F2F2F5', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ height: 50, borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, background: 'rgba(12,12,14,0.94)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 26, height: 26, border: '1.5px solid #6E54F5', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#6E54F5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,10 4,6 7,8 10,3 12,4.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.4, color: '#F2F2F5' }}>Port369</span>
        </a>
        <span style={{ fontSize: 11, color: '#3E3E55' }}>/</span>
        <span style={{ fontSize: 12, color: '#7A7A90' }}>Admin</span>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#17C974', background: 'rgba(23,201,116,0.1)', border: '1px solid rgba(23,201,116,0.2)', borderRadius: 20, padding: '3px 10px' }}>
          Owner
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.8, marginBottom: 4 }}>Admin Panel</div>
        <div style={{ fontSize: 12, color: '#3E3E55', fontFamily: 'monospace', marginBottom: 28 }}>{BONDING_CURVE_ADDRESS}</div>

        {/* SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total tokens', value: summary?.[0]?.toString() ?? '...' },
            { label: 'Graduated (ready)', value: summary?.[1]?.toString() ?? '...' },
            { label: 'Active', value: summary?.[2]?.toString() ?? '...' },
            { label: 'Active reserve', value: summary?.[3] ? `${Number(formatEther(summary[3])).toFixed(1)} PLS` : '...' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#3E3E55', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* INFO */}
        <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3E3E55', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Contract info</div>
          <InfoRow label="Owner" value={owner as string} mono />
          <InfoRow label="Treasury" value={treasury as string} mono />
          <InfoRow label="Deploy fee" value={deployFee ? `${formatEther(deployFee as bigint)} PLS` : '...'} />
          <InfoRow label="Grad target" value={defaultGradTarget ? `${formatEther(defaultGradTarget as bigint)} PLS` : '...'} last />
        </div>

        {/* SET GRAD TARGET */}
        <SetGradTarget />

        {/* WITHDRAW GRADUATED */}
        <WithdrawPanel
          title="Withdraw graduated funds"
          sub="Send PLS from graduated tokens to treasury"
          fnName="withdrawGraduatedFunds"
          btnLabel="Withdraw graduated"
          btnColor="#17C974"
          btnText="#0C0C0E"
        />

        {/* EMERGENCY WITHDRAW */}
        <WithdrawPanel
          title="Emergency withdraw"
          sub="Close active tokens and send reserve PLS to treasury"
          fnName="emergencyWithdraw"
          btnLabel="Emergency withdraw"
          btnColor="#F0455A"
          btnText="#fff"
          warn="This will permanently close the selected tokens. Buyers will not be able to sell."
        />
      </div>
    </main>
  )
}

function InfoRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.055)' }}>
      <span style={{ fontSize: 11, color: '#3E3E55' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#F2F2F5', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

function SetGradTarget() {
  const [val, setVal] = useState('')
  const { writeContract, isPending, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  function submit() {
    if (!val) return
    writeContract({
      address: BONDING_CURVE_ADDRESS,
      abi: BONDING_CURVE_ABI,
      functionName: 'setDefaultGradTarget',
      args: [parseEther(val)],
    })
  }

  return (
    <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#3E3E55', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Set graduation target</div>
      <div style={{ fontSize: 11, color: '#7A7A90', marginBottom: 14 }}>PLS required to graduate a token. Max 10,000 PLS.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder="e.g. 5000"
          style={{ flex: 1, background: '#0C0C0E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', color: '#F2F2F5', fontSize: 13, outline: 'none' }}
        />
        <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#3E3E55', paddingRight: 4 }}>PLS</span>
        <button
          onClick={submit}
          disabled={!val || isPending}
          style={{ background: '#6E54F5', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}>
          {isPending ? 'Confirm...' : 'Set'}
        </button>
      </div>
      {isSuccess && <div style={{ fontSize: 11, color: '#17C974', marginTop: 8 }}>Updated.</div>}
    </div>
  )
}

function WithdrawPanel({ title, sub, fnName, btnLabel, btnColor, btnText, warn }: {
  title: string; sub: string; fnName: string; btnLabel: string;
  btnColor: string; btnText: string; warn?: string
}) {
  const [addrs, setAddrs] = useState('')
  const { writeContract, isPending, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  function submit() {
    const list = addrs.split('\n').map(a => a.trim()).filter(a => a.startsWith('0x')) as `0x${string}`[]
    if (!list.length) return
    writeContract({
      address: BONDING_CURVE_ADDRESS,
      abi: BONDING_CURVE_ABI,
      functionName: fnName as any,
      args: [list],
    })
  }

  return (
    <div style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#3E3E55', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#7A7A90', marginBottom: warn ? 8 : 14 }}>{sub}</div>
      {warn && <div style={{ fontSize: 11, color: '#F5A623', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, lineHeight: 1.5 }}>{warn}</div>}
      <textarea
        value={addrs}
        onChange={e => setAddrs(e.target.value)}
        placeholder={'0xTokenAddress1\n0xTokenAddress2'}
        style={{ width: '100%', background: '#0C0C0E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '9px 12px', color: '#F2F2F5', fontSize: 11, fontFamily: 'monospace', outline: 'none', minHeight: 80, resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
      />
      <button
        onClick={submit}
        disabled={!addrs.trim() || isPending}
        style={{ background: btnColor, color: btnText, border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: isPending ? 0.5 : 1 }}>
        {isPending ? 'Confirm in wallet...' : btnLabel}
      </button>
      {isSuccess && <span style={{ fontSize: 11, color: '#17C974', marginLeft: 12 }}>Done.</span>}
    </div>
  )
}
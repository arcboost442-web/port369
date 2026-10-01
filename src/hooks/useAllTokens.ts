import { useReadContract, useReadContracts } from 'wagmi'
import { BONDING_CURVE_ADDRESS, BONDING_CURVE_ABI } from '@/config/contracts'
import { useMemo } from 'react'

export function useAllTokens() {
  const { data: total } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'totalTokens',
  })

  const { data: addresses } = useReadContract({
    address: BONDING_CURVE_ADDRESS,
    abi: BONDING_CURVE_ABI,
    functionName: 'getTokensPaginated',
    args: [BigInt(0), total ?? BigInt(0)],
    query: { enabled: !!total && total > BigInt(0) },
  })

  const contracts = useMemo(() => {
    if (!addresses) return []
    return (addresses as string[]).map(addr => ({
      address: BONDING_CURVE_ADDRESS as `0x${string}`,
      abi: BONDING_CURVE_ABI,
      functionName: 'getTokenInfo' as const,
      args: [addr as `0x${string}`],
    }))
  }, [addresses])

  const { data: infos } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  })

  const tokens = useMemo(() => {
    if (!addresses || !infos) return []
    return (addresses as string[]).map((addr, i) => ({
      address: addr,
      info: infos[i]?.result as any,
    })).filter(t => t.info)
  }, [addresses, infos])

  return tokens
}
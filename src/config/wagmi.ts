import { createConfig, http } from 'wagmi'
import { defineChain } from 'viem'

export const pulsechain = defineChain({
  id: 369,
  name: 'PulseChain',
  nativeCurrency: { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.pulsechain.com'] },
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.pulsechain.com' },
  },
})

export const config = createConfig({
  chains: [pulsechain],
  transports: {
    [pulsechain.id]: http(),
  },
})
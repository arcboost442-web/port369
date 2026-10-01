export const BONDING_CURVE_ADDRESS =
  '0xE0D708D790cA44A47df751C300633BfB6d4C64C3' as const

export const BONDING_CURVE_ABI = [
      // admin
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'treasury',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'DEPLOY_FEE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'defaultGradTarget',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'gradTarget',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'closed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'adminSummary',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'total',          type: 'uint256' },
      { name: 'graduatedReady', type: 'uint256' },
      { name: 'active',         type: 'uint256' },
      { name: 'activeReserve',  type: 'uint256' },
    ],
  },
  {
    name: 'setDefaultGradTarget',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_target', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'setTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_treasury', type: 'address' }],
    outputs: [],
  },
  {
    name: 'withdrawGraduatedFunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'list', type: 'address[]' }],
    outputs: [],
  },
  {
    name: 'emergencyWithdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'list', type: 'address[]' }],
    outputs: [],
  },
  
  // deploy token
  {
    name: 'deployToken',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_name',       type: 'string'  },
      { name: '_symbol',     type: 'string'  },
      { name: '_metaURI',    type: 'string'  },
      { name: '_antiSnipe',  type: 'bool'    },
      { name: '_walletCap',  type: 'bool'    },
      { name: '_initialBuy', type: 'uint256' },
    ],
    outputs: [{ name: 'tokenAddr', type: 'address' }],
  },
  // buy
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenAddr',    type: 'address' },
      { name: 'minTokensOut', type: 'uint256' },
    ],
    outputs: [],
  },
  // sell
  {
    name: 'sell',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenAddr', type: 'address' },
      { name: 'tokensIn',  type: 'uint256' },
      { name: 'minPlsOut', type: 'uint256' },
    ],
    outputs: [],
  },
  // quoteTokensOut
  {
    name: 'quoteTokensOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenAddr', type: 'address' },
      { name: 'plsIn',     type: 'uint256' },
    ],
    outputs: [
      { name: 'tokensOut',  type: 'uint256' },
      { name: 'fee',        type: 'uint256' },
      { name: 'priceAfter', type: 'uint256' },
    ],
  },
  // quotePlsOut
  {
    name: 'quotePlsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenAddr', type: 'address' },
      { name: 'tokensIn',  type: 'uint256' },
    ],
    outputs: [
      { name: 'plsOut', type: 'uint256' },
      { name: 'fee',    type: 'uint256' },
    ],
  },
  // currentPrice
  {
    name: 'currentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // milestone
  {
    name: 'milestone',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddr', type: 'address' }],
    outputs: [{ name: 'pct', type: 'uint256' }],
  },
  // getTokenInfo
  {
    name: 'getTokenInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddr', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenAddr',  type: 'address' },
          { name: 'creator',    type: 'address' },
          { name: 'reservePLS', type: 'uint256' },
          { name: 'tokensSold', type: 'uint256' },
          { name: 'createdAt',  type: 'uint256' },
          { name: 'graduated',  type: 'bool'    },
          { name: 'antiSnipe',  type: 'bool'    },
          { name: 'walletCap',  type: 'bool'    },
          { name: 'name',       type: 'string'  },
          { name: 'symbol',     type: 'string'  },
          { name: 'metaURI',    type: 'string'  },
        ],
      },
    ],
  },
  // totalTokens
  {
    name: 'totalTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // getTokensPaginated
  {
    name: 'getTokensPaginated',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'offset', type: 'uint256' },
      { name: 'limit',  type: 'uint256' },
    ],
    outputs: [{ name: 'page', type: 'address[]' }],
  },
  // events
  {
    name: 'TokenLaunched',
    type: 'event',
    inputs: [
      { name: 'tokenAddr', type: 'address', indexed: true },
      { name: 'creator',   type: 'address', indexed: true },
      { name: 'name',      type: 'string',  indexed: false },
      { name: 'symbol',    type: 'string',  indexed: false },
      { name: 'metaURI',   type: 'string',  indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TokensBought',
    type: 'event',
    inputs: [
      { name: 'tokenAddr',     type: 'address', indexed: true  },
      { name: 'buyer',         type: 'address', indexed: true  },
      { name: 'plsIn',         type: 'uint256', indexed: false },
      { name: 'tokensOut',     type: 'uint256', indexed: false },
      { name: 'newReserve',    type: 'uint256', indexed: false },
      { name: 'newTokensSold', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TokensSold',
    type: 'event',
    inputs: [
      { name: 'tokenAddr',     type: 'address', indexed: true  },
      { name: 'seller',        type: 'address', indexed: true  },
      { name: 'tokensIn',      type: 'uint256', indexed: false },
      { name: 'plsOut',        type: 'uint256', indexed: false },
      { name: 'newReserve',    type: 'uint256', indexed: false },
      { name: 'newTokensSold', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TokenGraduated',
    type: 'event',
    inputs: [
      { name: 'tokenAddr',  type: 'address', indexed: true  },
      { name: 'reservePLS', type: 'uint256', indexed: false },
      { name: 'timestamp',  type: 'uint256', indexed: false },
    ],
  },
] as const
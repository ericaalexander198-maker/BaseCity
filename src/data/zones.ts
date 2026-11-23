export interface ZoneItem {
  id?: string;
  name?: string;
  symbol?: string;
  slug?: string;
  category?: string;
  description?: string;
  url?: string;
  address?: string;
  decimals?: number;
  protocol?: string;
  depositUrl?: string;
  coingeckoId?: string;
}

export interface CityZone {
  id: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  position: { x: number; y: number };
  size: { width: number; height: number; height3D: number };
  items: ZoneItem[];
}

export const ZONES: CityZone[] = [
  {
    id: "defi-apps",
    name: "DeFi Apps Corner",
    category: "DeFi",
    color: "#0052FF",
    icon: "⚡",
    position: { x: 12, y: 14 },
    size: { width: 22, height: 18, height3D: 36 },
    items: [
      { id: "aerodrome", name: "Aerodrome", slug: "aerodrome", category: "DEX", url: "https://aerodrome.finance" },
      { id: "uniswap", name: "Uniswap", slug: "uniswap", category: "DEX", url: "https://app.uniswap.org" },
      { id: "morpho", name: "Morpho", slug: "morpho", category: "Lending", url: "https://app.morpho.org" },
      { id: "moonwell", name: "Moonwell", slug: "moonwell", category: "Lending", url: "https://moonwell.fi" },
      { id: "aave", name: "Aave V3", slug: "aave-v3", category: "Lending", url: "https://app.aave.com" },
    ],
  },
  {
    id: "dapp-store",
    name: "Dapp Store",
    category: "Directory",
    color: "#2563EB",
    icon: "🛍️",
    position: { x: 38, y: 14 },
    size: { width: 24, height: 18, height3D: 42 },
    items: [
      { id: "aerodrome-store", name: "Aerodrome", category: "DeFi", description: "Central liquidity hub on Base.", url: "https://aerodrome.finance" },
      { id: "zora-store", name: "Zora", category: "NFT", description: "Onchain media and creator mints.", url: "https://zora.co" },
      { id: "farcaster-store", name: "Farcaster", category: "Social", description: "Decentralized social network.", url: "https://warpcast.com" },
      { id: "parallel-store", name: "Parallel TCG", category: "Games", description: "Sci-fi trading card game.", url: "https://parallel.life" },
      { id: "basescan-store", name: "Basescan", category: "Tools", description: "Block explorer and contract verifier.", url: "https://basescan.org" },
    ],
  },
  {
    id: "builder-corner",
    name: "Builder Corner",
    category: "Dev",
    color: "#0EA5E9",
    icon: "🛠️",
    position: { x: 66, y: 14 },
    size: { width: 22, height: 18, height3D: 38 },
    items: [
      { id: "docs", name: "Base Docs", category: "Docs", url: "https://docs.base.org" },
      { id: "faucet", name: "Base Sepolia Faucet", category: "Faucet", url: "https://portal.cdp.coinbase.com/products/faucet" },
      { id: "onchainkit", name: "OnchainKit", category: "SDK", url: "https://onchainkit.xyz" },
      { id: "basescan", name: "Basescan", category: "Explorer", url: "https://basescan.org" },
      { id: "grants", name: "Base Builder Grants", category: "Grants", url: "https://base.org/build" },
    ],
  },
  {
    id: "team-hall",
    name: "Base Team Hall",
    category: "Community",
    color: "#4F46E5",
    icon: "🏛️",
    position: { x: 12, y: 38 },
    size: { width: 20, height: 18, height3D: 44 },
    items: [],
  },
  {
    id: "creator-corner",
    name: "Creator Corner",
    category: "Community",
    color: "#EC4899",
    icon: "🎨",
    position: { x: 36, y: 38 },
    size: { width: 20, height: 18, height3D: 36 },
    items: [],
  },
  {
    id: "swap-plaza",
    name: "Swap Plaza",
    category: "DeFi",
    color: "#10B981",
    icon: "🔁",
    position: { x: 60, y: 38 },
    size: { width: 24, height: 18, height3D: 32 },
    items: [
      { symbol: "ETH", name: "Ethereum", address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
      { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
      { symbol: "AERO", name: "Aerodrome", address: "0x940181a94A35A45639E42852D446163d97331a13", decimals: 18 },
      { symbol: "cbBTC", name: "Coinbase Wrapped BTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
    ],
  },
  {
    id: "lend-borrow",
    name: "Lend/Borrow Bank",
    category: "DeFi",
    color: "#F59E0B",
    icon: "🏦",
    position: { x: 12, y: 62 },
    size: { width: 24, height: 20, height3D: 48 },
    items: [
      { protocol: "Moonwell", depositUrl: "https://moonwell.fi/markets/supply/base" },
      { protocol: "Aave", depositUrl: "https://app.aave.com/?marketName=proto_base_v3" },
      { protocol: "Morpho", depositUrl: "https://app.morpho.org/?network=base" },
    ],
  },
  {
    id: "stocks-billboard",
    name: "Stocks Billboard",
    category: "RWA",
    color: "#8B5CF6",
    icon: "📈",
    position: { x: 40, y: 62 },
    size: { width: 22, height: 20, height3D: 54 },
    items: [
      { id: "ondo-usdy", symbol: "USDY", name: "Ondo US Dollar Yield", coingeckoId: "ondo-us-dollar-yield", address: "0x96F6eF951840721AdBF46Ac996b59E0235CB985C" },
      { id: "paxg-rwa", symbol: "PAXG", name: "PAX Gold RWA", coingeckoId: "pax-gold", address: "0x45804880De22913dAFE09f4980848ECE6EcbAF78" },
      { id: "usdc-base", symbol: "USDC", name: "Base Native USDC", coingeckoId: "usd-coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    ],
  },
  {
    id: "stats-tower",
    name: "Stats Tower",
    category: "Analytics",
    color: "#06B6D4",
    icon: "🗼",
    position: { x: 66, y: 62 },
    size: { width: 22, height: 20, height3D: 64 },
    items: [],
  },
];

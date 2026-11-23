import { useCallback, useEffect, useState } from "react";

export interface BaseProtocolItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo: string;
  url: string;
  tvl: number;
}

export interface LendingPoolItem {
  poolId: string;
  project: string;
  symbol: string;
  apyBase: string;
  apyBorrow: string;
  tvlUsd: number;
}

export interface TvlPoint {
  date: number;
  tvl: number;
}

export interface BaseMarketPayload {
  protocols: BaseProtocolItem[];
  lendingPools: LendingPoolItem[];
  tvlHistory: TvlPoint[];
  latestTvl: number;
  prices: Record<string, { usd?: number; usd_24h_change?: number }>;
  updatedAt: string;
}

const CACHE_KEY = "base_city_market_cache_v1";
const CACHE_TTL_MS = 60_000;

export function useBaseMarketData() {
  const [data, setData] = useState<BaseMarketPayload | null>(() => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.payload as BaseMarketPayload;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          setData(cached.payload as BaseMarketPayload);
          setLoading(false);
          setError(null);
          return;
        }
      } catch {
        // ignore cache errors
      }
    }

    setLoading(true);
    setError(null);

    try {
      const [protocolsRes, poolsRes, chainHistRes, cgRes] = await Promise.all([
        fetch("https://api.llama.fi/protocols"),
        fetch("https://yields.llama.fi/pools"),
        fetch("https://api.llama.fi/v2/historicalChainTvl/Base"),
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ondo-us-dollar-yield,pax-gold,usd-coin&vs_currencies=usd&include_24hr_change=true"
        ),
      ]);

      if (!protocolsRes.ok || !poolsRes.ok) {
        throw new Error("DefiLlama API request failed");
      }

      const [protocolsJson, poolsJson, histJson, cgJson] = await Promise.all([
        protocolsRes.json(),
        poolsRes.json(),
        chainHistRes.ok ? chainHistRes.json() : Promise.resolve([]),
        cgRes.ok ? cgRes.json() : Promise.resolve({}),
      ]);

      const baseProtocols: BaseProtocolItem[] = (Array.isArray(protocolsJson) ? protocolsJson : [])
        .filter((p) => Array.isArray(p.chains) && p.chains.includes("Base"))
        .map((p) => {
          const baseTvl =
            typeof p.chainTvls?.Base === "number"
              ? p.chainTvls.Base
              : typeof p.tvl === "number"
              ? p.tvl
              : 0;
          return {
            id: String(p.id || p.slug || p.name),
            name: String(p.name || "Protocol"),
            slug: String(p.slug || ""),
            category: String(p.category || "DeFi"),
            logo: String(p.logo || ""),
            url: String(p.url || "https://base.org"),
            tvl: baseTvl,
          };
        })
        .sort((a, b) => b.tvl - a.tvl);

      const lendingPools: LendingPoolItem[] = (Array.isArray(poolsJson?.data) ? poolsJson.data : [])
        .filter(
          (pool) =>
            pool.chain === "Base" &&
            ["moonwell", "aave-v3", "morpho-blue", "morpho"].some((proj) =>
              String(pool.project || "").toLowerCase().includes(proj)
            )
        )
        .slice(0, 18)
        .map((pool) => ({
          poolId: String(pool.pool),
          project: String(pool.project || ""),
          symbol: String(pool.symbol || ""),
          apyBase: Number(pool.apyBase || 0).toFixed(2),
          apyBorrow: Number(pool.apyBaseBorrow || pool.apyBorrow || 0).toFixed(2),
          tvlUsd: Number(pool.tvlUsd || 0),
        }));

      const historyPoints: TvlPoint[] = (Array.isArray(histJson) ? histJson : []).slice(-30);
      const latestTvl =
        historyPoints.length > 0 ? Number(historyPoints[historyPoints.length - 1].tvl || 0) : 0;

      const payload: BaseMarketPayload = {
        protocols: baseProtocols,
        lendingPools,
        tvlHistory: historyPoints,
        latestTvl,
        prices: cgJson || {},
        updatedAt: new Date().toLocaleTimeString(),
      };

      setData(payload);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), payload }));
      } catch {
        // ignore storage errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(false);
    const timer = setInterval(() => fetchAll(true), CACHE_TTL_MS);
    return () => clearInterval(timer);
  }, [fetchAll]);

  return { data, loading, error, refresh: () => fetchAll(true) };
}

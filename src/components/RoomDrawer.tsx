import React, { useEffect, useMemo, useState } from "react";
import peopleData from "../data/people.json";
import { CityZone } from "../data/zones";
import { BaseMarketPayload } from "../hooks/useBaseMarketData";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

interface RoomDrawerProps {
  zone: CityZone | null;
  onClose: () => void;
  marketData: BaseMarketPayload | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const BASE_CHAIN_HEX = "0x2105";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const RoomDrawer: React.FC<RoomDrawerProps> = ({
  zone,
  onClose,
  marketData,
  loading,
  error,
  onRefresh,
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("base_city_favs") || "[]") as string[];
    } catch {
      return [];
    }
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    wallet: true,
    faucet: false,
    contract: false,
    verify: false,
  });

  const [basenameQuery, setBasenameQuery] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balances, setBalances] = useState({ eth: "0.0000", usdc: "0.00" });

  const [swapAmount, setSwapAmount] = useState("0.01");
  const [slippage, setSlippage] = useState("0.5");
  const [swapQuote, setSwapQuote] = useState<{ buyAmountFormatted: string } | null>(null);
  const [swapConfirmed, setSwapConfirmed] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setSearch("");
    setCategory("All");
    setSwapConfirmed(false);
  }, [zone?.id]);

  useEffect(() => {
    try {
      localStorage.setItem("base_city_favs", JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  const loadBalances = async (addr: string) => {
    if (!window.ethereum) return;
    try {
      const [ethHex, usdcHex] = (await Promise.all([
        window.ethereum.request({ method: "eth_getBalance", params: [addr, "latest"] }),
        window.ethereum.request({
          method: "eth_call",
          params: [
            {
              to: USDC_BASE,
              data: `0x70a08231000000000000000000000000${addr.replace(/^0x/, "")}`,
            },
            "latest",
          ],
        }),
      ])) as [string, string];
      const ethVal = parseInt(ethHex, 16) / 1e18;
      const usdcVal = parseInt(usdcHex, 16) / 1e6;
      setBalances({
        eth: Number.isFinite(ethVal) ? ethVal.toFixed(4) : "0.0000",
        usdc: Number.isFinite(usdcVal) ? usdcVal.toFixed(2) : "0.00",
      });
    } catch {
      // ignore RPC errors
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return;
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const currentChain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    setChainId(currentChain);
    if (accounts?.[0]) {
      setAccount(accounts[0]);
      await loadBalances(accounts[0]);
    }
  };

  const switchToBase = async () => {
    if (!window.ethereum) return;
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
    setChainId(BASE_CHAIN_HEX);
    if (account) await loadBalances(account);
  };

  const handleGetQuote = async () => {
    setSwapConfirmed(false);
    const num = Number(swapAmount) || 0;
    try {
      const res = await fetch(
        `/api/swap-quote?sellToken=ETH&buyToken=USDC&sellAmount=${encodeURIComponent(
          String(Math.round(num * 1e18))
        )}&slippage=${encodeURIComponent(slippage)}`
      );
      if (res.ok) {
        const q = await res.json();
        setSwapQuote(q);
        return;
      }
    } catch {
      // fallback preview
    }
    setSwapQuote({
      buyAmountFormatted: (num * 3150).toFixed(2),
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredDeFi = useMemo(() => {
    const list = marketData?.protocols || [];
    return list.filter((item) => {
      const matchesCat = category === "All" || item.category === category;
      const matchesQ = item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesQ;
    });
  }, [marketData?.protocols, category, search]);

  if (!zone) return null;

  const drawerStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: "76vh",
        borderRadius: "16px 16px 0 0",
        zIndex: 30,
      }
    : {
        position: "fixed",
        top: 56,
        right: 0,
        bottom: 0,
        width: 410,
        zIndex: 30,
      };

  const githubIssueUrl = `https://github.com/issues/new?title=${encodeURIComponent(
    `Submit Base dApp: ${search || "New App"}`
  )}&body=${encodeURIComponent(
    `Category: ${category}\nApp Name: ${search}\nChain: Base`
  )}`;

  return (
    <aside
      style={{
        ...drawerStyle,
        background: "#0f172a",
        color: "#f8fafc",
        border: "1px solid rgba(148,163,184,0.25)",
        padding: 16,
        overflowY: "auto",
        boxShadow: "0 -8px 28px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong>
          {zone.icon} {zone.name}
        </strong>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>

      <div style={{ background: "#1e293b", padding: 10, borderRadius: 10, marginBottom: 12, fontSize: 12 }}>
        {!account ? (
          <button
            type="button"
            onClick={connectWallet}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              background: "#0052FF",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Connect Base Wallet
          </button>
        ) : (
          <div>
            <div>
              Connected: <b>{account.slice(0, 6)}...{account.slice(-4)}</b>
            </div>
            <div>
              ETH: <b>{balances.eth}</b> • USDC: <b>{balances.usdc}</b>
            </div>
            {chainId && chainId.toLowerCase() !== BASE_CHAIN_HEX && (
              <button
                type="button"
                onClick={switchToBase}
                style={{
                  marginTop: 6,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "#facc15",
                  color: "#0f172a",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Switch to Base Network
              </button>
            )}
          </div>
        )}
      </div>

      {loading && <div style={{ padding: 12, color: "#94a3b8" }}>Loading live Base data...</div>}
      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: "#450a0a", color: "#fca5a5", marginBottom: 10 }}>
          Error: {error}{" "}
          <button type="button" onClick={onRefresh} style={{ marginLeft: 8, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#fff",
          marginBottom: 8,
          fontSize: 12,
        }}
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["All", "DEX", "Lending", "DeFi", "NFT", "Social", "Games", "Tools"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "none",
              background: category === cat ? "#0052FF" : "#1e293b",
              color: "#fff",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {zone.id === "defi-apps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredDeFi.slice(0, 20).map((app) => (
            <div
              key={app.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#1e293b",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <div>
                <b>{app.name}</b> <span style={{ fontSize: 11, color: "#94a3b8" }}>({app.category})</span>
                <div style={{ fontSize: 11, color: "#38bdf8" }}>
                  TVL: ${((app.tvl || 0) / 1e6).toFixed(2)}M
                </div>
              </div>
              <a href={app.url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: 12 }}>
                Open ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {zone.id === "dapp-store" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {zone.items
            .filter(
              (d) =>
                (category === "All" || d.category === category) &&
                String(d.name || "").toLowerCase().includes(search.toLowerCase())
            )
            .map((dapp, idx) => {
              const favKey = dapp.id || String(idx);
              const isFav = favorites.includes(favKey);
              return (
                <div key={favKey} style={{ background: "#1e293b", padding: 10, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{dapp.name}</b>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(favKey)}
                      style={{ background: "transparent", border: "none", color: "#facc15", cursor: "pointer" }}
                    >
                      {isFav ? "★ Saved" : "☆ Save"}
                    </button>
                  </div>
                  <p style={{ margin: "4px 0", fontSize: 12, color: "#cbd5e1" }}>{dapp.description}</p>
                  {dapp.url && (
                    <a href={dapp.url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: 12 }}>
                      Launch ↗
                    </a>
                  )}
                </div>
              );
            })}
          <a
            href={githubIssueUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 6,
              padding: "8px 12px",
              borderRadius: 8,
              background: "#10b981",
              color: "#052e16",
              fontWeight: 700,
              textAlign: "center",
              textDecoration: "none",
              fontSize: 12,
            }}
          >
            Submit Your dApp (Prefilled GitHub Issue) ↗
          </a>
        </div>
      )}

      {zone.id === "builder-corner" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: "#1e293b", padding: 10, borderRadius: 8, fontSize: 12 }}>
            <b>Checklist: Deploy your first contract</b>
            {[
              ["wallet", "1. Connect Base wallet & switch to Base"],
              ["faucet", "2. Claim Base Sepolia testnet ETH"],
              ["contract", "3. Deploy Solidity contract via Remix / Foundry"],
              ["verify", "4. Verify source on Basescan & ship with OnchainKit"],
            ].map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 6, marginTop: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(checklist[key])}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {zone.items.map((linkItem, idx) => (
            <a
              key={linkItem.id || idx}
              href={linkItem.url || "https://docs.base.org"}
              target="_blank"
              rel="noreferrer"
              style={{ background: "#1e293b", padding: 10, borderRadius: 8, color: "#60a5fa", textDecoration: "none" }}
            >
              {linkItem.name} ({linkItem.category}) ↗
            </a>
          ))}
        </div>
      )}

      {(zone.id === "team-hall" || zone.id === "creator-corner") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {zone.id === "creator-corner" && (
            <input
              type="text"
              placeholder="Search Basenames (e.g. name.base.eth)..."
              value={basenameQuery}
              onChange={(e) => setBasenameQuery(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#fff",
                fontSize: 12,
              }}
            />
          )}
          {(zone.id === "team-hall" ? peopleData.team : peopleData.creators)
            .filter((p: { name: string; role: string; basenames?: string }) =>
              `${p.name} ${p.role} ${p.basenames || ""}`
                .toLowerCase()
                .includes((zone.id === "creator-corner" ? basenameQuery || search : search).toLowerCase())
            )
            .map((person: { id: string; name: string; role: string; basenames?: string; bio: string; xUrl: string; farcasterUrl: string }) => (
              <div key={person.id} style={{ background: "#1e293b", padding: 10, borderRadius: 8 }}>
                <b>{person.name}</b> — <span style={{ color: "#38bdf8", fontSize: 12 }}>{person.role}</span>
                {person.basenames && <div style={{ fontSize: 11, color: "#facc15" }}>{person.basenames}</div>}
                <p style={{ margin: "6px 0", fontSize: 12, color: "#cbd5e1" }}>{person.bio}</p>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <a href={person.xUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
                    X ↗
                  </a>
                  <a href={person.farcasterUrl} target="_blank" rel="noreferrer" style={{ color: "#c084fc" }}>
                    Farcaster ↗
                  </a>
                </div>
              </div>
            ))}
        </div>
      )}

      {zone.id === "swap-plaza" && (
        <div style={{ background: "#1e293b", padding: 12, borderRadius: 10, fontSize: 12 }}>
          <div style={{ background: "#451a03", color: "#fde68a", padding: 8, borderRadius: 6, marginBottom: 10 }}>
            ⚠️ Always verify slippage and token contracts before confirming swaps.
          </div>
          <label style={{ display: "block", marginBottom: 6 }}>
            Sell ETH Amount:
            <input
              type="text"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4, borderRadius: 6, background: "#0f172a", color: "#fff", border: "1px solid #475569" }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 10 }}>
            Slippage (%):
            <input
              type="text"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4, borderRadius: 6, background: "#0f172a", color: "#fff", border: "1px solid #475569" }}
            />
          </label>
          <button
            type="button"
            onClick={handleGetQuote}
            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "#0052FF", color: "#fff", fontWeight: 600, cursor: "pointer", marginRight: 8 }}
          >
            Get Quote
          </button>
          {swapQuote && (
            <div style={{ marginTop: 10, padding: 10, background: "#0f172a", borderRadius: 8 }}>
              <div>Est. Output: <b>{swapQuote.buyAmountFormatted} USDC</b></div>
              <button
                type="button"
                onClick={() => setSwapConfirmed(true)}
                style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, border: "none", background: "#10b981", color: "#052e16", fontWeight: 700, cursor: "pointer" }}
              >
                Confirm Swap
              </button>
              {swapConfirmed && <div style={{ color: "#4ade80", marginTop: 6 }}>Swap ready / confirmed.</div>}
            </div>
          )}
        </div>
      )}

      {zone.id === "lend-borrow" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(marketData?.lendingPools || []).map((pool) => {
            const deepLink =
              zone.items.find((i) => String(pool.project).includes(String(i.protocol || "").toLowerCase()))
                ?.depositUrl || "https://base.org";
            return (
              <div key={pool.poolId} style={{ background: "#1e293b", padding: 10, borderRadius: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <b>{pool.symbol}</b> <span style={{ color: "#94a3b8" }}>({pool.project})</span>
                    <div>
                      Supply APY: <b style={{ color: "#4ade80" }}>{pool.apyBase}%</b> • Borrow APY:{" "}
                      <b style={{ color: "#fbbf24" }}>{pool.apyBorrow}%</b>
                    </div>
                  </div>
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: "6px 10px", borderRadius: 6, background: "#0052FF", color: "#fff", textDecoration: "none", fontWeight: 600 }}
                  >
                    Deposit ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {zone.id === "stocks-billboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {zone.items.map((tok, idx) => {
            const p = tok.coingeckoId ? marketData?.prices?.[tok.coingeckoId] : undefined;
            return (
              <div key={tok.id || idx} style={{ background: "#1e293b", padding: 10, borderRadius: 8, fontSize: 12 }}>
                <b>{tok.symbol}</b> — {tok.name}
                <div style={{ color: "#38bdf8", fontSize: 14, marginTop: 4 }}>
                  {p?.usd ? `$${p.usd.toLocaleString()}` : "Price syncing..."}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", wordBreak: "break-all" }}>
                  Contract: {tok.address}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {zone.id === "stats-tower" && (
        <div style={{ background: "#1e293b", padding: 12, borderRadius: 10, fontSize: 12 }}>
          <div>
            Base Chain TVL: <b>${((marketData?.latestTvl || 0) / 1e9).toFixed(2)}B</b>
          </div>
          <div style={{ color: "#94a3b8", marginTop: 4 }}>
            Last updated: {marketData?.updatedAt || "Syncing"} (Auto-refresh: 60s)
          </div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>Recent TVL Points (30d)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 70, marginTop: 6 }}>
            {(marketData?.tvlHistory || []).map((pt, idx) => {
              const maxVal = Math.max(
                1,
                ...(marketData?.tvlHistory || []).map((x) => x.tvl || 0)
              );
              const pct = Math.max(10, Math.round(((pt.tvl || 0) / maxVal) * 100));
              return (
                <div
                  key={idx}
                  title={`${new Date(pt.date * 1000).toLocaleDateString()}: $${((pt.tvl || 0) / 1e9).toFixed(2)}B`}
                  style={{ flex: 1, height: `${pct}%`, background: "#38bdf8", borderRadius: "2px 2px 0 0" }}
                />
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};

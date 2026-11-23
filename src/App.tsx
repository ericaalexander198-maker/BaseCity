import React, { useEffect, useState } from "react";
import { AvatarConfig, AvatarCustomizer } from "./components/AvatarCustomizer";
import { BaseCityCanvas } from "./components/BaseCityCanvas";
import { CityManagerTool } from "./components/CityManagerTool";
import {
  CityMember,
  CitySector,
  INITIAL_MEMBERS,
  INITIAL_SECTORS,
} from "./data/sectors";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const BASE_CHAIN_ID_HEX = "0x2105"; // 8453 (Base Mainnet)
const STORAGE_SECTORS_KEY = "base_city_sectors_v1";
const STORAGE_MEMBERS_KEY = "base_city_members_v1";

export function App() {
  const [avatar, setAvatar] = useState<AvatarConfig>({
    name: "Base Citizen",
    bodyWidth: 1.0,
    bodyHeight: 1.0,
    headScale: 1.0,
    outfitColor: "#0052FF",
    skinTone: "#E5B893",
    visor: true,
  });

  const [sectors, setSectors] = useState<CitySector[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECTORS_KEY);
      return saved ? (JSON.parse(saved) as CitySector[]) : INITIAL_SECTORS;
    } catch {
      return INITIAL_SECTORS;
    }
  });

  const [members, setMembers] = useState<CityMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MEMBERS_KEY);
      return saved ? (JSON.parse(saved) as CityMember[]) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SECTORS_KEY, JSON.stringify(sectors));
    } catch {
      // ignore storage quota errors
    }
  }, [sectors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEMBERS_KEY, JSON.stringify(members));
    } catch {
      // ignore storage quota errors
    }
  }, [members]);

  const [leftPanel, setLeftPanel] = useState<"avatar" | "add">("avatar");
  const [selectedSector, setSelectedSector] = useState<CitySector | null>(null);
  const [selectedMember, setSelectedMember] = useState<CityMember | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<string>("");

  const connectBaseWallet = async () => {
    if (!window.ethereum) {
      setWalletStatus("No browser wallet found (Rabby/Coinbase/MetaMask)");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
      } catch {
        // User may cancel network switch
      }

      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        setWalletStatus("Connected on Base");
      }
    } catch {
      setWalletStatus("Wallet connection cancelled");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      <header
        style={{
          height: 54,
          padding: "0 16px",
          background: "#0b1120",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "#0052FF",
              display: "inline-block",
            }}
          />
          <strong style={{ fontSize: 16 }}>BASE CITY</strong>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {sectors.length} dApps/Spots • {members.length} Citizens
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {walletStatus && (
            <span style={{ fontSize: 12, color: "#93c5fd" }}>{walletStatus}</span>
          )}
          <button
            type="button"
            onClick={connectBaseWallet}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              border: "none",
              background: "#0052FF",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Base Wallet"}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            maxHeight: "calc(100vh - 76px)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setLeftPanel("avatar")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12,
                background: leftPanel === "avatar" ? "#2563eb" : "#1e293b",
                color: "#fff",
              }}
            >
              My Shape
            </button>
            <button
              type="button"
              onClick={() => setLeftPanel("add")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12,
                background: leftPanel === "add" ? "#2563eb" : "#1e293b",
                color: "#fff",
              }}
            >
              Add dApp / Citizen
            </button>
          </div>

          {leftPanel === "avatar" ? (
            <AvatarCustomizer avatar={avatar} onChange={setAvatar} />
          ) : (
            <CityManagerTool
              sectors={sectors}
              members={members}
              onAddSector={(sec) => setSectors((prev) => [...prev, sec])}
              onAddMember={(mem) => setMembers((prev) => [...prev, mem])}
            />
          )}
        </div>

        <div style={{ flex: 1, height: "100%" }}>
          <BaseCityCanvas
            avatar={avatar}
            sectors={sectors}
            members={members}
            selectedSector={selectedSector}
            selectedMember={selectedMember}
            onSelectSector={setSelectedSector}
            onSelectMember={setSelectedMember}
          />
        </div>

        {selectedSector && (
          <aside
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              width: 280,
              background: "rgba(15, 23, 42, 0.94)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 14,
              padding: 16,
              color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>
                {selectedSector.zone.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSector(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <h3 style={{ margin: "6px 0 4px", fontSize: 17 }}>
              [{selectedSector.logoText}] {selectedSector.name}
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#e2e8f0" }}>
              {selectedSector.description}
            </p>
            <a
              href={selectedSector.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "7px 12px",
                borderRadius: 8,
                background: "#0052FF",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Open dApp Link ↗
            </a>
          </aside>
        )}

        {selectedMember && (
          <aside
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              width: 280,
              background: "rgba(15, 23, 42, 0.94)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: 14,
              padding: 16,
              color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#fde047", fontWeight: 700 }}>
                {selectedMember.role.toUpperCase()} • {selectedMember.handle}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <h3 style={{ margin: "6px 0 4px", fontSize: 17 }}>{selectedMember.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#e2e8f0" }}>
              {selectedMember.bio}
            </p>
            <a
              href={selectedMember.link}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "7px 12px",
                borderRadius: 8,
                background: "#10b981",
                color: "#052e16",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Visit Profile ↗
            </a>
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;

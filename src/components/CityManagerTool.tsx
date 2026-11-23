import React, { useState } from "react";
import { CityMember, CitySector, CityZone } from "../data/sectors";

interface CityManagerToolProps {
  sectors: CitySector[];
  members: CityMember[];
  onAddSector: (sector: CitySector) => void;
  onAddMember: (member: CityMember) => void;
}

const ZONES: CityZone[] = [
  "Builders & Finance",
  "DeFi & Apps",
  "Creator Stage",
  "Beach & Lounge",
];

const COLORS = ["#0052FF", "#7C3AED", "#EC4899", "#0891B2", "#10B981", "#F59E0B"];

// Spacious preset stall slots so stalls never overlap each other
const STALL_SLOTS = [
  { x: 2, y: 2 },
  { x: 8, y: 2 },
  { x: 14, y: 2 },
  { x: 5, y: 10 },
  { x: 2, y: 6 },
  { x: 14, y: 6 },
  { x: 11, y: 10 },
  { x: 16, y: 10 },
  { x: 8, y: 6 },
  { x: 17, y: 2 },
  { x: 17, y: 6 },
  { x: 2, y: 10 },
];

export const CityManagerTool: React.FC<CityManagerToolProps> = ({
  sectors,
  members,
  onAddSector,
  onAddMember,
}) => {
  const [tab, setTab] = useState<"dapp" | "member">("dapp");

  const [dappName, setDappName] = useState("");
  const [logoText, setLogoText] = useState("A");
  const [logoUrl, setLogoUrl] = useState("");
  const [zone, setZone] = useState<CityZone>("DeFi & Apps");
  const [dappUrl, setDappUrl] = useState("https://");
  const [dappDesc, setDappDesc] = useState("");
  const [dappColor, setDappColor] = useState("#0052FF");

  const [memberName, setMemberName] = useState("");
  const [handle, setHandle] = useState("@");
  const [role, setRole] = useState<"Builder" | "Creator" | "Member">("Builder");
  const [memberLink, setMemberLink] = useState("https://x.com/");
  const [bio, setBio] = useState("");
  const [bodyWidth, setBodyWidth] = useState(1.0);
  const [outfitColor, setOutfitColor] = useState("#10B981");
  const [visor, setVisor] = useState(true);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const findOpenSpot = () => {
    for (const slot of STALL_SLOTS) {
      const taken = sectors.some(
        (s) => Math.hypot(s.x - slot.x, s.y - slot.y) < 3.6
      );
      if (!taken) return slot;
    }
    const idx = sectors.length;
    return { x: 2 + ((idx * 5) % 16), y: 2 + ((idx * 4) % 10) };
  };

  const handleCreateDapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dappName.trim()) return;

    const spot = findOpenSpot();

    onAddSector({
      id: `dapp-${Date.now()}`,
      name: dappName.trim(),
      logoText: (logoText.trim() || dappName.trim()[0] || "B").slice(0, 2).toUpperCase(),
      logoUrl: logoUrl.trim() || undefined,
      zone,
      roleLabel: `${zone} Stall`,
      description:
        dappDesc.trim() || `Official stall for ${dappName.trim()} in Base City.`,
      url: dappUrl.trim() || "https://base.org",
      x: spot.x,
      y: spot.y,
      width: 2.5,
      height: 2,
      color: dappColor,
      accent: "#e0f2fe",
    });

    setDappName("");
    setLogoText("A");
    setLogoUrl("");
    setDappUrl("https://");
    setDappDesc("");
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    const idx = members.length;
    const x = 4 + ((idx * 3) % 13);
    const y = 7.5 + ((idx * 1.3) % 2);

    onAddMember({
      id: `member-${Date.now()}`,
      name: memberName.trim(),
      handle: handle.trim() || "@base_citizen",
      role,
      link: memberLink.trim() || "https://x.com",
      bio: bio.trim() || `${role} in Base City.`,
      x,
      y,
      bodyWidth,
      bodyHeight: 1.0,
      outfitColor,
      skinTone: "#E5B893",
      visor,
    });

    setMemberName("");
    setHandle("@");
    setBio("");
    setMemberLink("https://x.com/");
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.94)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: 14,
        padding: 14,
        width: 280,
        color: "#f8fafc",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#38bdf8" }}>
        Add dApp Stall or Citizen
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setTab("dapp")}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: tab === "dapp" ? "#0052FF" : "#1e293b",
            color: "#fff",
          }}
        >
          + dApp Stall
        </button>
        <button
          type="button"
          onClick={() => setTab("member")}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: tab === "member" ? "#0052FF" : "#1e293b",
            color: "#fff",
          }}
        >
          + Builder/Creator
        </button>
      </div>

      {tab === "dapp" ? (
        <form onSubmit={handleCreateDapp} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="dApp Name (e.g. Aerodrome)"
            value={dappName}
            onChange={(e) => setDappName(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Logo Image URL (https://...png)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <label style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
            <span>Or upload logo:</span>
            <input type="file" accept="image/*" onChange={handleLogoFile} style={{ fontSize: 11, maxWidth: 165 }} />
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              placeholder="Badge (2 chars)"
              maxLength={2}
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              style={{ width: 78, padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            />
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value as CityZone)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="dApp / Website Link"
            value={dappUrl}
            onChange={(e) => setDappUrl(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Popup greeting / short info"
            value={dappDesc}
            onChange={(e) => setDappDesc(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#94a3b8" }}>Stall Color:</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDappColor(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: c,
                  border: dappColor === c ? "2px solid #fff" : "1px solid #334155",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            style={{ padding: 7, borderRadius: 8, border: "none", background: "#10b981", color: "#052e16", fontWeight: 700, cursor: "pointer" }}
          >
            Build Stall in Base City
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreateMember} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="Name (Builder / Creator / Member)"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              placeholder="@handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "Builder" | "Creator" | "Member")}
              style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
            >
              <option value="Builder">Builder</option>
              <option value="Creator">Creator</option>
              <option value="Member">Member</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="X / Farcaster / Profile Link"
            value={memberLink}
            onChange={(e) => setMemberLink(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <input
            type="text"
            placeholder="Bio / What they build or create"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
              <span>Avatar Build</span>
              <span>{Math.round(bodyWidth * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.4}
              step={0.05}
              value={bodyWidth}
              onChange={(e) => setBodyWidth(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#94a3b8" }}>Avatar:</span>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setOutfitColor(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: c,
                  border: outfitColor === c ? "2px solid #fff" : "1px solid #334155",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={visor} onChange={(e) => setVisor(e.target.checked)} />
            <span>Cyber Visor</span>
          </label>
          <button
            type="submit"
            style={{ padding: 7, borderRadius: 8, border: "none", background: "#0052FF", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            Add Avatar to City
          </button>
        </form>
      )}
    </div>
  );
};

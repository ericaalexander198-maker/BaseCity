import React, { useState } from "react";
import { CityMember, CitySector, CityZone } from "../data/sectors";

export type DecorKind =
  | "pine_tree"
  | "palm_tree"
  | "bench"
  | "lamp"
  | "planter"
  | "fountain"
  | "umbrella";

export interface CityDecorItem {
  id: string;
  kind: DecorKind;
  label: string;
  x: number;
  y: number;
}

interface CityManagerToolProps {
  sectors: CitySector[];
  members: CityMember[];
  decorItems: CityDecorItem[];
  placingDecorKind: DecorKind | null;
  onSelectPlacingDecorKind: (kind: DecorKind | null) => void;
  onAddSector: (sector: CitySector) => void;
  onAddMember: (member: CityMember) => void;
  onAddDecor: (item: CityDecorItem) => void;
  onClearCustomDecor: () => void;
}

const ZONES: CityZone[] = [
  "Builders & Finance",
  "DeFi & Apps",
  "Creator Stage",
  "Beach & Lounge",
];

const COLORS = ["#0052FF", "#7C3AED", "#EC4899", "#0891B2", "#10B981", "#F59E0B"];

const DECOR_OPTIONS: { kind: DecorKind; label: string; category: "Tree" | "Decor" }[] = [
  { kind: "pine_tree", label: "Pine Tree", category: "Tree" },
  { kind: "palm_tree", label: "Palm Tree", category: "Tree" },
  { kind: "bench", label: "Park Bench", category: "Decor" },
  { kind: "lamp", label: "Street Lamp", category: "Decor" },
  { kind: "planter", label: "Flower Planter", category: "Decor" },
  { kind: "fountain", label: "Plaza Fountain", category: "Decor" },
  { kind: "umbrella", label: "Creator Umbrella", category: "Decor" },
];

const CORNER_SLOTS = [
  { x: 0.8, y: 0.8 },
  { x: 18.2, y: 0.8 },
  { x: 0.8, y: 6.2 },
  { x: 18.2, y: 11.4 },
  { x: 0.8, y: 11.4 },
  { x: 18.2, y: 6.2 },
  { x: 6.5, y: 0.8 },
  { x: 12.5, y: 0.8 },
  { x: 6.5, y: 11.4 },
  { x: 12.5, y: 11.4 },
];

export const CityManagerTool: React.FC<CityManagerToolProps> = ({
  sectors,
  members,
  decorItems,
  placingDecorKind,
  onSelectPlacingDecorKind,
  onAddSector,
  onAddMember,
  onAddDecor,
  onClearCustomDecor,
}) => {
  const [tab, setTab] = useState<"dapp" | "member" | "decor">("dapp");

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

  const [selectedDecorKind, setSelectedDecorKind] = useState<DecorKind>("pine_tree");
  const [customLabel, setCustomLabel] = useState("");

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

  const findCornerSpot = () => {
    for (const slot of CORNER_SLOTS) {
      const taken = sectors.some(
        (s) => Math.hypot(s.x - slot.x, s.y - slot.y) < 4.2
      );
      if (!taken) return slot;
    }
    const idx = sectors.length;
    return {
      x: idx % 2 === 0 ? 0.8 : 18.2,
      y: idx % 4 < 2 ? 0.8 : 11.4,
    };
  };

  const handleCreateDapp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dappName.trim()) return;

    const spot = findCornerSpot();

    onAddSector({
      id: `dapp-${Date.now()}`,
      name: dappName.trim(),
      logoText: (logoText.trim() || dappName.trim()[0] || "B").slice(0, 2).toUpperCase(),
      logoUrl: logoUrl.trim() || undefined,
      zone,
      roleLabel: `${zone} Store`,
      description:
        dappDesc.trim() || `Corner store for ${dappName.trim()} in Base City.`,
      url: dappUrl.trim() || "https://base.org",
      x: spot.x,
      y: spot.y,
      width: 2.4,
      height: 2.0,
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
    const x = 6.5 + ((idx * 2.5) % 8);
    const y = 5.5 + ((idx * 1.4) % 3);

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

  const handleQuickDropDecor = () => {
    const meta = DECOR_OPTIONS.find((d) => d.kind === selectedDecorKind)!;
    const idx = decorItems.length;
    const x = 4.5 + ((idx * 3.1) % 24);
    const y = 3.5 + ((idx * 2.3) % 14);
    onAddDecor({
      id: `decor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: selectedDecorKind,
      label: customLabel.trim() || meta.label,
      x,
      y,
    });
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.94)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: 14,
        padding: 14,
        width: 288,
        color: "#f8fafc",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#38bdf8" }}>
        Base City Builder Panel
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => {
            setTab("dapp");
            onSelectPlacingDecorKind(null);
          }}
          style={{
            flex: 1,
            padding: "6px 6px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: tab === "dapp" ? "#0052FF" : "#1e293b",
            color: "#fff",
          }}
        >
          + Store
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("member");
            onSelectPlacingDecorKind(null);
          }}
          style={{
            flex: 1,
            padding: "6px 6px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: tab === "member" ? "#0052FF" : "#1e293b",
            color: "#fff",
          }}
        >
          + Citizen
        </button>
        <button
          type="button"
          onClick={() => setTab("decor")}
          style={{
            flex: 1,
            padding: "6px 6px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            background: tab === "decor" ? "#10b981" : "#1e293b",
            color: tab === "decor" ? "#052e16" : "#fff",
          }}
        >
          + Trees/Decor
        </button>
      </div>

      {tab === "dapp" && (
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
            <input type="file" accept="image/*" onChange={handleLogoFile} style={{ fontSize: 11, maxWidth: 170 }} />
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              placeholder="Badge"
              maxLength={2}
              value={logoText}
              onChange={(e) => setLogoText(e.target.value)}
              style={{ width: 68, padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
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
            <span style={{ color: "#94a3b8" }}>Store Color:</span>
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
            Place Corner Store
          </button>
        </form>
      )}

      {tab === "member" && (
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

      {tab === "decor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>
            Pick a tree or decor item, then click on the map to place or use Auto Drop:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {DECOR_OPTIONS.map((opt) => {
              const active = selectedDecorKind === opt.kind;
              return (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => setSelectedDecorKind(opt.kind)}
                  style={{
                    padding: "6px 7px",
                    borderRadius: 7,
                    border: active ? "1.5px solid #38bdf8" : "1px solid #334155",
                    background: active ? "#1e3a8a" : "#0f172a",
                    color: "#f8fafc",
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Optional tag/note (e.g. Chill Spot)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#fff" }}
          />

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() =>
                onSelectPlacingDecorKind(
                  placingDecorKind === selectedDecorKind ? null : selectedDecorKind
                )
              }
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 8,
                border: "none",
                background: placingDecorKind === selectedDecorKind ? "#facc15" : "#0052FF",
                color: placingDecorKind === selectedDecorKind ? "#0f172a" : "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {placingDecorKind === selectedDecorKind ? "Click Map Active ✓" : "Click-to-Place"}
            </button>
            <button
              type="button"
              onClick={handleQuickDropDecor}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "none",
                background: "#10b981",
                color: "#052e16",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Drop
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#94a3b8" }}>
            <span>Placed items: {decorItems.length}</span>
            <button
              type="button"
              onClick={onClearCustomDecor}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid #475569",
                background: "transparent",
                color: "#fca5a5",
                cursor: "pointer",
              }}
            >
              Reset Decor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

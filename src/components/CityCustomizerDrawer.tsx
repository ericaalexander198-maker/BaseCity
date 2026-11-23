import React, { useState } from "react";
import { CityMember, CitySector } from "../data/sectors";
import { CityDecorItem } from "./CityManagerTool";

export interface CityThemeConfig {
  grassPrimary: string;
  grassSecondary: string;
  streetPrimary: string;
  streetSecondary: string;
  wallExtrudeHeight: number;
  showGrid: boolean;
  showRoomDoors: boolean;
}

interface CityCustomizerDrawerProps {
  theme: CityThemeConfig;
  onChangeTheme: (next: CityThemeConfig) => void;
  sectors: CitySector[];
  onUpdateSector: (id: string, patch: Partial<CitySector>) => void;
  onDeleteSector: (id: string) => void;
  members: CityMember[];
  onUpdateMember: (id: string, patch: Partial<CityMember>) => void;
  onDeleteMember: (id: string) => void;
  decorItems: CityDecorItem[];
  onUpdateDecor: (id: string, patch: Partial<CityDecorItem>) => void;
  onDeleteDecor: (id: string) => void;
  onResetAllCityData: () => void;
}

export const CityCustomizerDrawer: React.FC<CityCustomizerDrawerProps> = ({
  theme,
  onChangeTheme,
  sectors,
  onUpdateSector,
  onDeleteSector,
  members,
  onUpdateMember,
  onDeleteMember,
  decorItems,
  onUpdateDecor,
  onDeleteDecor,
  onResetAllCityData,
}) => {
  const [tab, setTab] = useState<"theme" | "dapps" | "citizens" | "decor">("theme");

  return (
    <div
      style={{
        width: 310,
        background: "rgba(15, 23, 42, 0.96)",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        borderRadius: 12,
        padding: 12,
        color: "#f8fafc",
        fontSize: 12,
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.45)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: "#38bdf8" }}>FULL CITY CUSTOMIZER</strong>
        <button
          type="button"
          onClick={onResetAllCityData}
          style={{
            padding: "3px 7px",
            borderRadius: 6,
            border: "1px solid #7f1d1d",
            background: "#450a0a",
            color: "#fca5a5",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reset City
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 10 }}>
        {(["theme", "dapps", "citizens", "decor"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "5px 4px",
              borderRadius: 6,
              border: "none",
              background: tab === t ? "#0052FF" : "#1e293b",
              color: "#fff",
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "theme" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>Outer Turf A</span>
              <input
                type="color"
                value={theme.grassPrimary}
                onChange={(e) => onChangeTheme({ ...theme, grassPrimary: e.target.value })}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>Outer Turf B</span>
              <input
                type="color"
                value={theme.grassSecondary}
                onChange={(e) => onChangeTheme({ ...theme, grassSecondary: e.target.value })}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>Avenue Tile A</span>
              <input
                type="color"
                value={theme.streetPrimary}
                onChange={(e) => onChangeTheme({ ...theme, streetPrimary: e.target.value })}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#94a3b8", fontSize: 10 }}>Avenue Tile B</span>
              <input
                type="color"
                value={theme.streetSecondary}
                onChange={(e) => onChangeTheme({ ...theme, streetSecondary: e.target.value })}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: "#cbd5e1", fontSize: 11 }}>
              3D Wall Height: <b>{theme.wallExtrudeHeight}px</b>
            </span>
            <input
              type="range"
              min={4}
              max={24}
              value={theme.wallExtrudeHeight}
              onChange={(e) =>
                onChangeTheme({ ...theme, wallExtrudeHeight: Number(e.target.value) })
              }
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={theme.showGrid}
              onChange={(e) => onChangeTheme({ ...theme, showGrid: e.target.checked })}
            />
            <span>Show City Grid Lines</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={theme.showRoomDoors}
              onChange={(e) => onChangeTheme({ ...theme, showRoomDoors: e.target.checked })}
            />
            <span>Highlight Room Door Thresholds</span>
          </label>
        </div>
      )}

      {tab === "dapps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
          {sectors.map((sec) => (
            <div
              key={sec.id}
              style={{
                background: "#1e293b",
                borderRadius: 8,
                padding: 8,
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <input
                  type="text"
                  value={sec.name}
                  onChange={(e) => onUpdateSector(sec.id, { name: e.target.value })}
                  style={{
                    flex: 1,
                    padding: "4px 6px",
                    borderRadius: 5,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 11,
                  }}
                />
                <input
                  type="color"
                  value={sec.color}
                  onChange={(e) => onUpdateSector(sec.id, { color: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => onDeleteSector(sec.id)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 5,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <label style={{ fontSize: 10, color: "#94a3b8" }}>
                  X ({sec.x.toFixed(1)})
                  <input
                    type="range"
                    min={1}
                    max={56}
                    step={0.5}
                    value={sec.x}
                    onChange={(e) => onUpdateSector(sec.id, { x: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ fontSize: 10, color: "#94a3b8" }}>
                  Y ({sec.y.toFixed(1)})
                  <input
                    type="range"
                    min={1}
                    max={34}
                    step={0.5}
                    value={sec.y}
                    onChange={(e) => onUpdateSector(sec.id, { y: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "citizens" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
          {members.map((m) => (
            <div
              key={m.id}
              style={{
                background: "#1e293b",
                borderRadius: 8,
                padding: 8,
                border: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => onUpdateMember(m.id, { name: e.target.value })}
                  style={{
                    flex: 1,
                    padding: "4px 6px",
                    borderRadius: 5,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: 11,
                  }}
                />
                <input
                  type="color"
                  value={m.outfitColor}
                  onChange={(e) => onUpdateMember(m.id, { outfitColor: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => onDeleteMember(m.id)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 5,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <label style={{ fontSize: 10, color: "#94a3b8" }}>
                  X ({m.x.toFixed(1)})
                  <input
                    type="range"
                    min={1}
                    max={58}
                    step={0.5}
                    value={m.x}
                    onChange={(e) => onUpdateMember(m.id, { x: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </label>
                <label style={{ fontSize: 10, color: "#94a3b8" }}>
                  Y ({m.y.toFixed(1)})
                  <input
                    type="range"
                    min={1}
                    max={36}
                    step={0.5}
                    value={m.y}
                    onChange={(e) => onUpdateMember(m.id, { y: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "decor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
          {decorItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                background: "#1e293b",
                borderRadius: 7,
                padding: "6px 8px",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {item.kind.replace("_", " ")} ({item.x.toFixed(1)}, {item.y.toFixed(1)})
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onUpdateDecor(item.id, { x: item.x + 0.5 })}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid #475569",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  +X
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDecor(item.id)}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

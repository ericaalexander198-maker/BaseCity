import React, { useEffect, useState } from "react";
import { IsometricMap } from "./components/IsometricMap";
import { RoomDrawer } from "./components/RoomDrawer";
import { CityZone, ZONES } from "./data/zones";
import { useBaseMarketData } from "./hooks/useBaseMarketData";

export function App() {
  const [activeZone, setActiveZone] = useState<CityZone | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [smallScreen, setSmallScreen] = useState(() => window.innerWidth < 640);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const { data: marketData, loading, error, refresh } = useBaseMarketData();

  useEffect(() => {
    const handleResize = () => setSmallScreen(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        background: darkMode ? "#0b1120" : "#f8fafc",
        color: darkMode ? "#f8fafc" : "#0f172a",
      }}
    >
      <header
        style={{
          minHeight: 54,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          borderBottom: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        <strong style={{ fontSize: 15 }}>BASE CITY</strong>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {smallScreen && (
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === "map" ? "list" : "map"))}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#1e293b",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {viewMode === "map" ? "List View" : "Map View"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #334155",
              background: darkMode ? "#1e293b" : "#e2e8f0",
              color: darkMode ? "#f8fafc" : "#0f172a",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        {smallScreen && viewMode === "list" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {ZONES.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setActiveZone(z)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.25)",
                  background: z.color,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>
                  {z.icon} {z.name}
                </span>
                <span>Open →</span>
              </button>
            ))}
          </div>
        ) : (
          <IsometricMap
            zones={ZONES}
            activeZoneId={activeZone?.id || null}
            onSelectZone={setActiveZone}
            is3D={is3D}
            onToggle3D={() => setIs3D((prev) => !prev)}
            darkMode={darkMode}
          />
        )}

        <RoomDrawer
          zone={activeZone}
          onClose={() => setActiveZone(null)}
          marketData={marketData}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
      </main>
    </div>
  );
}

export default App;

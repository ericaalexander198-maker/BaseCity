import React, { useRef, useState } from "react";
import { CityZone } from "../data/zones";

interface IsometricMapProps {
  zones: CityZone[];
  activeZoneId: string | null;
  onSelectZone: (zone: CityZone) => void;
  is3D: boolean;
  onToggle3D: () => void;
  darkMode: boolean;
}

export const IsometricMap: React.FC<IsometricMapProps> = ({
  zones,
  activeZoneId,
  onSelectZone,
  is3D,
  onToggle3D,
  darkMode,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef({ active: false, startX: 0, startY: 0, lastDist: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current.active = true;
    dragState.current.startX = e.clientX - pan.x;
    dragState.current.startY = e.clientY - pan.y;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    setPan({
      x: e.clientX - dragState.current.startX,
      y: e.clientY - dragState.current.startY,
    });
  };

  const handlePointerUp = () => {
    dragState.current.active = false;
    dragState.current.lastDist = 0;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dragState.current.lastDist > 0) {
        const ratio = dist / dragState.current.lastDist;
        setScale((prev) => Math.max(0.55, Math.min(2.2, Number((prev * ratio).toFixed(2)))));
      }
      dragState.current.lastDist = dist;
    }
  };

  const mapTransform = is3D
    ? `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotateX(30deg) rotateZ(30deg)`
    : `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handlePointerUp}
      style={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        touchAction: "none",
        background: darkMode ? "#090d16" : "#e2e8f0",
        perspective: "1100px",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onToggle3D}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {is3D ? "Switch to 2D Map" : "Switch to Isometric 3D"}
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "#0f172a",
            color: "#93c5fd",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Auto-Fit ({Math.round(scale * 100)}%)
        </button>
      </div>

      {/* Minimap */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 10,
          width: 120,
          height: 90,
          borderRadius: 8,
          background: "rgba(15,23,42,0.88)",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        {zones.map((z) => (
          <div
            key={z.id}
            style={{
              position: "absolute",
              left: `${z.position.x}%`,
              top: `${z.position.y}%`,
              width: `${z.size.width * 0.7}%`,
              height: `${z.size.height * 0.7}%`,
              background: z.color,
              borderRadius: 2,
              opacity: activeZoneId === z.id ? 1 : 0.7,
            }}
          />
        ))}
      </div>

      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: mapTransform,
          transition: dragState.current.active ? "none" : "transform 220ms ease-out",
        }}
      >
        {zones.map((zone) => {
          const isSelected = activeZoneId === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectZone(zone);
              }}
              style={{
                position: "absolute",
                left: `${zone.position.x}%`,
                top: `${zone.position.y}%`,
                width: `${zone.size.width}%`,
                height: `${zone.size.height}%`,
                background: zone.color,
                color: "#fff",
                border: isSelected ? "3px solid #facc15" : "2px solid rgba(255,255,255,0.35)",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                boxShadow: is3D
                  ? `0 ${Math.round(zone.size.height3D * 0.4)}px ${zone.size.height3D}px rgba(0,0,0,0.45)`
                  : "0 6px 16px rgba(0,0,0,0.22)",
                transform: is3D ? `translateZ(${zone.size.height3D}px)` : "none",
              }}
            >
              <span style={{ fontSize: 20 }}>{zone.icon}</span>
              <strong style={{ fontSize: 12, textAlign: "center", padding: "0 4px" }}>
                {zone.name}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
};

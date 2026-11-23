import React, { useEffect, useRef, useState } from "react";
import { CityMember, CitySector } from "../data/sectors";
import { AvatarConfig } from "./AvatarCustomizer";

interface BaseCityCanvasProps {
  avatar: AvatarConfig;
  sectors: CitySector[];
  members: CityMember[];
  selectedSector: CitySector | null;
  selectedMember: CityMember | null;
  onSelectSector: (sector: CitySector | null) => void;
  onSelectMember: (member: CityMember | null) => void;
}

const GRID_COLS = 22;
const GRID_ROWS = 15;
const TILE_W = 54;
const TILE_H = 27;

function gridToIso(gx: number, gy: number, originX: number, originY: number) {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2),
  };
}

function isoToGrid(sx: number, sy: number, originX: number, originY: number) {
  const dx = sx - originX;
  const dy = sy - originY;
  const gx = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const gy = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return { gx, gy };
}

function shadeHex(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const BaseCityCanvas: React.FC<BaseCityCanvasProps> = ({
  avatar,
  sectors,
  members,
  selectedSector,
  selectedMember,
  onSelectSector,
  onSelectMember,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPos = useRef({ gx: 10.5, gy: 6.8 });
  const targetPos = useRef<{ gx: number; gy: number } | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const walkPhase = useRef(0);
  const logoCache = useRef<Record<string, HTMLImageElement>>({});
  const [nearbySector, setNearbySector] = useState<CitySector | null>(null);

  useEffect(() => {
    sectors.forEach((sec) => {
      if (sec.logoUrl && !logoCache.current[sec.logoUrl]) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sec.logoUrl;
        logoCache.current[sec.logoUrl] = img;
      }
    });
  }, [sectors]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      targetPos.current = null;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const originX = rect.width / 2;
    const originY = 82;

    const { gx, gy } = isoToGrid(sx, sy, originX, originY);
    const clampedX = Math.max(0.5, Math.min(GRID_COLS - 1, gx));
    const clampedY = Math.max(0.5, Math.min(GRID_ROWS - 1, gy));
    targetPos.current = { gx: clampedX, gy: clampedY };

    const clickedMember = members.find(
      (m) => Math.hypot(clampedX - m.x, clampedY - m.y) < 1.1
    );
    if (clickedMember) {
      onSelectMember(clickedMember);
      onSelectSector(null);
      return;
    }

    const clickedSector = sectors.find(
      (s) =>
        clampedX >= s.x - 0.6 &&
        clampedX <= s.x + s.width + 0.6 &&
        clampedY >= s.y - 0.6 &&
        clampedY <= s.y + s.height + 0.6
    );
    if (clickedSector) {
      onSelectSector(clickedSector);
      onSelectMember(null);
    }
  };

  useEffect(() => {
    let animId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cssW = canvas.clientWidth || 900;
      const cssH = canvas.clientHeight || 560;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const speed = 0.08;
      let dx = 0;
      let dy = 0;
      let isMoving = false;

      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= speed;
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += speed;
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= speed;
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += speed;

      if (dx !== 0 || dy !== 0) {
        playerPos.current.gx = Math.max(0.5, Math.min(GRID_COLS - 1, playerPos.current.gx + dx));
        playerPos.current.gy = Math.max(0.5, Math.min(GRID_ROWS - 1, playerPos.current.gy + dy));
        isMoving = true;
      } else if (targetPos.current) {
        const diffX = targetPos.current.gx - playerPos.current.gx;
        const diffY = targetPos.current.gy - playerPos.current.gy;
        const dist = Math.hypot(diffX, diffY);
        if (dist > 0.08) {
          playerPos.current.gx += (diffX / dist) * speed;
          playerPos.current.gy += (diffY / dist) * speed;
          isMoving = true;
        } else {
          targetPos.current = null;
        }
      }

      if (isMoving) {
        walkPhase.current += 0.22;
      } else {
        walkPhase.current += 0.04;
      }

      const foundNear =
        sectors.find((s) => {
          const cx = s.x + s.width / 2;
          const cy = s.y + s.height / 2;
          return Math.hypot(playerPos.current.gx - cx, playerPos.current.gy - cy) < 2.7;
        }) || null;

      setNearbySector((prev) => (prev?.id === foundNear?.id ? prev : foundNear));

      ctx.clearRect(0, 0, cssW, cssH);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, cssH);
      bgGrad.addColorStop(0, "#17153b");
      bgGrad.addColorStop(0.55, "#0b132b");
      bgGrad.addColorStop(1, "#0369a1");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cssW, cssH);

      const originX = cssW / 2;
      const originY = 82;

      // Ground tiles with subtle cobblestone & shore texture
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const p0 = gridToIso(c, r, originX, originY);
          const p1 = gridToIso(c + 1, r, originX, originY);
          const p2 = gridToIso(c + 1, r + 1, originX, originY);
          const p3 = gridToIso(c, r + 1, originX, originY);

          let tileFill = (r + c) % 2 === 0 ? "#2c3a4f" : "#263244";
          if (r >= 10 && r <= 12) {
            tileFill = (r + c) % 2 === 0 ? "#f4d58d" : "#ecc872";
          } else if (r >= 13) {
            tileFill = (r + c) % 2 === 0 ? "#0ea5e9" : "#0284c7";
          } else if (r === 4 || r === 9 || c === 5 || c === 16) {
            tileFill = "#1a2234";
          }

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fillStyle = tileFill;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.05)";
          ctx.stroke();
        }
      }

      // HD Textured Corner Stores / Booths
      sectors.forEach((sec) => {
        const topLeft = gridToIso(sec.x, sec.y, originX, originY);
        const topRight = gridToIso(sec.x + sec.width, sec.y, originX, originY);
        const bottomRight = gridToIso(sec.x + sec.width, sec.y + sec.height, originX, originY);
        const bottomLeft = gridToIso(sec.x, sec.y + sec.height, originX, originY);

        const counterH = 16;
        const roofH = 42;
        const isSelected = selectedSector?.id === sec.id;
        const isNear = foundNear?.id === sec.id;

        const baseColor = sec.color;
        const darkWall = shadeHex(baseColor, -30);
        const lightTrim = shadeHex(baseColor, 35);

        // Ground drop shadow
        ctx.beginPath();
        ctx.moveTo(topLeft.x + 5, topLeft.y + 5);
        ctx.lineTo(topRight.x + 5, topRight.y + 5);
        ctx.lineTo(bottomRight.x + 5, bottomRight.y + 5);
        ctx.lineTo(bottomLeft.x + 5, bottomLeft.y + 5);
        ctx.closePath();
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fill();

        // Front Counter Body with panel detail
        const frontGrad = ctx.createLinearGradient(0, bottomLeft.y - counterH, 0, bottomLeft.y);
        frontGrad.addColorStop(0, lightTrim);
        frontGrad.addColorStop(1, darkWall);
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - counterH);
        ctx.closePath();
        ctx.fillStyle = frontGrad;
        ctx.fill();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.5)";
        ctx.stroke();

        // Right Counter Wall
        ctx.beginPath();
        ctx.moveTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.closePath();
        ctx.fillStyle = darkWall;
        ctx.fill();

        // Polished Counter Top + Glowing Showcase Strip
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - counterH);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - counterH);
        ctx.closePath();
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.stroke();

        // Glowing display bar along front counter edge
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x + 4, bottomLeft.y - counterH + 5);
        ctx.lineTo(bottomRight.x - 4, bottomRight.y - counterH + 5);
        ctx.stroke();
        ctx.lineWidth = 1;

        // Four Corner Pillars with Metallic Caps
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.6;
        [topLeft, topRight, bottomRight, bottomLeft].forEach((corner) => {
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y - counterH);
          ctx.lineTo(corner.x, corner.y - roofH);
          ctx.stroke();

          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.arc(corner.x, corner.y - roofH, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.lineWidth = 1;

        // Striped Canopy Roof
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - roofH);
        ctx.lineTo(topRight.x, topRight.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - roofH);
        ctx.closePath();
        ctx.fillStyle = baseColor;
        ctx.fill();
        ctx.clip();

        // Diagonal stripe texture across canopy
        ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
        ctx.lineWidth = 6;
        for (let sx = topLeft.x - 140; sx < topRight.x + 140; sx += 14) {
          ctx.beginPath();
          ctx.moveTo(sx, topLeft.y - roofH - 60);
          ctx.lineTo(sx + 70, bottomRight.y - roofH + 60);
          ctx.stroke();
        }
        ctx.restore();

        // Canopy border highlight
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - roofH);
        ctx.lineTo(topRight.x, topRight.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - roofH);
        ctx.closePath();
        ctx.lineWidth = isSelected || isNear ? 3 : 1.5;
        ctx.strokeStyle = isSelected || isNear ? "#facc15" : "#ffffff";
        ctx.stroke();
        ctx.lineWidth = 1;

        // Scalloped Front Awning Valance
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH + 8);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - roofH + 8);
        ctx.closePath();
        ctx.fillStyle = sec.accent;
        ctx.fill();

        const center = gridToIso(
          sec.x + sec.width / 2,
          sec.y + sec.height / 2,
          originX,
          originY
        );

        // Logo Signboard Medallion
        const signY = center.y - roofH - 18;
        ctx.beginPath();
        ctx.arc(center.x, signY, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#090d1a";
        ctx.fill();
        ctx.strokeStyle = isNear ? "#facc15" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;

        const cachedImg = sec.logoUrl ? logoCache.current[sec.logoUrl] : null;
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(center.x, signY, 12, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, center.x - 12, signY - 12, 24, 24);
          ctx.restore();
        } else {
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(sec.logoText, center.x, signY + 4);
        }

        // Store Signboard Pill Label
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        const labelW = ctx.measureText(sec.name).width + 14;
        ctx.fillStyle = "rgba(9, 13, 26, 0.88)";
        ctx.beginPath();
        ctx.roundRect(center.x - labelW / 2, center.y - roofH - 7, labelW, 17, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(sec.name, center.x, center.y - roofH + 5);

        // Proximity Floating Popup Bubble when near store
        if (isNear) {
          const popupText = `${sec.name}: ${sec.description.slice(0, 44)}${
            sec.description.length > 44 ? "..." : ""
          }`;
          ctx.font = "bold 11px system-ui, sans-serif";
          const textW = Math.min(270, ctx.measureText(popupText).width + 22);
          const boxX = Math.max(12, Math.min(cssW - textW - 12, center.x - textW / 2));
          const boxY = Math.max(10, signY - 46);

          ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, textW, 27, 8);
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.lineWidth = 1;

          ctx.fillStyle = "#f8fafc";
          ctx.textAlign = "center";
          ctx.fillText(popupText, boxX + textW / 2, boxY + 17.5);
        }
      });

      // Builders / Creators / Members with animated arms
      members.forEach((m, index) => {
        const mPos = gridToIso(m.x, m.y, originX, originY);
        const w = m.bodyWidth;
        const h = m.bodyHeight;
        const torsoW = 13 * w;
        const torsoH = 16 * h;
        const headR = 6.5;
        const isSelected = selectedMember?.id === m.id;
        const armSwing = Math.sin(walkPhase.current + index * 1.4) * (isSelected ? 6 : 2.5);

        ctx.beginPath();
        ctx.ellipse(mPos.x, mPos.y + 2, 10 * w, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "rgba(250,204,21,0.55)" : "rgba(0,0,0,0.38)";
        ctx.fill();

        const shoulderY = mPos.y - 2 - torsoH + 3;
        ctx.strokeStyle = m.skinTone;
        ctx.lineWidth = Math.max(2.2, 2.8 * w);
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(mPos.x - torsoW / 2, shoulderY);
        ctx.lineTo(mPos.x - torsoW / 2 - 4 * w, shoulderY + 7 + armSwing);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mPos.x + torsoW / 2, shoulderY);
        ctx.lineTo(
          mPos.x + torsoW / 2 + 4 * w,
          isSelected ? shoulderY - 3 - Math.abs(armSwing) : shoulderY + 7 - armSwing
        );
        ctx.stroke();

        ctx.fillStyle = m.outfitColor;
        ctx.beginPath();
        ctx.roundRect(mPos.x - torsoW / 2, mPos.y - 2 - torsoH, torsoW, torsoH, 4);
        ctx.fill();

        const headY = mPos.y - 4 - torsoH - headR;
        ctx.beginPath();
        ctx.arc(mPos.x, headY, headR, 0, Math.PI * 2);
        ctx.fillStyle = m.skinTone;
        ctx.fill();

        if (m.visor) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(mPos.x - headR * 0.7, headY - 2, headR * 1.4, 3.5);
        }

        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fde047";
        ctx.fillText(`${m.name} (${m.role})`, mPos.x, headY - headR - 5);
      });

      // Player Avatar with animated arms & legs
      const pScreen = gridToIso(playerPos.current.gx, playerPos.current.gy, originX, originY);
      const wScale = avatar.bodyWidth;
      const hScale = avatar.bodyHeight;
      const headR = 7 * avatar.headScale;
      const torsoW = 14 * wScale;
      const torsoH = 18 * hScale;

      const armAmp = isMoving ? 7.5 : 2.2;
      const leftArmOffset = Math.sin(walkPhase.current) * armAmp;
      const rightArmOffset = Math.sin(walkPhase.current + Math.PI) * armAmp;
      const legOffset = isMoving ? Math.sin(walkPhase.current) * 3 : 0;

      ctx.beginPath();
      ctx.ellipse(pScreen.x, pScreen.y + 2, 11 * wScale, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      ctx.strokeStyle = avatar.skinTone;
      ctx.lineWidth = 3 * wScale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pScreen.x - 4 * wScale, pScreen.y - 2);
      ctx.lineTo(pScreen.x - 4 * wScale, pScreen.y + 5 + legOffset);
      ctx.moveTo(pScreen.x + 4 * wScale, pScreen.y - 2);
      ctx.lineTo(pScreen.x + 4 * wScale, pScreen.y + 5 - legOffset);
      ctx.stroke();

      ctx.fillStyle = avatar.outfitColor;
      ctx.beginPath();
      ctx.roundRect(pScreen.x - torsoW / 2, pScreen.y - 2 - torsoH, torsoW, torsoH, 5);
      ctx.fill();

      const pShoulderY = pScreen.y - 2 - torsoH + 4;
      ctx.strokeStyle = avatar.skinTone;
      ctx.lineWidth = Math.max(2.5, 3.2 * wScale);
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(pScreen.x - torsoW / 2, pShoulderY);
      ctx.lineTo(pScreen.x - torsoW / 2 - 5 * wScale, pShoulderY + 8 + leftArmOffset);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pScreen.x + torsoW / 2, pShoulderY);
      ctx.lineTo(pScreen.x + torsoW / 2 + 5 * wScale, pShoulderY + 8 + rightArmOffset);
      ctx.stroke();

      const headY = pScreen.y - 4 - torsoH - headR;
      ctx.beginPath();
      ctx.arc(pScreen.x, headY, headR, 0, Math.PI * 2);
      ctx.fillStyle = avatar.skinTone;
      ctx.fill();

      if (avatar.visor) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(pScreen.x - headR * 0.7, headY - 2, headR * 1.4, 4);
      }

      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(avatar.name || "Citizen", pScreen.x, headY - headR - 6);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [avatar, sectors, members, selectedSector, selectedMember]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          color: "#e2e8f0",
        }}
      >
        Walk near corner stores for popup • Click store or avatar for links
        {nearbySector && (
          <span style={{ marginLeft: 10, color: "#38bdf8" }}>
            Visiting: <b>{nearbySector.name}</b>
          </span>
        )}
      </div>
    </div>
  );
};

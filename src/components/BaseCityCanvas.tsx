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
  const playerPos = useRef({ gx: 8.5, gy: 7.5 });
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
    const originX = canvas.width / 2;
    const originY = 90;

    const { gx, gy } = isoToGrid(sx, sy, originX, originY);
    const clampedX = Math.max(1, Math.min(GRID_COLS - 1.5, gx));
    const clampedY = Math.max(1, Math.min(GRID_ROWS - 1.5, gy));
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
        clampedX >= s.x - 0.7 &&
        clampedX <= s.x + s.width + 0.7 &&
        clampedY >= s.y - 0.7 &&
        clampedY <= s.y + s.height + 0.7
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

      canvas.width = canvas.clientWidth || 900;
      canvas.height = canvas.clientHeight || 560;

      const speed = 0.08;
      let dx = 0;
      let dy = 0;
      let isMoving = false;

      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= speed;
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += speed;
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= speed;
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += speed;

      if (dx !== 0 || dy !== 0) {
        playerPos.current.gx = Math.max(1, Math.min(GRID_COLS - 1.5, playerPos.current.gx + dx));
        playerPos.current.gy = Math.max(1, Math.min(GRID_ROWS - 1.5, playerPos.current.gy + dy));
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
          return Math.hypot(playerPos.current.gx - cx, playerPos.current.gy - cy) < 2.8;
        }) || null;

      setNearbySector((prev) => (prev?.id === foundNear?.id ? prev : foundNear));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, "#1e1b4b");
      bgGrad.addColorStop(0.55, "#0f172a");
      bgGrad.addColorStop(1, "#0284c7");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const originX = canvas.width / 2;
      const originY = 90;

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const p0 = gridToIso(c, r, originX, originY);
          const p1 = gridToIso(c + 1, r, originX, originY);
          const p2 = gridToIso(c + 1, r + 1, originX, originY);
          const p3 = gridToIso(c, r + 1, originX, originY);

          let tileFill = "#334155";
          if (r >= 9 && r <= 11) tileFill = "#f3d58d";
          if (r >= 12) tileFill = "#0ea5e9";
          if (r === 5 || r === 8 || c === 6 || c === 12) tileFill = "#1e293b";

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fillStyle = tileFill;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.stroke();
        }
      }

      // Draw each dApp as a Market/Expo Stall Booth
      sectors.forEach((sec) => {
        const topLeft = gridToIso(sec.x, sec.y, originX, originY);
        const topRight = gridToIso(sec.x + sec.width, sec.y, originX, originY);
        const bottomRight = gridToIso(sec.x + sec.width, sec.y + sec.height, originX, originY);
        const bottomLeft = gridToIso(sec.x, sec.y + sec.height, originX, originY);
        const counterH = 14;
        const roofH = 38;
        const isSelected = selectedSector?.id === sec.id;
        const isNear = foundNear?.id === sec.id;

        // 1. Stall Front Counter Base
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - counterH);
        ctx.closePath();
        ctx.fillStyle = sec.color;
        ctx.fill();

        // Right counter wall
        ctx.beginPath();
        ctx.moveTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.closePath();
        ctx.fillStyle = "#1e293b";
        ctx.fill();

        // Counter top table
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - counterH);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - counterH);
        ctx.closePath();
        ctx.fillStyle = "#f8fafc";
        ctx.fill();

        // 2. Four Stall Poles supporting the Canopy
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.5;
        [topLeft, topRight, bottomRight, bottomLeft].forEach((corner) => {
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y - counterH);
          ctx.lineTo(corner.x, corner.y - roofH);
          ctx.stroke();
        });
        ctx.lineWidth = 1;

        // 3. Stall Canopy / Awning Roof
        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - roofH);
        ctx.lineTo(topRight.x, topRight.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - roofH);
        ctx.closePath();
        ctx.fillStyle = sec.color;
        ctx.fill();
        ctx.lineWidth = isSelected || isNear ? 3 : 1.5;
        ctx.strokeStyle = isSelected || isNear ? "#facc15" : "#ffffff";
        ctx.stroke();
        ctx.lineWidth = 1;

        // Front Awning Flap
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x, bottomLeft.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH);
        ctx.lineTo(bottomRight.x, bottomRight.y - roofH + 7);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - roofH + 7);
        ctx.closePath();
        ctx.fillStyle = sec.accent;
        ctx.fill();

        const center = gridToIso(
          sec.x + sec.width / 2,
          sec.y + sec.height / 2,
          originX,
          originY
        );

        // 4. Signboard & Logo Image or Letter Badge above Stall
        const signY = center.y - roofH - 16;
        ctx.beginPath();
        ctx.arc(center.x, signY, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.lineWidth = 1;

        const cachedImg = sec.logoUrl ? logoCache.current[sec.logoUrl] : null;
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(center.x, signY, 11, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, center.x - 11, signY - 11, 22, 22);
          ctx.restore();
        } else {
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(sec.logoText, center.x, signY + 4);
        }

        // Stall Name Banner
        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(sec.name, center.x, center.y - roofH + 3);

        // 5. Proximity Floating Popup Bubble when player walks close!
        if (isNear) {
          const popupText = `${sec.name}: ${sec.description.slice(0, 42)}${
            sec.description.length > 42 ? "..." : ""
          }`;
          ctx.font = "bold 11px system-ui, sans-serif";
          const textW = Math.min(260, ctx.measureText(popupText).width + 20);
          const boxX = center.x - textW / 2;
          const boxY = signY - 44;

          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, textW, 26, 8);
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.lineWidth = 1;

          // Speech bubble pointer triangle
          ctx.beginPath();
          ctx.moveTo(center.x - 5, boxY + 26);
          ctx.lineTo(center.x + 5, boxY + 26);
          ctx.lineTo(center.x, boxY + 32);
          ctx.closePath();
          ctx.fillStyle = "#38bdf8";
          ctx.fill();

          ctx.fillStyle = "#f8fafc";
          ctx.textAlign = "center";
          ctx.fillText(popupText, center.x, boxY + 17);
        }
      });

      // Draw Builders / Creators / Members with arm swing
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
        ctx.fillStyle = isSelected ? "rgba(250,204,21,0.55)" : "rgba(0,0,0,0.35)";
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

      // Draw Player Avatar with walking arm & leg animation
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
        Walk near any stall for popup • Click stall or avatar for links
        {nearbySector && (
          <span style={{ marginLeft: 10, color: "#38bdf8" }}>
            Visiting: <b>{nearbySector.name}</b>
          </span>
        )}
      </div>
    </div>
  );
};

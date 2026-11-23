import React, { useEffect, useRef, useState } from "react";
import { CityMember, CitySector } from "../data/sectors";
import { AvatarConfig } from "./AvatarCustomizer";

export type CityGroundSize = "compact" | "standard" | "mega";

interface BaseCityCanvasProps {
  avatar: AvatarConfig;
  sectors: CitySector[];
  members: CityMember[];
  groundSize: CityGroundSize;
  selectedSector: CitySector | null;
  selectedMember: CityMember | null;
  onSelectSector: (sector: CitySector | null) => void;
  onSelectMember: (member: CityMember | null) => void;
}

const GROUND_DIMS: Record<CityGroundSize, { cols: number; rows: number }> = {
  compact: { cols: 30, rows: 20 },
  standard: { cols: 38, rows: 24 },
  mega: { cols: 48, rows: 30 },
};

const TILE_SIZE = 32;
const STORE_MARGIN = 0.45;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.8;

const PINE_TREES = [
  { gx: 31.5, gy: 2.2 },
  { gx: 34.5, gy: 1.8 },
  { gx: 32.5, gy: 6.5 },
  { gx: 35.2, gy: 8.8 },
  { gx: 31.8, gy: 14.5 },
  { gx: 35.0, gy: 17.5 },
  { gx: 33.2, gy: 21.0 },
  { gx: 41.0, gy: 4.5 },
  { gx: 43.5, gy: 12.0 },
  { gx: 42.0, gy: 22.0 },
];

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

function resolveCollision(
  gx: number,
  gy: number,
  prevX: number,
  prevY: number,
  sectors: CitySector[],
  cols: number,
  rows: number
) {
  let outX = Math.max(0.8, Math.min(cols - 1.2, gx));
  let outY = Math.max(0.8, Math.min(rows - 1.2, gy));

  for (const s of sectors) {
    const minX = s.x - STORE_MARGIN;
    const maxX = s.x + s.width + STORE_MARGIN;
    const minY = s.y - STORE_MARGIN;
    const maxY = s.y + s.height + STORE_MARGIN;

    if (outX > minX && outX < maxX && outY > minY && outY < maxY) {
      const canMoveX = !(prevX > minX && prevX < maxX && outY > minY && outY < maxY);
      const canMoveY = !(outX > minX && outX < maxX && prevY > minY && prevY < maxY);

      if (canMoveX && !canMoveY) {
        outY = prevY;
      } else if (canMoveY && !canMoveX) {
        outX = prevX;
      } else {
        const dLeft = Math.abs(outX - minX);
        const dRight = Math.abs(maxX - outX);
        const dTop = Math.abs(outY - minY);
        const dBottom = Math.abs(maxY - outY);
        const minEdge = Math.min(dLeft, dRight, dTop, dBottom);

        if (minEdge === dLeft) outX = minX;
        else if (minEdge === dRight) outX = maxX;
        else if (minEdge === dTop) outY = minY;
        else outY = maxY;
      }
    }
  }

  return { gx: outX, gy: outY };
}

export const BaseCityCanvas: React.FC<BaseCityCanvasProps> = ({
  avatar,
  sectors,
  members,
  groundSize,
  selectedSector,
  selectedMember,
  onSelectSector,
  onSelectMember,
}) => {
  const { cols: gridCols, rows: gridRows } = GROUND_DIMS[groundSize];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPos = useRef({ gx: 14.0, gy: 11.5 });
  const targetPos = useRef<{ gx: number; gy: number } | null>(null);
  const camOffset = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.1);
  const [zoomDisplay, setZoomDisplay] = useState(110);
  const keysPressed = useRef<Record<string, boolean>>({});
  const walkPhase = useRef(0);
  const logoCache = useRef<Record<string, HTMLImageElement>>({});
  const [nearbySector, setNearbySector] = useState<CitySector | null>(null);

  const setZoom = (next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(next.toFixed(2))));
    zoomRef.current = clamped;
    setZoomDisplay(Math.round(clamped * 100));
  };

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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(zoomRef.current + (e.deltaY < 0 ? 0.12 : -0.12));
  };

  const getMapOrigin = (cssW: number, cssH: number) => {
    const mapW = gridCols * TILE_SIZE;
    const mapH = gridRows * TILE_SIZE;
    return {
      originX: (cssW - mapW) / 2 + camOffset.current.x,
      originY: (cssH - mapH) / 2 + camOffset.current.y,
    };
  };

  const screenToWorld = (sx: number, sy: number, cssW: number, cssH: number) => {
    const z = zoomRef.current;
    const cx = cssW / 2;
    const cy = cssH / 2;
    return {
      wx: (sx - cx) / z + cx,
      wy: (sy - cy) / z + cy,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { wx, wy } = screenToWorld(sx, sy, rect.width, rect.height);
    const { originX, originY } = getMapOrigin(rect.width, rect.height);

    const gx = (wx - originX) / TILE_SIZE;
    const gy = (wy - originY) / TILE_SIZE;
    const clampedX = Math.max(0.8, Math.min(gridCols - 1.2, gx));
    const clampedY = Math.max(0.8, Math.min(gridRows - 1.2, gy));

    targetPos.current = resolveCollision(
      clampedX,
      clampedY,
      playerPos.current.gx,
      playerPos.current.gy,
      sectors,
      gridCols,
      gridRows
    );

    const clickedMember = members.find(
      (m) => Math.hypot(clampedX - m.x, clampedY - m.y) < 1.25
    );
    if (clickedMember) {
      onSelectMember(clickedMember);
      onSelectSector(null);
      return;
    }

    const clickedSector = sectors.find(
      (s) =>
        clampedX >= s.x - 0.5 &&
        clampedX <= s.x + s.width + 0.5 &&
        clampedY >= s.y - 0.5 &&
        clampedY <= s.y + s.height + 0.5
    );
    if (clickedSector) {
      onSelectSector(clickedSector);
      onSelectMember(null);
    }
  };

  const drawDeskSet = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    accent: string
  ) => {
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Monitor screen
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + w * 0.25, y + 3, w * 0.5, 8);
    ctx.fillStyle = accent;
    ctx.fillRect(x + w * 0.28, y + 4.5, w * 0.44, 5);
    ctx.lineWidth = 1;
  };

  const drawPineTree = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    sway: number
  ) => {
    ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
    ctx.beginPath();
    ctx.ellipse(px, py + 10, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#78350f";
    ctx.fillRect(px - 3, py + 2, 6, 8);

    const tiers = [
      { y: py + 3, r: 13, color: "#15803d" },
      { y: py - 5, r: 10.5, color: "#16a34a" },
      { y: py - 12, r: 7.5, color: "#22c55e" },
    ];
    tiers.forEach((t) => {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(px + sway, t.y - t.r);
      ctx.lineTo(px - t.r, t.y + t.r * 0.55);
      ctx.lineTo(px + t.r, t.y + t.r * 0.55);
      ctx.closePath();
      ctx.fill();
    });
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
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      const speed = 0.11;
      let dx = 0;
      let dy = 0;
      let isMoving = false;

      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= speed;
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += speed;
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= speed;
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += speed;

      const prevX = Math.max(0.8, Math.min(gridCols - 1.2, playerPos.current.gx));
      const prevY = Math.max(0.8, Math.min(gridRows - 1.2, playerPos.current.gy));
      playerPos.current.gx = prevX;
      playerPos.current.gy = prevY;

      if (dx !== 0 || dy !== 0) {
        const resolved = resolveCollision(
          prevX + dx,
          prevY + dy,
          prevX,
          prevY,
          sectors,
          gridCols,
          gridRows
        );
        playerPos.current.gx = resolved.gx;
        playerPos.current.gy = resolved.gy;
        isMoving = Math.hypot(resolved.gx - prevX, resolved.gy - prevY) > 0.005;
      } else if (targetPos.current) {
        const diffX = targetPos.current.gx - prevX;
        const diffY = targetPos.current.gy - prevY;
        const dist = Math.hypot(diffX, diffY);
        if (dist > 0.08) {
          const stepX = prevX + (diffX / dist) * speed;
          const stepY = prevY + (diffY / dist) * speed;
          const resolved = resolveCollision(
            stepX,
            stepY,
            prevX,
            prevY,
            sectors,
            gridCols,
            gridRows
          );
          if (Math.hypot(resolved.gx - prevX, resolved.gy - prevY) > 0.005) {
            playerPos.current.gx = resolved.gx;
            playerPos.current.gy = resolved.gy;
            isMoving = true;
          } else {
            targetPos.current = null;
          }
        } else {
          targetPos.current = null;
        }
      }

      if (isMoving) {
        walkPhase.current += 0.22;
      } else {
        walkPhase.current += 0.03;
      }

      const { originX: baseOriginX, originY: baseOriginY } = getMapOrigin(cssW, cssH);
      const pWorldX = baseOriginX + playerPos.current.gx * TILE_SIZE;
      const pWorldY = baseOriginY + playerPos.current.gy * TILE_SIZE;
      const desiredCamX = Math.max(-240, Math.min(240, (cssW / 2 - pWorldX) * 0.45));
      const desiredCamY = Math.max(-160, Math.min(160, (cssH / 2 - pWorldY) * 0.45));
      camOffset.current.x += (desiredCamX - camOffset.current.x) * 0.08;
      camOffset.current.y += (desiredCamY - camOffset.current.y) * 0.08;

      const foundNear =
        sectors.find((s) => {
          const cx = s.x + s.width / 2;
          const cy = s.y + s.height / 2;
          return Math.hypot(playerPos.current.gx - cx, playerPos.current.gy - cy) < 3.4;
        }) || null;

      setNearbySector((prev) => (prev?.id === foundNear?.id ? prev : foundNear));

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#dcfce7";
      ctx.fillRect(0, 0, cssW, cssH);

      const z = zoomRef.current;
      ctx.translate(cssW / 2, cssH / 2);
      ctx.scale(z, z);
      ctx.translate(-cssW / 2, -cssH / 2);

      const { originX, originY } = getMapOrigin(cssW, cssH);
      const campusCols = gridCols - 6;
      const campusRows = gridRows - 2;

      // Exterior grass tiles around campus
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const x = originX + c * TILE_SIZE;
          const y = originY + r * TILE_SIZE;
          const inCampus = r >= 1 && r < campusRows && c >= 1 && c < campusCols;

          if (!inCampus) {
            ctx.fillStyle = (r + c) % 2 === 0 ? "#bbf7d0" : "#86efac";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.fillStyle = (r + c) % 2 === 0 ? "#f8fafc" : "#f1f5f9";
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
            ctx.lineWidth = 1 / z;
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Campus outer walls & zone bays (Team Settlement, dApp Stores, Creators Corner)
      const cx0 = originX + TILE_SIZE;
      const cy0 = originY + TILE_SIZE;
      const cw = (campusCols - 1) * TILE_SIZE;
      const ch = (campusRows - 1) * TILE_SIZE;

      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 5;
      ctx.strokeRect(cx0, cy0, cw, ch);
      ctx.lineWidth = 1;

      // Team Member Settlement Bays (Top & Left Rooms)
      const teamRooms = [
        { gx: 2, gy: 2, gw: 8, gh: 6, floor: "#e0e7ff", label: "TEAM SETTLEMENT" },
        { gx: 12, gy: 2, gw: 9, gh: 6, floor: "#f1f5f9", label: "BUILDER LOUNGE" },
        { gx: 2, gy: 10, gw: 8, gh: 6, floor: "#fef3c7", label: "OPS & SQUAD DESKS" },
        { gx: 12, gy: 10, gw: 9, gh: 6, floor: "#e0f2fe", label: "CORE TEAM HUB" },
      ];

      teamRooms.forEach((rm) => {
        if (rm.gx + rm.gw > campusCols || rm.gy + rm.gh > campusRows) return;
        const rx = originX + rm.gx * TILE_SIZE;
        const ry = originY + rm.gy * TILE_SIZE;
        const rw = rm.gw * TILE_SIZE;
        const rh = rm.gh * TILE_SIZE;

        ctx.fillStyle = rm.floor;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.lineWidth = 1;

        drawDeskSet(ctx, rx + 16, ry + 18, 44, 18, "#3b82f6");
        drawDeskSet(ctx, rx + rw - 64, ry + 18, 44, 18, "#8b5cf6");

        ctx.font = "bold 9px system-ui, sans-serif";
        ctx.fillStyle = "#475569";
        ctx.textAlign = "left";
        ctx.fillText(rm.label, rx + 8, ry + 12);
      });

      // Creators Corner Zone (Right Wing)
      const ccX = originX + 23 * TILE_SIZE;
      const ccY = originY + 2 * TILE_SIZE;
      const ccW = 7 * TILE_SIZE;
      const ccH = 14 * TILE_SIZE;
      if (23 + 7 <= campusCols && 2 + 14 <= campusRows) {
        ctx.fillStyle = "#fce7f3";
        ctx.fillRect(ccX, ccY, ccW, ccH);
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 2;
        ctx.strokeRect(ccX, ccY, ccW, ccH);
        ctx.lineWidth = 1;

        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillStyle = "#be185d";
        ctx.textAlign = "center";
        ctx.fillText("CREATORS CORNER", ccX + ccW / 2, ccY + 14);
        drawDeskSet(ctx, ccX + 22, ccY + 34, 52, 20, "#ec4899");
        drawDeskSet(ctx, ccX + ccW - 76, ccY + 140, 52, 20, "#f43f5e");
      }

      // dApp Stores (Bottom Storefront Row)
      sectors.forEach((sec) => {
        const sx = originX + sec.x * TILE_SIZE;
        const sy = originY + sec.y * TILE_SIZE;
        const sw = sec.width * TILE_SIZE;
        const sh = sec.height * TILE_SIZE;
        const isSelected = selectedSector?.id === sec.id;
        const isNear = foundNear?.id === sec.id;

        ctx.fillStyle = shadeHex(sec.color, 65);
        ctx.fillRect(sx, sy, sw, sh);
        ctx.lineWidth = isSelected || isNear ? 3 : 2;
        ctx.strokeStyle = isSelected || isNear ? "#facc15" : sec.color;
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.lineWidth = 1;

        // Storefront counter bar
        ctx.fillStyle = sec.color;
        ctx.fillRect(sx + 6, sy + sh - 16, sw - 12, 10);

        // Logo badge & store name
        const badgeX = sx + sw / 2;
        const badgeY = sy + 20;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#0f172a";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.lineWidth = 1;

        const cachedImg = sec.logoUrl ? logoCache.current[sec.logoUrl] : null;
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, badgeX - 10, badgeY - 10, 20, 20);
          ctx.restore();
        } else {
          ctx.font = "bold 10px system-ui, sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText(sec.logoText, badgeX, badgeY + 3.5);
        }

        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillStyle = "#0f172a";
        ctx.textAlign = "center";
        ctx.fillText(sec.name, badgeX, badgeY + 23);

        if (isNear) {
          const popupText = `${sec.name}: ${sec.description.slice(0, 42)}${
            sec.description.length > 42 ? "..." : ""
          }`;
          ctx.font = "bold 11px system-ui, sans-serif";
          const textW = Math.min(265, ctx.measureText(popupText).width + 20);
          const boxX = badgeX - textW / 2;
          const boxY = sy - 32;

          ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, textW, 24, 7);
          ctx.fill();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.lineWidth = 1;

          ctx.fillStyle = "#f8fafc";
          ctx.fillText(popupText, boxX + textW / 2, boxY + 15.5);
        }
      });

      // Pine trees around exterior
      const sway = Math.sin(walkPhase.current * 0.6) * 1.5;
      PINE_TREES.filter((t) => t.gx < gridCols && t.gy < gridRows).forEach((t) => {
        drawPineTree(ctx, originX + t.gx * TILE_SIZE, originY + t.gy * TILE_SIZE, sway);
      });

      // Settled Team Members & Creators (stationary with clean ● Name pill)
      members.forEach((m, index) => {
        const px = originX + m.x * TILE_SIZE;
        const py = originY + m.y * TILE_SIZE;
        const w = m.bodyWidth;
        const h = m.bodyHeight;
        const torsoW = 12 * w;
        const torsoH = 14 * h;
        const isSelected = selectedMember?.id === m.id;
        const wave = Math.sin(walkPhase.current * 1.4 + index) * (isSelected ? 4 : 0);

        ctx.fillStyle = isSelected ? "rgba(250,204,21,0.45)" : "rgba(15,23,42,0.25)";
        ctx.beginPath();
        ctx.ellipse(px, py + 7, 9 * w, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = m.skinTone;
        ctx.lineWidth = 2.5 * w;
        ctx.beginPath();
        ctx.moveTo(px - torsoW / 2, py - torsoH + 4);
        ctx.lineTo(px - torsoW / 2 - 3 * w, py - 2);
        ctx.moveTo(px + torsoW / 2, py - torsoH + 4);
        ctx.lineTo(px + torsoW / 2 + 3 * w, py - 2 - Math.abs(wave));
        ctx.stroke();

        ctx.fillStyle = m.outfitColor;
        ctx.beginPath();
        ctx.roundRect(px - torsoW / 2, py - torsoH, torsoW, torsoH, 4);
        ctx.fill();

        const headY = py - torsoH - 6.5;
        ctx.beginPath();
        ctx.arc(px, headY, 6, 0, Math.PI * 2);
        ctx.fillStyle = m.skinTone;
        ctx.fill();

        if (m.visor) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(px - 4, headY - 1.5, 8, 3);
        }

        // Gather-style pill tag above settled member/creator
        const tagText = `● ${m.name}`;
        ctx.font = "bold 10px system-ui, sans-serif";
        const tagW = ctx.measureText(tagText).width + 12;
        ctx.fillStyle = isSelected ? "#facc15" : "#0f172a";
        ctx.beginPath();
        ctx.roundRect(px - tagW / 2, headY - 21, tagW, 15, 7);
        ctx.fill();
        ctx.fillStyle = isSelected ? "#0f172a" : "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(tagText, px, headY - 10.5);
      });

      // Player Avatar
      const pX = originX + playerPos.current.gx * TILE_SIZE;
      const pY = originY + playerPos.current.gy * TILE_SIZE;
      const wScale = avatar.bodyWidth;
      const hScale = avatar.bodyHeight;
      const headR = 6.5 * avatar.headScale;
      const torsoW = 13 * wScale;
      const torsoH = 15 * hScale;

      const armAmp = isMoving ? 6 : 0;
      const leftArm = isMoving ? Math.sin(walkPhase.current) * armAmp : 0;
      const rightArm = isMoving ? Math.sin(walkPhase.current + Math.PI) * armAmp : 0;
      const legSwing = isMoving ? Math.sin(walkPhase.current) * 2.5 : 0;

      ctx.fillStyle = "rgba(15, 23, 42, 0.32)";
      ctx.beginPath();
      ctx.ellipse(pX, pY + 7, 10 * wScale, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.8 * wScale;
      ctx.beginPath();
      ctx.moveTo(pX - 3.5 * wScale, pY + 1);
      ctx.lineTo(pX - 3.5 * wScale, pY + 6 + legSwing);
      ctx.moveTo(pX + 3.5 * wScale, pY + 1);
      ctx.lineTo(pX + 3.5 * wScale, pY + 6 - legSwing);
      ctx.stroke();

      ctx.fillStyle = avatar.outfitColor;
      ctx.beginPath();
      ctx.roundRect(pX - torsoW / 2, pY - torsoH, torsoW, torsoH, 4);
      ctx.fill();

      ctx.strokeStyle = avatar.skinTone;
      ctx.lineWidth = 2.8 * wScale;
      ctx.beginPath();
      ctx.moveTo(pX - torsoW / 2, pY - torsoH + 4);
      ctx.lineTo(pX - torsoW / 2 - 4 * wScale, pY - 1 + leftArm);
      ctx.moveTo(pX + torsoW / 2, pY - torsoH + 4);
      ctx.lineTo(pX + torsoW / 2 + 4 * wScale, pY - 1 + rightArm);
      ctx.stroke();

      const headY = pY - torsoH - headR;
      ctx.beginPath();
      ctx.arc(pX, headY, headR, 0, Math.PI * 2);
      ctx.fillStyle = avatar.skinTone;
      ctx.fill();

      if (avatar.visor) {
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(pX - headR * 0.65, headY - 2, headR * 1.3, 3.5);
      }

      const pTag = avatar.name || "Citizen";
      ctx.font = "bold 10px system-ui, sans-serif";
      const pTagW = ctx.measureText(pTag).width + 12;
      ctx.fillStyle = "#0052FF";
      ctx.beginPath();
      ctx.roundRect(pX - pTagW / 2, headY - headR - 16, pTagW, 15, 7);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(pTag, pX, headY - headR - 5.5);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [avatar, sectors, members, groundSize, gridCols, gridRows, selectedSector, selectedMember]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 12,
          color: "#f8fafc",
        }}
      >
        <button
          type="button"
          onClick={() => setZoom(zoomRef.current - 0.2)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          −
        </button>
        <span style={{ minWidth: 42, textAlign: "center", fontWeight: 600 }}>
          {zoomDisplay}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(zoomRef.current + 0.2)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom(1.0)}
          style={{
            padding: "3px 7px",
            borderRadius: 6,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#93c5fd",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          color: "#e2e8f0",
        }}
      >
        Team Rooms • dApp Stores • Creators Corner ({groundSize.toUpperCase()})
        {nearbySector && (
          <span style={{ marginLeft: 10, color: "#38bdf8" }}>
            Near: <b>{nearbySector.name}</b>
          </span>
        )}
      </div>
    </div>
  );
};

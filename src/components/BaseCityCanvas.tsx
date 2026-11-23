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

const GRID_COLS = 32;
const GRID_ROWS = 24;
const TILE_W = 48;
const TILE_H = 24;
const STORE_MARGIN = 0.45;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.8;

const PALM_SPOTS = [
  { x: 4.2, y: 1.5 },
  { x: 11.5, y: 1.4 },
  { x: 21.5, y: 1.5 },
  { x: 28.5, y: 2.2 },
  { x: 2.2, y: 11.5 },
  { x: 14.0, y: 11.2 },
  { x: 24.5, y: 11.5 },
  { x: 3.5, y: 17.5 },
  { x: 16.5, y: 17.8 },
  { x: 27.5, y: 17.5 },
];

const LAMP_SPOTS = [
  { x: 6.5, y: 13.2 },
  { x: 13.5, y: 13.2 },
  { x: 20.5, y: 13.2 },
  { x: 26.5, y: 13.2 },
];

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

function resolveStoreCollision(
  gx: number,
  gy: number,
  prevX: number,
  prevY: number,
  sectors: CitySector[]
) {
  let outX = Math.max(0.6, Math.min(GRID_COLS - 1.2, gx));
  let outY = Math.max(0.6, Math.min(GRID_ROWS - 1.2, gy));

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
  selectedSector,
  selectedMember,
  onSelectSector,
  onSelectMember,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPos = useRef({ gx: 15.5, gy: 11.5 });
  const targetPos = useRef<{ gx: number; gy: number } | null>(null);
  const camOffset = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1.15);
  const [zoomDisplay, setZoomDisplay] = useState(115);
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
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom(zoomRef.current + delta);
  };

  const getMapOrigin = (cssW: number) => ({
    originX: cssW / 2 + camOffset.current.x,
    originY: 68 + camOffset.current.y,
  });

  // Convert screen click coordinates back through zoom transform into world coordinates
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
    const { originX, originY } = getMapOrigin(rect.width);

    const { gx, gy } = isoToGrid(wx, wy, originX, originY);
    const clampedX = Math.max(0.6, Math.min(GRID_COLS - 1.2, gx));
    const clampedY = Math.max(0.6, Math.min(GRID_ROWS - 1.2, gy));

    targetPos.current = resolveStoreCollision(
      clampedX,
      clampedY,
      playerPos.current.gx,
      playerPos.current.gy,
      sectors
    );

    const clickedMember = members.find(
      (m) => Math.hypot(clampedX - m.x, clampedY - m.y) < 1.2
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

  const drawPalmTree = (
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    originX: number,
    originY: number,
    sway: number
  ) => {
    const base = gridToIso(gx, gy, originX, originY);
    const topX = base.x + sway;
    const topY = base.y - 38;

    ctx.strokeStyle = "#7c4a21";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + sway * 0.4, base.y - 20, topX, topY);
    ctx.stroke();

    const frondColors = ["#16a34a", "#22c55e", "#4ade80"];
    const angles = [-2.5, -1.7, -0.8, 0.1, 0.9, 2.2];
    angles.forEach((ang, i) => {
      ctx.strokeStyle = frondColors[i % frondColors.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(ang) * 11,
        topY + Math.sin(ang) * 7 - 6,
        topX + Math.cos(ang) * 20,
        topY + Math.sin(ang) * 12 + 4
      );
      ctx.stroke();
    });
    ctx.lineWidth = 1;
  };

  const drawCar = (
    ctx: CanvasRenderingContext2D,
    gx: number,
    gy: number,
    originX: number,
    originY: number,
    color: string
  ) => {
    const p = gridToIso(gx, gy, originX, originY);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(p.x - 13, p.y - 10, 26, 10, 4);
    ctx.fill();

    ctx.fillStyle = "#bae6fd";
    ctx.beginPath();
    ctx.roundRect(p.x - 8, p.y - 15, 16, 6, 3);
    ctx.fill();
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
      // Full uncapped devicePixelRatio so browser zoom + canvas zoom stay 100% razor-sharp
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const speed = 0.09;
      let dx = 0;
      let dy = 0;
      let isMoving = false;

      if (keysPressed.current["w"] || keysPressed.current["arrowup"]) dy -= speed;
      if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) dy += speed;
      if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) dx -= speed;
      if (keysPressed.current["d"] || keysPressed.current["arrowright"]) dx += speed;

      const prevX = playerPos.current.gx;
      const prevY = playerPos.current.gy;

      if (dx !== 0 || dy !== 0) {
        const resolved = resolveStoreCollision(prevX + dx, prevY + dy, prevX, prevY, sectors);
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
          const resolved = resolveStoreCollision(stepX, stepY, prevX, prevY, sectors);
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

      const pIsoPreview = gridToIso(playerPos.current.gx, playerPos.current.gy, cssW / 2, 68);
      const desiredCamX = Math.max(-280, Math.min(280, cssW / 2 - pIsoPreview.x));
      const desiredCamY = Math.max(-160, Math.min(140, cssH * 0.52 - pIsoPreview.y));
      camOffset.current.x += (desiredCamX - camOffset.current.x) * 0.08;
      camOffset.current.y += (desiredCamY - camOffset.current.y) * 0.08;

      const foundNear =
        sectors.find((s) => {
          const cx = s.x + s.width / 2;
          const cy = s.y + s.height / 2;
          return Math.hypot(playerPos.current.gx - cx, playerPos.current.gy - cy) < 3.1;
        }) || null;

      setNearbySector((prev) => (prev?.id === foundNear?.id ? prev : foundNear));

      ctx.clearRect(0, 0, cssW, cssH);

      // Background sky fills full viewport cleanly
      const skyGrad = ctx.createLinearGradient(0, 0, 0, cssH);
      skyGrad.addColorStop(0, "#311042");
      skyGrad.addColorStop(0.35, "#7e22ce");
      skyGrad.addColorStop(0.65, "#ec4899");
      skyGrad.addColorStop(1, "#0284c7");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, cssW, cssH);

      // Apply Crisp Vector Zoom around viewport center
      const z = zoomRef.current;
      ctx.translate(cssW / 2, cssH / 2);
      ctx.scale(z, z);
      ctx.translate(-cssW / 2, -cssH / 2);

      const { originX, originY } = getMapOrigin(cssW);

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const p0 = gridToIso(c, r, originX, originY);
          const p1 = gridToIso(c + 1, r, originX, originY);
          const p2 = gridToIso(c + 1, r + 1, originX, originY);
          const p3 = gridToIso(c, r + 1, originX, originY);

          let tileFill = (r + c) % 2 === 0 ? "#cbd5e1" : "#94a3b8";
          if (r >= 14 && r <= 15) {
            tileFill = "#1e293b";
          } else if (r >= 16 && r <= 19) {
            tileFill = (r + c) % 2 === 0 ? "#fde68a" : "#fcd34d";
          } else if (r >= 20) {
            tileFill = (r + c) % 2 === 0 ? "#06b6d4" : "#0284c7";
          } else if (c === 15 || c === 16) {
            tileFill = "#1e293b";
          } else if (r >= 6 && r <= 11 && c >= 10 && c <= 21) {
            tileFill = (r + c) % 2 === 0 ? "#86efac" : "#4ade80";
          }

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fillStyle = tileFill;
          ctx.fill();
          ctx.strokeStyle = "rgba(15, 23, 42, 0.14)";
          ctx.lineWidth = 1 / z;
          ctx.stroke();
        }
      }
      ctx.lineWidth = 1;

      LAMP_SPOTS.forEach((lp) => {
        const pos = gridToIso(lp.x, lp.y, originX, originY);
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x, pos.y - 22);
        ctx.stroke();
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 24, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
      });

      const netA = gridToIso(11, 17.5, originX, originY);
      const netB = gridToIso(15, 17.5, originX, originY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(netA.x, netA.y);
      ctx.lineTo(netA.x, netA.y - 16);
      ctx.moveTo(netB.x, netB.y);
      ctx.lineTo(netB.x, netB.y - 16);
      ctx.moveTo(netA.x, netA.y - 14);
      ctx.lineTo(netB.x, netB.y - 14);
      ctx.stroke();
      ctx.lineWidth = 1;

      const carOffset = ((walkPhase.current * 14) % 24) + 3;
      drawCar(ctx, carOffset, 14.4, originX, originY, "#f43f5e");
      drawCar(ctx, 28 - (carOffset % 22), 15.3, originX, originY, "#facc15");

      const sway = Math.sin(walkPhase.current * 0.6) * 2.5;
      PALM_SPOTS.forEach((pt) => drawPalmTree(ctx, pt.x, pt.y, originX, originY, sway));

      // HD Textured Stores / Landmarks
      sectors.forEach((sec) => {
        const topLeft = gridToIso(sec.x, sec.y, originX, originY);
        const topRight = gridToIso(sec.x + sec.width, sec.y, originX, originY);
        const bottomRight = gridToIso(sec.x + sec.width, sec.y + sec.height, originX, originY);
        const bottomLeft = gridToIso(sec.x, sec.y + sec.height, originX, originY);

        const counterH = 18;
        const roofH = 46;
        const isSelected = selectedSector?.id === sec.id;
        const isNear = foundNear?.id === sec.id;

        const baseColor = sec.color;
        const darkWall = shadeHex(baseColor, -32);
        const lightTrim = shadeHex(baseColor, 35);

        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(bottomLeft.x, bottomLeft.y);
        ctx.closePath();
        ctx.fillStyle = "rgba(15, 23, 42, 0.32)";
        ctx.fill();
        ctx.lineWidth = (isSelected || isNear ? 2.5 : 1) / z;
        ctx.strokeStyle = isSelected || isNear ? "#facc15" : "rgba(15,23,42,0.35)";
        ctx.stroke();
        ctx.lineWidth = 1;

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

        ctx.beginPath();
        ctx.moveTo(bottomRight.x, bottomRight.y);
        ctx.lineTo(topRight.x, topRight.y);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.closePath();
        ctx.fillStyle = darkWall;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(topLeft.x, topLeft.y - counterH);
        ctx.lineTo(topRight.x, topRight.y - counterH);
        ctx.lineTo(bottomRight.x, bottomRight.y - counterH);
        ctx.lineTo(bottomLeft.x, bottomLeft.y - counterH);
        ctx.closePath();
        ctx.fillStyle = "#f8fafc";
        ctx.fill();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bottomLeft.x + 4, bottomLeft.y - counterH + 5);
        ctx.lineTo(bottomRight.x - 4, bottomRight.y - counterH + 5);
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2.6;
        [topLeft, topRight, bottomRight, bottomLeft].forEach((corner) => {
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y - counterH);
          ctx.lineTo(corner.x, corner.y - roofH);
          ctx.stroke();
        });
        ctx.lineWidth = 1;

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

        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 6;
        for (let sx = topLeft.x - 140; sx < topRight.x + 140; sx += 14) {
          ctx.beginPath();
          ctx.moveTo(sx, topLeft.y - roofH - 60);
          ctx.lineTo(sx + 70, bottomRight.y - roofH + 60);
          ctx.stroke();
        }
        ctx.restore();

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

        const center = gridToIso(
          sec.x + sec.width / 2,
          sec.y + sec.height / 2,
          originX,
          originY
        );

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

        ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        const labelW = ctx.measureText(sec.name).width + 14;
        ctx.fillStyle = "rgba(9, 13, 26, 0.9)";
        ctx.beginPath();
        ctx.roundRect(center.x - labelW / 2, center.y - roofH - 6, labelW, 17, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(sec.name, center.x, center.y - roofH + 6);

        if (isNear) {
          const popupText = `${sec.name}: ${sec.description.slice(0, 44)}${
            sec.description.length > 44 ? "..." : ""
          }`;
          ctx.font = "bold 11px system-ui, sans-serif";
          const textW = Math.min(270, ctx.measureText(popupText).width + 22);
          const boxX = center.x - textW / 2;
          const boxY = signY - 46;

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

      // Builders / Creators / Members
      members.forEach((m, index) => {
        const mPos = gridToIso(m.x, m.y, originX, originY);
        const w = m.bodyWidth;
        const h = m.bodyHeight;
        const torsoW = 13 * w;
        const torsoH = 16 * h;
        const headR = 6.5;
        const isSelected = selectedMember?.id === m.id;
        const idleWave = Math.sin(walkPhase.current * 1.3 + index * 1.5) * (isSelected ? 4.5 : 0);

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
        ctx.lineTo(mPos.x - torsoW / 2 - 4 * w, shoulderY + 7);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mPos.x + torsoW / 2, shoulderY);
        ctx.lineTo(mPos.x + torsoW / 2 + 4 * w, shoulderY + 7 - Math.abs(idleWave));
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

      // Player Avatar
      const pScreen = gridToIso(playerPos.current.gx, playerPos.current.gy, originX, originY);
      const wScale = avatar.bodyWidth;
      const hScale = avatar.bodyHeight;
      const headR = 7 * avatar.headScale;
      const torsoW = 14 * wScale;
      const torsoH = 18 * hScale;

      const armAmp = isMoving ? 7.5 : 0;
      const leftArmOffset = isMoving ? Math.sin(walkPhase.current) * armAmp : 0;
      const rightArmOffset = isMoving ? Math.sin(walkPhase.current + Math.PI) * armAmp : 0;
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
        onWheel={handleWheel}

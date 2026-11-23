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
const STORE_MARGIN = 0.45; // Solid border padding around every dApp store

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

// Keeps (gx, gy) outside all dApp store borders
function resolveStoreCollision(
  gx: number,
  gy: number,
  prevX: number,
  prevY: number,
  sectors: CitySector[]
) {
  let outX = Math.max(0.5, Math.min(GRID_COLS - 1, gx));
  let outY = Math.max(0.5, Math.min(GRID_ROWS - 1, gy));

  for (const s of sectors) {
    const minX = s.x - STORE_MARGIN;
    const maxX = s.x + s.width + STORE_MARGIN;
    const minY = s.y - STORE_MARGIN;
    const maxY = s.y + s.height + STORE_MARGIN;

    if (outX > minX && outX < maxX && outY > minY && outY < maxY) {
      // Try moving only on X or only on Y from previous valid position
      const canMoveX =
        !(prevX > minX && prevX < maxX && outY > minY && outY < maxY);
      const canMoveY =
        !(outX > minX && outX < maxX && prevY > minY && prevY < maxY);

      if (canMoveX && !canMoveY) {
        outY = prevY;
      } else if (canMoveY && !canMoveX) {
        outX = prevX;
      } else {
        // Push out to nearest border edge
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

    // Clamp walk target outside store borders so player stops right at the border
    const safeTarget = resolveStoreCollision(
      clampedX,
      clampedY,
      playerPos.current.gx,
      playerPos.current.gy,
      sectors
    );
    targetPos.current = safeTarget;

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


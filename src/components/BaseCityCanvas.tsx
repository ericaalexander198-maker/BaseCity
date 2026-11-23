import React, { useEffect, useRef, useState } from "react";
import { CityMember, CitySector } from "../data/sectors";
import { AvatarConfig } from "./AvatarCustomizer";
import { CityThemeConfig } from "./CityCustomizerDrawer";
import { CityDecorItem, DecorKind } from "./CityManagerTool";

export type CityGroundSize = "compact" | "standard" | "mega";

export interface BaseMarketSnapshot {
  tvl: string;
  tvlChange24h: string;
  stablecoins: string;
  dexVol24h: string;
  activeAddresses24h: string;
  marketStatus: "BULLISH" | "ACTIVE" | "CAUTIOUS";
  updatedLabel: string;
}

interface BaseCityCanvasProps {
  avatar: AvatarConfig;
  theme: CityThemeConfig;
  sectors: CitySector[];
  members: CityMember[];
  decorItems: CityDecorItem[];
  placingDecorKind: DecorKind | null;
  onPlaceDecorAt: (gx: number, gy: number) => void;
  groundSize: CityGroundSize;
  marketSnapshot: BaseMarketSnapshot;
  isSyncingMarket?: boolean;
  onRefreshMarket?: () => void;
  selectedSector: CitySector | null;
  selectedMember: CityMember | null;
  onSelectSector: (sector: CitySector | null) => void;
  onSelectMember: (member: CityMember | null) => void;
  onOpenMarketCorner?: () => void;
}

interface RoomBox {
  id: string;
  gx: number;
  gy: number;
  gw: number;
  gh: number;
  floor: string;
  wallTop: string;
  wallSide: string;
  borderColor: string;
  labelColor: string;
  label: string;
  doorSide: "south" | "north" | "west" | "east";
  doorSpan: number;
  deskAccentA: string;
  deskAccentB: string;
}

const GROUND_DIMS: Record<CityGroundSize, { cols: number; rows: number }> = {
  compact: { cols: 38, rows: 24 },
  standard: { cols: 50, rows: 32 },
  mega: { cols: 64, rows: 40 },
};

const TILE_SIZE = 34;
const WALL_THICK = 0.24;
const STORE_MARGIN = 0.45;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.8;

const ROOMS: RoomBox[] = [
  {
    id: "team-settlement",
    gx: 3,
    gy: 3,
    gw: 11,
    gh: 8,
    floor: "#e0e7ff",
    wallTop: "#a5b4fc",
    wallSide: "#6366f1",
    borderColor: "#4f46e5",
    labelColor: "#312e81",
    label: "BASE TEAM SETTLEMENT",
    doorSide: "south",
    doorSpan: 3.0,
    deskAccentA: "#3b82f6",
    deskAccentB: "#6366f1",
  },
  {
    id: "builder-lounge",
    gx: 17,
    gy: 3,
    gw: 12,
    gh: 8,
    floor: "#f1f5f9",
    wallTop: "#cbd5e1",
    wallSide: "#64748b",
    borderColor: "#475569",
    labelColor: "#1e293b",
    label: "BASE BUILDER LOUNGE",
    doorSide: "south",
    doorSpan: 3.0,
    deskAccentA: "#0052FF",
    deskAccentB: "#0ea5e9",
  },
  {
    id: "ops-squad",
    gx: 3,
    gy: 14,
    gw: 11,
    gh: 8,
    floor: "#fef3c7",
    wallTop: "#fcd34d",
    wallSide: "#d97706",
    borderColor: "#b45309",
    labelColor: "#78350f",
    label: "TEAM OPS & SQUAD",
    doorSide: "east",
    doorSpan: 3.0,
    deskAccentA: "#f59e0b",
    deskAccentB: "#ea580c",
  },
  {
    id: "core-builder-hub",
    gx: 17,
    gy: 14,
    gw: 12,
    gh: 8,
    floor: "#e0f2fe",
    wallTop: "#7dd3fc",
    wallSide: "#0284c7",
    borderColor: "#0369a1",
    labelColor: "#0c4a6e",
    label: "BUILDER SHIP ROOM",
    doorSide: "west",
    doorSpan: 3.0,
    deskAccentA: "#0052FF",
    deskAccentB: "#10b981",
  },
  {
    id: "creators-corner",
    gx: 32,
    gy: 3,
    gw: 10,
    gh: 19,
    floor: "#fce7f3",
    wallTop: "#f9a8d4",
    wallSide: "#db2777",
    borderColor: "#be185d",
    labelColor: "#831843",
    label: "CREATORS CORNER",
    doorSide: "west",
    doorSpan: 3.2,
    deskAccentA: "#ec4899",
    deskAccentB: "#f43f5e",
  },
];

function getDoorRange(room: RoomBox) {
  if (room.doorSide === "south" || room.doorSide === "north") {
    const center = room.gx + room.gw / 2;
    return {
      start: center - room.doorSpan / 2,
      end: center + room.doorSpan / 2,
    };
  }
  const center = room.gy + room.gh / 2;
  return {
    start: center - room.doorSpan / 2,
    end: center + room.doorSpan / 2,
  };
}

function isInsideDoorOpening(
  gx: number,
  gy: number,
  room: RoomBox,
  pad = 0.25
): boolean {
  const door = getDoorRange(room);
  if (room.doorSide === "south") {
    return (
      Math.abs(gy - (room.gy + room.gh)) <= WALL_THICK + pad &&
      gx >= door.start - pad &&
      gx <= door.end + pad
    );
  }
  if (room.doorSide === "north") {
    return (
      Math.abs(gy - room.gy) <= WALL_THICK + pad &&
      gx >= door.start - pad &&
      gx <= door.end + pad
    );
  }
  if (room.doorSide === "east") {
    return (
      Math.abs(gx - (room.gx + room.gw)) <= WALL_THICK + pad &&
      gy >= door.start - pad &&
      gy <= door.end + pad
    );
  }
  return (
    Math.abs(gx - room.gx) <= WALL_THICK + pad &&
    gy >= door.start - pad &&
    gy <= door.end + pad
  );
}

function hitsRoomWall(
  gx: number,
  gy: number,
  room: RoomBox,
  radius = 0.26
): boolean {
  if (isInsideDoorOpening(gx, gy, room)) return false;

  const xMin = room.gx;
  const xMax = room.gx + room.gw;
  const yMin = room.gy;
  const yMax = room.gy + room.gh;

  const withinXBand =
    gx >= xMin - WALL_THICK - radius && gx <= xMax + WALL_THICK + radius;
  const withinYBand =
    gy >= yMin - WALL_THICK - radius && gy <= yMax + WALL_THICK + radius;

  const onNorthWall = withinXBand && Math.abs(gy - yMin) < WALL_THICK + radius;
  const onSouthWall = withinXBand && Math.abs(gy - yMax) < WALL_THICK + radius;
  const onWestWall = withinYBand && Math.abs(gx - xMin) < WALL_THICK + radius;
  const onEastWall = withinYBand && Math.abs(gx - xMax) < WALL_THICK + radius;

  return onNorthWall || onSouthWall || onWestWall || onEastWall;
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
      const canMoveX = !(
        prevX > minX &&
        prevX < maxX &&
        outY > minY &&
        outY < maxY
      );
      const canMoveY = !(
        outX > minX &&
        outX < maxX &&
        prevY > minY &&
        prevY < maxY
      );

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

  for (const room of ROOMS) {
    if (hitsRoomWall(outX, outY, room)) {
      const canMoveX = !hitsRoomWall(outX, prevY, room);
      const canMoveY = !hitsRoomWall(prevX, outY, room);
      if (canMoveX && !canMoveY) {
        outY = prevY;
      } else if (canMoveY && !canMoveX) {
        outX = prevX;
      } else {
        outX = prevX;
        outY = prevY;
      }
    }
  }

  return { gx: outX, gy: outY };
}

export const BaseCityCanvas: React.FC<BaseCityCanvasProps> = ({
  avatar,
  theme,
  sectors,
  members,
  decorItems,
  placingDecorKind,
  onPlaceDecorAt,
  groundSize,
  marketSnapshot,
  isSyncingMarket = false,
  onRefreshMarket,
  selectedSector,
  selectedMember,
  onSelectSector,
  onSelectMember,
  onOpenMarketCorner,
}) => {
  const { cols: gridCols, rows: gridRows } = GROUND_DIMS[groundSize];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPos = useRef({ gx: 15.5, gy: 12.5 });
  const targetPos = useRef<{ gx: number; gy: number } | null>(null);
  const camOffset = useRef({ x: 0, y: 0 });
  const zoomRef = useRef<number | null>(null);
  const [zoomDisplay, setZoomDisplay] = useState(85);
  const [billboardOpen, setBillboardOpen] = useState(true);
  const keysPressed = useRef<Record<string, boolean>>({});
  const walkPhase = useRef(0);
  const logoCache = useRef<Record<string, HTMLImageElement>>({});
  const [nearbySector, setNearbySector] = useState<CitySector | null>(null);

  const getActiveZoom = (cssW: number) => {
    if (zoomRef.current !== null) return zoomRef.current;
    const mapPixelWidth = gridCols * TILE_SIZE;
    const ideal = Math.max(
      MIN_ZOOM,
      Math.min(1.15, (cssW * 0.72) / mapPixelWidth)
    );
    const rounded = Number(ideal.toFixed(2));
    zoomRef.current = rounded;
    return rounded;
  };

  useEffect(() => {
    zoomRef.current = null;
  }, [groundSize]);

  const setZoom = (next: number) => {
    const clamped = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, Number(next.toFixed(2)))
    );
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
    const currentZ = getActiveZoom(canvasRef.current?.clientWidth || 900);
    setZoom(currentZ + (e.deltaY < 0 ? 0.12 : -0.12));
  };

  const getMapOrigin = (cssW: number, cssH: number) => {
    const mapW = gridCols * TILE_SIZE;
    const mapH = gridRows * TILE_SIZE;
    return {
      originX: (cssW - mapW) / 2 + camOffset.current.x,
      originY: (cssH - mapH) / 2 + camOffset.current.y,
    };
  };

  const screenToWorld = (
    sx: number,
    sy: number,
    cssW: number,
    cssH: number
  ) => {
    const z = getActiveZoom(cssW);
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

    if (placingDecorKind) {
      onPlaceDecorAt(Number(clampedX.toFixed(2)), Number(clampedY.toFixed(2)));
      return;
    }

    if (clampedX >= 3 && clampedX <= 12.5 && clampedY >= 24 && clampedY <= 27.5) {
      onOpenMarketCorner?.();
    }

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

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + w * 0.25, y + 3, w * 0.5, 8);
    ctx.fillStyle = accent;
    ctx.fillRect(x + w * 0.28, y + 4.5, w * 0.44, 5);
    ctx.lineWidth = 1;
  };

  const drawWallSegment3D = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    topColor: string,
    sideColor: string,
    hasFrontFace: boolean
  ) => {
    if (pw <= 0 || ph <= 0) return;
    if (hasFrontFace) {
      ctx.fillStyle = sideColor;
      ctx.fillRect(px, py + ph - 1, pw, theme.wallExtrudeHeight);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
      ctx.strokeRect(px, py + ph - 1, pw, theme.wallExtrudeHeight);
    }
    ctx.fillStyle = topColor;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.25)";
    ctx.strokeRect(px, py, pw, ph);
  };

  const drawRoomWith3DBoundaryAndDoor = (
    ctx: CanvasRenderingContext2D,
    room: RoomBox,
    originX: number,
    originY: number
  ) => {
    const rx = originX + room.gx * TILE_SIZE;
    const ry = originY + room.gy * TILE_SIZE;
    const rw = room.gw * TILE_SIZE;
    const rh = room.gh * TILE_SIZE;
    const wt = WALL_THICK * TILE_SIZE;

    ctx.fillStyle = room.floor;
    ctx.fillRect(rx, ry, rw, rh);

    drawDeskSet(ctx, rx + 22, ry + 26, 48, 20, room.deskAccentA);
    if (room.gh >= 12) {
      drawDeskSet(ctx, rx + rw - 72, ry + 190, 48, 20, room.deskAccentB);
    } else {
      drawDeskSet(ctx, rx + rw - 72, ry + 26, 48, 20, room.deskAccentB);
    }

    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = room.labelColor;
    ctx.textAlign = "left";
    ctx.fillText(room.label, rx + 12, ry + 15);

    const door = getDoorRange(room);
    const dStartGridPx =
      room.doorSide === "south" || room.doorSide === "north"
        ? originX + door.start * TILE_SIZE
        : originY + door.start * TILE_SIZE;
    const dEndGridPx =
      room.doorSide === "south" || room.doorSide === "north"
        ? originX + door.end * TILE_SIZE
        : originY + door.end * TILE_SIZE;

    drawWallSegment3D(
      ctx,
      rx - wt,
      ry - wt,
      rw + wt * 2,
      wt,
      room.wallTop,
      room.wallSide,
      false
    );

    if (room.doorSide === "south") {
      if (theme.showRoomDoors) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
        ctx.fillRect(
          dStartGridPx,
          ry + rh - wt,
          dEndGridPx - dStartGridPx,
          wt
        );
      }
      drawWallSegment3D(
        ctx,
        rx - wt,
        ry + rh - wt,
        Math.max(0, dStartGridPx - (rx - wt)),
        wt,
        room.wallTop,
        room.wallSide,
        true
      );
      drawWallSegment3D(
        ctx,
        dEndGridPx,
        ry + rh - wt,
        Math.max(0, rx + rw + wt - dEndGridPx),
        wt,
        room.wallTop,
        room.wallSide,
        true
      );
    } else {
      drawWallSegment3D(
        ctx,
        rx - wt,
        ry + rh - wt,
        rw + wt * 2,
        wt,
        room.wallTop,
        room.wallSide,
        true
      );
    }

    if (room.doorSide === "west") {
      if (theme.showRoomDoors) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
        ctx.fillRect(
          rx - wt,
          dStartGridPx,
          wt,
          dEndGridPx - dStartGridPx
        );
      }
      drawWallSegment3D(
        ctx,
        rx - wt,
        ry - wt,
        wt,
        Math.max(0, dStartGridPx - (ry - wt)),
        room.wallTop,
        room.wallSide,
        false
      );
      drawWallSegment3D(
        ctx,
        rx - wt,
        dEndGridPx,
        wt,
        Math.max(0, ry + rh + wt - dEndGridPx),
        room.wallTop,
        room.wallSide,
        true
      );
    } else {
      drawWallSegment3D(
        ctx,
        rx - wt,
        ry - wt,
        wt,
        rh + wt * 2,
        room.wallTop,
        room.wallSide,
        true
      );
    }

    if (room.doorSide === "east") {
      if (theme.showRoomDoors) {
        ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
        ctx.fillRect(
          rx + rw - wt,
          dStartGridPx,
          wt,
          dEndGridPx - dStartGridPx
        );
      }
      drawWallSegment3D(
        ctx,
        rx + rw - wt,
        ry - wt,
        wt,
        Math.max(0, dStartGridPx - (ry - wt)),
        room.wallTop,
        room.wallSide,
        false
      );
      drawWallSegment3D(
        ctx,
        rx + rw - wt,
        dEndGridPx,
        wt,
        Math.max(0, ry + rh + wt - dEndGridPx),
        room.wallTop,
        room.wallSide,
        true
      );
    } else {
      drawWallSegment3D(
        ctx,
        rx + rw - wt,
        ry - wt,
        wt,
        rh + wt * 2,
        room.wallTop,
        room.wallSide,
        true
      );
    }
  };

  const drawDecorProp = (
    ctx: CanvasRenderingContext2D,
    kind: DecorKind,
    px: number,
    py: number,
    sway: number
  ) => {
    ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
    ctx.beginPath();
    ctx.ellipse(px, py + 9, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (kind === "pine_tree") {
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
      return;
    }

    if (kind === "palm_tree") {
      const topX = px + sway * 1.4;
      const topY = py - 24;
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px, py + 6);
      ctx.quadraticCurveTo(px + sway * 0.5, py - 10, topX, topY);
      ctx.stroke();

      const fronds = [-2.5, -1.6, -0.7, 0.2, 1.0, 2.2];
      fronds.forEach((ang, i) => {
        ctx.strokeStyle = i % 2 === 0 ? "#16a34a" : "#4ade80";
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.cos(ang) * 9,
          topY + Math.sin(ang) * 6 - 4,
          topX + Math.cos(ang) * 16,
          topY + Math.sin(ang) * 9 + 3
        );
        ctx.stroke();
      });
      ctx.lineWidth = 1;
      return;
    }

    if (kind === "bench") {
      ctx.fillStyle = "#b45309";
      ctx.beginPath();
      ctx.roundRect(px - 12, py - 4, 24, 9, 2);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px - 12, py - 9, 24, 4);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(px - 9, py + 5, 3, 4);
      ctx.fillRect(px + 6, py + 5, 3, 4);
      return;
    }

    if (kind === "lamp") {
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py + 7);
      ctx.lineTo(px, py - 18);
      ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(px, py - 20, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      return;
    }

    if (kind === "planter") {
      ctx.fillStyle = "#c2410c";
      ctx.beginPath();
      ctx.roundRect(px - 10, py - 3, 20, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(px - 4, py - 6, 5, 0, Math.PI * 2);
      ctx.arc(px + 4, py - 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(px, py - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (kind === "fountain") {
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.ellipse(px, py + 2, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px - 3, py - 9, 6, 10);
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.arc(px, py - 11, 4.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py + 7);
    ctx.lineTo(px, py - 13);
    ctx.stroke();
    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.arc(px, py - 13, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
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

      const speed = 0.14;
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

      const { originX: baseOriginX, originY: baseOriginY } = getMapOrigin(
        cssW,
        cssH
      );
      const pWorldX = baseOriginX + playerPos.current.gx * TILE_SIZE;
      const pWorldY = baseOriginY + playerPos.current.gy * TILE_SIZE;
      const desiredCamX = Math.max(
        -360,
        Math.min(360, (cssW / 2 - pWorldX) * 0.55)
      );
      const desiredCamY = Math.max(
        -240,
        Math.min(240, (cssH / 2 - pWorldY) * 0.55)
      );
      camOffset.current.x += (desiredCamX - camOffset.current.x) * 0.08;
      camOffset.current.y += (desiredCamY - camOffset.current.y) * 0.08;

      const foundNear =
        sectors.find((s) => {
          const cx = s.x + s.width / 2;
          const cy = s.y + s.height / 2;
          return (
            Math.hypot(
              playerPos.current.gx - cx,
              playerPos.current.gy - cy
            ) < 3.6
          );
        }) || null;

      setNearbySector((prev) => (prev?.id === foundNear?.id ? prev : foundNear));

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = theme.grassSecondary;
      ctx.fillRect(0, 0, cssW, cssH);

      const z = getActiveZoom(cssW);
      ctx.translate(cssW / 2, cssH / 2);
      ctx.scale(z, z);
      ctx.translate(-cssW / 2, -cssH / 2);

      const { originX, originY } = getMapOrigin(cssW, cssH);
      const campusCols = gridCols - 6;
      const campusRows = gridRows - 2;

      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const x = originX + c * TILE_SIZE;
          const y = originY + r * TILE_SIZE;
          const inCampus =
            r >= 1 && r < campusRows && c >= 1 && c < campusCols;

          if (!inCampus) {
            ctx.fillStyle =
              (r + c) % 2 === 0 ? theme.grassPrimary : theme.grassSecondary;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.fillStyle =
              (r + c) % 2 === 0
                ? theme.streetPrimary
                : theme.streetSecondary;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            if (theme.showGrid) {
              ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
              ctx.lineWidth = 1 / z;
              ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }

      const cx0 = originX + TILE_SIZE;
      const cy0 = originY + TILE_SIZE;
      const cw = (campusCols - 1) * TILE_SIZE;
      const ch = (campusRows - 1) * TILE_SIZE;

      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 5;
      ctx.strokeRect(cx0, cy0, cw, ch);
      ctx.lineWidth = 1;

      ROOMS.forEach((rm) => {
        if (rm.gx + rm.gw <= campusCols && rm.gy + rm.gh <= campusRows) {
          drawRoomWith3DBoundaryAndDoor(ctx, rm, originX, originY);
        }
      });

      const tvlX = originX + 3 * TILE_SIZE;
      const tvlY = originY + 24 * TILE_SIZE;
      const tvlW = 9.5 * TILE_SIZE;
      const tvlH = 3.5 * TILE_SIZE;
      if (3 + 9.5 <= campusCols && 24 + 3.5 <= campusRows) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(tvlX, tvlY, tvlW, tvlH);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.strokeRect(tvlX, tvlY, tvlW, tvlH);
        ctx.lineWidth = 1;

        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.textAlign = "left";
        ctx.fillText("BASE TVL & MARKET CORNER", tvlX + 12, tvlY + 16);

        ctx.fillStyle =
          marketSnapshot.marketStatus === "BULLISH"
            ? "#22c55e"
            : marketSnapshot.marketStatus === "ACTIVE"
            ? "#38bdf8"
            : "#facc15";
        ctx.fillText(marketSnapshot.marketStatus, tvlX + tvlW - 68, tvlY + 16);

        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(
          `TVL: ${marketSnapshot.tvl} (${marketSnapshot.tvlChange24h})`,
          tvlX + 12,
          tvlY + 40
        );

        ctx.font = "11px system-ui, sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(
          `Stables: ${marketSnapshot.stablecoins} • 24h DEX: ${marketSnapshot.dexVol24h}`,
          tvlX + 12,
          tvlY + 62
        );
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(
          `Active Addrs: ${marketSnapshot.activeAddresses24h} • ${marketSnapshot.updatedLabel}`,
          tvlX + 12,
          tvlY + 82
        );
      }

      const sway = Math.sin(walkPhase.current * 0.6) * 1.5;
      decorItems
        .filter((d) => d.x < gridCols && d.y < gridRows)
        .forEach((d) => {
          const px = originX + d.x * TILE_SIZE;
          const py = originY + d.y * TILE_SIZE;
          drawDecorProp(ctx, d.kind, px, py, sway);
        });

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

        ctx.fillStyle = sec.color;
        ctx.fillRect(sx + 6, sy + sh - 16, sw - 12, 10);

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
      });

      members.forEach((m, index) => {
        const px = originX + m.x * TILE_SIZE;
        const py = originY + m.y * TILE_SIZE;
        const w = m.bodyWidth;
        const h = m.bodyHeight;
        const torsoW = 12 * w;
        const torsoH = 14 * h;
        const isSelected = selectedMember?.id === m.id;
        const wave =
          Math.sin(walkPhase.current * 1.4 + index) * (isSelected ? 4 : 0);

        ctx.fillStyle = isSelected
          ? "rgba(250,204,21,0.45)"
          : "rgba(15,23,42,0.25)";
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
  }, [
    avatar,
    theme,
    sectors,
    members,
    decorItems,
    groundSize,
    marketSnapshot,
    gridCols,
    gridRows,
    selectedSector,
    selectedMember,
  ]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: placingDecorKind ? "crosshair" : "pointer",
        }}
      />

      {!billboardOpen ? (
        <button
          type="button"
          onClick={() => setBillboardOpen(true)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 9,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(56, 189, 248, 0.45)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#38bdf8",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          📊 TVL ({marketSnapshot.tvl})
        </button>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 9,
            width: "min(224px, calc(100vw - 24px))",
            maxHeight: "calc(100% - 96px)",
            overflowY: "auto",
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 12,
            padding: 12,
            color: "#f8fafc",
            fontSize: 12,
            boxShadow: "0 10px 24px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
              paddingBottom: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#38bdf8",
                letterSpacing: 0.4,
              }}
            >
              DEFILLAMA • BASE BOARD
            </span>
            <button
              type="button"
              onClick={() => setBillboardOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
              }}
              title="Minimize billboard"
            >
              —
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "#94a3b8", fontSize: 11 }}>Chain TVL</span>
            <strong style={{ fontSize: 16, color: "#ffffff" }}>
              {marketSnapshot.tvl}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#94a3b8" }}>Market Status</span>
            <span
              style={{
                fontWeight: 700,
                color:
                  marketSnapshot.marketStatus === "BULLISH"
                    ? "#4ade80"
                    : marketSnapshot.marketStatus === "ACTIVE"
                    ? "#38bdf8"
                    : "#facc15",
              }}
            >
              {marketSnapshot.marketStatus} ({marketSnapshot.tvlChange24h})
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              background: "rgba(30, 41, 59, 0.75)",
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>Stables</div>
              <strong>{marketSnapshot.stablecoins}</strong>
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>24h DEX</div>
              <strong>{marketSnapshot.dexVol24h}</strong>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>
                24h Active Addresses
              </div>
              <strong>{marketSnapshot.activeAddresses24h}</strong>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 10,
              color: "#94a3b8",
            }}
          >
            <span>{marketSnapshot.updatedLabel}</span>
            {onRefreshMarket && (
              <button
                type="button"
                onClick={onRefreshMarket}
                disabled={isSyncingMarket}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #334155",
                  background: "#1e293b",
                  color: "#93c5fd",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isSyncingMarket ? "Syncing..." : "↻ Sync"}
              </button>
            )}
          </div>
        </div>
      )}

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
          onClick={() =>
            setZoom(getActiveZoom(canvasRef.current?.clientWidth || 900) - 0.2)
          }
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
          onClick={() =>
            setZoom(getActiveZoom(canvasRef.current?.clientWidth || 900) + 0.2)
          }
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
          onClick={() => setZoom(0.85)}
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
        {placingDecorKind ? (
          <span style={{ color: "#facc15", fontWeight: 700 }}>
            Click anywhere on the map to place{" "}
            {placingDecorKind.replace("_", " ")}
          </span>
        ) : (
          <span>
            {gridCols}×{gridRows} Metropolis • Base TVL:{" "}
            <b style={{ color: "#38bdf8" }}>{marketSnapshot.tvl}</b>
          </span>
        )}
        {nearbySector && (
          <span style={{ marginLeft: 10, color: "#38bdf8" }}>
            Near: <b>{nearbySector.name}</b>
          </span>
        )}
      </div>
    </div>
  );
};

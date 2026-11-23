export type CityZone =
  | "Builders & Finance"
  | "DeFi & Apps"
  | "Creator Stage"
  | "Beach & Lounge";

export interface CitySector {
  id: string;
  name: string;
  logoText: string;
  logoUrl?: string;
  zone: CityZone;
  roleLabel: string;
  description: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  accent: string;
}

export interface CityMember {
  id: string;
  name: string;
  handle: string;
  role: "Builder" | "Creator" | "Member";
  link: string;
  bio: string;
  x: number;
  y: number;
  bodyWidth: number;
  bodyHeight: number;
  outfitColor: string;
  skinTone: string;
  visor: boolean;
}

export const INITIAL_SECTORS: CitySector[] = [
  {
    id: "base-builders-hq",
    name: "Base Builders HQ",
    logoText: "B",
    zone: "Builders & Finance",
    roleLabel: "Builders & Team Hub",
    description:
      "Main stall where Base builders and ecosystem teams ship onchain apps.",
    url: "https://base.org",
    x: 2,
    y: 2,
    width: 2.5,
    height: 2,
    color: "#2563eb",
    accent: "#93c5fd",
  },
  {
    id: "bankr-defi-plaza",
    name: "Bankr DeFi Stall",
    logoText: "D",
    zone: "DeFi & Apps",
    roleLabel: "dApps & Liquidity Booth",
    description:
      "Downtown stall where DeFi protocols, swaps, and onchain finance live.",
    url: "https://www.base.org/ecosystem",
    x: 8,
    y: 2,
    width: 2.5,
    height: 2,
    color: "#7c3aed",
    accent: "#ddd6fe",
  },
  {
    id: "clanker-stage",
    name: "Clanker Booth",
    logoText: "C",
    zone: "Creator Stage",
    roleLabel: "Creators & Events Stall",
    description:
      "Music, memes, and creator showcase booth in the heart of Base City.",
    url: "https://www.clanker.world",
    x: 14,
    y: 2,
    width: 2.5,
    height: 2,
    color: "#db2777",
    accent: "#fbcfe8",
  },
  {
    id: "feel-cash-beach",
    name: "Feel.Cash Beach Stall",
    logoText: "F",
    zone: "Beach & Lounge",
    roleLabel: "Beach & Hangout Booth",
    description:
      "Sunny beachfront stall with hangout spots and community corners.",
    url: "https://base.org",
    x: 5,
    y: 10,
    width: 2.5,
    height: 2,
    color: "#0891b2",
    accent: "#a5f3fc",
  },
];

export const INITIAL_MEMBERS: CityMember[] = [
  {
    id: "member-jesse",
    name: "Base Builder",
    handle: "@base",
    role: "Builder",
    link: "https://x.com/base",
    bio: "Building the onchain economy on Base.",
    x: 5.5,
    y: 6.2,
    bodyWidth: 1.05,
    bodyHeight: 1.02,
    outfitColor: "#0052FF",
    skinTone: "#E5B893",
    visor: true,
  },
  {
    id: "member-creator",
    name: "Onchain Creator",
    handle: "@creator_base",
    role: "Creator",
    link: "https://x.com/base",
    bio: "Making videos, memes, and guides for Base.",
    x: 12.5,
    y: 6.2,
    bodyWidth: 0.95,
    bodyHeight: 0.98,
    outfitColor: "#EC4899",
    skinTone: "#C68B59",
    visor: false,
  },
];

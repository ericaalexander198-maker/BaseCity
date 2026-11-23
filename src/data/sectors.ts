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
    name: "Base Builders Corner",
    logoText: "B",
    zone: "Builders & Finance",
    roleLabel: "Builders & Team Hub",
    description:
      "Top-left corner hub where Base builders and ecosystem teams ship onchain apps.",
    url: "https://base.org",
    x: 0.8,
    y: 0.8,
    width: 2.4,
    height: 2.0,
    color: "#2563eb",
    accent: "#93c5fd",
  },
  {
    id: "clanker-stage",
    name: "Clanker Corner Stage",
    logoText: "C",
    zone: "Creator Stage",
    roleLabel: "Creators & Events Booth",
    description:
      "Top-right corner booth for music, memes, and creator showcases in Base City.",
    url: "https://www.clanker.world",
    x: 18.2,
    y: 0.8,
    width: 2.4,
    height: 2.0,
    color: "#db2777",
    accent: "#fbcfe8",
  },
  {
    id: "bankr-defi-plaza",
    name: "Bankr DeFi Store",
    logoText: "D",
    zone: "DeFi & Apps",
    roleLabel: "dApps & Liquidity Store",
    description:
      "Outer-left storefront for DeFi protocols, swaps, and onchain finance.",
    url: "https://www.base.org/ecosystem",
    x: 0.8,
    y: 6.2,
    width: 2.4,
    height: 2.0,
    color: "#7c3aed",
    accent: "#ddd6fe",
  },
  {
    id: "feel-cash-beach",
    name: "Feel.Cash Beach Store",
    logoText: "F",
    zone: "Beach & Lounge",
    roleLabel: "Beachfront Corner Store",
    description:
      "Corner boardwalk store near the coast with hangout spots and community perks.",
    url: "https://base.org",
    x: 18.2,
    y: 11.4,
    width: 2.4,
    height: 2.0,
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
    x: 7.5,
    y: 6.0,
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
    x: 13.5,
    y: 6.0,
    bodyWidth: 0.95,
    bodyHeight: 0.98,
    outfitColor: "#EC4899",
    skinTone: "#C68B59",
    visor: false,
  },
];

import type { PressKitFormData, PressKitTemplate } from "../types/press-kit";

export const initialForm: PressKitFormData = {
  artistName: "",
  realName: "",
  city: "",
  email: "",
  phone: "",
  biography: "",
  experiences: "",
  genres: [],
  equipment: [],
  instagram: "",
  soundcloud: "",
  website: "",
};

export const templates: PressKitTemplate[] = [
  {
    id: "pulse",
    number: "01",
    name: "PULSE",
    description: "Editorial, directo y eléctrico.",
    accent: "#b7ff3c",
  },
  {
    id: "voltage",
    number: "02",
    name: "VOLTAGE",
    description: "Cinemático, cálido y nocturno.",
    accent: "#ff2a78",
  },
  {
    id: "afterdark",
    number: "03",
    name: "AFTERDARK",
    description: "Minimal, intenso y underground.",
    accent: "#ff3d24",
  },
];

export const genres = [
  "House",
  "Tech House",
  "Techno",
  "Melodic Techno",
  "Progressive",
  "Afro House",
  "Minimal",
  "Trance",
  "Drum & Bass",
  "Open Format",
];

export const equipment = [
  "CDJ-3000",
  "CDJ-2000NXS2",
  "DJM-A9",
  "DJM-900NXS2",
  "XDJ-XZ",
  "Allen & Heath Xone:96",
  "Traktor",
  "Serato",
  "Rekordbox",
];

export const formSteps = [
  { number: "01", label: "Identidad" },
  { number: "02", label: "Trayectoria" },
  { number: "03", label: "Media & setup" },
];

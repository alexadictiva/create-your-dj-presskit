export type TemplateId = "pulse" | "voltage" | "afterdark";

export type PressKitFormData = {
  artistName: string;
  realName: string;
  city: string;
  email: string;
  phone: string;
  biography: string;
  experiences: string;
  genres: string[];
  equipment: string[];
  instagram: string;
  soundcloud: string;
  website: string;
};

export type PressKitTemplate = {
  id: TemplateId;
  number: string;
  name: string;
  description: string;
  accent: string;
};

import type { jsPDF } from "jspdf";
import type { PressKitFormData, TemplateId } from "../types/press-kit";

export const IMAGE_UPLOAD_RULES = {
  minCount: 1,
  maxCount: 5,
  minWidth: 800,
  minHeight: 800,
  maxWidth: 6000,
  maxHeight: 6000,
  maxBytes: 10 * 1024 * 1024,
} as const;

type ImageValidationResult = {
  accepted: File[];
  errors: string[];
};

type ImageDimensions = {
  width: number;
  height: number;
};

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_X = 22;
const CONTENT_WIDTH = 166;
const CONTENT_BOTTOM = 269;
const COVER_PHOTO = { x: 116, y: 20, width: 72, height: 84 };

const templateColors: Record<TemplateId, [number, number, number]> = {
  pulse: [183, 255, 60],
  voltage: [255, 42, 120],
  afterdark: [255, 61, 36],
};

function inspectImage(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo leer ${file.name}`));
    };
    image.src = url;
  });
}

export async function validatePressKitImages(files: File[]): Promise<ImageValidationResult> {
  const errors: string[] = [];
  const accepted: File[] = [];

  if (files.length > IMAGE_UPLOAD_RULES.maxCount) {
    errors.push(`Podés agregar hasta ${IMAGE_UPLOAD_RULES.maxCount} fotos.`);
  }

  for (const file of files.slice(0, IMAGE_UPLOAD_RULES.maxCount)) {
    if (file.size > IMAGE_UPLOAD_RULES.maxBytes) {
      errors.push(`${file.name}: supera el máximo de 10 MB.`);
      continue;
    }

    try {
      const { width, height } = await inspectImage(file);
      const isTooSmall =
        width < IMAGE_UPLOAD_RULES.minWidth || height < IMAGE_UPLOAD_RULES.minHeight;
      const isTooLarge =
        width > IMAGE_UPLOAD_RULES.maxWidth || height > IMAGE_UPLOAD_RULES.maxHeight;

      if (isTooSmall || isTooLarge) {
        errors.push(
          `${file.name}: debe medir entre ${IMAGE_UPLOAD_RULES.minWidth}×${IMAGE_UPLOAD_RULES.minHeight} y ${IMAGE_UPLOAD_RULES.maxWidth}×${IMAGE_UPLOAD_RULES.maxHeight} px.`,
        );
        continue;
      }

      accepted.push(file);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name}: imagen inválida.`);
    }
  }

  return { accepted, errors };
}

async function cropImageToJpeg(file: File, targetRatio: number, outputWidth = 1000) {
  const image = new Image();
  const url = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`No se pudo procesar ${file.name}`));
      image.src = url;
    });

    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const sourceRatio = sourceWidth / sourceHeight;
    let sourceX = 0;
    let sourceY = 0;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      sourceX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      sourceY = (sourceHeight - cropHeight) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = Math.round(outputWidth / targetRatio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen para el PDF.");

    context.drawImage(
      image,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function paintPage(
  doc: jsPDF,
  accent: [number, number, number],
  template: TemplateId,
) {
  doc.setFillColor(7, 7, 9);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
  doc.setFillColor(...accent);
  doc.rect(
    0,
    0,
    template === "afterdark" ? PAGE_WIDTH : 9,
    template === "afterdark" ? 10 : PAGE_HEIGHT,
    "F",
  );
}

function addContinuationPage(
  doc: jsPDF,
  accent: [number, number, number],
  template: TemplateId,
  artistName: string,
) {
  doc.addPage();
  paintPage(doc, accent, template);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...accent);
  doc.text(`${artistName.toUpperCase()} / PRESS KIT`, CONTENT_X, 25);
  doc.setDrawColor(...accent);
  doc.line(CONTENT_X, 31, CONTENT_X + CONTENT_WIDTH, 31);
  return 45;
}

function drawSection(
  doc: jsPDF,
  accent: [number, number, number],
  template: TemplateId,
  artistName: string,
  label: string,
  content: string,
  startY: number,
) {
  const fontSize = content.length > 700 ? 8 : 9;
  const lineHeight = fontSize * 0.3528 * 1.28;
  const lines = doc.splitTextToSize(content.trim(), CONTENT_WIDTH) as string[];
  let cursorY = startY;
  let remaining = lines;
  let continuation = false;

  while (remaining.length > 0) {
    if (cursorY + 18 > CONTENT_BOTTOM) {
      cursorY = addContinuationPage(doc, accent, template, artistName);
      continuation = true;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text(continuation ? `${label} (CONT.)` : label, CONTENT_X, cursorY);
    cursorY += 9;

    const availableLines = Math.max(
      1,
      Math.floor((CONTENT_BOTTOM - cursorY) / lineHeight),
    );
    const pageLines = remaining.slice(0, availableLines);
    remaining = remaining.slice(availableLines);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(225, 225, 225);
    doc.text(pageLines, CONTENT_X, cursorY, { lineHeightFactor: 1.28 });
    cursorY += pageLines.length * lineHeight + 11;

    if (remaining.length > 0) {
      cursorY = addContinuationPage(doc, accent, template, artistName);
      continuation = true;
    }
  }

  return cursorY;
}

async function addGalleryPage(
  doc: jsPDF,
  photos: File[],
  accent: [number, number, number],
  template: TemplateId,
  artistName: string,
) {
  if (photos.length <= 1) return;

  doc.addPage();
  paintPage(doc, accent, template);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.setFontSize(9);
  doc.text(`${artistName.toUpperCase()} / PRESS PHOTOS`, CONTENT_X, 25);
  doc.setTextColor(248, 248, 246);
  doc.setFontSize(28);
  doc.text("SELECTED IMAGES", CONTENT_X, 42);

  const frames = [
    { x: 22, y: 55, width: 78, height: 92 },
    { x: 110, y: 55, width: 78, height: 92 },
    { x: 22, y: 157, width: 78, height: 92 },
    { x: 110, y: 157, width: 78, height: 92 },
  ];

  for (const [index, photo] of photos.slice(1, 5).entries()) {
    const frame = frames[index];
    const image = await cropImageToJpeg(photo, frame.width / frame.height, 900);
    doc.addImage(
      image,
      "JPEG",
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      undefined,
      "FAST",
    );
    doc.setDrawColor(...accent);
    doc.rect(frame.x, frame.y, frame.width, frame.height);
  }
}

function addFooters(doc: jsPDF, form: PressKitFormData) {
  const totalPages = doc.getNumberOfPages();
  const contact = [form.instagram, form.soundcloud, form.website]
    .filter(Boolean)
    .join("   ");

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(145, 145, 148);
    const contactLines = (doc.splitTextToSize(contact, 150) as string[]).slice(0, 2);
    const contactY = contactLines.length > 1 ? 278 : 282;
    doc.text(contactLines, CONTENT_X, contactY, { lineHeightFactor: 1.2 });
    doc.text(`${page.toString().padStart(2, "0")} / ${totalPages.toString().padStart(2, "0")}`, 188, 282, { align: "right" });
  }
}

export async function createPressKitPdf(
  form: PressKitFormData,
  template: TemplateId,
  photos: File[],
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const accent = templateColors[template];

  paintPage(doc, accent, template);

  if (photos[0]) {
    const coverImage = await cropImageToJpeg(
      photos[0],
      COVER_PHOTO.width / COVER_PHOTO.height,
      1000,
    );
    doc.addImage(
      coverImage,
      "JPEG",
      COVER_PHOTO.x,
      COVER_PHOTO.y,
      COVER_PHOTO.width,
      COVER_PHOTO.height,
      undefined,
      "FAST",
    );
    doc.setDrawColor(...accent);
    doc.rect(
      COVER_PHOTO.x,
      COVER_PHOTO.y,
      COVER_PHOTO.width,
      COVER_PHOTO.height,
    );
  }

  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("OFFICIAL PRESS KIT / 2026", CONTENT_X, 27);

  const artistName = form.artistName.toUpperCase();
  const titleSize = artistName.length > 20 ? 26 : artistName.length > 13 ? 30 : 34;
  doc.setTextColor(248, 248, 246);
  doc.setFontSize(titleSize);
  const titleLines = (doc.splitTextToSize(artistName, 80) as string[]).slice(0, 3);
  doc.text(titleLines, CONTENT_X, 50, { lineHeightFactor: 0.86 });

  const titleHeight = titleLines.length * titleSize * 0.3528 * 0.86;
  const metaY = 50 + titleHeight + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(170, 170, 174);
  const meta = `${form.city.toUpperCase()} / ${form.genres.join(" / ").toUpperCase()}`;
  const metaLines = doc.splitTextToSize(meta, 80) as string[];
  doc.text(metaLines, CONTENT_X, metaY, { lineHeightFactor: 1.15 });

  const headerRuleY = metaY + metaLines.length * 3.8 + 4;
  doc.setDrawColor(...accent);
  doc.line(CONTENT_X, headerRuleY, 102, headerRuleY);

  let cursorY = Math.max(119, headerRuleY + 12);
  cursorY = drawSection(
    doc,
    accent,
    template,
    form.artistName,
    "BIOGRAPHY",
    form.biography,
    cursorY,
  );
  cursorY = drawSection(
    doc,
    accent,
    template,
    form.artistName,
    "EXPERIENCE",
    form.experiences,
    cursorY,
  );
  cursorY = drawSection(
    doc,
    accent,
    template,
    form.artistName,
    "SOUND",
    form.genres.join("  /  "),
    cursorY,
  );
  drawSection(
    doc,
    accent,
    template,
    form.artistName,
    "TECHNICAL SETUP",
    form.equipment.join("  /  "),
    cursorY,
  );

  await addGalleryPage(doc, photos, accent, template, form.artistName);
  addFooters(doc, form);

  doc.save(`${form.artistName.toLowerCase().replace(/\s+/g, "-")}-press-kit.pdf`);
}

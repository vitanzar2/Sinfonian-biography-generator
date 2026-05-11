const fields = {
  fullName: document.getElementById("fullName"),
  chapter: document.getElementById("chapter"),
  school: document.getElementById("school"),
  hometown: document.getElementById("hometown"),
  major: document.getElementById("major"),
  voiceOrInstrument: document.getElementById("voiceOrInstrument"),
  graduationYear: document.getElementById("graduationYear"),
  offices: document.getElementById("offices"),
  achievements: document.getElementById("achievements"),
  bioNotes: document.getElementById("bioNotes")
};

const PHOTO_FRAME = { x: 445, y: 600, w: 120, h: 158 };

const photoInput = document.getElementById("profilePhoto");
const statusMessage = document.getElementById("statusMessage");
const pdfPreview = document.querySelector(".pdf-preview");

let previewPdfUrl;

function cleanSentence(text, fallback = "") {
  const value = text.trim();
  return value ? value : fallback;
}

function buildSheetText() {
  const d = Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value.trim()])
  );

  const name = cleanSentence(d.fullName, "This Sinfonian");
  const schoolClause = d.school ? ` at ${d.school}` : "";
  const chapterClause = d.chapter ? ` with ${d.chapter}` : "";

  const introParagraph = `${name} is a ${cleanSentence(d.voiceOrInstrument, "musician")} from ${cleanSentence(d.hometown, "their hometown")}${schoolClause}. They are focused on ${cleanSentence(d.major, "music")}${d.graduationYear ? ` and anticipate completing this work in ${d.graduationYear}` : ""}. Their path reflects artistic growth, collaboration, and service through performance, while supporting peers and contributing to a strong culture of excellence.`;

  const leadershipParagraph = d.offices
    ? `${name} contributes through ${d.offices}${chapterClause}, helping organize initiatives, mentor fellow members, and support programs that promote musicianship, scholarship, and community engagement.`
    : `${name} is active in collaborative and service-focused efforts, supporting others through leadership, musicianship, and community engagement.`;

  const fraternityParagraph = `Phi Mu Alpha Sinfonia Fraternity of America is the nation's oldest and largest secret national fraternal society in music. Founded on October 6, 1898, at the New England Conservatory of Music in Boston, Massachusetts, the fraternity was established to unite men through a shared commitment to music, brotherhood, scholarship, and service.`;

  const closingParagraph = d.bioNotes
    ? d.bioNotes
    : `The objectives of Phi Mu Alpha Sinfonia are to develop the best and truest fraternal spirit; foster the mutual welfare and brotherhood of musical students; advance music in America; and encourage loyalty to the alma mater. Through collegiate chapters, alumni associations, and national programs, Sinfonians continue to uphold these ideals by serving their campuses, communities, and the broader musical profession.`;

  const paragraphs = [introParagraph, leadershipParagraph, fraternityParagraph, closingParagraph];
  const body = paragraphs.join("\n\n");

  return body;
}

async function embedPhoto(pdfDoc, page) {
  const file = photoInput.files?.[0];
  if (!file) {
    return;
  }

  const imageBytes = await file.arrayBuffer();
  const image = file.type === "image/png"
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const imgScale = Math.max(PHOTO_FRAME.w / image.width, PHOTO_FRAME.h / image.height);
  const drawW = image.width * imgScale;
  const drawH = image.height * imgScale;

  page.drawImage(image, {
    x: PHOTO_FRAME.x + (PHOTO_FRAME.w - drawW) / 2,
    y: PHOTO_FRAME.y + (PHOTO_FRAME.h - drawH) / 2,
    width: drawW,
    height: drawH
  });
}

async function generatePdfBytes() {
  const existingPdfBytes = await fetch("template.pdf")
    .then((res) => {
      if (!res.ok) {
        throw new Error("template.pdf not found");
      }
      return res.arrayBuffer();
    });

  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const firstPage = pdfDoc.getPages()[0];
  const { width, height } = firstPage.getSize();

  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

  const sheetText = buildSheetText();

  firstPage.drawText(fields.fullName.value, {
    x: 72,
    y: height - 150,
    size: 22,
    font: boldFont,
    color: PDFLib.rgb(0.07, 0.07, 0.07)
  });

  firstPage.drawText("SINFONIAN BIOGRAPHY", {
    x: 72,
    y: height - 180,
    size: 10,
    font,
    color: PDFLib.rgb(0.56, 0.09, 0.15)
  });

  firstPage.drawText(sheetText, {
    x: 72,
    y: height - 248,
    size: 12,
    lineHeight: 18,
    maxWidth: width - 230,
    font,
    color: PDFLib.rgb(0.07, 0.07, 0.07)
  });

  await embedPhoto(pdfDoc, firstPage);

  return pdfDoc.save();
}

async function renderPdfPreview() {
  try {
    statusMessage.textContent = "Updating PDF preview...";
    const pdfBytes = await generatePdfBytes();

    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }

    previewPdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    pdfPreview.setAttribute("data", previewPdfUrl);
    statusMessage.textContent = "PDF preview updated.";
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Unable to render PDF preview. Make sure template.pdf exists in the repository root.";
  }
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", renderPdfPreview);
});

photoInput.addEventListener("change", async () => {
  await renderPdfPreview();
});

async function downloadPdf() {
  try {
    statusMessage.textContent = "Generating PDF...";

    const pdfBytes = await generatePdfBytes();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${fields.fullName.value.replace(/\s+/g, "-").toLowerCase()}-bio-sheet.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    statusMessage.textContent = "PDF downloaded successfully.";
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Unable to generate PDF. Make sure template.pdf exists in the repository root.";
  }
}

document.getElementById("downloadButton").addEventListener("click", downloadPdf);
document.getElementById("resetButton").addEventListener("click", () => location.reload());

buildSheetText();
renderPdfPreview();

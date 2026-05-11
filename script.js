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
  bioNotes: document.getElementById("bioNotes"),
  eventName: document.getElementById("eventName")
};

const photoInput = document.getElementById("profilePhoto");
const photoPreview = document.getElementById("photoPreview");
const bioOutput = document.getElementById("bioOutput");
const previewName = document.getElementById("previewName");
const previewEvent = document.getElementById("previewEvent");
const statusMessage = document.getElementById("statusMessage");
const pdfPreview = document.querySelector(".pdf-preview");

const fraternityIntro = [
  "Phi Mu Alpha Sinfonia is America's oldest secret national fraternal society in music.",
  "The Fraternity builds men of integrity through brotherhood, service, and leadership, while advancing music in America.",
  "Sinfonians support their campuses and communities by creating meaningful musical experiences and encouraging excellence in all members."
].join(" ");

let previewPdfUrl;

function buildSheetText() {
  const d = Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value.trim()])
  );

  const details = [
    `Chapter: ${d.chapter}`,
    `School: ${d.school}`,
    `Hometown: ${d.hometown}`,
    `Major: ${d.major}`,
    `Voice / Instrument: ${d.voiceOrInstrument}`,
    `Graduation Year: ${d.graduationYear}`,
    `Offices / Roles: ${d.offices}`,
    `Achievements: ${d.achievements || "N/A"}`,
    `Additional Notes: ${d.bioNotes || "N/A"}`
  ].join("\n");

  bioOutput.textContent = `${fraternityIntro}\n\n${details}`;
  previewName.textContent = d.fullName;
  previewEvent.textContent = d.eventName;

  return `${fraternityIntro}\n\n${details}`;
}

function updatePhotoPreview() {
  const file = photoInput.files?.[0];
  if (!file) {
    photoPreview.removeAttribute("src");
    photoPreview.classList.add("hidden");
    return;
  }

  const url = URL.createObjectURL(file);
  photoPreview.src = url;
  photoPreview.classList.remove("hidden");
  photoPreview.onload = () => URL.revokeObjectURL(url);
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

  const imgScale = Math.min(PHOTO_FRAME.w / image.width, PHOTO_FRAME.h / image.height);
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

  firstPage.drawText(fields.eventName.value.toUpperCase(), {
    x: 72,
    y: height - 180,
    size: 10,
    font,
    color: PDFLib.rgb(0.56, 0.09, 0.15)
  });

  firstPage.drawText(sheetText, {
    x: 72,
    y: height - 230,
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
  updatePhotoPreview();
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

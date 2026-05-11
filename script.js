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
const bioOutput = document.getElementById("bioOutput");
const previewName = document.getElementById("previewName");
const previewEvent = document.getElementById("previewEvent");
const statusMessage = document.getElementById("statusMessage");

function buildSheetText() {
  const d = Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value.trim()])
  );

  const sheet = [
    `Chapter: ${d.chapter}`,
    `School: ${d.school}`,
    `Hometown: ${d.hometown}`,
    `Major: ${d.major}`,
    `Voice / Instrument: ${d.voiceOrInstrument}`,
    `Graduation Year: ${d.graduationYear}`,
    `Offices / Roles: ${d.offices}`,
    `Achievements: ${d.achievements}`,
    `Additional Notes: ${d.bioNotes}`
  ].join("\n");

  bioOutput.textContent = sheet;
  previewName.textContent = d.fullName;
  previewEvent.textContent = d.eventName;

  return sheet;
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", buildSheetText);
});

buildSheetText();

async function embedPhoto(pdfDoc, page) {
  const file = photoInput.files?.[0];
  if (!file) {
    return;
  }

  const imageBytes = await file.arrayBuffer();
  const image = file.type === "image/png"
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const { width, height } = page.getSize();

  const frame = {
    x: width - 200,
    y: height - 280,
    w: 125,
    h: 160
  };

  const imgScale = Math.max(frame.w / image.width, frame.h / image.height);
  const drawW = image.width * imgScale;
  const drawH = image.height * imgScale;

  page.drawImage(image, {
    x: frame.x - (drawW - frame.w) / 2,
    y: frame.y - (drawH - frame.h) / 2,
    width: drawW,
    height: drawH
  });
}

async function downloadPdf() {
  try {
    statusMessage.textContent = "Generating PDF...";

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

    const pdfBytes = await pdfDoc.save();
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

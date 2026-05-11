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

const templateChoice = document.getElementById("templateChoice");
const bioOutput = document.getElementById("bioOutput");
const previewName = document.getElementById("previewName");
const previewEvent = document.getElementById("previewEvent");
const customText = document.getElementById("customText");
const statusMessage = document.getElementById("statusMessage");

function lastName(name) {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1];
}

function buildBio() {

  const d = Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value])
  );

  let text = "";

  if (templateChoice.value === "formal") {
    text = `${d.fullName} is a brother of Phi Mu Alpha Sinfonia Fraternity and a member of the ${d.chapter} at ${d.school}. A native of ${d.hometown}, he studies ${d.major} and performs as ${d.voiceOrInstrument}.

Within Sinfonia, ${lastName(d.fullName)} has served as ${d.offices}. His accomplishments include ${d.achievements}. ${d.bioNotes}

${d.fullName} is expected to graduate in ${d.graduationYear} and remains committed to the ideals of brotherhood, musicianship, and service.`;
  }

  if (templateChoice.value === "concise") {
    text = `${d.fullName}, a brother of the ${d.chapter} at ${d.school}, is a ${d.major} student from ${d.hometown}. He performs as ${d.voiceOrInstrument} and has served as ${d.offices}. His work includes ${d.achievements}. ${d.bioNotes}`;
  }

  if (templateChoice.value === "nomination") {
    text = `${d.fullName} is a dedicated Sinfonian whose work reflects the Fraternity's commitment to music, brotherhood, and service. As a member of the ${d.chapter} at ${d.school}, he has distinguished himself through ${d.achievements}.

A ${d.major} student from ${d.hometown}, ${lastName(d.fullName)} performs as ${d.voiceOrInstrument} and has contributed to the chapter as ${d.offices}. ${d.bioNotes}`;
  }

  const finalText = customText.value.trim() || text;

  bioOutput.textContent = finalText;
  previewName.textContent = d.fullName;
  previewEvent.textContent = d.eventName;

  return finalText;
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", buildBio);
});

templateChoice.addEventListener("change", buildBio);
customText.addEventListener("input", buildBio);

buildBio();

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

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const { width, height } = firstPage.getSize();

    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

    const bioText = buildBio();

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

    firstPage.drawText(bioText, {
      x: 72,
      y: height - 230,
      size: 12,
      lineHeight: 18,
      maxWidth: width - 144,
      font,
      color: PDFLib.rgb(0.07, 0.07, 0.07)
    });

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], {
      type: "application/pdf"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      `${fields.fullName.value.replace(/\s+/g, "-").toLowerCase()}-bio.pdf`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    statusMessage.textContent = "PDF downloaded successfully.";

  } catch (error) {

    console.error(error);

    statusMessage.textContent =
      "Unable to generate PDF. Make sure template.pdf exists in the repository root.";
  }
}

document
  .getElementById("downloadButton")
  .addEventListener("click", downloadPdf);

document
  .getElementById("resetButton")
  .addEventListener("click", () => location.reload());

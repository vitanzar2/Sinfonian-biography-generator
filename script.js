const fields = {
  fullName: document.getElementById("fullName"),
  chapter: document.getElementById("chapter"),
  school: document.getElementById("school"),
  hometown: document.getElementById("hometown"),
  major: document.getElementById("major"),
  voiceOrInstrument: document.getElementById("voiceOrInstrument"),
  graduationYear: document.getElementById("graduationYear"),
  hasGraduated: document.getElementById("hasGraduated"),
  musicalInvolvement: document.getElementById("musicalInvolvement"),
  leadershipAccomplishments: document.getElementById("leadershipAccomplishments"),
  whyJoined: document.getElementById("whyJoined"),
  careerGoals: document.getElementById("careerGoals"),
  serviceEngagement: document.getElementById("serviceEngagement"),
  bioNotes: document.getElementById("bioNotes")
};

const POSITION_DESCRIPTIONS = {
  president: "provides leadership for chapter operations and strategic planning",
  vicePresident: "assists in chapter administration and member development",
  fraternityEducationOfficer: "supports the development and education of new members",
  treasurer: "oversees chapter finances and budgeting"
};

const POSITION_LABELS = {
  president: "President",
  vicePresident: "Vice President",
  fraternityEducationOfficer: "Fraternity Education Officer",
  treasurer: "Treasurer"
};

const PHOTO_FRAME = { x: 445, y: 600, w: 120, h: 158 };

const photoInput = document.getElementById("profilePhoto");
const statusMessage = document.getElementById("statusMessage");
const pdfPreview = document.querySelector(".pdf-preview");
const positionCheckboxes = [...document.querySelectorAll("#positionSelections input[type='checkbox']")];

let previewPdfUrl;

function cleanSentence(text, fallback = "") {
  const value = text.trim();
  return value ? value : fallback;
}

function buildGraduationClause(graduationYear, hasGraduated) {
  if (hasGraduated === "yes") {
    return graduationYear
      ? ` and has successfully completed their degree in ${graduationYear}`
      : " and has successfully completed their degree in their field";
  }

  if (!graduationYear) {
    return "";
  }

  return ` and anticipates completing this work in ${graduationYear}`;
}

function buildLeadershipRoleSentence(name, chapter) {
  const selectedPositions = positionCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  if (!selectedPositions.length) {
    return `${name} is active in collaborative and service-focused efforts, supporting others through leadership, musicianship, and community engagement.`;
  }

  const chapterClause = chapter ? ` within ${chapter}` : "";
  const rolesList = selectedPositions.map((position) => POSITION_LABELS[position]).join(", ");
  const roleDetails = selectedPositions
    .map((position) => `${POSITION_LABELS[position]}: ${POSITION_DESCRIPTIONS[position]}`)
    .join("; ");

  return `${name} serves as ${rolesList}${chapterClause}. In these roles, ${name} ${roleDetails}.`;
}

function buildSheetText() {
  const d = Object.fromEntries(
    Object.entries(fields).map(([key, element]) => [key, element.value.trim()])
  );

  const name = cleanSentence(d.fullName, "This Sinfonian");
  const schoolClause = d.school ? ` at ${d.school}` : "";
  const graduationClause = buildGraduationClause(d.graduationYear, d.hasGraduated);

  const personalAcademicParagraph = `${name} is a ${cleanSentence(d.voiceOrInstrument, "musician")} from ${cleanSentence(d.hometown, "their hometown")}${schoolClause}. They are focused on ${cleanSentence(d.major, "music")}${graduationClause}.`;

  const musicalInvolvementParagraph = d.musicalInvolvement
    ? `${name}'s musical involvement includes ${d.musicalInvolvement}.`
    : `${name} has actively contributed to musical ensembles and collaborative performance opportunities that support artistic excellence.`;

  const fraternityLeadershipParagraph = d.leadershipAccomplishments
    ? `${buildLeadershipRoleSentence(name, d.chapter)} ${name}'s leadership accomplishments include ${d.leadershipAccomplishments}.`
    : buildLeadershipRoleSentence(name, d.chapter);

  const personalValuesGoalsParagraph = `${d.whyJoined ? `${name} joined Phi Mu Alpha Sinfonia because ${d.whyJoined}.` : `${name} joined Phi Mu Alpha Sinfonia to strengthen brotherhood through a shared commitment to music, scholarship, and service.`} ${d.careerGoals ? `${name}'s career goals include ${d.careerGoals}.` : `${name} is dedicated to lifelong artistic growth and meaningful professional impact.`} ${d.serviceEngagement ? `Their service and community engagement includes ${d.serviceEngagement}.` : `They remain committed to service and community engagement through campus and local initiatives.`}`;

  const fraternityParagraph = "Phi Mu Alpha Sinfonia Fraternity of America is the nation's oldest and largest secret national fraternal society in music. Founded on October 6, 1898, at the New England Conservatory of Music in Boston, Massachusetts, the fraternity was established to unite men through a shared commitment to music, brotherhood, scholarship, and service.";

  const closingParagraph = d.bioNotes
    ? d.bioNotes
    : "The objectives of Phi Mu Alpha Sinfonia are to develop the best and truest fraternal spirit; foster the mutual welfare and brotherhood of musical students; advance music in America; and encourage loyalty to the alma mater. Through collegiate chapters, alumni associations, and national programs, Sinfonians continue to uphold these ideals by serving their campuses, communities, and the broader musical profession.";

  return [
    personalAcademicParagraph,
    musicalInvolvementParagraph,
    fraternityLeadershipParagraph,
    personalValuesGoalsParagraph,
    fraternityParagraph,
    closingParagraph
  ].join("\n\n");
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
  field.addEventListener("change", renderPdfPreview);
});

positionCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", renderPdfPreview);
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

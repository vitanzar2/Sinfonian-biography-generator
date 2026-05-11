const ids = ["fullName","personType","styleMode","lengthMode","outputMode","chapter","school","hometown","majors","minors","graduationYear","instrument","genreFocus","conductingExperience","compositionExperience","ensembles","communityPerformance","serviceEngagement","mentorship","leadershipPosition","leadershipAccomplishments","achievements","militaryChurchCommunity","whyJoined","careerGoals","values","motto","sectionOrder"];
const fields = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const statusMessage = document.getElementById("statusMessage");
const preview = document.getElementById("livePreview");
const pdfPreview = document.getElementById("pdfPreview");

let previewUrl;
const TEMPLATE_PATH = "template.pdf";

const ROLE_DESCRIPTIONS = { president: "guides chapter strategy and strengthens culture through decisive, service-centered leadership", vicePresident: "supports chapter operations and drives member development initiatives", fraternityEducationOfficer: "designs meaningful educational pathways for new and active brothers", treasurer: "safeguards chapter resources through responsible budgeting and financial stewardship", secretary: "maintains records and communication systems that preserve chapter continuity", warden: "upholds chapter standards, ritual integrity, and event readiness" };
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const titleCase = (s) => clean(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const dedupeWords = (text) => text.replace(/\b(\w+)\s+\1\b/g, (match, word) => (/^[A-Z]/.test(word) ? match : word));
function pWord(name) { return name; }
function sentenceVariants(style) { if (style === "ceremonial") return ["With distinction,", "In faithful pursuit of harmony,", "With steadfast purpose,"]; if (style === "recruitment") return ["Notably,", "Prospective members appreciate that", "A standout quality is that"]; if (style === "formal") return ["Additionally,", "Furthermore,", "In addition,"]; return ["Additionally,", "Beyond this,", "Notably,"]; }

function buildBio() { /* unchanged */
  const d = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, clean(v.value)]));
  const name = titleCase(d.fullName || "This Sinfonian");
  const grad = ["alumni","professional"].includes(d.personType) ? `completed studies in ${d.graduationYear || "their program"}` : `is expected to graduate in ${d.graduationYear || "a future term"}`;
  const personLabel = d.personType === "undergrad" ? "undergraduate" : d.personType;
  const sections = {
    intro: `${name} is an ${personLabel} musician from ${d.hometown || "their hometown"} ${d.school ? `affiliated with ${d.school}` : ""}, where ${name} ${grad}.`,
    musical: `With primary emphasis in ${d.instrument || "their principal instrument"}, ${name} participates in collaborative musical and performance opportunities that support both campus and community engagement. ${name}'s work reflects continued artistic development, musicianship, and a commitment to excellence through performance and service.`,
    leadership: `As a member of the ${d.chapter || "local chapter"} of Phi Mu Alpha Sinfonia Fraternity of America, ${name} contributes to chapter leadership, brotherhood initiatives, and programs that promote scholarship, service, and the advancement of music within the collegiate community.`,
    service: d.serviceEngagement || d.communityPerformance ? `Service and community engagement includes ${d.serviceEngagement || "ongoing volunteer and chapter-supported initiatives"}. ${d.communityPerformance ? `Outreach performance work includes ${d.communityPerformance}.` : ""}` : "",
    honors: `${d.achievements ? `${name} has earned recognition including ${d.achievements}.` : ""}`,
    values: `${d.whyJoined ? `${name} joined Sinfonia because ${d.whyJoined}.` : ""} ${d.values ? `Guiding values include ${d.values}.` : ""} ${d.motto ? `Personal motto: “${d.motto}.”` : ""}`,
    fraternity: buildFraternityParagraph(d),
    future: `${d.careerGoals ? `Future aspirations include ${d.careerGoals}.` : `Through leadership, musicianship, scholarship, and service, ${name} continues to uphold the ideals of Phi Mu Alpha Sinfonia while pursuing personal and professional growth through music.`}`,
    closing: d.outputMode === "nomination" ? `${name} is respectfully recommended for award consideration based on sustained excellence and exemplary character.` : ""
  };
  const order = (d.sectionOrder || "intro,musical,leadership,service,honors,values,fraternity,future,closing").split(",").map(s => clean(s));
  let picked = order.map(k => sections[k]).filter(Boolean);
  if (d.lengthMode === "short") picked = picked.slice(0, 4);
  if (d.outputMode === "social") return dedupeWords(`${name} | ${d.instrument || "Musician"}. ${d.school || ""} ${d.achievements || ""} ${d.careerGoals || ""}`);
  return dedupeWords(picked.join("\n\n")).replace(/\s+\./g, ".");
}
function buildFraternityParagraph(d) { const versions = []; if (document.getElementById("frFormal").checked) versions.push("Founded on October 6, 1898, at the New England Conservatory in Boston, Massachusetts, Phi Mu Alpha Sinfonia Fraternity of America is the nation’s oldest and largest secret national fraternal society in music. The fraternity seeks to develop the best and truest fraternal spirit; foster the mutual welfare and brotherhood of musical students; advance music in America; and encourage loyalty to the alma mater."); if (document.getElementById("frShort").checked && !document.getElementById("frFormal").checked) versions.push("Phi Mu Alpha Sinfonia advances music, brotherhood, scholarship, and service nationwide."); if (document.getElementById("frCeremonial").checked) versions.push("In solemn fraternity, Sinfonians unite to elevate one another through devotion to music and noble service."); if (document.getElementById("frRecruitment").checked) versions.push("Sinfonia invites men of musical integrity to grow as artists, leaders, and servants in their communities."); return versions.join(" "); }

function renderPreview() { const text = buildBio(); preview.innerHTML = text.split("\n\n").map(p => `<p>${p}</p>`).join(""); renderPdfPreview(); }

function wrapLines(text, font, size, maxWidth) {
  const paras = text.split("\n\n"); const lines = [];
  for (const para of paras) {
    const words = para.split(/\s+/).filter(Boolean); let line = "";
    for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate; else { if (line) lines.push(line); line = word; } }
    if (line) lines.push(line); lines.push("");
  }
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

async function buildPdfBytes() {
  const templateBytes = await fetch(TEMPLATE_PATH).then(res => { if (!res.ok) throw new Error("Unable to load template.pdf"); return res.arrayBuffer(); });
  const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0); const { height } = page.getSize();
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
  const title = fields.fullName.value || "Sinfonian Biography";
  const text = buildBio();

  const box = { x: 66, topY: 560, bottomY: 70, maxWidth: 430 };
  let fontSize = 11; let lineHeight = 16; let lines = wrapLines(text, font, fontSize, box.maxWidth);
  while (fontSize > 8 && (lines.length * lineHeight > box.topY - box.bottomY)) {
    fontSize -= 0.5; lineHeight -= 0.7; lines = wrapLines(text, font, fontSize, box.maxWidth);
  }

  page.drawText(title, { x: 66, y: 610, size: 17, font: bold });
  let y = box.topY;
  for (const line of lines) { if (y < box.bottomY) break; page.drawText(line, { x: box.x, y, size: fontSize, lineHeight, maxWidth: box.maxWidth, font }); y -= lineHeight; }
  return pdfDoc.save();
}

async function renderPdfPreview() {
  try {
    const bytes = await buildPdfBytes();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    pdfPreview.src = previewUrl;
    statusMessage.textContent = "Preview updated.";
  } catch (error) {
    statusMessage.textContent = `Preview unavailable: ${error.message}`;
  }
}

async function exportPdf() { const bytes = await buildPdfBytes(); downloadBlob(bytes, "application/pdf", "biography.pdf"); }
function exportDoc() { const text = buildBio(); const html = `<!doctype html><html><head><meta charset='utf-8'></head><body><h1>${fields.fullName.value}</h1>${text.split("\n\n").map(p=>`<p>${p}</p>`).join("")}</body></html>`; downloadBlob(new TextEncoder().encode(html), "application/msword", "biography.doc"); }
function downloadBlob(data, type, filename) { const blob = new Blob([data], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

document.querySelectorAll("input, textarea, select").forEach(el => { el.addEventListener("input", renderPreview); el.addEventListener("change", renderPreview); });
document.getElementById("downloadPdfButton").addEventListener("click", exportPdf);
document.getElementById("downloadDocButton").addEventListener("click", exportDoc);
document.getElementById("printButton").addEventListener("click", () => window.print());
document.getElementById("resetButton").addEventListener("click", () => location.reload());
renderPreview();

let mode = "upload";
let generatedImages = [];

// ---------- TOAST ----------
function showToast(msg, duration = 2500) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), duration);
}

// ---------- MODE ----------
function setMode(m) {
  mode = m;
  document.getElementById("uploadSection").classList.toggle("hidden", m !== "upload");
  document.getElementById("manualSection").classList.toggle("hidden", m !== "manual");
  document.getElementById("btnUpload").classList.toggle("active", m === "upload");
  document.getElementById("btnManual").classList.toggle("active", m === "manual");
}

// ---------- FILE NAME DISPLAY ----------
function onFileSelected(input) {
  const display = document.getElementById("fileNameDisplay");
  if (input.files[0]) {
    display.textContent = "📄 " + input.files[0].name;
    display.style.display = "block";
  }
}

// ---------- DRAG & DROP ----------
const zone = document.getElementById("uploadZone");
if (zone) {
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById("fileInput").files = e.dataTransfer.files;
      onFileSelected(document.getElementById("fileInput"));
    }
  });
}

// ---------- SELECT ALL ----------
function selectAll() {
  const all = generatedImages.every(i => i.checkbox.checked);
  generatedImages.forEach(i => i.checkbox.checked = !all);
  showToast(all ? "Deselected all" : "Selected all");
}

// ---------- HELPERS ----------
function normalizeGender(g) {
  if (!g) return null;
  g = g.trim().toLowerCase();
  if (g === "m" || g === "male") return "M";
  if (g === "f" || g === "female") return "F";
  return null;
}

function sanitize(str) {
  return str ? str.trim() : "";
}

function buildText(data) {
  // Split full name into parts: last, first, middle
  const nameParts = (data.name || "").trim().split(/\s+/);
  const firstName  = nameParts[0] || "";
  const middleName = nameParts.length >= 3 ? nameParts.slice(1, -1).join(" ") : "";
  const lastName   = nameParts.length >= 2 ? nameParts[nameParts.length - 1] : "";

  const heightIn = parseInt(data.height) || 69;
  // Format height as 3-digit inches with leading zero e.g. 069
  const heightFormatted = String(heightIn).padStart(3, "0");

  return `@
ANSI 636020090001DL00310242DLDAQ${data.dl}
DCF${data.dd || data.dl}
DBD${data.issue}
DBB${data.dob}
DBA${data.expiry}
DAC${firstName}
DDFN
DAD${middleName}
DDGN
DCS${lastName}
DDEN
DAU${heightFormatted} IN
DBC${data.gender === "M" ? "1" : "2"}
DAYBLK
DAG${data.street}
DAI${data.city}
DAJ${data.state}
DAK${(data.zip || "").padEnd(9, "0")}
DCGUSA
DDAF
DCJ${data.dd || ""}
DCLU`;
}

// ---------- GENERATE ----------
function generate(dataList) {
  generatedImages = [];
  const output = document.getElementById("output");
  output.innerHTML = "";

  // Filter empty rows
  const valid = dataList.filter(d => d.name && d.dl);

  if (valid.length === 0) {
    output.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No valid rows found. Check your input format.</p></div>`;
    return;
  }

  valid.forEach((data, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = 180;
    let barcodeText;
    try {
      barcodeText = buildText(data);
      PDF417.draw(barcodeText, canvas, 2, 3);
    } catch (e) {
      console.warn("Barcode error for row", i, e);
      // Try with default options
      try { PDF417.draw(barcodeText, canvas); } catch(e2) { return; }
    }

    const filename = `${data.name.replace(/\s+/g, "_")}_${data.gender || "X"}_${data.height}.png`;

    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${i * 0.06}s`;

    const header = document.createElement("div");
    header.className = "card-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "card-checkbox";

    const nameEl = document.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = data.name;

    const tag = document.createElement("div");
    tag.className = "card-tag";
    tag.textContent = `${data.state || "—"} · ${data.gender || "—"}`;

    header.appendChild(checkbox);
    header.appendChild(nameEl);
    header.appendChild(tag);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const dlBtn = document.createElement("button");
    dlBtn.className = "btn btn-secondary";
    dlBtn.innerHTML = "⬇ Download PNG";
    dlBtn.onclick = () => { downloadImage(canvas, filename); showToast("Downloaded!"); };

    actions.appendChild(dlBtn);

    card.appendChild(header);
    card.appendChild(canvas);
    card.appendChild(actions);
    output.appendChild(card);

    generatedImages.push({ canvas, filename, checkbox });
  });

  document.getElementById("controls").classList.remove("hidden");
  document.getElementById("countDisplay").textContent = generatedImages.length;
  showToast(`✅ ${generatedImages.length} barcode${generatedImages.length !== 1 ? "s" : ""} generated!`);
  output.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- DOWNLOAD ----------
function downloadImage(canvas, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function downloadAll() {
  const zip = new JSZip();
  const selected = generatedImages.filter(i => i.checkbox.checked);
  const list = selected.length > 0 ? selected : generatedImages;

  list.forEach(img => {
    const data = img.canvas.toDataURL("image/png").split(",")[1];
    zip.file(img.filename, data, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = selected.length > 0 ? "selected_barcodes.zip" : "all_barcodes.zip";
  link.click();

  showToast(`📦 Downloaded ${list.length} barcode${list.length !== 1 ? "s" : ""}!`);
}

// ---------- FILE ----------
function handleFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file) { showToast("⚠️ Please select a file first"); return; }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = text.split("\n").slice(1).filter(r => r.trim());

    const dataList = rows.map(r => {
      const c = r.split(",").map(sanitize);
      return {
        name: c[0], street: c[1], city: c[2], state: c[3],
        zip: c[4], dl: c[5], dd: c[6], issue: c[7], dob: c[8],
        expiry: c[9], gender: normalizeGender(c[10]), height: c[11]
      };
    });

    generate(dataList);
  };

  reader.readAsText(file);
}

// ---------- MANUAL ----------
function handleManual() {
  const text = document.getElementById("manualText").value.trim();
  if (!text) { showToast("⚠️ Please enter some data first"); return; }

  const rows = text.split("\n").filter(r => r.trim());
  if (rows.length > 25) return; // button should already be disabled

  const dataList = rows.map(r => {
    const c = r.split("\t").map(sanitize);
    return {
      name: c[0], street: c[1], city: c[2], state: c[3],
      zip: c[4], dl: c[5], dd: c[6], issue: c[7], dob: c[8],
      expiry: c[9], gender: normalizeGender(c[10]), height: c[11]
    };
  });

  generate(dataList);
}

// Live row counter + button lock for manual textarea
document.addEventListener("DOMContentLoaded", () => {
  const ta      = document.getElementById("manualText");
  const btn     = document.getElementById("manualGenerateBtn");
  const counter = document.getElementById("rowCounter");
  const limitMsg= document.getElementById("rowLimitMsg");

  if (ta && btn) {
    ta.addEventListener("input", () => {
      const rows = ta.value.trim() ? ta.value.trim().split("\n").filter(r => r.trim()).length : 0;
      if (counter) counter.textContent = rows;
      const over = rows > 25;
      btn.disabled = over;
      btn.style.opacity  = over ? "0.4" : "1";
      btn.style.cursor   = over ? "not-allowed" : "pointer";
      if (limitMsg) limitMsg.style.display = over ? "flex" : "none";
    });
  }
});

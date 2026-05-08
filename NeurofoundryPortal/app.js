(function () {
  "use strict";

  const STORAGE_KEY = "neurofoundry.mythos.fragments.v1";
  const state = {
    fragments: [],
    selectedIds: new Set(),
    draft: null,
  };

  const $ = (id) => document.getElementById(id);
  const ui = {
    form: $("fragmentForm"),
    title: $("title"),
    classification: $("classification"),
    signature: $("signature"),
    theme: $("theme"),
    seed: $("seed"),
    intensity: $("intensity"),
    complexity: $("complexity"),
    cryptic: $("cryptic"),
    length: $("length"),
    preview: $("preview"),
    list: $("fragmentList"),
    listState: $("listState"),
    search: $("search"),
    filterClassification: $("filterClassification"),
    filterTheme: $("filterTheme"),
    sortBy: $("sortBy"),
    selectionCount: $("selectionCount"),
    toast: $("toast"),
    fileImport: $("fileImport"),
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function uid() {
    return `frag_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function parseJsonSafe(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.fragments));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseJsonSafe(raw) : [];
    state.fragments = Array.isArray(parsed) ? parsed.filter(isFragmentLike) : [];
  }

  function isFragmentLike(x) {
    return x && typeof x === "object" && typeof x.id === "string" && typeof x.title === "string";
  }

  function toast(msg, timeout = 1700) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    window.clearTimeout(ui.toast._timer);
    ui.toast._timer = window.setTimeout(() => ui.toast.classList.remove("show"), timeout);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function classifyTone(theme, intensity, cryptic) {
    if (theme === "Null Choir" && cryptic > 7) return "oblique";
    if (theme === "Electric Pale" && intensity > 7) return "volatile";
    if (theme === "Cold Horizon") return "sterile";
    if (intensity > 7) return "severe";
    return "measured";
  }

  function generateContent(input) {
    const lengthMap = { short: 1, medium: 2, long: 3 };
    const segments = [];
    const n = lengthMap[input.length] || 2;
    const tone = classifyTone(input.theme, input.intensity, input.cryptic);
    const lexicon = {
      "Iron Litany": ["forged axioms", "load-bearing myth", "sealed directive"],
      "Velvet Signal": ["whispered relay", "soft coercion", "encrypted tenderness"],
      "Cold Horizon": ["hard-edge protocol", "frozen telemetry", "distance doctrine"],
      "Electric Pale": ["charged threshold", "ionized omen", "transient voltage prayer"],
      "Null Choir": ["absence harmonic", "silent consensus", "vacuum oath"],
    };
    const words = lexicon[input.theme] || lexicon["Iron Litany"];

    for (let i = 0; i < n; i++) {
      const anchor = words[(i + input.complexity) % words.length];
      const pulse = input.intensity > 6 ? "escalates" : "stabilizes";
      const crypt = input.cryptic > 6 ? "partially veiled" : "explicitly declared";
      segments.push(
        `Cycle ${i + 1}: This fragment ${pulse} under ${anchor}, remaining ${crypt} while preserving ${tone} operator intent.`
      );
    }

    if (input.seed.trim()) {
      segments.unshift(`Seed Pressure: ${input.seed.trim()}`);
    }
    return segments.join(" ");
  }

  function buildDraft() {
    const title = ui.title.value.trim() || `Untitled Fragment ${new Date().toLocaleTimeString()}`;
    const signature = ui.signature.value.trim() || `NF-AUTO-${Math.floor(Math.random() * 9000 + 1000)}`;
    const input = {
      title,
      classification: ui.classification.value,
      signature,
      theme: ui.theme.value,
      seed: ui.seed.value || "",
      intensity: Number(ui.intensity.value || 6),
      complexity: Number(ui.complexity.value || 5),
      cryptic: Number(ui.cryptic.value || 7),
      length: ui.length.value || "medium",
    };

    const content = generateContent(input);
    state.draft = {
      id: uid(),
      title: input.title,
      classification: input.classification,
      content,
      signature: input.signature,
      theme: input.theme,
      intensity: input.intensity,
      complexity: input.complexity,
      cryptic: input.cryptic,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      tags: [input.theme, input.classification.toLowerCase()],
    };
    ui.preview.textContent = [
      `Title: ${state.draft.title}`,
      `Classification: ${state.draft.classification}`,
      `Content: ${state.draft.content}`,
      `Signature: ${state.draft.signature}`,
      `Theme: ${state.draft.theme}`,
    ].join("\n");
    toast("Fragment draft generated.");
  }

  function persistDraft(e) {
    if (e) e.preventDefault();
    if (!state.draft) {
      toast("Generate a draft first.");
      return;
    }
    state.fragments.unshift({ ...state.draft, persistedAt: nowIso() });
    saveState();
    renderList();
    toast("Fragment persisted to registry.");
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  function filteredSorted() {
    const q = ui.search.value.trim().toLowerCase();
    const cls = ui.filterClassification.value;
    const theme = ui.filterTheme.value;
    const sort = ui.sortBy.value;

    let rows = state.fragments.filter((f) => {
      const matchQ =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q) ||
        f.signature.toLowerCase().includes(q);
      const matchCls = !cls || f.classification === cls;
      const matchTheme = !theme || f.theme === theme;
      return matchQ && matchCls && matchTheme;
    });

    rows = rows.slice().sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "classification") return a.classification.localeCompare(b.classification);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return rows;
  }

  function renderList() {
    const rows = filteredSorted();
    ui.list.innerHTML = "";

    if (!rows.length) {
      ui.listState.textContent = "No fragments match current criteria.";
      ui.selectionCount.textContent = `${state.selectedIds.size} selected`;
      return;
    }
    ui.listState.textContent = `${rows.length} fragment(s) in view`;

    for (const row of rows) {
      const card = document.createElement("article");
      card.className = "fragment-card";
      card.innerHTML = `
        <div class="fragment-head">
          <div>
            <h4>${escapeHtml(row.title)}</h4>
            <div class="meta">
              <span class="chip">${escapeHtml(row.classification)}</span>
              <span class="chip">${escapeHtml(row.theme)}</span>
              <span>${escapeHtml(row.signature)}</span>
            </div>
            <div class="meta">Created: ${escapeHtml(formatDate(row.createdAt))}</div>
          </div>
          <label class="meta">
            <input type="checkbox" data-select-id="${escapeHtml(row.id)}" ${
        state.selectedIds.has(row.id) ? "checked" : ""
      } />
            select
          </label>
        </div>
        <div class="content">${escapeHtml(row.content)}</div>
        <div class="card-actions">
          <button class="btn ghost" data-copy-id="${escapeHtml(row.id)}">Copy</button>
          <button class="btn ghost" data-export-id="${escapeHtml(row.id)}">Export</button>
          <button class="btn danger" data-delete-id="${escapeHtml(row.id)}">Delete</button>
        </div>
      `;
      ui.list.appendChild(card);
    }

    ui.selectionCount.textContent = `${state.selectedIds.size} selected`;
  }

  function download(name, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson(rows, name = "mythos-fragments.json") {
    download(name, JSON.stringify(rows, null, 2), "application/json");
  }

  function exportCsv(rows, name = "mythos-fragments.csv") {
    const cols = ["id", "title", "classification", "theme", "signature", "content", "createdAt"];
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = [cols.join(",")];
    for (const row of rows) {
      lines.push(cols.map((c) => esc(row[c])).join(","));
    }
    download(name, lines.join("\n"), "text/csv");
  }

  function removeByIds(ids) {
    if (!ids.length) return;
    const set = new Set(ids);
    state.fragments = state.fragments.filter((f) => !set.has(f.id));
    for (const id of ids) state.selectedIds.delete(id);
    saveState();
    renderList();
    toast(`Removed ${ids.length} fragment(s).`);
  }

  function wireEvents() {
    $("btnGenerate").addEventListener("click", buildDraft);
    ui.form.addEventListener("submit", persistDraft);
    $("btnReset").addEventListener("click", () => {
      state.draft = null;
      ui.preview.textContent = "No draft generated.";
      toast("Generator reset.");
    });

    $("btnExportAll").addEventListener("click", () => exportJson(state.fragments));
    $("btnExportCsv").addEventListener("click", () => exportCsv(state.fragments));

    $("btnSelectAll").addEventListener("click", () => {
      for (const row of filteredSorted()) state.selectedIds.add(row.id);
      renderList();
      toast("Visible fragments selected.");
    });
    $("btnClearSelection").addEventListener("click", () => {
      state.selectedIds.clear();
      renderList();
      toast("Selection cleared.");
    });

    $("btnBulkDelete").addEventListener("click", () => {
      if (!state.selectedIds.size) return toast("No fragments selected.");
      if (!window.confirm(`Delete ${state.selectedIds.size} selected fragment(s)?`)) return;
      removeByIds([...state.selectedIds]);
    });

    $("btnBulkExport").addEventListener("click", () => {
      if (!state.selectedIds.size) return toast("No fragments selected.");
      const rows = state.fragments.filter((f) => state.selectedIds.has(f.id));
      exportJson(rows, "mythos-fragments-selected.json");
      toast("Selected fragments exported.");
    });

    ui.list.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const copyId = t.getAttribute("data-copy-id");
      const exportId = t.getAttribute("data-export-id");
      const deleteId = t.getAttribute("data-delete-id");

      if (copyId) {
        const row = state.fragments.find((f) => f.id === copyId);
        if (!row) return;
        navigator.clipboard.writeText(JSON.stringify(row, null, 2))
          .then(() => toast("Fragment copied to clipboard."))
          .catch(() => toast("Clipboard unavailable."));
      }
      if (exportId) {
        const row = state.fragments.find((f) => f.id === exportId);
        if (!row) return;
        exportJson([row], `${row.id}.json`);
        toast("Fragment exported.");
      }
      if (deleteId) {
        if (!window.confirm("Delete fragment?")) return;
        removeByIds([deleteId]);
      }
    });

    ui.list.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      const id = t.getAttribute("data-select-id");
      if (!id) return;
      if (t.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      ui.selectionCount.textContent = `${state.selectedIds.size} selected`;
    });

    [ui.search, ui.filterClassification, ui.filterTheme, ui.sortBy].forEach((x) => {
      x.addEventListener("input", renderList);
      x.addEventListener("change", renderList);
    });

    ui.fileImport.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseJsonSafe(text);
        if (!Array.isArray(parsed)) throw new Error("Invalid import payload. Expected array.");
        const normalized = parsed.filter(isFragmentLike).map((x) => ({
          ...x,
          id: x.id || uid(),
          createdAt: x.createdAt || nowIso(),
          updatedAt: x.updatedAt || nowIso(),
        }));
        state.fragments = [...normalized, ...state.fragments];
        saveState();
        renderList();
        toast(`Imported ${normalized.length} fragment(s).`);
      } catch (err) {
        toast(`Import failed: ${err.message || err}`);
      } finally {
        ui.fileImport.value = "";
      }
    });
  }

  loadState();
  wireEvents();
  renderList();
})();

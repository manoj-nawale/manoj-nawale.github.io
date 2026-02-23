// assets/js/app.js

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function uniq(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
}

function badge(label) {
  return `<span class="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-xs text-slate-700">
    ${escapeHtml(label)}
  </span>`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function projectCard(p) {
  const roles = (p.roles || []).slice(0, 3).map(badge).join("");
  const skills = (p.skills || []).slice(0, 5).map(badge).join("");
  const highlights = (p.highlights || []).slice(0, 3)
    .map(h => `<li class="text-sm text-slate-700">${escapeHtml(h)}</li>`)
    .join("");

  return `
  <article class="group rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur hover:bg-white transition">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium text-slate-500">${escapeHtml(p.category || "Project")}</p>
        <h3 class="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          <a class="hover:underline" href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a>
        </h3>
      </div>
      <span class="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
        ${escapeHtml(p.status || "Shipped")}
      </span>
    </div>

    <p class="mt-3 text-sm text-slate-700">${escapeHtml(p.tagline || "")}</p>

    <div class="mt-4 flex flex-wrap gap-2">
      ${roles}
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      ${skills}
    </div>

    <ul class="mt-4 space-y-1">
      ${highlights}
    </ul>

    <div class="mt-5 flex items-center justify-between">
      <a class="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:underline"
         href="${escapeHtml(p.url)}">
        View case study
        <span aria-hidden="true" class="transition group-hover:translate-x-0.5">→</span>
      </a>
      ${p.github ? `<a class="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                   href="${escapeHtml(p.github)}" target="_blank" rel="noreferrer">GitHub</a>` : ""}
    </div>
  </article>`;
}

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [
    p.title, p.tagline, p.category,
    ...(p.roles || []),
    ...(p.skills || []),
    ...(p.tools || []),
    ...(p.highlights || []),
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function matchesFilters(p, selectedRoles, selectedSkills) {
  const rOk = selectedRoles.size === 0 || (p.roles || []).some(r => selectedRoles.has(r));
  const sOk = selectedSkills.size === 0 || (p.skills || []).some(s => selectedSkills.has(s));
  return rOk && sOk;
}

function pill(label, active) {
  return `
    <button type="button"
      class="${active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white/60 text-slate-800 border-slate-200 hover:bg-white"} 
      inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition"
      data-pill="${escapeHtml(label)}">
      ${escapeHtml(label)}
    </button>`;
}

function renderPills(container, labels, selectedSet, onToggle) {
  container.innerHTML = labels.map(l => pill(l, selectedSet.has(l))).join("");
  container.querySelectorAll("button[data-pill]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-pill");
      if (selectedSet.has(v)) selectedSet.delete(v);
      else selectedSet.add(v);
      onToggle();
    });
  });
}

function renderProjects(listEl, projects) {
  if (!projects.length) {
    listEl.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-white/70 p-10 text-center">
        <p class="text-slate-900 font-semibold">No matches.</p>
        <p class="mt-2 text-sm text-slate-700">Try clearing filters or searching fewer keywords.</p>
      </div>`;
    return;
  }
  listEl.innerHTML = projects.map(projectCard).join("");
}

async function initProjectsPage() {
  const listEl = document.getElementById("projectList");
  if (!listEl) return;

  const searchEl = document.getElementById("searchInput");
  const rolesEl = document.getElementById("rolePills");
  const skillsEl = document.getElementById("skillPills");
  const clearBtn = document.getElementById("clearFilters");
  const countEl = document.getElementById("resultCount");

  const data = await loadJSON("/data/projects.json");
  const projects = data.projects || [];

  const allRoles = uniq(projects.flatMap(p => p.roles || []));
  const allSkills = uniq(projects.flatMap(p => p.skills || []));

  const selectedRoles = new Set();
  const selectedSkills = new Set();

  function apply() {
    const q = (searchEl?.value || "").trim();
    const filtered = projects
      .filter(p => matchesQuery(p, q))
      .filter(p => matchesFilters(p, selectedRoles, selectedSkills));

    renderProjects(listEl, filtered);
    if (countEl) countEl.textContent = `${filtered.length} / ${projects.length}`;
    renderPills(rolesEl, allRoles, selectedRoles, apply);
    renderPills(skillsEl, allSkills, selectedSkills, apply);
  }

  if (searchEl) searchEl.addEventListener("input", apply);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    selectedRoles.clear();
    selectedSkills.clear();
    if (searchEl) searchEl.value = "";
    apply();
  });

  // First render
  apply();
}

document.addEventListener("DOMContentLoaded", () => {
  initProjectsPage().catch(err => {
    console.error(err);
    const listEl = document.getElementById("projectList");
    if (listEl) {
      listEl.innerHTML = `
        <div class="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p class="font-semibold text-red-900">Projects failed to load.</p>
          <p class="mt-2 text-sm text-red-800">Open DevTools → Console for details.</p>
        </div>`;
    }
  });
});

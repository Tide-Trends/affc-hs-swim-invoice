import {
  SCHOOLS,
  SCHOOL_NAMES,
  COURSES,
  DAY_GROUPS,
  WEEKDAYS,
  AM_PM,
  loadBundle,
  filterSessions,
  sumHours,
  countBy,
  verifyCounts,
} from "./data-core.js";

let allSessions = [];
let verification = null;
let meta = {};
let matrixFilter = null;

const $ = (id) => document.getElementById(id);

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s ?? "";
  return d.innerHTML;
}

function getFiltered() {
  let list = allSessions;
  const school = $("filter-school").value;
  const section = $("filter-section").value;
  const q = ($("filter-search").value || "").trim().toLowerCase();

  list = filterSessions(list, school);
  if (section !== "ALL") list = list.filter((s) => s.section === section);
  if (matrixFilter) {
    list = list.filter((s) => {
      if (matrixFilter.course && s.course !== matrixFilter.course) return false;
      if (matrixFilter.day_group && s.day_group !== matrixFilter.day_group) return false;
      if (matrixFilter.am_pm && s.am_pm !== matrixFilter.am_pm) return false;
      return true;
    });
  }
  if (q) {
    list = list.filter((s) => {
      const blob = [
        s.date,
        s.weekday,
        s.school,
        s.course,
        s.day_group,
        s.am_pm,
        s.section,
        s.slot,
        s.time,
        (s.flags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }
  return list;
}

function renderVerifyBanner() {
  const { ok, issues, total } = verifyCounts(allSessions, verification);
  const el = $("verify-banner");
  el.className = `verify-banner ${ok ? "pass" : "fail"}`;
  if (ok) {
    el.innerHTML = `<strong>Verification passed.</strong> All ${total} billable sessions match the Excel source (<code>${esc(verification.source_file.split(/[/\\]/).pop())}</code>, sheet “${esc(verification.sheet)}”). School totals: AFHS ${verification.by_school.AFHS}, LPHS ${verification.by_school.LPHS}, PGHS ${verification.by_school.PGHS}, SKYR ${verification.by_school.SKYR}.`;
  } else {
    el.innerHTML = `<strong>Verification failed.</strong><ul>${issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }
}

function renderKpis(list) {
  const school = $("filter-school").value;
  const reg = list.filter((s) => s.section === "Regular");
  const hol = list.filter((s) => s.section === "Holiday & Special");
  const sc = list.filter((s) => s.course === "Short Course");
  const lc = list.filter((s) => s.course === "Long Course");

  $("kpi-row").innerHTML = `
    <div class="kpi"><div class="label">Sessions</div><div class="value">${list.length}</div><div class="sub">${school === "ALL" ? "all schools" : school}</div></div>
    <div class="kpi"><div class="label">Total hours</div><div class="value">${sumHours(list).toFixed(1)}</div></div>
    <div class="kpi"><div class="label">Regular</div><div class="value">${reg.length}</div><div class="sub">${sumHours(reg).toFixed(1)} hrs</div></div>
    <div class="kpi"><div class="label">Holiday &amp; special</div><div class="value">${hol.length}</div><div class="sub">${sumHours(hol).toFixed(1)} hrs</div></div>
    <div class="kpi"><div class="label">Short course</div><div class="value">${sc.length}</div></div>
    <div class="kpi"><div class="label">Long course</div><div class="value">${lc.length}</div></div>
    <div class="kpi"><div class="label">AM</div><div class="value">${list.filter((s) => s.am_pm === "AM").length}</div></div>
    <div class="kpi"><div class="label">PM</div><div class="value">${list.filter((s) => s.am_pm === "PM").length}</div></div>
  `;
}

function matrixKey(s) {
  return `${s.course}|${s.day_group}|${s.am_pm}`;
}

function renderMatrix(list) {
  const counts = new Map();
  for (const s of list) {
    if (s.section !== "Regular") continue;
    const k = matrixKey(s);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  let html = '<div class="matrix-wrap"><table class="matrix"><thead><tr><th>Course</th><th>Day group</th>';
  for (const ap of AM_PM) html += `<th>${ap}</th>`;
  html += "<th>Row total</th></tr></thead><tbody>";

  for (const course of COURSES) {
    for (const dg of DAY_GROUPS) {
      const cls = course === "Short Course" ? "sc" : "lc";
      html += `<tr><th class="${cls}">${course.replace(" Course", "")}</th><td>${dg}</td>`;
      let row = 0;
      for (const ap of AM_PM) {
        const k = `${course}|${dg}|${ap}`;
        const n = counts.get(k) || 0;
        row += n;
        const sel =
          matrixFilter &&
          matrixFilter.course === course &&
          matrixFilter.day_group === dg &&
          matrixFilter.am_pm === ap
            ? " selected"
            : "";
        html += `<td class="cell-data ${cls}${n ? " has-data" : ""}${sel}" data-course="${esc(course)}" data-dg="${esc(dg)}" data-ap="${ap}">${n || '<span class="zero">0</span>'}</td>`;
      }
      html += `<td><strong>${row}</strong></td></tr>`;
    }
  }
  html += "</tbody></table></div>";
  $("matrix-table").innerHTML = html;

  $("matrix-table").querySelectorAll(".cell-data").forEach((td) => {
    td.addEventListener("click", () => {
      const course = td.dataset.course;
      const day_group = td.dataset.dg;
      const am_pm = td.dataset.ap;
      if (
        matrixFilter &&
        matrixFilter.course === course &&
        matrixFilter.day_group === day_group &&
        matrixFilter.am_pm === am_pm
      ) {
        matrixFilter = null;
        $("detail-hint").textContent = "All sessions matching filters. Click a matrix cell to filter.";
      } else {
        matrixFilter = { course, day_group, am_pm };
        $("detail-hint").textContent = `Filtered: ${course}, ${day_group}, ${am_pm}. Click cell again to clear.`;
      }
      renderAll();
    });
  });
}

function renderWeekday(list) {
  const rows = [];
  for (const wd of WEEKDAYS) {
    for (const course of COURSES) {
      for (const ap of AM_PM) {
        const n = list.filter(
          (s) => s.weekday === wd && s.course === course && s.am_pm === ap
        ).length;
        if (n) rows.push({ wd, course, ap, n });
      }
    }
  }
  let html =
    '<table class="matrix"><thead><tr><th>Weekday</th><th>Course</th><th>AM/PM</th><th>Sessions</th></tr></thead><tbody>';
  for (const r of rows) {
    const cls = r.course === "Short Course" ? "sc" : "lc";
    html += `<tr><td>${r.wd}</td><td class="${cls}">${r.course.replace(" Course", "")}</td><td>${r.ap}</td><td><strong>${r.n}</strong></td></tr>`;
  }
  html += "</tbody></table>";
  $("weekday-table").innerHTML = html || "<p class='help'>No data for current filters.</p>";
}

function renderSlots(list) {
  const bySlot = countBy(list, (s) => `${s.slot}|${s.time}`);
  const sorted = [...bySlot.entries()].sort((a, b) => b[1].count - a[1].count);
  let html =
    '<table class="matrix"><thead><tr><th>Slot</th><th>Time</th><th>Sessions</th><th>Hours</th></tr></thead><tbody>';
  for (const [key, o] of sorted) {
    const [slot, time] = key.split("|");
    html += `<tr><td>${esc(slot)}</td><td>${esc(time)}</td><td><strong>${o.count}</strong></td><td>${o.hours.toFixed(1)}</td></tr>`;
  }
  html += "</tbody></table>";
  $("slot-table").innerHTML = html;
}

function renderMonths(list) {
  const byMonth = countBy(list, (s) => s.date.slice(0, 7));
  const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...sorted.map(([, o]) => o.count), 1);

  let html = '<div class="bar-chart">';
  for (const [ym, o] of sorted) {
    const pct = (o.count / max) * 100;
    const scN = o.sessions.filter((s) => s.course === "Short Course").length;
    const lcN = o.count - scN;
    html += `<div class="bar-row">
      <span>${ym}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <span>${o.count}</span>
    </div>
    <div class="help" style="margin:-0.2rem 0 0.35rem 4.5rem;font-size:0.72rem">SC ${scN} · LC ${lcN} · ${o.hours.toFixed(1)} hrs</div>`;
  }
  html += "</div>";
  $("month-chart").innerHTML = html;
}

function renderHoliday(list) {
  const hol = list.filter((s) => s.section === "Holiday & Special");
  if (!hol.length) {
    $("holiday-table").innerHTML = "<p class='help'>No holiday/special sessions for current filters.</p>";
    return;
  }
  let html =
    '<table class="matrix"><thead><tr><th>Date</th><th>Day</th><th>School</th><th>Slot</th><th>Time</th><th>Hrs</th><th>Flags</th></tr></thead><tbody>';
  for (const s of hol.sort((a, b) => a.date.localeCompare(b.date))) {
    html += `<tr>
      <td>${s.date}</td><td>${s.weekday}</td><td>${s.school}</td>
      <td>${esc(s.slot)}</td><td>${esc(s.time)}</td><td>${s.hours}</td>
      <td>${esc((s.flags || []).join(", "))}</td></tr>`;
  }
  html += "</tbody></table>";
  $("holiday-table").innerHTML = html;
}

function renderSchoolCompare() {
  let html =
    '<table class="school-compare"><thead><tr><th>School</th><th>Total</th><th>Regular</th><th>Holiday</th><th>SC</th><th>LC</th><th>AM</th><th>PM</th><th>Hours</th><th>Excel ✓</th></tr></thead><tbody>';
  for (const sch of SCHOOLS) {
    const list = allSessions.filter((s) => s.school === sch);
    const exp = verification.by_school[sch];
    const ok = list.length === exp;
    html += `<tr>
      <td><strong>${sch}</strong><br><span class="help">${SCHOOL_NAMES[sch]}</span></td>
      <td>${list.length}</td>
      <td>${list.filter((s) => s.section === "Regular").length}</td>
      <td>${list.filter((s) => s.section === "Holiday & Special").length}</td>
      <td>${list.filter((s) => s.course === "Short Course").length}</td>
      <td>${list.filter((s) => s.course === "Long Course").length}</td>
      <td>${list.filter((s) => s.am_pm === "AM").length}</td>
      <td>${list.filter((s) => s.am_pm === "PM").length}</td>
      <td>${sumHours(list).toFixed(1)}</td>
      <td>${ok ? "✓ " + exp : "✗ expected " + exp}</td>
    </tr>`;
  }
  html += "</tbody></table>";
  $("school-compare").innerHTML = html;
}

function renderDetail(list) {
  const tbody = $("detail-table").querySelector("tbody");
  const title = $("filter-school").value;
  $("detail-title").textContent =
    matrixFilter
      ? `Session detail — ${title} (${list.length})`
      : `Session detail — ${title} (${list.length} rows)`;

  tbody.innerHTML = list
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map(
      (s) => `<tr>
      <td>${s.date}</td><td>${s.weekday}</td><td>${s.school}</td>
      <td class="${s.course === "Short Course" ? "sc" : "lc"}">${s.course.replace(" Course", "")}</td>
      <td>${s.day_group}</td><td>${s.am_pm}</td><td>${s.section}</td>
      <td>${esc(s.slot)}</td><td>${esc(s.time)}</td><td>${s.hours}</td>
      <td>${esc((s.flags || []).join(", "))}</td></tr>`
    )
    .join("");
}

function verifyBreakdown(list, school) {
  const issues = [];
  const sch = school === "ALL" ? null : school;
  const subset = sch ? list : allSessions;
  const verKey = "by_school_course_daygroup_ampm";

  for (const [key, exp] of Object.entries(verification[verKey] || {})) {
    const [s, course, dg, ap] = key.split("|");
    if (sch && s !== sch) continue;
    const n = subset.filter(
      (x) =>
        x.school === s &&
        x.course === course &&
        x.day_group === dg &&
        x.am_pm === ap &&
        x.section === "Regular"
    ).length;
    if (n !== exp) issues.push(`${key}: site=${n}, excel=${exp}`);
  }
  return issues;
}

function renderAuth() {
  const { ok, issues } = verifyCounts(allSessions, verification);
  const school = $("filter-school").value;
  const breakdownIssues = verifyBreakdown(allSessions, school);

  let html = '<div class="auth-grid">';
  html += `<div><h3>Source document</h3>
    <ul>
      <li><strong>File:</strong> ${esc(verification.source_file)}</li>
      <li><strong>Sheet:</strong> ${esc(verification.sheet)}</li>
      <li><strong>Generated:</strong> ${esc(verification.generated_at)}</li>
      <li><strong>Billable sessions:</strong> ${verification.total_sessions}</li>
      <li><strong>Excluded non-school cells:</strong> ${verification.excluded_count}</li>
    </ul></div>`;

  html += `<div><h3>Excluded cells (not billed)</h3><ul>`;
  for (const ex of verification.excluded_cells || []) {
    html += `<li>${ex.date} · ${esc(ex.slot)} · “${esc(ex.value)}”</li>`;
  }
  html += "</ul></div>";

  html += `<div><h3>Session list integrity</h3>`;
  html += ok
    ? `<p class="pass-text">Every session key matches the Excel export (date + school + slot + time).</p>`
    : `<ul>${issues.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  html += "</div>";

  html += `<div><h3>Billing matrix vs Excel</h3>`;
  if (!breakdownIssues.length) {
    html += `<p>All course × day group × AM/PM counts match for ${school === "ALL" ? "every school" : school}.</p>`;
  } else {
    html += `<ul>${breakdownIssues.slice(0, 12).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    if (breakdownIssues.length > 12)
      html += `<p class="help">+ ${breakdownIssues.length - 12} more mismatches</p>`;
  }
  html += "</div></div>";

  $("auth-panel").innerHTML = html;
}

function exportCsv() {
  const list = getFiltered();
  const headers = [
    "date",
    "weekday",
    "school",
    "course",
    "day_group",
    "am_pm",
    "section",
    "slot",
    "time",
    "hours",
    "flags",
  ];
  const rows = list.map((s) =>
    headers
      .map((h) => {
        const v = h === "flags" ? (s.flags || []).join("; ") : s[h];
        const t = String(v ?? "");
        return t.includes(",") || t.includes('"') ? `"${t.replace(/"/g, '""')}"` : t;
      })
      .join(",")
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `affc-swim-stats-${$("filter-school").value}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderAll() {
  const list = getFiltered();
  renderKpis(list);
  renderMatrix(list);
  renderWeekday(list);
  renderSlots(list);
  renderMonths(list);
  renderHoliday(list);
  renderDetail(list);
  renderAuth();
}

async function init() {
  const bundle = await loadBundle();
  allSessions = bundle.sessions;
  verification = bundle.verification;
  meta = bundle.meta || {};

  $("source-label").textContent = meta.source
    ? `${meta.source} · ${meta.sheet}`
    : verification.source_file;

  const params = new URLSearchParams(location.search);
  if (params.get("school")) $("filter-school").value = params.get("school");

  renderVerifyBanner();
  renderSchoolCompare();

  ["filter-school", "filter-section", "filter-search"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if (id !== "filter-search") matrixFilter = null;
      renderAll();
    });
    $(id).addEventListener("input", renderAll);
  });

  $("export-csv").addEventListener("click", exportCsv);
  $("print-stats").addEventListener("click", () => window.print());

  renderAll();
}

init().catch((e) => {
  $("verify-banner").className = "verify-banner fail";
  $("verify-banner").textContent = "Failed to load data: " + e.message;
});

/* AFFC HS Swim Invoice — 2025-2026 */
(function () {
  const STORAGE = "affc_swim_rates_v2";
  const SCHOOLS = ["AFHS", "LPHS", "PGHS", "SKYR"];
  const COURSES = ["Short Course", "Long Course"];
  const DAY_GROUPS = ["Mon-Tue-Thu-Fri", "Wednesday", "Weekend"];
  const AM_PM = ["AM", "PM"];

  const SCHOOL_NAMES = {
    AFHS: "American Fork High School",
    LPHS: "Lone Peak High School",
    PGHS: "Pleasant Grove High School",
    SKYR: "Skyridge High School",
  };

  let data = { sessions: [], meta: {} };
  let rates = loadRates();

  const $ = (id) => document.getElementById(id);

  function loadRates() {
    try {
      return { holidayFlat: true, hourly: {}, holiday: {}, ...JSON.parse(localStorage.getItem(STORAGE)) };
    } catch {
      return defaultRates();
    }
  }

  function defaultRates() {
    const hourly = {};
    for (const c of COURSES) {
      for (const d of DAY_GROUPS) {
        for (const a of AM_PM) {
          hourly[`${c}|${d}|${a}`] = c === "Short Course" ? 125 : 135;
        }
      }
    }
    const holiday = {};
    return { holidayFlat: true, hourly, holiday };
  }

  function rateKey(c, d, a) {
    return `${c}|${d}|${a}`;
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);
  }

  async function init() {
    const res = await fetch("./data/sessions.json");
    data = await res.json();
    $("session-count").textContent = data.meta.total_sessions + " verified";

    const today = new Date().toISOString().slice(0, 10);
    $("inv-date").value = today;
    const due = new Date();
    due.setDate(due.getDate() + 30);
    $("inv-due").value = due.toISOString().slice(0, 10);
    $("inv-num").value = "INV-" + today.replace(/-/g, "");
    $("bill-to").value = SCHOOL_NAMES.AFHS;

    $("school").addEventListener("change", () => {
      $("bill-to").value = SCHOOL_NAMES[$("school").value] || $("school").value;
      refresh();
    });

    $("save-rates").addEventListener("click", () => {
      readRatesFromUI();
      localStorage.setItem(STORAGE, JSON.stringify(rates));
      $("saved-msg").textContent = "Saved";
      refresh();
    });

    $("holiday-flat").checked = rates.holidayFlat;
    $("holiday-flat").addEventListener("change", () => {
      rates.holidayFlat = $("holiday-flat").checked;
      renderRateInputs();
    });

    $("build-invoice").addEventListener("click", buildInvoice);
    $("copy-text").addEventListener("click", () => copy(lastPlain));
    $("copy-subject").addEventListener("click", () => copy(lastSubject));

    renderRateInputs();
    refresh();
  }

  function schoolSessions() {
    const sch = $("school").value;
    return data.sessions.filter((s) => s.school === sch);
  }

  function regularSessions(list) {
    return list.filter((s) => s.section === "Regular");
  }

  function holidaySessions(list) {
    return list.filter((s) => s.section === "Holiday & Special");
  }

  function sessionAmount(s) {
    if (s.section === "Holiday & Special") {
      if (rates.holidayFlat) {
        return Number(rates.holiday[s.slot] ?? rates.holiday["_default"] ?? 0);
      }
      const rk = rateKey(s.course, "Holiday", s.am_pm);
      return (Number(rates.hourly[rk]) || 0) * s.hours;
    }
    const rk = rateKey(s.course, s.day_group, s.am_pm);
    return (Number(rates.hourly[rk]) || 0) * s.hours;
  }

  function aggregateRegular(list) {
    const tree = {};
    for (const c of COURSES) {
      tree[c] = {};
      for (const d of DAY_GROUPS) {
        tree[c][d] = { AM: { n: 0, h: 0, $: 0 }, PM: { n: 0, h: 0, $: 0 } };
      }
    }
    for (const s of regularSessions(list)) {
      const cell = tree[s.course][s.day_group][s.am_pm];
      cell.n += 1;
      cell.h += s.hours;
      cell.$ += sessionAmount(s);
    }
    return tree;
  }

  function aggregateHoliday(list) {
    const map = new Map();
    for (const s of holidaySessions(list)) {
      const k = s.slot + " · " + s.time;
      if (!map.has(k)) map.set(k, { slot: s.slot, time: s.time, n: 0, h: 0, $: 0, course: s.course });
      const g = map.get(k);
      g.n += 1;
      g.h += s.hours;
      g.$ += sessionAmount(s);
    }
    return [...map.values()];
  }

  function renderRateInputs() {
    const wrap = $("rate-table");
    wrap.innerHTML = "";
    for (const c of COURSES) {
      const head = document.createElement("div");
      head.className = "rate-section-label";
      head.style.cssText = "font-weight:600;margin:0.4rem 0 0.2rem;font-size:0.75rem";
      head.textContent = c;
      wrap.appendChild(head);
      for (const d of DAY_GROUPS) {
        for (const a of AM_PM) {
          const k = rateKey(c, d, a);
          const row = document.createElement("div");
          row.className = "rate-row";
          row.innerHTML = `<span>${d} ${a}</span><input type="number" data-k="${k}" min="0" step="1" value="${rates.hourly[k] ?? 0}" />`;
          wrap.appendChild(row);
        }
      }
    }

    const hol = $("holiday-rates");
    hol.innerHTML = "";
    const slots = [...new Set(data.sessions.filter((s) => s.section === "Holiday & Special").map((s) => s.slot))];
    const def = document.createElement("div");
    def.className = "rate-row";
    def.innerHTML = `<span>Default $/session</span><input type="number" data-hol="_default" min="0" value="${rates.holiday._default ?? 150}" />`;
    hol.appendChild(def);
    for (const slot of slots.sort()) {
      const row = document.createElement("div");
      row.className = "rate-row";
      row.innerHTML = `<span>${slot}</span><input type="number" data-hol="${slot}" min="0" value="${rates.holiday[slot] ?? ""}" placeholder="default" />`;
      hol.appendChild(row);
    }
    $("holiday-rates").style.display = rates.holidayFlat ? "block" : "none";
  }

  function readRatesFromUI() {
    rates.holidayFlat = $("holiday-flat").checked;
    document.querySelectorAll("#rate-table input[data-k]").forEach((inp) => {
      rates.hourly[inp.dataset.k] = Number(inp.value) || 0;
    });
    document.querySelectorAll("#holiday-rates input[data-hol]").forEach((inp) => {
      const v = inp.value === "" ? rates.holiday._default : Number(inp.value);
      rates.holiday[inp.dataset.hol] = v;
    });
  }

  function dayGroupLabel(d) {
    if (d === "Mon-Tue-Thu-Fri") return "Monday · Tuesday · Thursday · Friday";
    if (d === "Wednesday") return "Wednesday";
    if (d === "Weekend") return "Saturday · Sunday";
    return d;
  }

  function renderDayTable(cells) {
    let html = `<table class="inv"><thead><tr>
      <th></th><th class="num">Sessions</th><th class="num">Hours</th><th class="num">Amount</th>
    </tr></thead><tbody>`;
    let subN = 0,
      subH = 0,
      sub$ = 0;
    for (const a of AM_PM) {
      const c = cells[a];
      if (!c.n) continue;
      html += `<tr><td>${a}</td><td class="num">${c.n}</td><td class="num">${c.h.toFixed(1)}</td><td class="num">${money(c.$)}</td></tr>`;
      subN += c.n;
      subH += c.h;
      sub$ += c.$;
    }
    if (subN) {
      html += `<tr class="subtotal"><td>Subtotal</td><td class="num">${subN}</td><td class="num">${subH.toFixed(1)}</td><td class="num">${money(sub$)}</td></tr>`;
    }
    html += "</tbody></table>";
    return { html, sub$ };
  }

  let lastPlain = "";
  let lastSubject = "";

  function buildInvoice() {
    readRatesFromUI();
    const sch = $("school").value;
    const list = schoolSessions();
    const reg = aggregateRegular(list);
    const hol = aggregateHoliday(list);
    let total = 0;
    let html = `<div class="inv-head">
      <h2>Invoice ${escapeHtml($("inv-num").value)}</h2>
      <div class="inv-meta">
        <div><strong>From:</strong> ${escapeHtml($("inv-from").value)}</div>
        <div><strong>Bill to:</strong> ${escapeHtml($("bill-to").value)} (${sch})</div>
        <div><strong>Date:</strong> ${$("inv-date").value} · <strong>Due:</strong> ${$("inv-due").value}</div>
        <div>High school swim lane rental — 2025-2026 season</div>
      </div>
    </div>`;

    const plain = [];
    plain.push($("inv-from").value);
    plain.push(`INVOICE ${$("inv-num").value}`);
    plain.push(`Bill to: ${$("bill-to").value} (${sch})`);
    plain.push(`Date: ${$("inv-date").value}  Due: ${$("inv-due").value}`);
    plain.push("");
    plain.push("HIGH SCHOOL SWIM LANE RENTAL — 2025-2026");
    plain.push("");

    for (const course of COURSES) {
      const css = course === "Short Course" ? "sc" : "lc";
      html += `<section class="billing-section ${css}"><h3>${course}</h3>`;
      plain.push(`=== ${course.toUpperCase()} ===`);

      let courseTotal = 0;
      for (const dg of DAY_GROUPS) {
        const cells = reg[course][dg];
        const has = cells.AM.n + cells.PM.n;
        if (!has) continue;
        const { html: thtml, sub$ } = renderDayTable(cells);
        courseTotal += sub$;
        html += `<div class="day-block"><h4>${dayGroupLabel(dg)}</h4>${thtml}</div>`;
        plain.push(`  ${dayGroupLabel(dg)}`);
        if (cells.AM.n) plain.push(`    AM: ${cells.AM.n} sessions, ${cells.AM.h.toFixed(1)} hr — ${money(cells.AM.$)}`);
        if (cells.PM.n) plain.push(`    PM: ${cells.PM.n} sessions, ${cells.PM.h.toFixed(1)} hr — ${money(cells.PM.$)}`);
      }
      html += `<p style="text-align:right;font-weight:600">${course} total: ${money(courseTotal)}</p>`;
      plain.push(`  Section total: ${money(courseTotal)}`);
      plain.push("");
      total += courseTotal;
    }

    if (hol.length) {
      html += `<section class="billing-section holiday"><h3>Holiday &amp; special rentals</h3>`;
      plain.push("=== HOLIDAY & SPECIAL RENTALS ===");
      html += `<table class="inv"><thead><tr>
        <th>Slot</th><th>Time</th><th>Course</th>
        <th class="num">Sessions</th><th class="num">Hours</th><th class="num">Amount</th>
      </tr></thead><tbody>`;
      let hol$ = 0;
      for (const row of hol) {
        hol$ += row.$;
        html += `<tr><td>${escapeHtml(row.slot)}</td><td>${escapeHtml(row.time)}</td><td>${row.course}</td>
          <td class="num">${row.n}</td><td class="num">${row.h.toFixed(1)}</td><td class="num">${money(row.$)}</td></tr>`;
        plain.push(`  ${row.slot} (${row.time}): ${row.n}× — ${money(row.$)}`);
      }
      html += `</tbody></table><p style="text-align:right;font-weight:600">Holiday total: ${money(hol$)}</p></section>`;
      plain.push(`  Section total: ${money(hol$)}`);
      plain.push("");
      total += hol$;
    }

    html += `<p class="grand-total">Total due: ${money(total)}</p>`;
    plain.push(`TOTAL DUE: ${money(total)}`);
    plain.push("");
    plain.push("Thank you,");
    plain.push($("inv-from").value);

    $("invoice-doc").innerHTML = html;
    lastPlain = plain.join("\n");
    lastSubject = `Invoice ${$("inv-num").value} — ${sch} — AFFC HS Swim 2025-2026`;

    renderSummary(list, total);
    renderNoteworthy(sch);
  }

  function renderSummary(list, total) {
    const reg = regularSessions(list).length;
    const hol = holidaySessions(list).length;
    $("summary-bar").innerHTML = `
      <div><span class="muted">Sessions</span> <strong>${list.length}</strong></div>
      <div><span class="muted">Regular (SC/LC grid)</span> <strong>${reg}</strong></div>
      <div><span class="muted">Holiday / special</span> <strong>${hol}</strong></div>
      <div><span class="muted">Invoice total</span> <strong>${money(total)}</strong></div>
    `;
  }

  function renderNoteworthy(sch) {
    const list = schoolSessions();
    const flagged = list.filter((s) => s.flags && s.flags.length);
    const ex = data.meta.excluded_cells || [];
    let html = "<h3 style='margin:0 0 0.5rem;font-size:0.85rem'>Schedule notes (this school)</h3>";
    if (!flagged.length) {
      html += "<p>None flagged for this school.</p>";
    } else {
      html += "<ul>";
      const seen = new Set();
      for (const s of flagged) {
        const key = s.flags.join(";") + s.date;
        if (seen.has(key)) continue;
        seen.add(key);
        html += `<li><strong>${s.date}</strong> (${s.weekday}) — ${s.flags.join("; ")} — ${s.slot}</li>`;
      }
      html += "</ul>";
    }
    html += "<h3 style='margin:0.75rem 0 0.5rem;font-size:0.85rem'>Excluded from billing (whole schedule)</h3>";
    html += '<ul class="excluded">';
    for (const e of ex) {
      html += `<li>${e.date}: "${escapeHtml(e.value)}" in ${e.slot}</li>`;
    }
    html += "</ul>";
    html += `<p class="help">Long course on Tue/Thu; short course on Mon/Wed/Fri. Weekend = Sat/Sun.</p>`;
    $("noteworthy").innerHTML = html;
  }

  function refresh() {
    readRatesFromUI();
    const list = schoolSessions();
    let t = 0;
    for (const s of list) t += sessionAmount(s);
    renderSummary(list, t);
    renderNoteworthy($("school").value);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const b = $("clipboard-buffer");
      b.value = text;
      b.select();
      document.execCommand("copy");
    }
    alert("Copied to clipboard.");
  }

  init().catch((e) => {
    document.body.innerHTML = `<p style="padding:2rem">Failed to load data/sessions.json. Run a local server (see README).<br><pre>${e}</pre></p>`;
  });
})();

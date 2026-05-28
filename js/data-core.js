/** Shared data constants and helpers for billing + stats */
export const SCHOOLS = ["AFHS", "LPHS", "PGHS", "SKYR"];
export const COURSES = ["Short Course", "Long Course"];
export const DAY_GROUPS = ["Mon-Tue-Thu-Fri", "Wednesday", "Weekend"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const AM_PM = ["AM", "PM"];

export const SCHOOL_NAMES = {
  AFHS: "American Fork High School",
  LPHS: "Lone Peak High School",
  PGHS: "Pleasant Grove High School",
  SKYR: "Skyridge High School",
};

export async function loadBundle() {
  const [sessRes, verRes] = await Promise.all([
    fetch("./data/sessions.json"),
    fetch("./data/verification.json"),
  ]);
  const bundle = await sessRes.json();
  bundle.verification = await verRes.json();
  return bundle;
}

export function filterSessions(sessions, school) {
  if (!school || school === "ALL") return sessions;
  return sessions.filter((s) => s.school === school);
}

export function sumHours(list) {
  return list.reduce((a, s) => a + (s.hours || 0), 0);
}

export function countBy(sessions, keyFn) {
  const m = new Map();
  for (const s of sessions) {
    const k = keyFn(s);
    if (!m.has(k)) m.set(k, { count: 0, hours: 0, sessions: [] });
    const o = m.get(k);
    o.count += 1;
    o.hours += s.hours || 0;
    o.sessions.push(s);
  }
  return m;
}

export function verifyCounts(sessions, verification) {
  const issues = [];
  const total = sessions.length;
  if (total !== verification.total_sessions) {
    issues.push(`Total sessions: site=${total}, excel=${verification.total_sessions}`);
  }
  for (const sch of SCHOOLS) {
    const n = sessions.filter((s) => s.school === sch).length;
    const exp = verification.by_school[sch] || 0;
    if (n !== exp) issues.push(`${sch}: site=${n}, excel=${exp}`);
  }
  const keys = sessions
    .map((s) => `${s.date}|${s.school}|${s.slot}|${s.time}`)
    .sort();
  const expKeys = verification.session_keys || [];
  if (keys.length !== expKeys.length) {
    issues.push(`Session key count mismatch`);
  } else {
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== expKeys[i]) {
        issues.push(`Session list differs at index ${i}`);
        break;
      }
    }
  }
  return { ok: issues.length === 0, issues, total };
}

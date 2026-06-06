import React, { useState, useEffect } from "react";
import {
  Users, CalendarCheck, LayoutDashboard, Plus, Search, Trash2, Pencil,
  X, Check, Copy, ChevronLeft, ChevronRight, LogOut, Shield, User,
  Megaphone, BookOpen, Lock, Flame, Award, KeyRound, Trophy, Medal, Star, BadgeCheck, Download, ClipboardList,
} from "lucide-react";

// 배포 환경에서 브라우저 로컬 백업(window.storage가 없으면 localStorage 사용)
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (k) => { const v = localStorage.getItem(k); return v ? { value: v } : null; },
    set: async (k, v) => { localStorage.setItem(k, v); },
  };
}

// ════════════════════════════════════════════════════
//  가온태권도장 운영 앱 v3
//  · 디자인 리뉴얼 (딥 차콜 + 골드 / 전용 서체)
//  · 회원별 수련 횟수 누적 (관리자 전체 / 수련자 본인)
//  · 다중 관리자: 최고관리자가 사범 계정(아이디·비번) 배정
//  데이터는 브라우저에 저장되어 새로고침해도 유지됩니다.
// ════════════════════════════════════════════════════

const C = {
  bg: "#08080b", card: "#131318", card2: "#1b1b22", line: "#27272f",
  gold: "#d8b45a", goldLt: "#f0d590", goldGrad: "linear-gradient(135deg,#f0d590,#c69a3c)",
  text: "#f3f0e8", dim: "#8c8c96", dim2: "#62626c",
};
const TEAM_COLOR = { "GDT(시범단)": "#d8693f", "GST(겨루기)": "#4d82d8", "GPT(품새)": "#3fb08c" };
const HCAT = {
  "승단": { color: "#d8b45a", Icon: Award },
  "대회": { color: "#d8693f", Icon: Trophy },
  "공연": { color: "#4d82d8", Icon: Star },
  "자격증": { color: "#8a6fd4", Icon: BadgeCheck },
  "기타": { color: "#3fb08c", Icon: Medal },
};
const HCATS = ["승단", "대회", "공연", "자격증", "기타"];
const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const DISP = "'Oswald', " + FONT;

const SESSIONS = ["오전", "오후", "통합"];
const TEAMS = ["GDT(시범단)", "GST(겨루기)", "GPT(품새)"];
const STATUSES = ["활동중", "정지중", "탈퇴"];
const LESSON_NAMES = ["오전 정규반", "오후 정규반", "통합반", "시범단 훈련", "겨루기팀 훈련", "품새팀 훈련"];
const EVENT_NAMES = ["승급심사", "태권도대회", "시범공연", "이벤트"];
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KEY = "gaon:data:v3";

// ── Supabase 공용 저장소 연결 ──
const SB_URL = "https://toaqqukkukmytmbhjtbb.supabase.co";
const SB_KEY = "sb_publishable_I2sw5hRddkPhk1VtaivWlA_bqNkSQXa";
const SB_HEAD = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
async function sbLoad() {
  const r = await fetch(`${SB_URL}/rest/v1/gaon_app?id=eq.1&select=data`, { headers: SB_HEAD });
  if (!r.ok) throw new Error("load fail " + r.status);
  const rows = await r.json();
  return rows[0]?.data ?? null;
}
async function sbSave(data) {
  const r = await fetch(`${SB_URL}/rest/v1/gaon_app?id=eq.1`, {
    method: "PATCH", headers: { ...SB_HEAD, Prefer: "return=minimal" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("save fail " + r.status);
}

const yy = () => String(new Date().getFullYear()).slice(2);
const tail4 = (p) => (p || "").replace(/\D/g, "").slice(-4);
const isTeam = (t) => TEAMS.includes(t);
const tColor = (t) => TEAM_COLOR[t] || C.gold;
const mainColor = (targets) => { const t = (targets || []).find(isTeam); return t ? tColor(t) : C.gold; };
const canTake = (m, c) => (c.targets || []).some((t) => (m.enrollments || []).includes(t));
const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// 누적 / 월별 수련 횟수 (출석 기준)
const trainTotal = (data, mid) => Object.values(data.attendance).reduce((n, day) => n + (day[mid] === "출석" ? 1 : 0), 0);
const trainMonth = (data, mid, m = ym()) => Object.entries(data.attendance).reduce((n, [d, day]) => n + (d.startsWith(m) && day[mid] === "출석" ? 1 : 0), 0);

function weekDates(base) {
  const d = new Date(base), dow = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return x.toISOString().slice(0, 10); });
}

function useWide() {
  const [wide, setWide] = useState(typeof window !== "undefined" ? window.innerWidth >= 900 : false);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 900);
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return wide;
}

// 수업이 해당 주에 열리는 날짜 (매주=요일, 특정날짜=그 주에 포함될 때만)
function classDateInWeek(c, week) {
  if (c.type === "once") return week.includes(c.date) ? c.date : null;
  return week[c.day];
}
const dowOf = (date) => new Date(date + "T00:00:00").getDay();

// 엑셀에서 바로 열리는 CSV 내려받기 (UTF-8 BOM 포함 → 한글 안 깨짐)
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalize(d) {
  if (!d.admins) d.admins = [{ id: 1, loginId: "가온", pw: "0000", name: "관장", role: "super" }];
  d.admins = d.admins.map((a) => (a.role === "super" && a.loginId === "master") ? { ...a, loginId: "가온" } : a);
  d.members = (d.members || []).map((m) => {
    const e = m.enrollments || [...(m.session ? [m.session] : []), ...(m.team && m.team !== "없음" ? [m.team] : [])];
    return { ...m, enrollments: e, history: m.history || [] };
  });
  d.classes = (d.classes || []).map((c) => ({ ...c, targets: c.targets || (c.target ? [c.target] : []), type: c.type || "weekly", kind: c.kind || (EVENT_NAMES.includes(c.label) ? "행사" : "수업"), fields: c.fields || [] }));
  if (!d.submissions) d.submissions = {};
  return d;
}

const SAMPLE = {
  admins: [
    { id: 1, loginId: "가온", pw: "0000", name: "관장", role: "super" },
    { id: 2, loginId: "eunji", pw: "1234", name: "이은지 사범", role: "staff" },
  ],
  members: [
    { id: 1, no: "25-001", name: "김지훈", phone: "010-1234-0001", enrollments: ["오후", "GST(겨루기)", "GPT(품새)"], status: "활동중", joinDate: "2025-03-02", history: [
      { id: 1, date: "2025-09-01", category: "승단", title: "태권도 1단 승단" },
      { id: 2, date: "2025-11-15", category: "대회", title: "서울시 생활체육대회 겨루기 1위" },
      { id: 3, date: "2026-03-10", category: "공연", title: "신촌 거리 시범공연 참여" },
      { id: 4, date: "2026-04-20", category: "자격증", title: "생활스포츠지도사 2급 (태권도)" },
    ] },
    { id: 2, no: "25-002", name: "이수민", phone: "010-1234-0002", enrollments: ["오후"], status: "활동중", joinDate: "2025-05-11" },
    { id: 3, no: "24-001", name: "박서연", phone: "010-1234-0003", enrollments: ["오전", "GPT(품새)"], status: "활동중", joinDate: "2024-11-20" },
    { id: 4, no: "25-003", name: "정민재", phone: "010-1234-0004", enrollments: ["통합", "GDT(시범단)"], status: "정지중", joinDate: "2025-01-15" },
    { id: 5, no: "26-001", name: "최유진", phone: "010-1234-0005", enrollments: ["오후"], status: "활동중", joinDate: "2026-06-01" },
    { id: 6, no: "24-002", name: "강도현", phone: "010-1234-0006", enrollments: ["오후", "GST(겨루기)"], status: "탈퇴", joinDate: "2024-09-08" },
    { id: 7, no: "26-002", name: "한지우", phone: "010-1234-0007", enrollments: ["통합", "GDT(시범단)"], status: "활동중", joinDate: "2026-02-10" },
  ],
  classes: [
    { id: 1, kind: "수업", type: "weekly", day: 5, time: "20:00", targets: ["GDT(시범단)"], label: "시범단 훈련", desc: "" },
    { id: 2, kind: "수업", type: "weekly", day: 6, time: "16:00", targets: ["GST(겨루기)"], label: "겨루기팀 훈련", desc: "" },
    { id: 3, kind: "수업", type: "weekly", day: 0, time: "11:00", targets: ["GPT(품새)"], label: "품새팀 훈련", desc: "" },
    { id: 4, kind: "수업", type: "weekly", day: 2, time: "10:00", targets: ["오전"], label: "오전 정규반", desc: "" },
    { id: 5, kind: "수업", type: "weekly", day: 1, time: "19:00", targets: ["오후"], label: "오후 정규반", desc: "" },
    { id: 6, kind: "행사", type: "once", day: 0, date: "2026-06-28", time: "14:00", targets: ["오전", "오후", "통합"], label: "승급심사", desc: "6월 정기 승급심사. 도복·승급비 지참.", fields: ["현재 단/급", "응시 단/급", "비상 연락처"] },
  ],
  submissions: {},
  reservations: {},
  attendance: {},
  notices: [{ id: 1, date: "2026-06-01", title: "6월 정상 운영 안내", body: "이번 달도 정규 수업 정상 진행합니다. 매트 위에서 만나요!" }],
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("auth");
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    // 서체 주입
    [
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
      "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&display=swap",
    ].forEach((href) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l); });
    (async () => {
      let loaded = null;
      // 1) 공용 저장소(Supabase) 먼저
      try {
        const sb = await sbLoad();
        if (sb && Object.keys(sb).length > 0) loaded = sb;
      } catch {}
      // 2) 실패 시 브라우저 백업
      if (!loaded) { try { const r = await window.storage.get(KEY); if (r) loaded = JSON.parse(r.value); } catch {} }
      const final = normalize(loaded || SAMPLE);
      setData(final);
      setLoading(false);
      // 공용 저장소가 비어 있으면 초기 데이터 한 번 올려두기(시드)
      if (!loaded) { try { await sbSave(final); } catch {} }
    })();
  }, []);

  const persist = async (next) => {
    setData(next);
    try { await window.storage.set(KEY, JSON.stringify(next)); } catch {} // 로컬 백업(항상)
    setSaveState("saving");
    try { await sbSave(next); setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1500); }
    catch { setSaveState("error"); }
  };
  const wide = useWide();

  if (loading || !data) return <Center>불러오는 중…</Center>;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: FONT,
      backgroundImage: "radial-gradient(900px circle at 50% -10%, rgba(216,180,90,0.10), transparent 55%)" }}>
      {saveState !== "idle" && (
        <div style={{ position: "fixed", top: 14, right: 14, zIndex: 100, fontSize: 12, fontWeight: 700, padding: "7px 13px", borderRadius: 10,
          background: saveState === "error" ? "#3a2418" : "#16221a", color: saveState === "error" ? "#e0a86a" : "#7fd6a0", border: `1px solid ${saveState === "error" ? "#5a4022" : "#2a5a3e"}` }}>
          {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "☁ 클라우드 저장됨" : "⚠ 로컬 임시저장 (연결 확인 필요)"}
        </div>
      )}
      <div style={{ maxWidth: (wide && view === "admin") ? 1260 : 1000, margin: "0 auto", padding: "0 16px 90px" }}>
        {view === "auth" && <Auth data={data}
          onAdmin={(a) => { setAdmin(a); setView("admin"); }}
          onMember={(m) => { setUser(m); setView("member"); }} />}
        {view === "admin" && admin && <Admin data={data} persist={persist} admin={admin} onLogout={() => { setAdmin(null); setView("auth"); }} />}
        {view === "member" && user && <Member data={data} persist={persist}
          me={data.members.find((x) => x.id === user.id) || user} onLogout={() => { setUser(null); setView("auth"); }} />}
      </div>
    </div>
  );
}

// ═══════════ 로그인 ═══════════
function Auth({ data, onAdmin, onMember }) {
  const [mode, setMode] = useState("member");
  const [no, setNo] = useState(""); const [pin, setPin] = useState("");
  const [lid, setLid] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const loginMember = () => {
    const m = data.members.find((x) => x.no === no.trim());
    if (!m) return setErr("회원번호를 찾을 수 없습니다.");
    if (tail4(m.phone) !== pin.trim()) return setErr("전화번호 뒷 4자리가 일치하지 않습니다.");
    setErr(""); onMember(m);
  };
  const loginAdmin = () => {
    const a = data.admins.find((x) => x.loginId === lid.trim() && x.pw === pw.trim());
    if (!a) return setErr("아이디 또는 비밀번호가 일치하지 않습니다.");
    setErr(""); onAdmin(a);
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", paddingTop: 56 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <img src="/logo.png" alt="가온태권도장" style={{ width: "64%", maxWidth: 250, height: "auto", display: "block", margin: "0 auto", filter: "drop-shadow(0 6px 22px rgba(0,0,0,0.55))" }} />
        <div style={{ height: 2, width: "64%", maxWidth: 250, margin: "20px auto 0", background: "linear-gradient(90deg, transparent, #d8b45a 22%, #f0d68a 50%, #d8b45a 78%, transparent)", borderRadius: 2, opacity: 0.85 }} />
        <p style={{ margin: "14px 0 0", fontSize: 13, color: "#b8a878", letterSpacing: "0.2px" }}>같이 배우고 같이 땀 흘리는, 우리의 시간</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["member", "수련자", User], ["admin", "관리자", Shield]].map(([id, label, Icon]) => {
          const on = mode === id;
          return (
            <button key={id} onClick={() => { setMode(id); setErr(""); }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 13,
                background: on ? C.goldGrad : "transparent", color: on ? "#1a1305" : C.dim,
                border: `1px solid ${on ? "transparent" : C.line}`, borderRadius: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: on ? "0 4px 14px rgba(216,180,90,0.25)" : "none" }}>
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, boxShadow: "0 12px 40px rgba(0,0,0,0.4)" }}>
        {mode === "member" ? (
          <>
            <Field label="회원번호"><input style={inp} value={no} onChange={(e) => setNo(e.target.value)} placeholder="예: 25-001" /></Field>
            <Field label="전화번호 뒷 4자리"><input style={inp} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="0000" maxLength={4} /></Field>
            <button onClick={loginMember} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 6 }}>로그인</button>
            <p style={{ fontSize: 11, color: C.dim2, marginTop: 14, lineHeight: 1.6 }}>
              테스트 · 25-001/0001(김지훈·활동중) · 25-003/0004(정민재·정지중) · 24-002/0006(강도현·탈퇴)
            </p>
          </>
        ) : (
          <>
            <Field label="아이디"><input style={inp} value={lid} onChange={(e) => setLid(e.target.value)} placeholder="아이디" /></Field>
            <Field label="비밀번호"><input type="password" style={inp} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••" /></Field>
            <button onClick={loginAdmin} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 6 }}>로그인</button>
            <p style={{ fontSize: 11, color: C.dim2, marginTop: 14, lineHeight: 1.6 }}>
              테스트 · 가온/0000(최고관리자) · eunji/1234(사범)
            </p>
          </>
        )}
        {err && <p style={{ color: "#e58282", fontSize: 12, marginTop: 12, marginBottom: 0 }}>{err}</p>}
      </div>
    </div>
  );
}

// ═══════════ 관리자 ═══════════
function Admin({ data, persist, admin, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const wide = useWide();
  const tabs = [
    ["dashboard", "대시보드", LayoutDashboard],
    ["members", "회원", Users],
    ["training", "수련현황", Flame],
    ["classes", "수업", BookOpen],
    ["events", "이벤트", Trophy],
    ["reserve", "예약·출석", CalendarCheck],
    ["notice", "공지", Megaphone],
    ...(admin.role === "super" ? [["accounts", "관리자", KeyRound]] : []),
  ];
  const content = (
    <>
      {tab === "dashboard" && <Dashboard data={data} wide={wide} />}
      {tab === "members" && <MembersAdmin data={data} persist={persist} />}
      {tab === "training" && <TrainingView data={data} />}
      {tab === "classes" && <ClassesAdmin data={data} persist={persist} kind="수업" />}
      {tab === "events" && <ClassesAdmin data={data} persist={persist} kind="행사" />}
      {tab === "reserve" && <ReserveAdmin data={data} persist={persist} />}
      {tab === "notice" && <NoticeAdmin data={data} persist={persist} />}
      {tab === "accounts" && admin.role === "super" && <AdminAccounts data={data} persist={persist} me={admin} />}
    </>
  );
  if (wide) {
    return (
      <div style={{ display: "flex", gap: 28, paddingTop: 26 }}>
        <Sidebar tabs={tabs} tab={tab} setTab={setTab} admin={admin} onLogout={onLogout} />
        <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
      </div>
    );
  }
  return (
    <>
      <TopBar role="관리자" name={admin.name} onLogout={onLogout} />
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
      {content}
    </>
  );
}

function Sidebar({ tabs, tab, setTab, admin, onLogout }) {
  return (
    <aside style={{ width: 212, flexShrink: 0, position: "sticky", top: 26, alignSelf: "flex-start", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      <div style={{ paddingBottom: 18, borderBottom: `1px solid ${C.line}`, marginBottom: 14 }}>
        <img src="/logo-h.png" alt="가온태권도장" style={{ width: 180, height: "auto", display: "block" }} />
        <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>관리자 · {admin.name}</div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {tabs.map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
              background: on ? C.goldGrad : "transparent", color: on ? "#1a1305" : C.dim,
              border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left",
              boxShadow: on ? "0 4px 14px rgba(216,180,90,0.22)" : "none" }}>
              <Icon size={17} /> {label}
            </button>
          );
        })}
      </nav>
      <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 11, color: C.dim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><LogOut size={15} /> 로그아웃</button>
    </aside>
  );
}

function Dashboard({ data, wide }) {
  const active = data.members.filter((x) => x.status === "활동중");
  const counts = { 활동중: 0, 정지중: 0, 탈퇴: 0 };
  data.members.forEach((x) => counts[x.status]++);
  const bySession = SESSIONS.map((s) => ({ name: s, n: active.filter((x) => (x.enrollments || []).includes(s)).length, color: C.gold }));
  const byTeam = TEAMS.map((t) => ({ name: t, n: active.filter((x) => (x.enrollments || []).includes(t)).length, color: tColor(t) }));
  const maxS = Math.max(1, ...bySession.map((b) => b.n));
  const maxT = Math.max(1, ...byTeam.map((b) => b.n));
  const totalTrain = data.members.reduce((n, m) => n + trainTotal(data, m.id), 0);

  return (
    <div>
      <Grid3>
        <Stat label="활동중" value={counts.활동중} unit="명" accent />
        <Stat label="정지중" value={counts.정지중} unit="명" />
        <Stat label="이번달 수련" value={data.members.reduce((n, m) => n + trainMonth(data, m.id), 0)} unit="회" />
      </Grid3>
      <div style={{ display: wide ? "grid" : "block", gridTemplateColumns: wide ? "1fr 1fr" : undefined, gap: wide ? 16 : 0, alignItems: "start" }}>
      <Panel title="세션별 등록 인원" sub="활동중 기준 · 복수 등록 포함">
        {bySession.map((b) => <Bar key={b.name} {...b} max={maxS} />)}
      </Panel>
      <Panel title="전문팀 등록 인원" sub="활동중 기준">
        {byTeam.map((b) => <Bar key={b.name} {...b} max={maxT} />)}
      </Panel>
      <Panel title="개설된 수업">
        {data.classes.filter((c) => (c.kind || "수업") === "수업").length === 0 ? <Empty>개설된 수업이 없습니다.</Empty> :
          [...data.classes].filter((c) => (c.kind || "수업") === "수업").sort((a, b) => ((b.targets || []).some(isTeam) ? 1 : 0) - ((a.targets || []).some(isTeam) ? 1 : 0) || (a.day || 0) - (b.day || 0)).map((c) => {
            const dow = c.type === "once" ? dowOf(c.date) : c.day;
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                <DayBadge day={dow} color={mainColor(c.targets)} />
                <span style={{ color: C.dim, fontFamily: DISP, fontWeight: 600 }}>{c.time}</span>
                <span style={{ fontWeight: 600 }}>{c.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim2 }}>{c.type === "once" ? c.date.slice(5) : `매주 ${DAYS[c.day]}`}</span>
              </div>
            );
          })}
      </Panel>
      <Panel title="다가오는 일정" sub="대회 · 심사 · 공연 · 이벤트">
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const evs = data.classes.filter((c) => c.kind === "행사" && (c.type !== "once" || c.date >= today)).sort((a, b) => (a.date || "z").localeCompare(b.date || "z"));
          return evs.length === 0 ? <Empty>예정된 일정이 없습니다.</Empty> : evs.map((c) => {
            const dow = c.type === "once" ? dowOf(c.date) : c.day;
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                <DayBadge day={dow} color={mainColor(c.targets)} />
                <span style={{ fontWeight: 600, flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 11, color: C.dim2 }}>{c.type === "once" ? `${c.date.slice(5)} ${c.time}` : `매주 ${DAYS[c.day]} ${c.time}`}</span>
              </div>
            );
          });
        })()}
      </Panel>
      <Panel title="공지사항">
        {data.notices.length === 0 ? <Empty>등록된 공지가 없습니다.</Empty> : data.notices.map((n) => (
          <div key={n.id} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontWeight: 700 }}>{n.title}</div>
            <div style={{ fontSize: 11, color: C.dim2, margin: "3px 0 6px", fontFamily: DISP }}>{n.date}</div>
            <div style={{ fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{n.body}</div>
          </div>
        ))}
      </Panel>
      </div>
    </div>
  );
}

// ── 수련현황 (전체 회원 수련 횟수) ──
function TrainingView({ data }) {
  const rows = data.members.filter((m) => m.status !== "탈퇴")
    .map((m) => ({ m, total: trainTotal(data, m.id), month: trainMonth(data, m.id) }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.map((r) => r.total));
  const sum = rows.reduce((n, r) => n + r.total, 0);

  return (
    <div>
      <Grid3>
        <Stat label="누적 수련" value={sum} unit="회" accent />
        <Stat label="이번달" value={rows.reduce((n, r) => n + r.month, 0)} unit="회" />
        <Stat label="대상 회원" value={rows.length} unit="명" />
      </Grid3>
      <Panel title="회원별 수련 횟수" sub="누적 출석 기준 · 내림차순">
        {rows.length === 0 ? <Empty>데이터가 없습니다.</Empty> : rows.map((r, i) => (
          <div key={r.m.id} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
              <span style={{ fontFamily: DISP, fontWeight: 700, color: i < 3 ? C.gold : C.dim2, minWidth: 20, fontSize: 15 }}>{i + 1}</span>
              <span style={{ fontWeight: 700 }}>{r.m.name}</span>
              <span style={{ fontSize: 11, color: C.dim2 }}>{r.m.no}</span>
              <span style={{ marginLeft: "auto", fontFamily: DISP, fontWeight: 700, color: C.gold, fontSize: 16 }}>{r.total}<span style={{ fontSize: 11, color: C.dim, marginLeft: 2 }}>회</span></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 7, background: "#202028", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${(r.total / max) * 100}%`, height: "100%", background: C.goldGrad, borderRadius: 5 }} />
              </div>
              <span style={{ fontSize: 11, color: C.dim2, minWidth: 60, textAlign: "right" }}>이번달 {r.month}회</span>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function MembersAdmin({ data, persist }) {
  const [q, setQ] = useState(""); const [edit, setEdit] = useState(null); const [hist, setHist] = useState(null);
  const list = data.members.filter((m) => m.name.includes(q) || m.no.includes(q) || m.phone.includes(q));
  const nextNo = () => {
    const p = yy();
    const n = Math.max(0, ...data.members.filter((m) => m.no.startsWith(p)).map((m) => Number(m.no.split("-")[1]))) + 1;
    return `${p}-${String(n).padStart(3, "0")}`;
  };
  const save = (mem) => {
    let next;
    if (mem.id) next = { ...data, members: data.members.map((x) => x.id === mem.id ? mem : x) };
    else next = { ...data, members: [...data.members, { ...mem, id: Math.max(0, ...data.members.map((x) => x.id)) + 1, no: nextNo() }] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm("회원 데이터를 완전히 삭제할까요? (탈퇴 처리는 상태 변경 권장)")) persist({ ...data, members: data.members.filter((x) => x.id !== id) }); };
  const badge = (s) => ({ 활동중: C.gold, 정지중: "#c89042", 탈퇴: "#56565e" }[s]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 13px" }}>
          <Search size={16} color={C.dim} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·회원번호·연락처"
            style={{ flex: 1, background: "transparent", border: "none", color: C.text, padding: "12px 0", outline: "none", fontSize: 14, fontFamily: FONT }} />
        </div>
        <button onClick={() => setEdit({ name: "", phone: "", enrollments: [], status: "활동중", joinDate: new Date().toISOString().slice(0, 10) })} style={btnGold}><Plus size={16} /> 추가</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
        {list.length === 0 ? <Empty>회원이 없습니다.</Empty> : list.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontFamily: DISP, width: 44, textAlign: "center", fontSize: 12, color: C.dim2, fontWeight: 700 }}>{m.no}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>{m.name}
                <span style={{ fontSize: 10, color: "#0b0b0e", background: badge(m.status), borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{m.status}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto", fontFamily: DISP, color: C.gold, fontWeight: 700 }}><Flame size={13} />{trainTotal(data, m.id)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {(m.enrollments || []).map((e) => <span key={e} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(e), borderRadius: 5, padding: "2px 6px" }}>{e}</span>)}
              </div>
            </div>
            <button onClick={() => setHist(m)} style={iconBtn} title="경력 관리"><Award size={15} /></button>
            <button onClick={() => setEdit(m)} style={iconBtn}><Pencil size={15} /></button>
            <button onClick={() => remove(m.id)} style={iconBtn}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      {edit && <MemberForm member={edit} previewNo={edit.id ? edit.no : nextNo()} onSave={save} onClose={() => setEdit(null)} />}
      {hist && <HistoryManager member={hist} onSave={(mem) => { save(mem); setHist(null); }} onClose={() => setHist(null)} />}
    </div>
  );
}

function MemberForm({ member, previewNo, onSave, onClose }) {
  const [f, setF] = useState(member);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (v) => setF((p) => { const s = new Set(p.enrollments || []); s.has(v) ? s.delete(v) : s.add(v); return { ...p, enrollments: [...s] }; });
  const has = (v) => (f.enrollments || []).includes(v);
  return (
    <Modal title={member.id ? "회원 정보 수정" : "새 회원 등록"} onClose={onClose}>
      <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
        회원번호 <b style={{ color: C.gold, fontFamily: DISP, letterSpacing: 1 }}>{previewNo}</b> {member.id ? "" : "(자동 발급)"}
      </div>
      <Field label="이름"><input style={inp} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="연락처"><input style={inp} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" /></Field>
      <Field label="수업 등록 (복수 선택 가능)">
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>정규반</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{SESSIONS.map((s) => <Chip key={s} on={has(s)} color={C.gold} onClick={() => toggle(s)}>{s}</Chip>)}</div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>전문팀</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TEAMS.map((t) => <Chip key={t} on={has(t)} color={tColor(t)} onClick={() => toggle(t)}>{t}</Chip>)}</div>
      </Field>
      <Field label="상태"><select style={inp} value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="등록일"><input type="date" style={inp} value={f.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></Field>
      <button disabled={!f.name.trim() || !tail4(f.phone)} onClick={() => onSave(f)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: f.name.trim() && tail4(f.phone) ? 1 : 0.4 }}><Check size={16} /> 저장</button>
    </Modal>
  );
}

function HistoryManager({ member, onSave, onClose }) {
  const [list, setList] = useState(member.history || []);
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), category: "승단", title: "" });
  const add = () => { if (!f.title.trim()) return; setList([...list, { ...f, id: Date.now() }]); setF({ ...f, title: "" }); };
  const del = (id) => setList(list.filter((x) => x.id !== id));
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Modal title={`${member.name} 경력 관리`} onClose={onClose}>
      <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        {sorted.length === 0 ? <Empty>등록된 경력이 없습니다.</Empty> : sorted.map((h) => {
          const { color, Icon } = HCAT[h.category] || HCAT["기타"];
          return (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color="#fff" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{h.title}</div>
                <div style={{ fontSize: 11, color: C.dim2, fontFamily: DISP }}>{h.date} · {h.category}</div>
              </div>
              <button onClick={() => del(h.id)} style={iconBtn}><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <Field label="분류"><select style={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{HCATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="날짜"><input type="date" style={inp} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="내용"><input style={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="예: 1단 승단 / 전국대회 겨루기 1위 / 시범공연 참여" /></Field>
      <button onClick={add} disabled={!f.title.trim()} style={{ ...btnGold, width: "100%", justifyContent: "center", background: "transparent", color: C.gold, border: `1px solid ${C.gold}`, boxShadow: "none", opacity: f.title.trim() ? 1 : 0.4 }}><Plus size={16} /> 목록에 추가</button>
      <button onClick={() => onSave({ ...member, history: list })} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 10 }}><Check size={16} /> 저장</button>
    </Modal>
  );
}

function ClassesAdmin({ data, persist, kind }) {
  const [edit, setEdit] = useState(null);
  const [subs, setSubs] = useState(null);
  const isEvent = kind === "행사";
  const names = isEvent ? EVENT_NAMES : LESSON_NAMES;
  const save = (c) => {
    let next;
    if (c.id) next = { ...data, classes: data.classes.map((x) => x.id === c.id ? c : x) };
    else next = { ...data, classes: [...data.classes, { ...c, id: Math.max(0, ...data.classes.map((x) => x.id)) + 1 }] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm(`이 ${isEvent ? "일정" : "수업"}을 삭제할까요?`)) persist({ ...data, classes: data.classes.filter((x) => x.id !== id) }); };
  const card = (c) => {
    const dow = c.type === "once" ? dowOf(c.date) : c.day;
    return (
      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
        <DayBadge day={dow} color={mainColor(c.targets)} big />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{c.label} <span style={{ fontWeight: 500, color: C.dim, fontFamily: DISP }}>{c.time}</span></div>
          <div style={{ fontSize: 12, color: C.dim }}>{c.type === "once" ? `${c.date} (${DAYS[dow]})` : `매주 ${DAYS[c.day]}요일`}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
            {(c.targets || []).map((t) => <span key={t} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(t), borderRadius: 5, padding: "2px 6px" }}>{t}</span>)}
          </div>
          {c.desc && <div style={{ fontSize: 12, color: C.dim2, marginTop: 5, lineHeight: 1.5 }}>{c.desc}</div>}
        </div>
        {isEvent && <button onClick={() => setSubs(c)} style={iconBtn} title="신청 현황"><ClipboardList size={15} /></button>}
        <button onClick={() => setEdit(c)} style={iconBtn}><Pencil size={15} /></button>
        <button onClick={() => remove(c.id)} style={iconBtn}><Trash2 size={15} /></button>
      </div>
    );
  };
  const mine = data.classes.filter((c) => (c.kind || "수업") === kind);
  const sortKey = (c) => c.type === "once" ? c.date : `w${c.day}`;
  const newItem = isEvent
    ? { kind: "행사", type: "once", day: 0, date: new Date().toISOString().slice(0, 10), time: "14:00", targets: [], label: "", desc: "" }
    : { kind: "수업", type: "weekly", day: 1, date: new Date().toISOString().slice(0, 10), time: "19:00", targets: [], label: "", desc: "" };

  if (isEvent) {
    const sorted = [...mine].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return (
      <div>
        <button onClick={() => setEdit(newItem)} style={{ ...btnGold, marginBottom: 18 }}><Plus size={16} /> 일정 추가</button>
        <GroupLabel color="#d8693f">대회 · 심사 · 공연 · 이벤트 ({sorted.length})</GroupLabel>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>{sorted.length ? sorted.map(card) : <Empty>등록된 일정이 없습니다.</Empty>}</div>
        {edit && <ClassForm cls={edit} names={names} isEvent onSave={save} onClose={() => setEdit(null)} />}
        {subs && <SubmissionsView data={data} event={subs} onClose={() => setSubs(null)} />}
      </div>
    );
  }
  const teams = mine.filter((c) => (c.targets || []).some(isTeam)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const regs = mine.filter((c) => !(c.targets || []).some(isTeam)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return (
    <div>
      <button onClick={() => setEdit(newItem)} style={{ ...btnGold, marginBottom: 18 }}><Plus size={16} /> 수업 개설</button>
      <GroupLabel color="#d8693f">전문팀 수업 ({teams.length})</GroupLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>{teams.length ? teams.map(card) : <Empty>전문팀 수업이 없습니다.</Empty>}</div>
      <GroupLabel color={C.gold}>정규반 수업 ({regs.length})</GroupLabel>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>{regs.length ? regs.map(card) : <Empty>정규반 수업이 없습니다.</Empty>}</div>
      {edit && <ClassForm cls={edit} names={names} onSave={save} onClose={() => setEdit(null)} />}
    </div>
  );
}

function SubmissionsView({ data, event, onClose }) {
  const subs = data.submissions[event.id] || {};
  const fields = event.fields || [];
  const rows = Object.entries(subs).map(([mid, s]) => ({ m: data.members.find((x) => x.id === Number(mid)), answers: s.answers || {}, when: s.when || s.date })).filter((r) => r.m);
  const exportCSV = () => {
    const header = ["회원번호", "이름", "연락처", ...fields, "신청일시"];
    const body = rows.map((r) => [r.m.no, r.m.name, r.m.phone, ...fields.map((f) => r.answers[f] || ""), r.when || ""]);
    downloadCSV(`${event.label}_신청현황_${event.date || ""}.csv`, [header, ...body]);
  };
  return (
    <Modal title={`${event.label} 신청 현황`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 14 }}>{event.date || (event.type === "weekly" ? `매주 ${DAYS[event.day]}` : "")} · 총 <b style={{ color: C.gold }}>{rows.length}</b>명 신청</div>
      {rows.length === 0 ? <Empty>아직 신청자가 없습니다.</Empty> : (
        <>
          <div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: 14 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontWeight: 700 }}>{r.m.name} <span style={{ fontSize: 11, color: C.dim2, fontFamily: DISP }}>{r.m.no}</span></div>
                {fields.length === 0 ? <div style={{ fontSize: 12, color: C.dim2, marginTop: 3 }}>신청 완료</div> :
                  fields.map((f) => <div key={f} style={{ fontSize: 12, color: C.dim, marginTop: 3 }}><span style={{ color: C.dim2 }}>{f}</span> · {r.answers[f] || "-"}</div>)}
              </div>
            ))}
          </div>
          <button onClick={exportCSV} style={{ ...btnGold, width: "100%", justifyContent: "center" }}><Download size={16} /> 엑셀(CSV)로 내려받기</button>
        </>
      )}
    </Modal>
  );
}

function ClassForm({ cls, names, isEvent, onSave, onClose }) {
  const [f, setF] = useState(cls);
  const [custom, setCustom] = useState(cls.label !== "" && !names.includes(cls.label));
  const [fieldInput, setFieldInput] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const addField = () => { const v = fieldInput.trim(); if (!v) return; set("fields", [...(f.fields || []), v]); setFieldInput(""); };
  const toggleT = (v) => setF((p) => { const s = new Set(p.targets || []); s.has(v) ? s.delete(v) : s.add(v); return { ...p, targets: [...s] }; });
  const hasT = (v) => (f.targets || []).includes(v);
  const valid = f.label.trim() && (f.targets || []).length > 0 && (f.type === "weekly" || f.date);
  return (
    <Modal title={cls.id ? (isEvent ? "일정 수정" : "수업 수정") : (isEvent ? "일정 추가" : "수업 개설")} onClose={onClose}>
      <Field label="반복">
        <div style={{ display: "flex", gap: 6 }}>
          {[["weekly", "매주 반복"], ["once", "특정 날짜"]].map(([v, l]) => (
            <button key={v} onClick={() => set("type", v)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontWeight: 700, cursor: "pointer",
              background: f.type === v ? C.goldGrad : "transparent", color: f.type === v ? "#1a1305" : C.dim, border: `1px solid ${f.type === v ? "transparent" : C.line}` }}>{l}</button>
          ))}
        </div>
      </Field>
      {f.type === "weekly" ? (
        <Field label="요일">
          <div style={{ display: "flex", gap: 4 }}>{DAYS.map((d, i) => (
            <button key={i} onClick={() => set("day", i)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontWeight: 700, cursor: "pointer",
              background: f.day === i ? C.goldGrad : "transparent", color: f.day === i ? "#1a1305" : C.dim, border: `1px solid ${f.day === i ? "transparent" : C.line}` }}>{d}</button>
          ))}</div>
        </Field>
      ) : (
        <Field label="날짜"><input type="date" style={inp} value={f.date || ""} onChange={(e) => set("date", e.target.value)} /></Field>
      )}
      <Field label="시간"><input type="time" style={inp} value={f.time} onChange={(e) => set("time", e.target.value)} /></Field>
      <Field label={isEvent ? "일정 종류" : "수업명"}>
        <select style={inp} value={custom ? "__c" : f.label} onChange={(e) => { if (e.target.value === "__c") { setCustom(true); set("label", ""); } else { setCustom(false); set("label", e.target.value); } }}>
          <option value="" disabled>{isEvent ? "일정 종류를 선택하세요" : "수업명을 선택하세요"}</option>
          {names.map((n) => <option key={n}>{n}</option>)}
          <option value="__c">기타 (직접 입력)</option>
        </select>
        {custom && <input style={{ ...inp, marginTop: 8 }} value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="수업명 직접 입력" autoFocus />}
      </Field>
      <Field label="대상 (복수 선택 가능 · 선택한 세션/팀 회원이 예약 가능)">
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>정규반</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{SESSIONS.map((t) => <Chip key={t} on={hasT(t)} color={C.gold} onClick={() => toggleT(t)}>{t}</Chip>)}</div>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>전문팀</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TEAMS.map((t) => <Chip key={t} on={hasT(t)} color={tColor(t)} onClick={() => toggleT(t)}>{t}</Chip>)}</div>
      </Field>
      <Field label="내용 (선택)"><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={f.desc || ""} onChange={(e) => set("desc", e.target.value)} placeholder="수업 안내, 준비물, 장소, 대회/공연/심사 일정 등" /></Field>
      {isEvent && (
        <Field label="신청 항목 (수련자가 신청 시 입력할 정보)">
          {(f.fields || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {(f.fields || []).map((fd, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                  {fd}
                  <button onClick={() => set("fields", f.fields.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 0, display: "flex" }}><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <input style={inp} value={fieldInput} onChange={(e) => setFieldInput(e.target.value)} placeholder="예: 체급 / 현재 단·급 / 비상연락처"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addField(); } }} />
            <button onClick={addField} style={{ ...btnGold, padding: "0 14px" }}><Plus size={16} /></button>
          </div>
          <div style={{ fontSize: 11, color: C.dim2, marginTop: 6 }}>비워두면 정보 입력 없이 단순 신청만 받습니다.</div>
        </Field>
      )}
      <button disabled={!valid} onClick={() => onSave(f)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: valid ? 1 : 0.4 }}><Check size={16} /> 저장</button>
    </Modal>
  );
}

function ReserveAdmin({ data, persist }) {
  const [base, setBase] = useState(new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);
  const week = weekDates(base);
  const items = data.classes.map((c) => ({ c, date: classDateInWeek(c, week) })).filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
  const mark = (date, mid, st) => persist({ ...data, attendance: { ...data.attendance, [date]: { ...(data.attendance[date] || {}), [mid]: st } } });

  const absent = [];
  week.forEach((d) => { Object.entries(data.attendance[d] || {}).forEach(([mid, st]) => { if (st === "결석") { const m = data.members.find((x) => x.id === Number(mid)); if (m) absent.push(m.name); } }); });
  const uniq = [...new Set(absent)];
  const draft = uniq.map((n) => `${n} 회원님, 이번 주 수련에서 못 뵈었네요! 다음 시간엔 매트 위에서 같이 땀 흘려요. 가온은 늘 그 자리에 있습니다 💪`).join("\n\n");

  return (
    <div>
      <WeekNav base={base} setBase={setBase} week={week} />
      {items.length === 0 ? <Empty>이번 주에 열리는 수업이 없습니다.</Empty> : items.map(({ c, date }) => {
        const dow = dowOf(date);
        const members = (data.reservations[date]?.[c.id] || []).map((id) => data.members.find((m) => m.id === id)).filter(Boolean);
        return (
          <Panel key={`${c.id}-${date}`} title={`${DAYS[dow]} ${date.slice(5)} · ${c.label}`} sub={`${(c.targets || []).join(", ")} · ${c.time}`} dot={mainColor(c.targets)}>
            {members.length === 0 ? <Empty>예약자가 없습니다.</Empty> : members.map((m) => {
              const st = data.attendance[date]?.[m.id];
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ fontSize: 11, color: C.dim2, minWidth: 42, fontFamily: DISP }}>{m.no}</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{m.name}</span>
                  <button onClick={() => mark(date, m.id, "출석")} style={{ ...pill, background: st === "출석" ? "#2e7d52" : "transparent", color: st === "출석" ? "#fff" : C.dim, borderColor: st === "출석" ? "#2e7d52" : C.line }}>출석</button>
                  <button onClick={() => mark(date, m.id, "결석")} style={{ ...pill, background: st === "결석" ? "#a23b3b" : "transparent", color: st === "결석" ? "#fff" : C.dim, borderColor: st === "결석" ? "#a23b3b" : C.line }}>결석</button>
                </div>
              );
            })}
          </Panel>
        );
      })}
      {uniq.length > 0 && (
        <Panel title="결석자 카카오톡 초안">
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "#dadae0", margin: 0, fontFamily: FONT }}>{draft}</pre>
          <button onClick={() => { navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ ...btnGold, marginTop: 14 }}><Copy size={15} /> {copied ? "복사됨!" : "메시지 복사"}</button>
        </Panel>
      )}
    </div>
  );
}

function NoticeAdmin({ data, persist }) {
  const [edit, setEdit] = useState(null);
  const save = (n) => {
    let next;
    if (n.id) next = { ...data, notices: data.notices.map((x) => x.id === n.id ? n : x) };
    else next = { ...data, notices: [{ ...n, id: Math.max(0, ...data.notices.map((x) => x.id)) + 1, date: new Date().toISOString().slice(0, 10) }, ...data.notices] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm("공지를 삭제할까요?")) persist({ ...data, notices: data.notices.filter((x) => x.id !== id) }); };
  return (
    <div>
      <button onClick={() => setEdit({ title: "", body: "" })} style={{ ...btnGold, marginBottom: 16 }}><Plus size={16} /> 공지 작성</button>
      {data.notices.length === 0 ? <Empty>공지가 없습니다.</Empty> : data.notices.map((n) => (
        <Panel key={n.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: C.dim2, marginBottom: 8, fontFamily: DISP }}>{n.date}</div>
              <div style={{ fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{n.body}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEdit(n)} style={iconBtn}><Pencil size={15} /></button>
              <button onClick={() => remove(n.id)} style={iconBtn}><Trash2 size={15} /></button>
            </div>
          </div>
        </Panel>
      ))}
      {edit && (
        <Modal title={edit.id ? "공지 수정" : "공지 작성"} onClose={() => setEdit(null)}>
          <Field label="제목"><input style={inp} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="내용"><textarea style={{ ...inp, minHeight: 110, resize: "vertical" }} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          <button disabled={!edit.title.trim()} onClick={() => save(edit)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: edit.title.trim() ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// ── 관리자 계정 (최고관리자 전용) ──
function AdminAccounts({ data, persist, me }) {
  const [edit, setEdit] = useState(null);
  const save = (a) => {
    if (data.admins.some((x) => x.loginId === a.loginId.trim() && x.id !== a.id)) { alert("이미 사용 중인 아이디입니다."); return; }
    let next;
    if (a.id) next = { ...data, admins: data.admins.map((x) => x.id === a.id ? a : x) };
    else next = { ...data, admins: [...data.admins, { ...a, id: Math.max(0, ...data.admins.map((x) => x.id)) + 1, role: "staff" }] };
    persist(next); setEdit(null);
  };
  const remove = (a) => {
    if (a.role === "super") return alert("최고관리자 계정은 삭제할 수 없습니다.");
    if (confirm(`${a.name} 계정을 삭제할까요?`)) persist({ ...data, admins: data.admins.filter((x) => x.id !== a.id) });
  };
  return (
    <div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>사범님께 아이디·비밀번호를 배정하면 관리자 모드로 로그인해 전체를 확인·관리할 수 있습니다.</div>
      <button onClick={() => setEdit({ name: "", loginId: "", pw: "" })} style={{ ...btnGold, marginBottom: 16 }}><Plus size={16} /> 사범 계정 추가</button>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
        {data.admins.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: a.role === "super" ? C.goldGrad : C.card2, color: a.role === "super" ? "#1a1305" : C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {a.role === "super" ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.name} {a.role === "super" && <span style={{ fontSize: 10, color: C.gold }}>최고관리자</span>}</div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: DISP }}>ID {a.loginId} · PW {a.pw}</div>
            </div>
            <button onClick={() => setEdit(a)} style={iconBtn}><Pencil size={15} /></button>
            {a.role !== "super" && <button onClick={() => remove(a)} style={iconBtn}><Trash2 size={15} /></button>}
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.role === "super" ? "최고관리자 정보 수정" : edit.id ? "사범 계정 수정" : "사범 계정 추가"} onClose={() => setEdit(null)}>
          <Field label="이름"><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="예: 이은지 사범" /></Field>
          <Field label="아이디"><input style={inp} value={edit.loginId} onChange={(e) => setEdit({ ...edit, loginId: e.target.value })} placeholder="영문 아이디" /></Field>
          <Field label="비밀번호"><input style={inp} value={edit.pw} onChange={(e) => setEdit({ ...edit, pw: e.target.value })} placeholder="비밀번호" /></Field>
          <button disabled={!edit.name.trim() || !edit.loginId.trim() || !edit.pw.trim()} onClick={() => save(edit)}
            style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: edit.name.trim() && edit.loginId.trim() && edit.pw.trim() ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════ 수련자 ═══════════
function Member({ data, persist, me, onLogout }) {
  const [tab, setTab] = useState("home");
  const isOut = me.status === "탈퇴", isPaused = me.status === "정지중";
  const tabs = isOut ? [["home", "공지", Megaphone]]
    : [["home", "홈", User], ["reserve", "수업", CalendarCheck], ["events", "이벤트", Trophy], ["mine", "내 기록", BookOpen]];
  const total = trainTotal(data, me.id), month = trainMonth(data, me.id);

  return (
    <>
      <TopBar role="수련자" name={`${me.name} · ${me.no}`} onLogout={onLogout} />
      <TabBar tabs={tabs} tab={tab} setTab={setTab} />
      <NoticeMarquee notices={data.notices} />
      {tab === "home" && (
        <div>
          {!isOut && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, marginBottom: 16,
              backgroundImage: "radial-gradient(500px circle at 100% 0%, rgba(216,180,90,0.10), transparent 60%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dim, marginBottom: 10 }}><Flame size={15} color={C.gold} /> 나의 수련 기록</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: 46, fontWeight: 700, lineHeight: 1, background: C.goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>누적 수련 횟수</div>
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: 30, fontWeight: 600, lineHeight: 1, color: C.text }}>{month}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>이번달</div>
                </div>
              </div>
            </div>
          )}
          {!isOut && (
            <Panel title="내 정보">
              <InfoRow k="회원번호" v={me.no} mono />
              <InfoRow k="상태" v={me.status} />
              <InfoRow k="등록 수업" v={(me.enrollments || []).join(", ") || "없음"} />
            </Panel>
          )}
          <Panel title="공지사항">
            {data.notices.length === 0 ? <Empty>공지가 없습니다.</Empty> : data.notices.map((n) => (
              <div key={n.id} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: C.dim2, margin: "3px 0 6px", fontFamily: DISP }}>{n.date}</div>
                <div style={{ fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{n.body}</div>
              </div>
            ))}
          </Panel>
          {isOut && <p style={{ textAlign: "center", fontSize: 12, color: C.dim2, marginTop: 20 }}>탈퇴 회원은 공지만 확인할 수 있습니다.</p>}
        </div>
      )}
      {tab === "reserve" && !isOut && <ReserveMember data={data} persist={persist} me={me} locked={isPaused} kind="수업" />}
      {tab === "events" && !isOut && <ReserveMember data={data} persist={persist} me={me} locked={isPaused} kind="행사" />}
      {tab === "mine" && !isOut && <MineRecord data={data} me={me} />}
    </>
  );
}

function ReserveMember({ data, persist, me, locked, kind }) {
  const [base, setBase] = useState(new Date().toISOString().slice(0, 10));
  const [applyFor, setApplyFor] = useState(null);
  const week = weekDates(base);
  const items = data.classes.filter((c) => canTake(me, c) && (c.kind || "수업") === kind).map((c) => ({ c, date: classDateInWeek(c, week) })).filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
  const toggle = (date, cid) => {
    if (locked) return;
    const dayRes = { ...(data.reservations[date] || {}) };
    const arr = new Set(dayRes[cid] || []); arr.has(me.id) ? arr.delete(me.id) : arr.add(me.id); dayRes[cid] = [...arr];
    persist({ ...data, reservations: { ...data.reservations, [date]: dayRes } });
  };
  const applied = (c) => !!(data.submissions[c.id]?.[me.id]);
  const submitApply = (c, date, answers) => {
    const dayRes = { ...(data.reservations[date] || {}) };
    const arr = new Set(dayRes[c.id] || []); arr.add(me.id); dayRes[c.id] = [...arr];
    const subC = { ...(data.submissions[c.id] || {}) };
    subC[me.id] = { date, answers, when: new Date().toLocaleString("ko-KR") };
    persist({ ...data, reservations: { ...data.reservations, [date]: dayRes }, submissions: { ...data.submissions, [c.id]: subC } });
    setApplyFor(null);
  };
  const cancelApply = (c, date) => {
    const dayRes = { ...(data.reservations[date] || {}) };
    const arr = new Set(dayRes[c.id] || []); arr.delete(me.id); dayRes[c.id] = [...arr];
    const subC = { ...(data.submissions[c.id] || {}) }; delete subC[me.id];
    persist({ ...data, reservations: { ...data.reservations, [date]: dayRes }, submissions: { ...data.submissions, [c.id]: subC } });
  };
  return (
    <div>
      {locked && <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#241f12", border: `1px solid #5a4a22`, borderRadius: 12, padding: "13px 15px", marginBottom: 16, fontSize: 13, color: "#dcc89a" }}><Lock size={16} /> 정지중 상태에서는 조회만 가능합니다. 복귀를 원하시면 도장에 문의해 주세요.</div>}
      <WeekNav base={base} setBase={setBase} week={week} />
      {items.length === 0 ? <Empty>이번 주에 신청 가능한 {kind === "행사" ? "이벤트가" : "수업이"} 없습니다.</Empty> : items.map(({ c, date }) => {
        const dow = dowOf(date);
        const arr = data.reservations[date]?.[c.id] || [];
        const isApply = c.kind === "행사" && (c.fields || []).length > 0;
        const on = isApply ? applied(c) : arr.includes(me.id);
        const col = mainColor(c.targets);
        return (
          <div key={`${c.id}-${date}`} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${on ? "#2e7d52" : C.line}`, borderRadius: 16, padding: "15px 16px", marginBottom: 10 }}>
            <DayBadge day={dow} date={date} color={col} big />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>{c.label}</span>
                {(c.targets || []).map((t) => <span key={t} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(t), borderRadius: 5, padding: "2px 6px" }}>{t}</span>)}
                {isApply && <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 5, padding: "1px 6px" }}>신청서</span>}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{DAYS[dow]}요일 {c.time} · 현재 {arr.length}명 {isApply ? "신청" : "예약"}</div>
              {c.desc && <div style={{ fontSize: 12, color: C.dim2, marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>}
            </div>
            <button onClick={() => { if (locked) return; if (isApply) { on ? cancelApply(c, date) : setApplyFor({ c, date }); } else toggle(date, c.id); }}
              disabled={locked} style={{ ...pill, opacity: locked ? 0.4 : 1, padding: "9px 18px", background: on ? "#2e7d52" : "transparent", color: on ? "#fff" : C.gold, borderColor: on ? "#2e7d52" : "#5a4a22" }}>
              {on ? (isApply ? "신청됨" : "예약됨") : (isApply ? "신청" : "예약")}
            </button>
          </div>
        );
      })}
      {applyFor && <ApplyModal event={applyFor.c} onSubmit={(ans) => submitApply(applyFor.c, applyFor.date, ans)} onClose={() => setApplyFor(null)} />}
    </div>
  );
}

function ApplyModal({ event, onSubmit, onClose }) {
  const fields = event.fields || [];
  const [ans, setAns] = useState({});
  const valid = fields.every((f) => (ans[f] || "").trim());
  return (
    <Modal title={`${event.label} 신청`} onClose={onClose}>
      {event.desc && <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 13px", marginBottom: 16, fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{event.desc}</div>}
      {fields.map((f) => (
        <Field key={f} label={f}><input style={inp} value={ans[f] || ""} onChange={(e) => setAns({ ...ans, [f]: e.target.value })} /></Field>
      ))}
      <button disabled={!valid} onClick={() => onSubmit(ans)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: valid ? 1 : 0.4 }}><Check size={16} /> 신청 제출</button>
    </Modal>
  );
}

function MineRecord({ data, me }) {
  const total = trainTotal(data, me.id), month = trainMonth(data, me.id);
  const rows = [];
  Object.entries(data.reservations).forEach(([date, byClass]) => Object.entries(byClass).forEach(([cid, ids]) => {
    if (ids.includes(me.id)) { const c = data.classes.find((x) => x.id === Number(cid)); if (c) rows.push({ date, c, att: data.attendance[date]?.[me.id] }); }
  }));
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <Grid3>
        <Stat label="누적 수련" value={total} unit="회" accent />
        <Stat label="이번달" value={month} unit="회" />
        <Stat label="경력" value={(me.history || []).length} unit="건" />
      </Grid3>
      {(me.history || []).length > 0 && (
        <Panel title="나의 발자취" sub="가온에서 쌓아온 기록">
          {[...me.history].sort((a, b) => a.date.localeCompare(b.date)).map((h, i, arr) => {
            const { color, Icon } = HCAT[h.category] || HCAT["기타"];
            return (
              <div key={h.id} style={{ display: "flex", gap: 13, paddingBottom: i === arr.length - 1 ? 0 : 18 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 0 4px ${color}22` }}><Icon size={17} color="#fff" /></div>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: C.line, marginTop: 5 }} />}
                </div>
                <div style={{ paddingTop: 5 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{h.title}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}><span style={{ fontFamily: DISP }}>{h.date}</span> · <span style={{ color }}>{h.category}</span></div>
                </div>
              </div>
            );
          })}
        </Panel>
      )}
      <Panel title="예약 · 출석 내역">
        {rows.length === 0 ? <Empty>내역이 없습니다.</Empty> : rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <DayBadge day={dowOf(r.date)} color={mainColor(r.c.targets)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{r.c.label} <span style={{ color: C.dim, fontWeight: 400, fontFamily: DISP }}>{r.c.time}</span></div>
              <div style={{ fontSize: 12, color: C.dim2, fontFamily: DISP }}>{r.date}</div>
            </div>
            {r.att && <span style={{ fontSize: 12, fontWeight: 700, color: r.att === "출석" ? "#5ac88a" : "#e58282" }}>{r.att}</span>}
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ═══════════ 공통 UI ═══════════
function TopBar({ role, name, onLogout }) {
  return (
    <header style={{ display: "flex", alignItems: "center", padding: "26px 0 18px", borderBottom: `1px solid ${C.line}` }}>
      <div>
        <img src="/logo-h.png" alt="가온태권도장" style={{ width: 158, height: "auto", display: "block" }} />
        <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>{role} · {name}</div>
      </div>
      <button onClick={onLogout} style={{ ...iconBtn, marginLeft: "auto", width: "auto", padding: "0 13px", gap: 6, fontSize: 13, height: 38 }}><LogOut size={14} /> 로그아웃</button>
    </header>
  );
}
function TabBar({ tabs, tab, setTab }) {
  return (
    <nav style={{ display: "flex", gap: 5, margin: "18px 0 22px", overflowX: "auto", paddingBottom: 2 }}>
      {tabs.map(([id, label, Icon]) => {
        const on = tab === id;
        return (
          <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 15px", whiteSpace: "nowrap",
            background: on ? C.goldGrad : "transparent", color: on ? "#1a1305" : C.dim,
            border: `1px solid ${on ? "transparent" : C.line}`, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: on ? "0 4px 14px rgba(216,180,90,0.22)" : "none" }}><Icon size={15} /> {label}</button>
        );
      })}
    </nav>
  );
}
function DayBadge({ day, date, color, big }) {
  const s = big ? 46 : 34;
  return (
    <div style={{ width: s, height: s, borderRadius: 11, background: color, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontWeight: 800, lineHeight: 1, flexShrink: 0 }}>
      <span style={{ fontSize: big ? 17 : 14 }}>{DAYS[day]}</span>
      {date && <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, marginTop: 2, fontFamily: DISP }}>{date.slice(5)}</span>}
    </div>
  );
}
function WeekNav({ base, setBase, week }) {
  const shift = (n) => { const d = new Date(base); d.setDate(d.getDate() + n); setBase(d.toISOString().slice(0, 10)); };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
      <button onClick={() => shift(-7)} style={iconBtn}><ChevronLeft size={16} /></button>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: DISP, letterSpacing: 0.5 }}>{week[0].slice(5)} ~ {week[6].slice(5)}</span>
      <button onClick={() => shift(7)} style={iconBtn}><ChevronRight size={16} /></button>
    </div>
  );
}
const Grid3 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 11, marginBottom: 16 }}>{children}</div>;
function Stat({ label, value, unit, accent }) {
  return (
    <div style={{ position: "relative", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 16px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.goldGrad, opacity: accent ? 1 : 0.2 }} />
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 7 }}>{label}</div>
      <div style={{ fontFamily: DISP, fontSize: 32, fontWeight: 700, ...(accent ? { background: C.goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } : { color: C.text }) }}>
        {value}<span style={{ fontSize: 14, fontWeight: 600, color: C.dim, marginLeft: 3, fontFamily: FONT }}>{unit}</span>
      </div>
    </div>
  );
}
function Bar({ name, n, max, color }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{name}</span><span style={{ color, fontWeight: 700, fontFamily: DISP }}>{n}명</span>
      </div>
      <div style={{ height: 9, background: "#202028", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: color === C.gold ? C.goldGrad : color, borderRadius: 5 }} />
      </div>
    </div>
  );
}
const Panel = ({ title, sub, dot, children }) => (
  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
    {title && (
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          {dot && <span style={{ width: 9, height: 9, borderRadius: 3, background: dot }} />}{title}
        </h3>
        {sub && <div style={{ fontSize: 11, color: C.dim2, marginTop: 4 }}>{sub}</div>}
      </div>
    )}
    {children}
  </div>
);
const Empty = ({ children }) => <div style={{ padding: "22px 4px", textAlign: "center", color: C.dim2, fontSize: 13 }}>{children}</div>;
const GroupLabel = ({ color, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 2px 10px", fontSize: 13, fontWeight: 700, color: "#d8d8de" }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{children}
  </div>
);
function NoticeMarquee({ notices }) {
  if (!notices || notices.length === 0) return null;
  const text = notices.map((n) => `${n.title} — ${n.body}`).join("        ◆        ");
  return (
    <div style={{ position: "relative", overflow: "hidden", whiteSpace: "nowrap", background: C.goldGrad, borderRadius: 12, marginBottom: 16, height: 42, display: "flex", alignItems: "center", boxShadow: "0 3px 14px rgba(216,180,90,0.22)" }}>
      <style>{"@keyframes gaonMq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}"}</style>
      <div style={{ display: "inline-flex", whiteSpace: "nowrap", animation: "gaonMq 22s linear infinite", color: "#1a1305", fontWeight: 700, fontSize: 13 }}>
        <span style={{ paddingRight: 70 }}>📢 {text}</span>
        <span style={{ paddingRight: 70 }}>📢 {text}</span>
      </div>
    </div>
  );
}
const Chip = ({ on, color, onClick, children }) => (
  <button onClick={onClick} style={{ padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
    background: on ? color : "transparent", color: on ? "#fff" : C.dim, border: `1px solid ${on ? color : C.line}` }}>{children}</button>
);
const InfoRow = ({ k, v, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
    <span style={{ color: C.dim }}>{k}</span><span style={{ fontWeight: 700, fontFamily: mono ? DISP : FONT, letterSpacing: mono ? 1 : 0 }}>{v}</span>
  </div>
);
const Center = ({ children }) => <div style={{ background: C.bg, color: C.gold, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>{children}</div>;
function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 390, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>{children}
      </div>
    </div>
  );
}
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 13 }}>
    <label style={{ display: "block", fontSize: 12, color: C.dim, marginBottom: 6 }}>{label}</label>{children}
  </div>
);
const inp = { width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT };
const btnGold = { display: "flex", alignItems: "center", gap: 7, padding: "11px 16px", background: C.goldGrad, color: "#1a1305", border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(216,180,90,0.22)" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 9, color: C.dim, cursor: "pointer" };
const pill = { padding: "7px 16px", border: "1px solid", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" };

import React, { useState, useEffect } from "react";
import {
  Users, CalendarCheck, LayoutDashboard, Plus, Search, Trash2, Pencil,
  X, Check, Copy, ChevronLeft, ChevronRight, LogOut, Shield, User,
  Megaphone, BookOpen, Lock, Flame, Award, KeyRound, Trophy, Medal, Star, BadgeCheck, Download, ClipboardList, Ticket, Video, CalendarX,
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
const PERIODS = ["일일", "1개월", "3개월", "6개월", "1년"];
const PERIOD_MONTHS = { "1개월": 1, "3개월": 3, "6개월": 6, "1년": 12 };
const DEFAULT_TEAM_DAYS = { "GDT(시범단)": 5, "GST(겨루기)": 6, "GPT(품새)": 0 }; // 요일 (일=0 … 토=6)
// 정규반 홀딩 한도: 기간 → { 최대 누적일수, 최대 횟수 }
const HOLD_LIMITS = { "1개월": { days: 7, count: 1 }, "3개월": { days: 30, count: 2 }, "6개월": { days: 60, count: 3 }, "1년": { days: 90, count: 4 } };
const TEAMS = ["GDT(시범단)", "GST(겨루기)", "GPT(품새)"];
const STATUSES = ["활동중", "휴식중", "정지중", "탈퇴"];
// ── 가격표 (관리자 수정 가능, 단위 원) ──
const DEFAULT_PRICING = {
  // 정규반 1개월
  reg1: { 오전: 160000, 오후: 180000, 통합: 200000 },
  // 장기등록 — 신규
  newReg: {
    "3개월": { 오전: 430000, 오후: 490000, 통합: 550000 },
    "6개월": { 오전: 860000, 오후: 980000, 통합: 1100000 },
    "1년": { 오전: 1720000, 오후: 1960000, 통합: 2000000 },
  },
  // 장기등록 — 기존
  oldReg: {
    "3개월": { 오전: 430000, 오후: 490000, 통합: 550000 },
    "6개월": { 오전: 860000, 오후: 960000, 통합: 1100000 },
    "1년": { 오전: 1720000, 오후: 1920000, 통합: 2000000 },
  },
  // 팀 (월)
  team: { 내부: 60000, 외부: 80000, 지도진: 30000, 체험: 30000 },
  // 기타 항목 (등록 시 추가)
  extras: [
    { id: "ipgwan", name: "입관비", price: 30000 },
    { id: "dobok", name: "도복 (기본)", price: 50000 },
    { id: "dobok_adidas", name: "도복 (아디다스)", price: 80000 },
    { id: "locker", name: "사물함 (월)", price: 10000 },
    { id: "test_grade", name: "승급 심사비", price: 30000 },
    { id: "coupon", name: "쿠폰 10회", price: 300000 },
    { id: "oneday", name: "1일 수련", price: 30000 },
    { id: "lesson", name: "1:1 레슨 (시간)", price: 100000 },
    { id: "danjeung", name: "단증취득반 10회", price: 300000 },
  ],
  // 국기원 승단 심사 (단별)
  dan: { "1단": 230000, "2단": 250000, "3단": 270000, "4단": 290000, "5단": 310000, "6단": 330000 },
  // 사범 수업 시급 (정규수업, 시간당)
  wage: { senior: 15000, junior: 10320 }, // senior=관장~정사범, junior=보조사범 이하
};
const ADMIN_STATUSES = ["활동중", "휴식중", "정지", "탈퇴"];
const ADMIN_ROLES = [
  ["director", "관장"], ["vice", "지관장"], ["senior", "수석사범"],
  ["regular", "정사범"], ["assistant", "보조사범"], ["gyobeom", "교범"], ["affairs", "총무·홍보"],
];
const roleLabel = (r) => (ADMIN_ROLES.find((x) => x[0] === r) || ["", "사범"])[1];
// 시급 그룹: 관장~정사범=senior, 보조사범~총무=junior
const WAGE_SENIOR = ["director", "vice", "senior", "regular"];
const wageGroupOf = (role) => WAGE_SENIOR.includes(role) ? "senior" : "junior";
// 사범 한 명의 해당 월 정규수업 자동 급여 계산 (지도진 스케줄 기준, 팀수업 제외)
function autoSalary(data, staffName, role, month) {
  const sched = data.scheduleData || {};
  const wage = (data.pricing?.wage) || DEFAULT_PRICING.wage;
  const rate = wage[wageGroupOf(role)] || 0;
  let totalHours = 0, count = 0;
  Object.entries(sched).forEach(([date, byClass]) => {
    if ((date || "").slice(0, 7) !== month) return;
    Object.entries(byClass).forEach(([cid, arr]) => {
      if (!Array.isArray(arr) || !arr.some((s) => s.name === staffName)) return;
      const c = (data.classes || []).find((x) => x.id === Number(cid));
      if (!c) return;
      if ((c.targets || []).some(isTeam)) return; // 팀수업 제외 (팀비 별도)
      totalHours += (c.hours || 1); count += 1;
    });
  });
  return { count, hours: totalHours, rate, amount: Math.round(totalHours * rate) };
}
// 편집 권한 (보기는 모든 등급 가능)
const PERM = {
  members: ["director", "vice", "senior"],
  classes: ["director", "vice", "senior", "regular", "affairs"],
  notice: ["director", "vice", "senior", "affairs"],
  accounts: ["director", "vice"],
  schedule: ["director", "vice", "senior"],
  holiday: ["director", "vice", "senior"],
  finance: ["director"],
  locker: ["director"],
  training: ["director"],
};
const can = (role, key) => (PERM[key] || []).includes(role);
// 휴무 판정: 전체 휴무(only 없음) 또는 특정 수업만 휴무(only에 포함)
const isClosed = (holidays, date, classId) => {
  const h = (holidays || {})[date]; if (!h) return false;
  if (!h.only || h.only.length === 0) return true;
  return classId != null && h.only.includes(classId);
};
const migrateRole = (r) => (r === "super" ? "director" : r === "staff" ? "regular" : (r || "regular"));
const LESSON_NAMES = ["종합수련 오전반", "종합수련", "품새", "발차기", "겨루기기초", "시범발차기", "특별수련", "오전 정규반", "오후 정규반", "통합반", "시범단 훈련", "겨루기팀 훈련", "품새팀 훈련"];
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
// 예약 가능: 그 수업 대상 중 본인이 등록했고 수강권이 유효(만료 전)한 게 하나라도 있어야
const canReserve = (m, c) => (c.targets || []).some((t) => {
  if (!(m.enrollments || []).includes(t)) return false;
  const s = termStatus(m.terms?.[t]);
  return s.days != null && s.days >= 0;
});
// 회원번호로 회원 찾기 (전체 "26-002" 또는 뒷번호 "002"/"2" 모두 허용)
function findMemberByNo(members, input) {
  const v = (input || "").trim();
  if (!v) return { member: null, count: 0 };
  let cands = members.filter((m) => m.no === v);
  if (cands.length === 0) {
    const tail = v.replace(/\D/g, "");
    if (tail) { const padded = tail.padStart(3, "0"); cands = members.filter((m) => { const t = (m.no.split("-")[1] || ""); return t === padded || t === tail; }); }
  }
  return { member: cands[0] || null, count: cands.length };
}
const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// 출석 값 호환: 옛 "출석" 문자열 또는 새 {st,g} 객체 모두 처리
const attSt = (v) => (typeof v === "string" ? v : v?.st) || "";
const attG = (v) => (typeof v === "string" ? "정규" : v?.g) || "정규";
const ATT_GROUPS = ["정규", "시범단", "겨루기", "품새"];
const VIDEO_CATS = ["품새", "발차기", "겨루기", "시범", "기타"];
// ── 수련자 모드 한/영 번역 사전 ──
const LANG = {
  ko: {
    home: "홈", classes: "수업", events: "이벤트", videos: "영상", mine: "내 기록",
    member: "수련자", instructor: "지도진", logout: "로그아웃", toAdmin: "관리자로",
    myRecord: "나의 수련 기록", totalTrain: "누적 수련 횟수", thisMonth: "이번달",
    reserveApply: "수업 신청", trainVideos: "수련 영상",
    introTitle: "가온태권도장 소개",
    intro: "성인·외국인만을 대상으로 운영하는 태권도장! 현재 약 100여 명의 성인 회원들이 아이들 없이 태권도 수련을 하고 있는 국내 유일 성인 전문 태권도장입니다.",
    feat: ["성인·외국인 전문 취미 태권도장", "단증 취득 / 지도자 자격증 취득", "태권도학과 진학 입시 준비", "각종 생활체육 태권도 대회 참가", "품새 / 겨루기 / 시범 전문 팀 운영"],
    timetableTitle: "수련 시간표",
    contactTitle: "오시는 길 · 상담 문의",
    c_phone: "상담 문의", c_addr: "주소", c_addrV: "서울 서대문구 신촌로 61 (신촌역 1번 출구 도보 4분)",
    noticeTitle: "공지사항", noNotice: "공지가 없습니다.",
    myInfo: "내 정보", memberNo: "회원번호", enrolled: "등록 수업", noEnroll: "등록된 수업이 없습니다.",
    myTerm: "내 수강권", myVoucher: "내 상품권",
    restMsg: "현재 휴식 중이에요. 수련 기록은 볼 수 있으며, 복귀를 원하시면 도장에 문의해 주세요.",
    pauseMsg: "현재 정지 상태예요. 수련 기록은 볼 수 있지만 수업·이벤트 신청은 재등록 후 가능합니다.",
    inquiry: "문의", viewRecord: "내 기록 보기",
    outMsg: "탈퇴 회원은 도장 정보와 공지만 확인할 수 있습니다. 재등록 문의: 010-8984-3725",
    detail: "자세히 보기",
    reserve: "예약", reserved: "예약됨", apply: "신청", applied: "신청됨", applyForm: "신청서",
    ppl: "명", reserveWord: "예약", applyWord: "신청",
    thisWeek: "이번 주", pickDate: "달력에서 날짜를 선택하세요", noClassDay: "이 날은 수업이 없습니다.",
    closedDay: "휴무", videosTitle: "수련 영상", noVideo: "등록된 영상이 없습니다.", all: "전체",
    catPoomsae: "품새", catKick: "발차기", catSpar: "겨루기", catDemo: "시범", catEtc: "기타",
    recTotal: "누적 수련", recByGroup: "구분별 누적 수련", recMonthly: "월별 수련 기록", recent6: "최근 6개월", career: "경력",
    cnt: "회", cntItem: "건", myTermSub: "등록 수업별 기간", noRec: "수련 기록이 없습니다.",
    voucherUsable: (n) => `사용 가능 ${n}장 · 도장에서 보여주세요`, voucherOwned: "보유 상품권",
    footprint: "나의 발자취", footprintSub: "가온에서 쌓아온 기록", unlimited: "무기한",
    g_정규: "정규", g_시범단: "시범단", g_겨루기: "겨루기", g_품새: "품새",
    lockedMsg: "정지중 상태에서는 조회만 가능합니다. 복귀를 원하시면 도장에 문의해 주세요.",
    holidayMsg: "고정 수업은 쉽니다", holidayMore: " (이 날 따로 열린 수업은 아래에서 신청 가능)",
    upcomingEv: "다가오는 이벤트", noUpcomingEv: "예정된 이벤트가 없습니다.",
    weekAll: "주간 전체 보기", noWeekClass: "이번 주에 신청 가능한 수업이 없습니다.",
    evWord: "이벤트", classWord: "수업", noEvDay: "이 날은 이벤트가 없습니다.", noClassDay2: "이 날은 수업이 없습니다.",
  },
  en: {
    home: "Home", classes: "Classes", events: "Events", videos: "Videos", mine: "My Record",
    member: "Member", instructor: "Instructor", logout: "Log out", toAdmin: "To Admin",
    myRecord: "My Training Record", totalTrain: "Total Sessions", thisMonth: "This Month",
    reserveApply: "Book Class", trainVideos: "Training Videos",
    introTitle: "About Gaon Taekwondo",
    intro: "An adults-only Taekwondo studio. Around 100 adult members currently train here — Korea's only Taekwondo dojang exclusively for adults, with no children's classes.",
    feat: ["Adults & foreigners specialized hobby dojang", "Belt promotion / instructor certification", "Taekwondo university admission prep", "Participation in amateur Taekwondo competitions", "Poomsae / Sparring / Demo specialist teams"],
    timetableTitle: "Class Schedule",
    contactTitle: "Location & Contact",
    c_phone: "Inquiry", c_addr: "Address", c_addrV: "61 Sinchon-ro, Seodaemun-gu, Seoul (4 min walk from Sinchon Stn. Exit 1)",
    noticeTitle: "Notices", noNotice: "No notices yet.",
    myInfo: "My Info", memberNo: "Member No.", enrolled: "Enrolled Classes", noEnroll: "No enrolled classes.",
    myTerm: "My Membership", myVoucher: "My Vouchers",
    restMsg: "You are currently on a break. You can view your records. Please contact the studio to return.",
    pauseMsg: "Your membership is paused. You can view records, but booking requires re-registration.",
    inquiry: "Contact", viewRecord: "View My Record",
    outMsg: "Withdrawn members can only view studio info and notices. Re-registration: 010-8984-3725",
    detail: "Read more",
    reserve: "Book", reserved: "Booked", apply: "Apply", applied: "Applied", applyForm: "Form",
    ppl: "", reserveWord: "booked", applyWord: "applied",
    thisWeek: "This Week", pickDate: "Select a date on the calendar", noClassDay: "No classes on this day.",
    closedDay: "Closed", videosTitle: "Training Videos", noVideo: "No videos yet.", all: "All",
    catPoomsae: "Poomsae", catKick: "Kicking", catSpar: "Sparring", catDemo: "Demo", catEtc: "Etc",
    recTotal: "Total Sessions", recByGroup: "Sessions by Type", recMonthly: "Monthly Record", recent6: "Last 6 months", career: "Career",
    cnt: "", cntItem: "", myTermSub: "Period by class", noRec: "No training records yet.",
    voucherUsable: (n) => `${n} usable · show at the studio`, voucherOwned: "My Vouchers",
    footprint: "My Journey", footprintSub: "Milestones at Gaon", unlimited: "No expiry",
    g_정규: "Regular", g_시범단: "Demo", g_겨루기: "Sparring", g_품새: "Poomsae",
    lockedMsg: "Viewing only while paused. Please contact the studio to return.",
    holidayMsg: "Regular classes are closed", holidayMore: " (classes opened for this day can be booked below)",
    upcomingEv: "Upcoming Events", noUpcomingEv: "No upcoming events.",
    weekAll: "Weekly View", noWeekClass: "No bookable classes this week.",
    evWord: "Events", classWord: "Classes", noEvDay: "No events on this day.", noClassDay2: "No classes on this day.",
  },
};
// 요일 영문
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// 수업명·종목 영문 매핑 (PPT 기준)
const NAME_EN = {
  "종합수련 오전반": "Morning Total Training", "종합수련": "Total Training",
  "품새": "Poomsae", "발차기": "Kicking", "겨루기": "Sparring", "시범": "Demonstration",
  "특별수련": "Special Training", "겨루기기초": "Sparring (Basics)", "시범발차기": "Demo Kicking",
  "태권도 P.T": "Taekwondo P.T", "주말 보충수련": "Weekend Class", "주말반": "Weekend Class",
  "시범단 훈련": "Demo Team Training", "겨루기팀 훈련": "Sparring Team Training", "품새팀 훈련": "Poomsae Team Training",
  "휴식 및 개인운동": "Break / Personal", "퇴실": "Closing",
};
// 팀/세션 영문 라벨
const TARGET_EN = {
  "오전": "Morning", "오후": "Afternoon", "통합": "Combined",
  "GDT(시범단)": "GDT (Demo)", "GST(겨루기)": "GST (Sparring)", "GPT(품새)": "GPT (Poomsae)",
};
const trName = (s, lang) => (lang === "en" ? (NAME_EN[s] || s) : s);
const trTarget = (s, lang) => (lang === "en" ? (TARGET_EN[s] || s) : s);
// 유튜브 링크에서 영상 ID 추출
function ytId(url) {
  if (!url) return "";
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : "";
}
// 누적 / 월별 수련 횟수 (출석 기준)
const trainTotal = (data, mid) => Object.values(data.attendance).reduce((n, day) => n + (attSt(day[mid]) === "출석" ? 1 : 0), 0);
const trainMonth = (data, mid, m = ym()) => Object.entries(data.attendance).reduce((n, [d, day]) => n + (d.startsWith(m) && attSt(day[mid]) === "출석" ? 1 : 0), 0);
// 구분별 누적 횟수
const trainByGroup = (data, mid, g) => Object.values(data.attendance).reduce((n, day) => n + (attSt(day[mid]) === "출석" && attG(day[mid]) === g ? 1 : 0), 0);
// 구분별 월 횟수
const trainGroupMonth = (data, mid, g, m) => Object.entries(data.attendance).reduce((n, [d, day]) => n + (d.startsWith(m) && attSt(day[mid]) === "출석" && attG(day[mid]) === g ? 1 : 0), 0);

// 최근 N개월 키 ["2026-01", ...]
function recentMonths(n) {
  const out = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`); }
  return out;
}
// 데이터에 나타난 연도들 (등록/출석 기준)
function activeYears(data) {
  const ys = new Set();
  (data.members || []).forEach((m) => { if (m.joinDate) ys.add(m.joinDate.slice(0, 4)); });
  Object.keys(data.attendance || {}).forEach((d) => ys.add(d.slice(0, 4)));
  ys.add(String(new Date().getFullYear()));
  return [...ys].sort();
}
// 기간별 신규 등록 인원 (회원 필터 적용 가능)
function newMembersByPeriod(data, periods, isYear, filterFn = () => true) {
  return periods.map((p) => ({ p, n: (data.members || []).filter(filterFn).filter((m) => (m.joinDate || "").slice(0, isYear ? 4 : 7) === p).length }));
}
// 기간별 수련 참여(출석) 횟수 (회원 필터 적용 가능)
function trainByPeriod(data, periods, isYear, memberIds = null) {
  const idSet = memberIds ? new Set(memberIds) : null;
  return periods.map((p) => {
    let n = 0;
    Object.entries(data.attendance || {}).forEach(([d, day]) => {
      if (d.slice(0, isYear ? 4 : 7) !== p) return;
      Object.entries(day).forEach(([mid, st]) => { if (st === "출석" && (!idSet || idSet.has(Number(mid)))) n++; });
    });
    return { p, n };
  });
}
const periodLabel = (p, isYear) => isYear ? `${p}년` : `${Number(p.slice(5))}월`;

// ── 상품권 ──
const todayStr = () => new Date().toISOString().slice(0, 10);
// 상품권 상태: 사용완료 / 기간만료 / 사용가능
function voucherState(v) {
  if (v.usedAt) return "사용완료";
  if (v.expiry && v.expiry < todayStr()) return "기간만료";
  return "사용가능";
}
const voucherColor = (s) => ({ 사용가능: "#3fa86a", 사용완료: "#56565e", 기간만료: "#a23b3b" }[s] || C.dim);
// 만료일 계산 (days 후) — days 없으면 빈 문자열(무기한)
function expiryFromDays(days) {
  if (!days) return "";
  const d = new Date(); d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

// ── 등록 기간(수강권) ──
// 그 달의 마지막 특정요일 날짜 (팀 만료일용). ym="YYYY-MM", dow=요일
function lastDowOfMonth(year, month0, dow) {
  const last = new Date(year, month0 + 1, 0); // 그 달 말일
  const diff = (last.getDay() - dow + 7) % 7;
  last.setDate(last.getDate() - diff);
  return last.toISOString().slice(0, 10);
}
// 팀 만료일: 등록일이 속한 달의 마지막 훈련 요일. 단 이미 지났으면 다음 달의 마지막 훈련 요일
function teamExpiry(start, dow) {
  if (!start || dow == null) return "";
  const d = new Date(start); const y = d.getFullYear(), m = d.getMonth();
  let exp = lastDowOfMonth(y, m, dow);
  if (exp < start) { const nd = new Date(y, m + 1, 1); exp = lastDowOfMonth(nd.getFullYear(), nd.getMonth(), dow); }
  return exp;
}
// 정규반 만료일: 시작일 + 개월 − 1일 + 홀딩 누적일수
function regularExpiry(start, period, holdDays = 0) {
  if (!start || !period) return "";
  if (period === "일일") return start;
  const m = PERIOD_MONTHS[period]; if (!m) return "";
  const d = new Date(start); d.setMonth(d.getMonth() + m); d.setDate(d.getDate() - 1 + (holdDays || 0));
  return d.toISOString().slice(0, 10);
}
const holdDaysUsed = (t) => (t.holds || []).reduce((n, h) => n + (h.days || 0), 0);
// 수강권 만료일 계산 (수업명 k, 팀요일맵 teamDays)
function computeExpiry(k, t, teamDays) {
  if (isTeam(k)) return teamExpiry(t.start, (teamDays || DEFAULT_TEAM_DAYS)[k]);
  return regularExpiry(t.start, t.period, holdDaysUsed(t));
}
// 수강권 상태 (만료일 기준)
function termStatus(t) {
  if (!t || !t.expiry) return { label: "기간 미설정", color: C.dim, days: null };
  const days = Math.ceil((new Date(t.expiry + "T23:59:59") - new Date()) / 86400000);
  if (days < 0) return { label: "만료", color: "#a23b3b", days };
  if (days <= 7) return { label: `D-${days}`, color: "#c89042", days };
  return { label: `D-${days}`, color: "#3fa86a", days };
}
// 재등록: 팀=다음 달 마지막 훈련일 / 정규반=현재 만료 다음날부터 새 기간 연장(홀딩 초기화)
function renewTerm(k, t, teamDays, newPeriod) {
  if (isTeam(k)) {
    const baseExp = t.expiry || todayStr();
    const d = new Date(baseExp); d.setDate(d.getDate() + 1); // 만료 다음날 = 다음 달 진입
    const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const expiry = lastDowOfMonth(nd.getFullYear(), nd.getMonth(), (teamDays || DEFAULT_TEAM_DAYS)[k]);
    return { ...t, expiry, history: [...(t.history || []), { at: todayStr(), until: expiry }] };
  }
  const period = newPeriod || t.period;
  const base = (t.expiry && t.expiry >= todayStr()) ? (() => { const d = new Date(t.expiry); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })() : todayStr();
  const expiry = regularExpiry(base, period, 0);
  return { ...t, start: base, period, expiry, holds: [], history: [...(t.history || []), { at: todayStr(), from: base, period, until: expiry }] };
}

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
// week는 월요일 시작 배열(week[0]=월…week[6]=일), c.day는 일0~토6 → 변환 필요
function classDateInWeek(c, week) {
  if (c.type === "once") return week.includes(c.date) ? c.date : null;
  const idx = (c.day + 6) % 7; // 일(0)→6, 월(1)→0, 화(2)→1 … 토(6)→5
  return week[idx];
}
const dowOf = (date) => new Date(date + "T00:00:00").getDay();

// ── 월 달력 헬퍼 ──
function monthMatrix(base) {
  const d = new Date(base); const y = d.getFullYear(), m = d.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysIn; day++) cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
const monthLabel = (base) => { const d = new Date(base); return `${d.getFullYear()}년 ${d.getMonth() + 1}월`; };
const shiftMonth = (base, delta) => { const d = new Date(base); d.setDate(1); d.setMonth(d.getMonth() + delta); return d.toISOString().slice(0, 10); };
// 특정 날짜에 열리는 수업 목록 (kind/회원 필터 옵션)
function classesOnDate(classes, date, opt = {}) {
  const dow = dowOf(date);
  return classes.filter((c) => {
    if (opt.kind && (c.kind || "수업") !== opt.kind) return false;
    if (opt.me && (c.kind || "수업") !== "행사") { if (!canReserve(opt.me, c)) return false; }
    // 휴무일: 반복(weekly) 수업만 제외 / 그날 직접 개설한 1회성(once)은 살림
    if (opt.holidays && (c.kind || "수업") !== "행사" && c.type !== "once" && isClosed(opt.holidays, date, c.id)) return false;
    return c.type === "once" ? c.date === date : c.day === dow;
  });
}

// 엑셀에서 바로 열리는 CSV 내려받기 (UTF-8 BOM 포함 → 한글 안 깨짐)
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalize(d) {
  if (!d.admins) d.admins = [{ id: 1, loginId: "가온", pw: "0000", name: "관장", role: "director" }];
  d.admins = d.admins.map((a) => (a.loginId === "master") ? { ...a, loginId: "가온" } : a);
  d.admins = d.admins.map((a) => ({ ...a, status: a.status || "활동중", role: a.id === 1 ? "director" : migrateRole(a.role) }));
  if (!d.scheduleData) d.scheduleData = {};
  if (!d.holidays) d.holidays = {};
  if (!d.pricing) d.pricing = { ...DEFAULT_PRICING };
  if (!d.pricing.wage) d.pricing.wage = { ...DEFAULT_PRICING.wage };
  if (!d.finance) d.finance = [];
  if (!d.salaries) d.salaries = {};
  if (!d.lockers) d.lockers = {};
  if (!d.teamDays) d.teamDays = { ...DEFAULT_TEAM_DAYS };
  d.members = (d.members || []).map((m) => {
    const e = m.enrollments || [...(m.session ? [m.session] : []), ...(m.team && m.team !== "없음" ? [m.team] : [])];
    const general = m.general != null ? m.general : (m.memberType ? m.memberType === "내부 회원" : e.some((x) => SESSIONS.includes(x)));
    const terms = { ...(m.terms || {}) };
    const tdays = d.teamDays || DEFAULT_TEAM_DAYS;
    e.forEach((k) => {
      if (!terms[k]) terms[k] = { start: m.joinDate || "", period: "", holds: [], history: [] };
      if (!terms[k].holds) terms[k].holds = [];
      terms[k].expiry = computeExpiry(k, terms[k], tdays);
    });
    Object.keys(terms).forEach((k) => { if (!e.includes(k)) delete terms[k]; });
    // 자동 정지: 활동중인데 등록이 있고 유효한 수강권이 하나도 없으면 정지중 (복귀는 수동)
    let status = m.status;
    if (status === "활동중" && e.length > 0) {
      const anyValid = e.some((k) => { const s = termStatus(terms[k]); return s.days != null && s.days >= 0; });
      if (!anyValid) status = "정지중";
    }
    return { ...m, enrollments: e, status, history: m.history || [], general, instructor: m.instructor || false, vouchers: m.vouchers || [], terms };
  });
  d.classes = (d.classes || []).map((c) => ({ ...c, targets: c.targets || (c.target ? [c.target] : []), type: c.type || "weekly", kind: c.kind || (EVENT_NAMES.includes(c.label) ? "행사" : "수업"), fields: c.fields || [] }));
  if (!d.submissions) d.submissions = {};
  if (!d.voucherTemplates) d.voucherTemplates = [];
  if (!d.videos) d.videos = [];
  return d;
}

const SAMPLE = {
  admins: [
    { id: 1, loginId: "가온", pw: "0000", name: "관장", role: "director" },
    { id: 2, loginId: "eunji", pw: "1234", name: "이은지 사범", role: "senior" },
  ],
  members: [
    { id: 1, no: "25-001", name: "김지훈", phone: "010-1234-0001", enrollments: ["오후", "GST(겨루기)", "GPT(품새)"], status: "활동중", joinDate: "2025-03-02", history: [
      { id: 1, date: "2025-09-01", category: "승단", title: "태권도 1단 승단" },
      { id: 2, date: "2025-11-15", category: "대회", title: "서울시 생활체육대회 겨루기 1위" },
      { id: 3, date: "2026-03-10", category: "공연", title: "신촌 거리 시범공연 참여" },
      { id: 4, date: "2026-04-20", category: "자격증", title: "생활스포츠지도사 2급 (태권도)" },
    ] },
    { id: 2, no: "25-002", name: "이수민", phone: "010-1234-0002", enrollments: ["오후"], status: "활동중", joinDate: "2025-05-11", terms: { "오후": { start: "2026-06-01", period: "1개월", expiry: "2026-06-30", history: [] } } },
    { id: 3, no: "24-001", name: "박서연", phone: "010-1234-0003", enrollments: ["오전", "GPT(품새)"], status: "활동중", joinDate: "2024-11-20", terms: { "오전": { start: "2026-04-01", period: "3개월", expiry: "2026-06-30", history: [] }, "GPT(품새)": { start: "2026-06-01", period: "1개월", expiry: "2026-06-30", history: [] } } },
    { id: 4, no: "25-003", name: "정민재", phone: "010-1234-0004", enrollments: ["통합", "GDT(시범단)"], status: "정지중", joinDate: "2025-01-15" },
    { id: 5, no: "26-001", name: "최유진", phone: "010-1234-0005", enrollments: ["오후"], status: "활동중", joinDate: "2026-06-01" },
    { id: 6, no: "24-002", name: "강도현", phone: "010-1234-0006", enrollments: ["오후", "GST(겨루기)"], status: "탈퇴", joinDate: "2024-09-08" },
    { id: 7, no: "26-002", name: "한지우", phone: "010-1234-0007", enrollments: ["통합", "GDT(시범단)"], status: "활동중", joinDate: "2026-02-10" },
  ],
  classes: [
    { id: 1, kind: "수업", type: "weekly", day: 5, time: "20:30", targets: ["GDT(시범단)"], label: "시범단 훈련", desc: "금요일 20:30~22:00" },
    { id: 2, kind: "수업", type: "weekly", day: 6, time: "13:00", targets: ["GST(겨루기)"], label: "겨루기팀 훈련", desc: "토요일 13:00~16:30" },
    { id: 3, kind: "수업", type: "weekly", day: 0, time: "15:00", targets: ["GPT(품새)"], label: "품새팀 훈련", desc: "일요일 15:00~16:30" },
    { id: 4, kind: "수업", type: "weekly", day: 1, time: "11:00", targets: ["오전"], label: "종합수련 오전반", desc: "" },
    { id: 5, kind: "수업", type: "weekly", day: 3, time: "11:00", targets: ["오전"], label: "종합수련 오전반", desc: "" },
    { id: 6, kind: "수업", type: "weekly", day: 5, time: "11:00", targets: ["오전"], label: "종합수련 오전반", desc: "" },
    { id: 7, kind: "수업", type: "weekly", day: 1, time: "17:30", targets: ["오후"], label: "품새", desc: "" },
    { id: 8, kind: "수업", type: "weekly", day: 2, time: "17:30", targets: ["오후"], label: "발차기", desc: "" },
    { id: 9, kind: "수업", type: "weekly", day: 3, time: "17:30", targets: ["오후"], label: "품새", desc: "" },
    { id: 10, kind: "수업", type: "weekly", day: 4, time: "17:30", targets: ["오후"], label: "발차기", desc: "" },
    { id: 11, kind: "수업", type: "weekly", day: 1, time: "19:00", targets: ["오후"], label: "발차기", desc: "" },
    { id: 12, kind: "수업", type: "weekly", day: 2, time: "19:00", targets: ["오후"], label: "품새", desc: "" },
    { id: 13, kind: "수업", type: "weekly", day: 3, time: "19:00", targets: ["오후"], label: "발차기", desc: "" },
    { id: 14, kind: "수업", type: "weekly", day: 4, time: "19:00", targets: ["오후"], label: "품새", desc: "" },
    { id: 15, kind: "수업", type: "weekly", day: 5, time: "18:30", targets: ["통합"], label: "종합수련", desc: "금요일 18:30~20:00" },
    { id: 16, kind: "수업", type: "weekly", day: 1, time: "20:30", targets: ["오후"], label: "품새", desc: "" },
    { id: 17, kind: "수업", type: "weekly", day: 2, time: "20:30", targets: ["오후"], label: "겨루기기초", desc: "" },
    { id: 18, kind: "수업", type: "weekly", day: 3, time: "20:30", targets: ["오후"], label: "시범발차기", desc: "" },
    { id: 19, kind: "수업", type: "weekly", day: 4, time: "20:30", targets: ["오후"], label: "특별수련", desc: "" },
    { id: 20, kind: "행사", type: "once", day: 0, date: "2026-06-28", time: "14:00", targets: ["오전", "오후", "통합"], label: "승급심사", desc: "6월 정기 승급심사. 도복·승급비 지참.", fields: ["현재 단/급", "응시 단/급", "비상 연락처"] },
  ],
  submissions: {},
  reservations: {},
  attendance: {},
  voucherTemplates: [
    { id: 1, name: "수련비 1만원 할인권", desc: "다음 달 수련비에서 1만원 할인", days: 30 },
    { id: 2, name: "도복 상품권", desc: "도복 1벌 교환권", days: 60 },
  ],
  notices: [{ id: 1, date: "2026-06-01", title: "6월 정상 운영 안내", body: "이번 달도 정규 수업 정상 진행합니다. 매트 위에서 만나요!", link: "" }],
  videos: [
    { id: 1, cat: "품새", title: "태극 1장 시범", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", desc: "기본 품새 태극 1장 동작" },
  ],
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
        {view === "admin" && admin && <Admin data={data} persist={persist} admin={admin}
          onViewMember={() => {
            const r = findMemberByNo(data.members, admin.memberNo);
            if (!r.member) { alert("이 관리자 계정에 연결된 회원을 찾을 수 없습니다.\n관리자 탭에서 본인 계정을 열어 '연결 회원번호'를 입력해 주세요. (뒷번호만 입력해도 됩니다)"); return; }
            if (r.count > 1) { alert(`뒷번호 '${admin.memberNo}' 인 회원이 ${r.count}명입니다.\n관리자 설정에서 연도까지 포함한 전체 번호(예: 26-002)로 입력해 주세요.`); return; }
            setUser(r.member); setView("member");
          }}
          onLogout={() => { setAdmin(null); setView("auth"); }} />}
        {view === "member" && user && <Member data={data} persist={persist}
          me={data.members.find((x) => x.id === user.id) || user}
          asAdmin={!!admin}
          onLogout={() => { if (admin) { setUser(null); setView("admin"); } else { setUser(null); setView("auth"); } }} />}
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
    if (a.status === "정지" || a.status === "탈퇴") return setErr(`${a.status} 상태의 계정입니다. 관장님께 문의해 주세요.`);
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
function Admin({ data, persist, admin, onLogout, onViewMember }) {
  const [tab, setTab] = useState("dashboard");
  const wide = useWide();
  const tabs = [
    ["dashboard", "대시보드", LayoutDashboard],
    ["classes", "수업", BookOpen],
    ["attend", "출석부", ClipboardList],
    ...(can(admin.role, "locker") ? [["locker", "사물함", KeyRound]] : []),
    ["members", "회원", Users],
    ["events", "이벤트", Trophy],
    ["videos", "영상", Video],
    ["notice", "공지", Megaphone],
    ["schedule", "지도진", CalendarCheck],
  ];
  // 관장 전용 영역 (운영·재무·관리자)
  const ownerTabs = [
    ...(can(admin.role, "training") ? [["training", "운영", Flame]] : []),
    ...(can(admin.role, "finance") ? [["finance", "재무", Ticket]] : []),
    ...(can(admin.role, "accounts") ? [["accounts", "관리자", KeyRound]] : []),
  ];
  const allTabs = [...tabs, ...ownerTabs];
  const content = (
    <>
      {tab === "dashboard" && <Dashboard data={data} wide={wide} setTab={setTab} role={admin.role} admin={admin} ownerTabs={ownerTabs} />}
      {tab === "classes" && <ClassesAdmin data={data} persist={persist} kind="수업" canEdit={can(admin.role, "classes")} canHoliday={can(admin.role, "holiday")} />}
      {tab === "attend" && <ReserveAdmin data={data} persist={persist} />}
      {tab === "locker" && can(admin.role, "locker") && <LockerView data={data} persist={persist} />}
      {tab === "members" && <MembersAdmin data={data} persist={persist} canEdit={can(admin.role, "members")} canFinance={can(admin.role, "finance")} />}
      {tab === "events" && <ClassesAdmin data={data} persist={persist} kind="행사" canEdit={can(admin.role, "classes")} />}
      {tab === "videos" && <VideosView data={data} persist={persist} admin={can(admin.role, "classes")} />}
      {tab === "notice" && <NoticeAdmin data={data} persist={persist} canEdit={can(admin.role, "notice")} />}
      {tab === "training" && can(admin.role, "training") && <OperationsView data={data} />}
      {tab === "schedule" && <ScheduleView data={data} persist={persist} canEdit={can(admin.role, "schedule")} />}
      {tab === "finance" && can(admin.role, "finance") && <FinanceView data={data} persist={persist} />}
      {tab === "accounts" && can(admin.role, "accounts") && <AdminAccounts data={data} persist={persist} me={admin} />}
    </>
  );
  if (wide) {
    return (
      <div style={{ display: "flex", gap: 28, paddingTop: 26 }}>
        <Sidebar tabs={tabs} ownerTabs={ownerTabs} tab={tab} setTab={setTab} admin={admin} onLogout={onLogout} onViewMember={onViewMember} />
        <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
      </div>
    );
  }
  return (
    <>
      <TopBar role="관리자" name={admin.name} onLogout={onLogout} />
      {tab === "dashboard"
        ? <button onClick={onViewMember} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "11px 0", marginBottom: 14, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 11, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><User size={15} /> 수련자 화면 보기 (내 수업·기록)</button>
        : <button onClick={() => setTab("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}><ChevronLeft size={16} /> 홈</button>}
      {tab !== "dashboard" && <TabBar tabs={allTabs} tab={tab} setTab={setTab} />}
      {content}
    </>
  );
}

function Sidebar({ tabs, ownerTabs = [], tab, setTab, admin, onLogout, onViewMember }) {
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
        {ownerTabs.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "14px 6px 6px" }}>
              <Lock size={11} color="#9a7be0" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9a7be0", letterSpacing: 0.5 }}>관장 전용</span>
              <div style={{ flex: 1, height: 1, background: "#3a2f55" }} />
            </div>
            {ownerTabs.map(([id, label, Icon]) => {
              const on = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                  background: on ? "linear-gradient(135deg,#6d52c4,#4a3585)" : "rgba(120,90,200,0.08)", color: on ? "#fff" : "#b9a9e0",
                  border: `1px solid ${on ? "transparent" : "#3a2f55"}`, borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left",
                  boxShadow: on ? "0 4px 14px rgba(120,90,200,0.3)" : "none" }}>
                  <Icon size={17} /> {label}
                </button>
              );
            })}
          </>
        )}
      </nav>
      <button onClick={onViewMember} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", marginBottom: 8, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 11, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><User size={15} /> 수련자 화면 보기</button>
      <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "transparent", border: `1px solid ${C.line}`, borderRadius: 11, color: C.dim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><LogOut size={15} /> 로그아웃</button>
    </aside>
  );
}

function Dashboard({ data, wide, setTab, role, admin, ownerTabs = [] }) {
  const big = [
    { id: "members", label: "회원 관리", sub: "명단 · 수강권 · 상품권", Ic: Users },
    { id: "classes", label: "수업", sub: "시간표 · 수업 개설", Ic: BookOpen },
    { id: "attend", label: "출석부", sub: "오늘 수업 출석 체크", Ic: ClipboardList },
    { id: "locker", label: "개인 사물함", sub: can(role, "locker") ? "1~65번 · 기간 · 비밀번호" : "관장 전용", Ic: KeyRound, lock: !can(role, "locker") },
  ];
  const goTab = (id) => {
    if (id === "locker" && !can(role, "locker")) { alert("사물함 관리는 관장만 확인할 수 있습니다."); return; }
    setTab(id);
  };
  const small = [
    { id: "events", label: "이벤트", Ic: Trophy },
    { id: "videos", label: "수련 영상", Ic: Video },
    { id: "notice", label: "공지", Ic: Megaphone },
    { id: "schedule", label: "지도진", Ic: CalendarCheck },
  ];
  const ownerIcons = { training: Flame, finance: Ticket, accounts: KeyRound };
  const ownerSubs = { training: "통계 · 현황 분석", finance: "수입·지출·월급·가격", accounts: "사범 계정 관리" };

  const today = todayStr();
  const dow = dowOf(today);
  const myName = admin?.name || "";
  // 오늘 열리는 수업 (휴무 반영)
  const todayClasses = classesOnDate(data.classes, today, { kind: "수업", holidays: data.holidays });
  // 오늘 내가 배정된 수업 (지도진 스케줄)
  const sched = data.scheduleData || {};
  const myToday = todayClasses.filter((c) => {
    const arr = sched[today]?.[c.id];
    return Array.isArray(arr) && arr.some((s) => s.name === myName);
  });
  const reservedCount = (c) => (data.reservations[today]?.[c.id] || []).length;
  const myRole = (c) => { const arr = sched[today]?.[c.id] || []; const f = arr.find((s) => s.name === myName); return f?.role; };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {big.map(({ id, label, sub, Ic, lock }) => (
          <button key={id} onClick={() => goTab(id)} style={{ textAlign: "left", background: "linear-gradient(135deg,#2a2410,#14140f)", border: "1px solid #5a4a22", borderRadius: 16, padding: 15, minHeight: 92, display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "pointer", opacity: lock ? 0.7 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Ic size={23} color={C.gold} />{lock ? <Lock size={15} color="#8a7340" /> : <ChevronRight size={17} color="#8a7340" />}</div>
            <div><div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{label}</div><div style={{ fontSize: 10, color: C.dim2, marginTop: 2 }}>{sub}</div></div>
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 20 }}>
        {small.map(({ id, label, Ic }) => (
          <button key={id} onClick={() => goTab(id)} style={{ position: "relative", textAlign: "left", background: "linear-gradient(135deg,#1c1709,#13110c)", border: "1px solid #4a3d1c", borderRadius: 14, padding: "13px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, minHeight: 70 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(216,180,90,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={17} color={C.gold} /></div>
              <ChevronRight size={15} color="#7a6a3a" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e8e4da" }}>{label}</div>
          </button>
        ))}
      </div>

      {ownerTabs.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "4px 2px 10px" }}>
            <Lock size={12} color="#9a7be0" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9a7be0", letterSpacing: 0.5 }}>관장 전용</span>
            <div style={{ flex: 1, height: 1, background: "#3a2f55" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, ownerTabs.length)}, 1fr)`, gap: 9 }}>
            {ownerTabs.map(([id, label]) => {
              const Ic = ownerIcons[id] || Flame;
              return (
                <button key={id} onClick={() => setTab(id)} style={{ textAlign: "left", background: "linear-gradient(135deg,#241c3d,#16121f)", border: "1px solid #4a3a72", borderRadius: 14, padding: "14px 13px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, minHeight: 84 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(140,110,220,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={18} color="#b9a9e0" /></div>
                    <ChevronRight size={15} color="#7a6aa8" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#9a8ec0", marginTop: 2 }}>{ownerSubs[id]}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* 사범 정보 */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 15px", marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: C.goldGrad, color: "#1a1305", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={18} /></div>
        <div>
          <div style={{ fontWeight: 800 }}>{myName} <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{roleLabel(admin?.role)}</span></div>
          <div style={{ fontSize: 11, color: C.dim2 }}>{today} ({DAYS[dow]}요일)</div>
        </div>
      </div>

      <div style={{ display: wide ? "grid" : "block", gridTemplateColumns: wide ? "1fr 1fr" : undefined, gap: wide ? 16 : 0, alignItems: "start" }}>
        <Panel title="오늘 내 수업" sub="지도진 스케줄 기준">
          {myToday.length === 0 ? <Empty>오늘 배정된 수업이 없습니다.</Empty> : myToday.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1305", background: C.gold, borderRadius: 5, padding: "2px 7px" }}>{myRole(c)}</span>
              <span style={{ fontWeight: 700, flex: 1 }}>{c.label}</span>
              <span style={{ fontSize: 12, color: C.dim }}>{c.time}</span>
              <span style={{ fontSize: 11, color: C.gold }}>{reservedCount(c)}명 신청</span>
            </div>
          ))}
        </Panel>
        <Panel title="오늘 전체 수업" sub="신청 인원 포함">
          {todayClasses.length === 0 ? <Empty>오늘 열리는 수업이 없습니다.</Empty> : todayClasses.map((c) => (
            <button key={c.id} onClick={() => setTab("attend")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 0", borderBottom: `1px solid ${C.line}`, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
              <DayBadge day={dow} color={mainColor(c.targets)} />
              <span style={{ fontSize: 12, color: C.dim, fontFamily: DISP, fontWeight: 600 }}>{c.time}</span>
              <span style={{ fontWeight: 600, flex: 1, color: C.text }}>{c.label}</span>
              <span style={{ fontSize: 11, color: C.gold }}>{reservedCount(c)}명</span>
              <ChevronRight size={14} color={C.dim} />
            </button>
          ))}
        </Panel>
        <Panel title="공지사항">
          {data.notices.length === 0 ? <Empty>등록된 공지가 없습니다.</Empty> : data.notices.slice(0, 5).map((n) => (
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

// ── 막대 그래프 ──
function BarChart({ rows, color, isYear }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, padding: "0 2px" }}>
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: last ? color : C.dim2, fontFamily: DISP, fontWeight: 700 }}>{r.n}</span>
            <div style={{ width: "100%", height: `${Math.max(3, (r.n / max) * 80)}px`, background: color, opacity: last ? 1 : 0.55, borderRadius: "4px 4px 0 0", transition: "height .2s" }} />
            <span style={{ fontSize: 9, color: last ? color : C.dim2 }}>{periodLabel(r.p, isYear)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 운영 (전체 현황 + 팀 드릴다운) ──
function OperationsView({ data }) {
  const [unit, setUnit] = useState("month"); // month | year
  const [team, setTeam] = useState(null);    // 팀 상세
  const [filter, setFilter] = useState("전체");
  const [panel, setPanel] = useState("members"); // 카드 선택: members | new | train | team
  const [memDetail, setMemDetail] = useState(null); // 회원 기록 상세
  const isYear = unit === "year";
  const periods = isYear ? activeYears(data) : recentMonths(6);

  const active = data.members.filter((m) => m.status === "활동중");
  const newThis = data.members.filter((m) => (m.joinDate || "").slice(0, 7) === ym()).length;
  const trainThis = data.members.reduce((n, m) => n + trainMonth(data, m.id), 0);
  const teamCount = active.filter((m) => (m.enrollments || []).some(isTeam)).length;

  if (team) return <TeamDetail data={data} team={team} unit={unit} setUnit={setUnit} onBack={() => setTeam(null)} />;
  if (memDetail) {
    const m = data.members.find((x) => x.id === memDetail) || {};
    return (
      <div>
        <button onClick={() => setMemDetail(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}><ChevronLeft size={16} /> 순위로</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{m.instructor && <span style={{ color: C.gold }}>★</span>}{m.name}</span>
          <span style={{ fontSize: 12, color: C.dim2, fontFamily: DISP }}>{m.no}</span>
        </div>
        <Grid3>
          <Stat label="누적 수련" value={trainTotal(data, m.id)} unit="회" accent />
          <Stat label="이번달" value={trainMonth(data, m.id)} unit="회" />
          <Stat label="경력" value={(m.history || []).length} unit="건" />
        </Grid3>
        <MemberTrainRecord data={data} mid={m.id} />
      </div>
    );
  }

  const FILTERS = [
    { k: "전체", t: () => true }, { k: "내부", t: (m) => m.general },
    { k: "외부", t: (m) => !m.general }, { k: "지도진", t: (m) => m.instructor },
    { k: "시범단", t: (m) => (m.enrollments || []).includes("GDT(시범단)") },
    { k: "겨루기", t: (m) => (m.enrollments || []).includes("GST(겨루기)") },
    { k: "품새", t: (m) => (m.enrollments || []).includes("GPT(품새)") },
  ];
  const tf = (FILTERS.find((x) => x.k === filter) || FILTERS[0]).t;
  const rows = data.members.filter((m) => m.status !== "탈퇴").filter(tf)
    .map((m) => ({ m, total: trainTotal(data, m.id), month: trainMonth(data, m.id) })).sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...rows.map((r) => r.total));

  const newRows = newMembersByPeriod(data, periods, isYear);
  const trainRows = trainByPeriod(data, periods, isYear);
  const teamRows = TEAMS.map((t) => ({ t, n: active.filter((m) => (m.enrollments || []).includes(t)).length }));
  const teamMax = Math.max(1, ...teamRows.map((r) => r.n));
  const newList = data.members.filter((m) => (m.joinDate || "").slice(0, 7) === ym()).sort((a, b) => (b.joinDate || "").localeCompare(a.joinDate || ""));

  const cards = [
    { k: "members", label: "활동 회원", value: active.length, unit: "명" },
    { k: "new", label: "이번달 신규", value: `+${newThis}`, unit: "명" },
    { k: "train", label: "이번달 수련", value: trainThis, unit: "회" },
    { k: "team", label: "팀 인원", value: teamCount, unit: "명" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>운영 현황</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {[["month", "월별"], ["year", "연별"]].map(([v, l]) => (
            <button key={v} onClick={() => setUnit(v)} style={{ fontSize: 12, padding: "6px 13px", borderRadius: 9, border: `1px solid ${unit === v ? "transparent" : C.line}`, background: unit === v ? C.goldGrad : "transparent", color: unit === v ? "#1a1305" : C.dim, fontWeight: 700, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 7, marginBottom: 18 }}>
        {cards.map((c) => {
          const on = panel === c.k;
          return (
            <button key={c.k} onClick={() => setPanel(c.k)} style={{ textAlign: "center", background: on ? "#181206" : C.card, border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 12, padding: "10px 4px", cursor: "pointer" }}>
              <div style={{ fontSize: 10, color: on ? C.gold : C.dim, lineHeight: 1.2 }}>{c.label}</div>
              <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 700, marginTop: 4, color: on ? C.gold : C.text }}>{c.value}<span style={{ fontSize: 9, fontWeight: 600, color: C.dim, marginLeft: 1, fontFamily: FONT }}>{c.unit}</span></div>
            </button>
          );
        })}
      </div>

      {panel === "members" && (
        <>
          {(() => {
            const cumul = periods.map((p) => ({ p, n: data.members.filter((m) => (m.joinDate || "").slice(0, isYear ? 4 : 7) <= p).length }));
            const internal = active.filter((m) => m.general).length;
            const external = active.length - internal;
            const paused = data.members.filter((m) => m.status === "정지중").length;
            const left = data.members.filter((m) => m.status === "탈퇴").length;
            return (
              <>
                <Panel title={`회원 누적 추이 · ${isYear ? "연별" : "월별"}`} sub="가입일 기준 누적">
                  <BarChart rows={cumul} color={C.gold} isYear={isYear} />
                </Panel>
                <Panel title="현재 구성">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    {[["내부 회원", internal, C.gold], ["외부 회원", external, "#4d82d8"], ["정지중", paused, "#c89042"], ["탈퇴 누적", left, "#a23b3b"]].map(([l, v, col]) => (
                      <div key={l} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
                        <div style={{ fontSize: 11, color: C.dim2 }}>{l}</div>
                        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 20, color: col, marginTop: 3 }}>{v}<span style={{ fontSize: 10, color: C.dim, fontFamily: FONT, marginLeft: 2 }}>명</span></div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            );
          })()}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 0 14px", paddingBottom: 2 }}>
            {FILTERS.map((fl) => (
              <button key={fl.k} onClick={() => setFilter(fl.k)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: `1px solid ${filter === fl.k ? "transparent" : C.line}`, background: filter === fl.k ? C.goldGrad : "transparent", color: filter === fl.k ? "#1a1305" : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{fl.k}</button>
            ))}
          </div>
          <Panel title={`회원별 수련 순위 · ${filter}`} sub="누적 출석 기준 · 회원을 누르면 상세 기록">
            {rows.length === 0 ? <Empty>데이터가 없습니다.</Empty> : rows.map((r, i) => (
              <div key={r.m.id} onClick={() => setMemDetail(r.m.id)} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                  <span style={{ fontFamily: DISP, fontWeight: 700, color: i < 3 ? C.gold : C.dim2, minWidth: 20, fontSize: 15 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700 }}>{r.m.instructor && <span style={{ color: C.gold }}>★</span>}{r.m.name}</span>
                  <span style={{ fontSize: 11, color: C.dim2 }}>{r.m.no}</span>
                  <span style={{ marginLeft: "auto", fontFamily: DISP, fontWeight: 700, color: C.gold, fontSize: 16 }}>{r.total}<span style={{ fontSize: 11, color: C.dim, marginLeft: 2 }}>회</span></span>
                  <ChevronRight size={15} color={C.dim} />
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
        </>
      )}

      {panel === "new" && (
        <>
          <Panel title={`신규 등록 인원 · ${isYear ? "연별" : "월별"}`} sub="가입일 기준">
            <BarChart rows={newRows} color={C.gold} isYear={isYear} />
          </Panel>
          <Panel title={`이번달 신규 회원 · ${newList.length}명`} sub="누가 어디에 등록했는지">
            {newList.length === 0 ? <Empty>이번달 신규 등록이 없습니다.</Empty> : newList.map((m) => (
              <div key={m.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: C.dim2, minWidth: 42, fontFamily: DISP }}>{m.no}</span>
                  <span style={{ fontWeight: 700 }}>{m.instructor && <span style={{ color: C.gold }}>★</span>}{m.name}</span>
                  <span style={{ fontSize: 9, color: C.dim, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 5px" }}>{m.general ? "내부" : "외부"}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim2, fontFamily: DISP }}>{m.joinDate}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7, paddingLeft: 50 }}>
                  {(m.enrollments || []).length === 0 ? <span style={{ fontSize: 11, color: C.dim2 }}>등록 수업 없음</span>
                    : (m.enrollments || []).map((e) => <span key={e} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(e), borderRadius: 5, padding: "2px 7px" }}>{e}</span>)}
                </div>
              </div>
            ))}
          </Panel>
        </>
      )}

      {panel === "train" && (
        <Panel title={`수련 참여 수 · ${isYear ? "연별" : "월별"}`} sub="출석 기준 (전체 합계)">
          <BarChart rows={trainRows} color="#3fa86a" isYear={isYear} />
        </Panel>
      )}

      {panel === "team" && (
        <Panel title="팀별 인원" sub="활동중 기준 · 탭하면 팀 상세">
          {teamRows.map((r) => (
            <button key={r.t} onClick={() => setTeam(r.t)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 0", background: "transparent", border: "none", borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
              <span style={{ fontSize: 13, color: C.text, minWidth: 84, textAlign: "left", fontWeight: 600 }}>{r.t.replace(/\(.*\)/, "")} <span style={{ fontSize: 10, color: C.dim2 }}>{r.t.match(/\((.*)\)/)?.[1]}</span></span>
              <div style={{ flex: 1, height: 10, background: "#202028", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${(r.n / teamMax) * 100}%`, height: "100%", background: tColor(r.t), borderRadius: 5 }} />
              </div>
              <span style={{ fontSize: 13, fontFamily: DISP, fontWeight: 700, color: tColor(r.t), minWidth: 28, textAlign: "right" }}>{r.n}</span>
              <ChevronRight size={15} color={C.dim} />
            </button>
          ))}
        </Panel>
      )}
    </div>
  );
}

// ── 회원 수련 기록 (구분별 누적 + 월별) — 수련자/운영 공용 ──
const GROUP_COLOR = { 정규: "#d8b45a", 시범단: "#d8693f", 겨루기: "#4d82d8", 품새: "#3fb08c" };
function MemberTrainRecord({ data, mid, lang = "ko" }) {
  const t = (k) => (LANG[lang] || LANG.ko)[k];
  const gName = (g) => t(`g_${g}`) || g;
  const groups = ATT_GROUPS.map((g) => ({ g, n: trainByGroup(data, mid, g) })).filter((x) => x.n > 0);
  const months = recentMonths(6);
  const monthRows = months.map((m) => ({ m, total: trainMonth(data, mid, m), parts: ATT_GROUPS.map((g) => ({ g, n: trainGroupMonth(data, mid, g, m) })).filter((x) => x.n > 0) })).filter((x) => x.total > 0);
  return (
    <>
      {groups.length > 0 && (
        <Panel title={t("recByGroup")}>
          {groups.map(({ g, n }) => (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: GROUP_COLOR[g] }} />
              <span style={{ fontSize: 14, flex: 1 }}>{gName(g)}{lang === "en" ? "" : " 수련"}</span>
              <span style={{ fontFamily: DISP, fontWeight: 700, color: C.gold }}>{n}{lang === "en" ? "" : "회"}</span>
            </div>
          ))}
        </Panel>
      )}
      <Panel title={t("recMonthly")} sub={t("recent6")}>
        {monthRows.length === 0 ? <Empty>{t("noRec")}</Empty> : monthRows.map(({ m, total, parts }) => (
          <div key={m} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontFamily: DISP }}>{lang === "en" ? m : `${m.slice(0, 4)}년 ${Number(m.slice(5))}월`}</span>
              <span style={{ marginLeft: "auto", fontFamily: DISP, fontWeight: 700, color: C.gold }}>{total}{lang === "en" ? "" : "회"}</span>
            </div>
            {parts.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {parts.map(({ g, n }) => <span key={g} style={{ fontSize: 11, color: "#fff", background: GROUP_COLOR[g], borderRadius: 5, padding: "2px 8px" }}>{gName(g)} {n}</span>)}
              </div>
            )}
          </div>
        ))}
      </Panel>
    </>
  );
}

function MiniStat({ label, value, unit, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 15px" }}>
      <div style={{ fontSize: 12, color: C.dim }}>{label}</div>
      <div style={{ fontFamily: DISP, fontSize: 26, fontWeight: 700, marginTop: 4, color: accent ? C.gold : C.text }}>{value}<span style={{ fontSize: 12, fontWeight: 600, color: C.dim, marginLeft: 3, fontFamily: FONT }}>{unit}</span></div>
    </div>
  );
}

function TeamDetail({ data, team, unit, setUnit, onBack }) {
  const isYear = unit === "year";
  const periods = isYear ? activeYears(data) : recentMonths(6);
  const members = data.members.filter((m) => (m.enrollments || []).includes(team) && m.status !== "탈퇴");
  const ids = members.map((m) => m.id);
  const trainRows = trainByPeriod(data, periods, isYear, ids);
  const col = tColor(team);
  const badge = (s) => ({ 활동중: C.gold, 휴식중: "#5a9bd8", 정지중: "#c89042", 탈퇴: "#56565e" }[s]);
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}><ChevronLeft size={16} /> 운영 현황으로</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: 4, background: col }} />
        <span style={{ fontSize: 18, fontWeight: 800 }}>{team}</span>
        <span style={{ marginLeft: "auto", fontFamily: DISP, fontWeight: 700, color: col, fontSize: 20 }}>{members.length}<span style={{ fontSize: 12, color: C.dim, marginLeft: 2, fontFamily: FONT }}>명</span></span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, marginBottom: 12 }}>
        {[["month", "월별"], ["year", "연별"]].map(([v, l]) => (
          <button key={v} onClick={() => setUnit(v)} style={{ fontSize: 12, padding: "6px 13px", borderRadius: 9, border: `1px solid ${unit === v ? "transparent" : C.line}`, background: unit === v ? C.goldGrad : "transparent", color: unit === v ? "#1a1305" : C.dim, fontWeight: 700, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
      <Panel title={`수련 참여 수 · ${isYear ? "연별" : "월별"}`} sub={`${team} 팀 출석 합계`}>
        <BarChart rows={trainRows} color={col} isYear={isYear} />
      </Panel>

      <Panel title="팀 명단" sub={`${members.length}명`}>
        {members.length === 0 ? <Empty>팀원이 없습니다.</Empty> : members.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 11, color: C.dim2, minWidth: 42, fontFamily: DISP }}>{m.no}</span>
            <span style={{ fontWeight: 700, flex: 1 }}>{m.instructor && <span style={{ color: C.gold }}>★</span>}{m.name}</span>
            <span style={{ fontSize: 9, color: C.dim, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 5px" }}>{m.general ? "내부" : "외부"}</span>
            <span style={{ fontSize: 10, color: "#0b0b0e", background: badge(m.status), borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{m.status}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: DISP, color: col, fontWeight: 700, fontSize: 13 }}><Flame size={12} />{trainTotal(data, m.id)}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function MembersAdmin({ data, persist, canEdit = true, canFinance = false }) {
  const [payFor, setPayFor] = useState(null);
  const [q, setQ] = useState(""); const [edit, setEdit] = useState(null); const [hist, setHist] = useState(null);
  const [vouchMember, setVouchMember] = useState(null);
  const [gFilter, setGFilter] = useState("전체");
  const [sFilter, setSFilter] = useState("전체");
  const GROUP_FILTERS = [
    { k: "전체", t: () => true },
    { k: "내부", t: (m) => m.general },
    { k: "외부", t: (m) => !m.general },
    { k: "지도진", t: (m) => m.instructor },
    { k: "시범단", t: (m) => (m.enrollments || []).includes("GDT(시범단)") },
    { k: "겨루기", t: (m) => (m.enrollments || []).includes("GST(겨루기)") },
    { k: "품새", t: (m) => (m.enrollments || []).includes("GPT(품새)") },
  ];
  const STATUS_FILTERS = [
    { k: "전체", t: () => true },
    { k: "활동중", t: (m) => m.status === "활동중" },
    { k: "휴식중", t: (m) => m.status === "휴식중" },
    { k: "정지중", t: (m) => m.status === "정지중" },
    { k: "탈퇴", t: (m) => m.status === "탈퇴" },
  ];
  const gf = (GROUP_FILTERS.find((x) => x.k === gFilter) || GROUP_FILTERS[0]).t;
  const sf = (STATUS_FILTERS.find((x) => x.k === sFilter) || STATUS_FILTERS[0]).t;
  const list = data.members.filter((m) => m.name.includes(q) || m.no.includes(q) || m.phone.includes(q)).filter(gf).filter(sf);
  const filterLabel = `${gFilter}${sFilter !== "전체" ? " · " + sFilter : ""}`;
  const nextNo = () => {
    const p = yy();
    const n = Math.max(0, ...data.members.filter((m) => m.no.startsWith(p)).map((m) => Number(m.no.split("-")[1]))) + 1;
    return `${p}-${String(n).padStart(3, "0")}`;
  };
  const save = (mem) => {
    const cleanNo = (mem.no || "").trim() || nextNo();
    const dup = data.members.some((x) => x.no === cleanNo && x.id !== mem.id);
    if (dup) { alert(`회원번호 ${cleanNo} 는 이미 사용 중입니다. 다른 번호를 입력해 주세요.`); return; }
    let next;
    if (mem.id) next = { ...data, members: data.members.map((x) => x.id === mem.id ? { ...mem, no: cleanNo } : x) };
    else next = { ...data, members: [...data.members, { ...mem, id: Math.max(0, ...data.members.map((x) => x.id)) + 1, no: cleanNo }] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm("회원 데이터를 완전히 삭제할까요? (탈퇴 처리는 상태 변경 권장)")) persist({ ...data, members: data.members.filter((x) => x.id !== id) }); };
  const badge = (s) => ({ 활동중: C.gold, 휴식중: "#5a9bd8", 정지중: "#c89042", 탈퇴: "#56565e" }[s]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 13px" }}>
          <Search size={16} color={C.dim} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·회원번호·연락처"
            style={{ flex: 1, background: "transparent", border: "none", color: C.text, padding: "12px 0", outline: "none", fontSize: 14, fontFamily: FONT }} />
        </div>
        {canEdit && <button onClick={() => setEdit({ name: "", phone: "", enrollments: [], status: "활동중", general: true, instructor: false, joinDate: new Date().toISOString().slice(0, 10) })} style={btnGold}><Plus size={16} /> 추가</button>}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: C.dim2, alignSelf: "center", marginRight: 2, flexShrink: 0 }}>구분</span>
        {GROUP_FILTERS.map((fl) => (
          <button key={fl.k} onClick={() => setGFilter(fl.k)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: `1px solid ${gFilter === fl.k ? "transparent" : C.line}`, background: gFilter === fl.k ? C.goldGrad : "transparent", color: gFilter === fl.k ? "#1a1305" : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{fl.k}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
        <span style={{ fontSize: 11, color: C.dim2, alignSelf: "center", marginRight: 2, flexShrink: 0 }}>상태</span>
        {STATUS_FILTERS.map((fl) => {
          const col = { 활동중: "#2e7d52", 휴식중: "#3f72b0", 정지중: "#c89042", 탈퇴: "#a23b3b" }[fl.k] || C.gold;
          const on = sFilter === fl.k;
          return <button key={fl.k} onClick={() => setSFilter(fl.k)} style={{ flexShrink: 0, padding: "7px 15px", borderRadius: 9, border: `1px solid ${on ? "transparent" : C.line}`, background: on ? (fl.k === "전체" ? C.goldGrad : col) : "transparent", color: on ? (fl.k === "전체" ? "#1a1305" : "#fff") : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{fl.k}</button>;
        })}
      </div>
      <div style={{ fontSize: 12, color: C.dim2, marginBottom: 10 }}>{filterLabel} · 총 {list.length}명</div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
        {list.length === 0 ? <Empty>회원이 없습니다.</Empty> : list.map((m) => {
          const actBtn = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", color: C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT };
          return (
            <div key={m.id} style={{ padding: "14px 15px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {m.instructor && <span style={{ color: C.gold }}>★</span>}
                <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                <span style={{ fontSize: 9, color: C.dim, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>{m.general ? "내부" : "외부"}</span>
                <span style={{ fontSize: 10, color: "#0b0b0e", background: badge(m.status), borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{m.status}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: "auto", fontFamily: DISP, color: C.gold, fontWeight: 700 }}><Flame size={13} />{trainTotal(data, m.id)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim2, marginTop: 5, fontFamily: DISP, letterSpacing: 0.3 }}>{m.no} · {m.phone}</div>
              {(m.enrollments || []).length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 9 }}>
                  {(m.enrollments || []).map((e) => {
                    const st = termStatus(m.terms?.[e]);
                    return (
                      <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(e), borderRadius: 5, padding: "3px 7px" }}>
                        {e}{st.days !== null && <span style={{ fontSize: 9, color: st.color === "#3fa86a" ? "#dfffe9" : "#1a1305", background: st.color, borderRadius: 3, padding: "0 4px" }}>{st.label}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
                <button onClick={() => setHist(m)} style={actBtn}><Award size={14} /> 경력</button>
                {canFinance && <button onClick={() => setPayFor(m)} style={{ ...actBtn, color: "#3fa86a", borderColor: "#2a5a3e" }}><Ticket size={14} /> 결제</button>}
                {canEdit && <button onClick={() => setVouchMember(m)} style={{ ...actBtn, color: C.gold, borderColor: "#5a4a22" }}><Ticket size={14} /> 상품권</button>}
                {canEdit && <button onClick={() => setEdit(m)} style={actBtn}><Pencil size={14} /> 수정</button>}
                {canEdit && <button onClick={() => remove(m.id)} style={actBtn}><Trash2 size={14} /> 삭제</button>}
              </div>
            </div>
          );
        })}
      </div>
      {edit && <MemberForm member={edit} previewNo={edit.id ? edit.no : nextNo()} teamDays={data.teamDays} onSave={save} onClose={() => setEdit(null)} />}
      {hist && <HistoryManager member={hist} onSave={(mem) => { save(mem); setHist(null); }} onClose={() => setHist(null)} />}
      {vouchMember && <MemberVoucherModal data={data} persist={persist} member={data.members.find((x) => x.id === vouchMember.id) || vouchMember} onClose={() => setVouchMember(null)} />}
      {payFor && <PaymentModal data={data} persist={persist} member={payFor} onClose={() => setPayFor(null)} />}
    </div>
  );
}

function MemberForm({ member, previewNo, onSave, onClose, teamDays }) {
  const [f, setF] = useState(member.id ? member : { ...member, no: previewNo, terms: member.terms || {} });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const has = (v) => (f.enrollments || []).includes(v);
  const toggle = (v) => setF((p) => {
    const on = (p.enrollments || []).includes(v);
    const enrollments = on ? p.enrollments.filter((x) => x !== v) : [...(p.enrollments || []), v];
    const terms = { ...(p.terms || {}) };
    if (on) delete terms[v];
    else {
      const start = p.joinDate || todayStr();
      const period = isTeam(v) ? "" : "1개월";
      const t0 = { start, period, holds: [], history: [] };
      terms[v] = { ...t0, expiry: computeExpiry(v, t0, teamDays) };
    }
    return { ...p, enrollments, terms };
  });
  const setTerm = (k, key, val) => setF((p) => {
    const t = { ...(p.terms?.[k] || {}) }; t[key] = val;
    t.expiry = computeExpiry(k, t, teamDays);
    return { ...p, terms: { ...p.terms, [k]: t } };
  });
  const renew = (k, newPeriod) => setF((p) => ({ ...p, terms: { ...p.terms, [k]: renewTerm(k, p.terms[k], teamDays, newPeriod) } }));
  const removeHold = (k, idx) => setF((p) => {
    const t = { ...(p.terms?.[k] || {}) }; t.holds = (t.holds || []).filter((_, i) => i !== idx);
    t.expiry = computeExpiry(k, t, teamDays);
    return { ...p, terms: { ...p.terms, [k]: t } };
  });
  const addHold = (k, days) => setF((p) => {
    const t = { ...(p.terms?.[k] || {}) }; const lim = HOLD_LIMITS[t.period];
    if (!lim) { alert("일일권은 홀딩할 수 없습니다."); return p; }
    const usedCnt = (t.holds || []).length, usedDays = holdDaysUsed(t);
    if (usedCnt >= lim.count) { alert(`홀딩 횟수를 모두 사용했습니다. (${t.period} 최대 ${lim.count}회)`); return p; }
    if (usedDays + days > lim.days) { alert(`홀딩 가능 일수를 초과합니다. (${t.period} 최대 ${lim.days}일 · 현재 ${usedDays}일 사용)`); return p; }
    t.holds = [...(t.holds || []), { at: todayStr(), days }];
    t.expiry = computeExpiry(k, t, teamDays);
    return { ...p, terms: { ...p.terms, [k]: t } };
  });

  const TermCard = ({ k }) => {
    const t = f.terms?.[k] || {}; const st = termStatus(t);
    const team = isTeam(k);
    const dow = (teamDays || DEFAULT_TEAM_DAYS)[k];
    const lim = HOLD_LIMITS[t.period];
    const [holdDays, setHoldDays] = useState("");
    const [renewPeriod, setRenewPeriod] = useState(t.period || "1개월");
    return (
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 12px", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: tColor(k), borderRadius: 5, padding: "2px 7px" }}>{k}</span>
          <span style={{ fontSize: 10, color: C.dim2 }}>{team ? "팀 · 월 단위" : "정규반"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, marginLeft: "auto" }}>{st.label}{t.expiry ? ` · ~${t.expiry}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: C.dim2, marginBottom: 3 }}>{team ? "등록일" : "시작일"}</div>
            <input type="date" style={{ ...inp, padding: "8px 10px", fontSize: 13 }} value={t.start || ""} onChange={(e) => setTerm(k, "start", e.target.value)} />
          </div>
          {!team && (
            <div style={{ width: 96 }}>
              <div style={{ fontSize: 10, color: C.dim2, marginBottom: 3 }}>기간</div>
              <select style={{ ...inp, padding: "8px 10px", fontSize: 13 }} value={t.period || ""} onChange={(e) => setTerm(k, "period", e.target.value)}>
                <option value="">미설정</option>
                {PERIODS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
        {team && <div style={{ fontSize: 11, color: C.dim2, marginTop: 7 }}>매월 마지막 {DAYS[dow]}요일 수련까지 유효 · 이후 재등록 필요</div>}

        {!team && lim && (
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 11px", marginTop: 9 }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>홀딩 {(t.holds || []).length}/{lim.count}회 · {holdDaysUsed(t)}/{lim.days}일 사용 ({t.period} 한도)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={holdDays} onChange={(e) => setHoldDays(e.target.value)} placeholder="홀딩 일수" style={{ ...inp, padding: "7px 10px", fontSize: 13, flex: 1 }} />
              <button type="button" onClick={() => { const dd = Number(holdDays); if (dd > 0) { addHold(k, dd); setHoldDays(""); } }} style={{ ...pill, padding: "7px 14px", color: C.gold, borderColor: "#5a4a22" }}>홀딩 추가</button>
            </div>
            {(t.holds || []).length > 0 && (
              <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
                {t.holds.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.dim, background: "#16161c", borderRadius: 7, padding: "6px 9px" }}>
                    <span style={{ color: C.gold, fontWeight: 700 }}>{i + 1}회차</span>
                    <span>{h.at} · {h.days}일</span>
                    <button type="button" onClick={() => removeHold(k, i)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#e58282", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {team ? (
          <button type="button" onClick={() => renew(k)} style={{ ...pill, width: "100%", justifyContent: "center", marginTop: 9, padding: "8px 0", background: "#181206", color: C.gold, borderColor: "#5a4a22" }}>＋ 재등록 (다음 달)</button>
        ) : (
          <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
            <select value={renewPeriod} onChange={(e) => setRenewPeriod(e.target.value)} style={{ ...inp, padding: "8px 10px", fontSize: 13, width: 110 }}>
              {PERIODS.map((p) => <option key={p}>{p}</option>)}
            </select>
            <button type="button" onClick={() => renew(k, renewPeriod)} style={{ ...pill, flex: 1, justifyContent: "center", padding: "8px 0", background: "#181206", color: C.gold, borderColor: "#5a4a22" }}>＋ 이 기간으로 재등록</button>
          </div>
        )}
        {(t.history || []).length > 0 && <div style={{ fontSize: 10, color: C.dim2, marginTop: 7 }}>재등록 {t.history.length}회 · 최근 {t.history[t.history.length - 1].at}</div>}
      </div>
    );
  };

  return (
    <Modal title={member.id ? "회원 정보 수정" : "새 회원 등록"} onClose={onClose}>
      <Field label="회원번호">
        <input style={{ ...inp, fontFamily: DISP, letterSpacing: 1, color: C.gold, fontWeight: 700 }} value={f.no || ""} onChange={(e) => set("no", e.target.value)} placeholder="예: 26-001" />
        <div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>
          {member.id ? "필요하면 직접 수정할 수 있어요." : "자동 발급된 번호예요. 그대로 두거나 직접 바꿔도 됩니다."}
        </div>
      </Field>
      <Field label="이름"><input style={inp} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="연락처"><input style={inp} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" /></Field>
      <Field label="회원 유형">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.general} onChange={(e) => setF((p) => {
            const general = e.target.checked;
            let enrollments = p.enrollments || []; let terms = { ...(p.terms || {}) };
            if (!general) { enrollments = enrollments.filter((x) => !SESSIONS.includes(x)); SESSIONS.forEach((s) => delete terms[s]); }
            return { ...p, general, enrollments, terms };
          })} style={{ width: 17, height: 17, accentColor: C.gold }} /> 내부 회원 (정규수업 수련자)
        </label>
        <div style={{ fontSize: 11, color: C.dim2, margin: "5px 0 12px 25px" }}>체크하면 내부 회원, 해제하면 외부 회원(팀 활동만)으로 표시됩니다.</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.instructor} onChange={(e) => set("instructor", e.target.checked)} style={{ width: 17, height: 17, accentColor: C.gold }} /> 지도진 (이름 앞에 ★ 표시)
        </label>
      </Field>
      <Field label={f.general ? "정규수업 등록 (복수 선택 가능)" : "전문팀 등록 (복수 선택 가능)"}>
        {f.general ? (
          <>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>정규반</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{SESSIONS.map((s) => <Chip key={s} on={has(s)} color={C.gold} onClick={() => toggle(s)}>{s}</Chip>)}</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>전문팀 (병행 시 선택)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TEAMS.map((t) => <Chip key={t} on={has(t)} color={tColor(t)} onClick={() => toggle(t)}>{t}</Chip>)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 7 }}>전문팀</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TEAMS.map((t) => <Chip key={t} on={has(t)} color={tColor(t)} onClick={() => toggle(t)}>{t}</Chip>)}</div>
            <div style={{ fontSize: 11, color: C.dim2, marginTop: 8 }}>외부 회원은 전문팀만 등록합니다. 정규수업도 들으면 위에서 '내부 회원'을 체크하세요.</div>
          </>
        )}
      </Field>
      {(f.enrollments || []).length > 0 && (
        <Field label="등록 기간 (각 수업별로 따로 지정)">
          {(f.enrollments || []).map((k) => <TermCard key={k} k={k} />)}
        </Field>
      )}
      <Field label="상태"><select style={inp} value={f.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="회원 가입일"><input type="date" style={inp} value={f.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></Field>
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

// ── 휴무일 관리 ──
function HolidayModal({ data, persist, onClose }) {
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const holidays = data.holidays || {};
  const list = Object.entries(holidays).sort((a, b) => a[0].localeCompare(b[0]));
  const add = () => {
    if (!date) return;
    persist({ ...data, holidays: { ...holidays, [date]: { reason: reason.trim() || "휴무", only: [] } } });
    setReason("");
  };
  const remove = (d) => { const h = { ...holidays }; delete h[d]; persist({ ...data, holidays: h }); };
  return (
    <Modal title="휴무일 관리" onClose={onClose}>
      <div style={{ fontSize: 12, color: C.dim2, marginBottom: 14, lineHeight: 1.6 }}>휴무로 지정한 날은 그날의 정규수업·팀 훈련이 모두 쉬며, 수련자에게 예약이 안 됩니다. (이벤트는 영향 없음)</div>
      <Field label="날짜"><input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="사유 (선택)"><input style={inp} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 어린이날, 도장 행사" /></Field>
      <button onClick={add} style={{ ...btnGold, width: "100%", justifyContent: "center", marginBottom: 16 }}><Plus size={16} /> 휴무일 추가</button>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>등록된 휴무일 {list.length}건</div>
      {list.length === 0 ? <Empty>등록된 휴무일이 없습니다.</Empty> : (
        <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          {list.map(([d, h]) => (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: DISP, fontWeight: 700, color: "#e0a0a0" }}>{d.slice(5).replace("-", "/")}</span>
              <span style={{ fontSize: 11, color: C.dim2 }}>{DAYS[dowOf(d)]}요일</span>
              <span style={{ fontSize: 13, flex: 1 }}>{h.reason}</span>
              <button onClick={() => remove(d)} style={{ background: "transparent", border: "none", color: "#e58282", cursor: "pointer", fontSize: 15 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ClassesAdmin({ data, persist, kind, canEdit = true, canHoliday = true }) {
  const [edit, setEdit] = useState(null);
  const [subs, setSubs] = useState(null);
  const [teamCfg, setTeamCfg] = useState(false);
  const [holiCfg, setHoliCfg] = useState(false);
  const [view, setView] = useState("main"); // main | reserve (수업탭) / list | vouchers (이벤트탭)
  const [monthBase, setMonthBase] = useState(new Date().toISOString().slice(0, 10));
  const [selDate, setSelDate] = useState(kind === "행사" ? null : todayStr());
  const [showAll, setShowAll] = useState(false);
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
        {canEdit && <button onClick={() => setEdit(c)} style={iconBtn}><Pencil size={15} /></button>}
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
    if (view === "vouchers") {
      return (
        <div>
          <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}><ChevronLeft size={16} /> 이벤트로</button>
          <VouchersAdmin data={data} persist={persist} />
        </div>
      );
    }
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {canEdit && <button onClick={() => setEdit(newItem)} style={btnGold}><Plus size={16} /> 일정 추가</button>}
          {canEdit && <button onClick={() => setView("vouchers")} style={{ ...pill, padding: "11px 16px", color: C.gold, borderColor: "#5a4a22", gap: 6 }}><Ticket size={15} /> 상품권 발급</button>}
        </div>
        <GroupLabel color="#d8693f">대회 · 심사 · 공연 · 이벤트 ({sorted.length})</GroupLabel>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>{sorted.length ? sorted.map(card) : <Empty>등록된 일정이 없습니다.</Empty>}</div>
        {edit && <ClassForm cls={edit} names={names} isEvent onSave={save} onClose={() => setEdit(null)} />}
        {subs && <SubmissionsView data={data} event={subs} onClose={() => setSubs(null)} />}
      </div>
    );
  }
  const teams = mine.filter((c) => (c.targets || []).some(isTeam)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const regs = mine.filter((c) => !(c.targets || []).some(isTeam)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  if (view === "reserve") {
    return (
      <div>
        <button onClick={() => setView("main")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}><ChevronLeft size={16} /> 수업으로</button>
        <ReserveAdmin data={data} persist={persist} />
      </div>
    );
  }
  if (view === "timetable") return <TimetableGrid data={data} persist={persist} onClose={() => setView("main")} />;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {canEdit && <button onClick={() => setEdit(newItem)} style={btnGold}><Plus size={16} /> 수업 개설</button>}
        <button onClick={() => setView("timetable")} style={{ ...pill, padding: "11px 15px", color: C.gold, borderColor: "#5a4a22", gap: 6 }}><LayoutDashboard size={15} /> 정규수업 설정</button>
        <button onClick={() => setTeamCfg(true)} style={{ ...pill, padding: "11px 15px", color: C.gold, borderColor: "#5a4a22", gap: 6 }}><CalendarCheck size={15} /> 팀 수업 설정</button>
        <button onClick={() => setView("reserve")} style={{ ...pill, padding: "11px 15px", color: C.gold, borderColor: "#5a4a22", gap: 6 }}><ClipboardList size={15} /> 출석부</button>
        {canHoliday && <button onClick={() => setHoliCfg(true)} style={{ ...pill, padding: "11px 15px", color: "#e0a0a0", borderColor: "#5a2222", gap: 6 }}><CalendarX size={15} /> 휴무일 관리</button>}
      </div>
      <MonthCalendar monthBase={monthBase} setMonthBase={setMonthBase} classes={data.classes} opt={{ holidays: data.holidays }} selected={selDate} onSelect={setSelDate} />
      {selDate && (() => {
        const closed = isClosed(data.holidays, selDate);
        const dayItems = classesOnDate(data.classes, selDate, { holidays: data.holidays });
        return (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{selDate.slice(5).replace("-", "월 ")}일 ({DAYS[dowOf(selDate)]}) 수업</span>
              {canHoliday && <button onClick={() => {
                const h = { ...(data.holidays || {}) };
                if (h[selDate]) delete h[selDate];
                else h[selDate] = { reason: prompt("휴무 사유 (예: 어린이날)", "") || "휴무", only: [] };
                persist({ ...data, holidays: h });
              }} style={{ marginLeft: "auto", ...pill, padding: "6px 12px", fontSize: 12, color: closed ? "#fff" : "#e0a0a0", background: closed ? "#a23b3b" : "transparent", borderColor: closed ? "#a23b3b" : "#5a2222" }}>{closed ? "휴무 해제" : "이 날 휴무"}</button>}
            </div>
            {closed && <div style={{ background: "#2a1414", border: "1px solid #5a2222", borderRadius: 12, padding: "12px 15px", fontSize: 13, color: "#e0a0a0", fontWeight: 700, marginBottom: 10 }}>🚫 {data.holidays[selDate].reason} · 휴무일 (고정 수업 휴무 · 이 날 따로 개설한 수업은 아래 표시)</div>}
            {dayItems.length === 0 ? (!closed && <Empty>이 날은 수업이 없습니다.</Empty>) : (
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>{dayItems.map(card)}</div>
            )}
          </div>
        );
      })()}
      {!selDate && <Empty>달력에서 날짜를 선택하면 그날 수업이 표시됩니다.</Empty>}
      <button onClick={() => setShowAll((v) => !v)} style={{ ...pill, width: "100%", justifyContent: "center", padding: "10px 0", color: C.dim, borderColor: C.line, marginTop: 4 }}>{showAll ? "전체 수업 목록 닫기 ▲" : "개설된 전체 수업 보기 ▼"}</button>
      {showAll && (
        <div style={{ marginTop: 14 }}>
          <GroupLabel color="#d8693f">전문팀 수업 ({teams.length})</GroupLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>{teams.length ? teams.map(card) : <Empty>전문팀 수업이 없습니다.</Empty>}</div>
          <GroupLabel color={C.gold}>정규반 수업 ({regs.length})</GroupLabel>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>{regs.length ? regs.map(card) : <Empty>정규반 수업이 없습니다.</Empty>}</div>
        </div>
      )}
      {edit && <ClassForm cls={edit} names={names} onSave={save} onClose={() => setEdit(null)} />}
      {teamCfg && <TeamDaysModal data={data} persist={persist} onClose={() => setTeamCfg(false)} />}
      {holiCfg && <HolidayModal data={data} persist={persist} onClose={() => setHoliCfg(false)} />}
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

function ClassForm({ cls, names, isEvent, onSave, onClose, onDelete }) {
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
      {!isEvent && (
        <Field label="수업 길이 (월급 계산용)">
          <div style={{ display: "flex", gap: 6 }}>
            {[[1, "1시간"], [1.5, "1시간 30분"], [2, "2시간"]].map(([v, l]) => (
              <button key={v} onClick={() => set("hours", v)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, fontWeight: 700, cursor: "pointer", fontSize: 13,
                background: (f.hours || 1) === v ? C.goldGrad : "transparent", color: (f.hours || 1) === v ? "#1a1305" : C.dim, border: `1px solid ${(f.hours || 1) === v ? "transparent" : C.line}` }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim2, marginTop: 6 }}>금·토 종합/보충수련은 1시간 30분으로 설정하세요. 사범 월급이 길이에 따라 계산됩니다.</div>
        </Field>
      )}
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
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {onDelete && <button onClick={onDelete} style={{ ...pill, padding: "12px 16px", color: "#e58282", borderColor: "#5a2a2a" }}><Trash2 size={15} /> 삭제</button>}
        <button disabled={!valid} onClick={() => onSave(f)} style={{ ...btnGold, flex: 1, justifyContent: "center", opacity: valid ? 1 : 0.4 }}><Check size={16} /> 저장</button>
      </div>
    </Modal>
  );
}

function ReserveAdmin({ data, persist }) {
  const [monthBase, setMonthBase] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState(todayStr());
  const [classId, setClassId] = useState(null);
  const [copied, setCopied] = useState(false);

  // 그날 열리는 수업 (휴무 반영, 행사 제외)
  const dayClasses = classesOnDate(data.classes, selected, { kind: "수업", holidays: data.holidays });
  // 선택된 수업 (없으면 그날 첫 수업)
  const cls = dayClasses.find((c) => c.id === classId) || dayClasses[0] || null;

  // 그 수업의 저장 구분(출석 통계용)
  const groupOf = (c) => {
    const tg = c.targets || [];
    if (tg.includes("GDT(시범단)")) return "시범단";
    if (tg.includes("GST(겨루기)")) return "겨루기";
    if (tg.includes("GPT(품새)")) return "품새";
    return "정규";
  };
  // 그 수업에 그날 예약(신청)한 회원만
  const reservedIds = cls ? (data.reservations[selected]?.[cls.id] || []) : [];
  const list = reservedIds.map((id) => data.members.find((m) => m.id === id)).filter(Boolean).sort((a, b) => a.no.localeCompare(b.no));

  const mark = (m, st) => {
    const cur = attSt(data.attendance[selected]?.[m.id]);
    const dayRec = { ...(data.attendance[selected] || {}) };
    if (cur === st) delete dayRec[m.id]; else dayRec[m.id] = { st, g: cls ? groupOf(cls) : "정규" };
    persist({ ...data, attendance: { ...data.attendance, [selected]: dayRec } });
  };

  const present = list.filter((m) => attSt(data.attendance[selected]?.[m.id]) === "출석").length;
  const absent = list.filter((m) => attSt(data.attendance[selected]?.[m.id]) === "결석").map((m) => m.name);
  const draft = absent.map((n) => `${n} 회원님, 오늘 수련에서 못 뵈었네요! 다음 시간엔 매트 위에서 같이 땀 흘려요. 가온은 늘 그 자리에 있습니다 💪`).join("\n\n");

  return (
    <div>
      <MonthCalendar monthBase={monthBase} setMonthBase={setMonthBase} classes={data.classes} opt={{ holidays: data.holidays }} selected={selected} onSelect={(d) => { setSelected(d); setClassId(null); }} />

      <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, margin: "16px 0 10px" }}>{selected.slice(5).replace("-", "월 ")}일 ({DAYS[dowOf(selected)]}) 수업</div>

      {dayClasses.length === 0 ? (
        <Empty>이 날은 열리는 수업이 없습니다.</Empty>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
            {dayClasses.map((c) => {
              const on = cls && c.id === cls.id;
              return (
                <button key={c.id} onClick={() => setClassId(c.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 9, border: `1px solid ${on ? "transparent" : C.line}`, background: on ? C.goldGrad : "transparent", color: on ? "#1a1305" : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.label} <span style={{ fontSize: 10, opacity: 0.8 }}>{c.time}</span></button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{cls?.label} 신청자</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.dim2 }}>출석 {present} / {list.length}명</span>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
            {list.length === 0 ? <Empty>이 수업에 신청한 회원이 없습니다.</Empty> : list.map((m) => {
              const st = attSt(data.attendance[selected]?.[m.id]);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ fontSize: 11, color: C.dim2, minWidth: 42, fontFamily: DISP }}>{m.no}</span>
                  <span style={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{m.instructor && <span style={{ color: C.gold }}>★</span>}{m.name}</span>
                  <button onClick={() => mark(m, "출석")} style={{ ...pill, padding: "7px 13px", background: st === "출석" ? "#2e7d52" : "transparent", color: st === "출석" ? "#fff" : C.dim, borderColor: st === "출석" ? "#2e7d52" : C.line }}>출석</button>
                  <button onClick={() => mark(m, "결석")} style={{ ...pill, padding: "7px 13px", background: st === "결석" ? "#a23b3b" : "transparent", color: st === "결석" ? "#fff" : C.dim, borderColor: st === "결석" ? "#a23b3b" : C.line }}>결석</button>
                </div>
              );
            })}
          </div>

          {absent.length > 0 && (
            <Panel title="결석자 카카오톡 초안">
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "#dadae0", margin: 0, fontFamily: FONT }}>{draft}</pre>
              <button onClick={() => { navigator.clipboard?.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ ...btnGold, marginTop: 14 }}><Copy size={15} /> {copied ? "복사됨!" : "메시지 복사"}</button>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function NoticeAdmin({ data, persist, canEdit = true }) {
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
      {canEdit && <button onClick={() => setEdit({ title: "", body: "", link: "" })} style={{ ...btnGold, marginBottom: 16 }}><Plus size={16} /> 공지 작성</button>}
      {data.notices.length === 0 ? <Empty>공지가 없습니다.</Empty> : data.notices.map((n) => (
        <Panel key={n.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: C.dim2, marginBottom: 8, fontFamily: DISP }}>{n.date}</div>
              <div style={{ fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{n.body}</div>
              {n.link && <div style={{ fontSize: 11, color: C.gold, marginTop: 8, wordBreak: "break-all" }}>🔗 {n.link}</div>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {canEdit && <button onClick={() => setEdit(n)} style={iconBtn}><Pencil size={15} /></button>}
              {canEdit && <button onClick={() => remove(n.id)} style={iconBtn}><Trash2 size={15} /></button>}
            </div>
          </div>
        </Panel>
      ))}
      {edit && (
        <Modal title={edit.id ? "공지 수정" : "공지 작성"} onClose={() => setEdit(null)}>
          <Field label="제목"><input style={inp} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="내용 (요약)"><textarea style={{ ...inp, minHeight: 110, resize: "vertical" }} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} placeholder="공지 요약 내용을 적으세요. 자세한 건 아래 링크로 연결됩니다." /></Field>
          <Field label="링크 (선택 · 블로그 등)"><input style={inp} value={edit.link || ""} onChange={(e) => setEdit({ ...edit, link: e.target.value })} placeholder="https://blog.naver.com/..." /><div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>입력하면 공지에 '자세히 보기' 버튼이 생겨 이 주소로 이동합니다.</div></Field>
          <button disabled={!edit.title.trim()} onClick={() => save(edit)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: edit.title.trim() ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// ── 수련 영상 (유튜브) ──
function VideosView({ data, persist, admin, onBack, lang = "ko" }) {
  const t = (k) => (LANG[lang] || LANG.ko)[k];
  const CAT_EN = { "품새": "Poomsae", "발차기": "Kicking", "겨루기": "Sparring", "시범": "Demo", "기타": "Etc" };
  const catLabel = (c) => lang === "en" ? (c === "전체" ? t("all") : (CAT_EN[c] || c)) : c;
  const [edit, setEdit] = useState(null);
  const [cat, setCat] = useState("전체");
  const videos = data.videos || [];
  const shown = cat === "전체" ? videos : videos.filter((v) => v.cat === cat);
  const save = (v) => {
    let next;
    if (v.id) next = { ...data, videos: videos.map((x) => x.id === v.id ? v : x) };
    else next = { ...data, videos: [{ ...v, id: Math.max(0, ...videos.map((x) => x.id)) + 1 }, ...videos] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm("이 영상을 삭제할까요?")) persist({ ...data, videos: videos.filter((x) => x.id !== id) }); };

  return (
    <div>
      {onBack && <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}><ChevronLeft size={16} /> {t("home")}</button>}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>{t("videosTitle")}</span>
        {admin && <button onClick={() => setEdit({ cat: "품새", title: "", url: "", desc: "" })} style={{ ...btnGold, marginLeft: "auto", padding: "8px 13px" }}><Plus size={15} /> 영상 추가</button>}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }}>
        {["전체", ...VIDEO_CATS].map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: `1px solid ${cat === c ? "transparent" : C.line}`, background: cat === c ? C.goldGrad : "transparent", color: cat === c ? "#1a1305" : C.dim, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{catLabel(c)}</button>
        ))}
      </div>
      {shown.length === 0 ? <Empty>{t("noVideo")}</Empty> : shown.map((v) => {
        const id = ytId(v.url);
        return (
          <div key={v.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {id ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe src={`https://www.youtube.com/embed/${id}`} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} />
              </div>
            ) : <div style={{ padding: 20, fontSize: 12, color: "#e58282", textAlign: "center" }}>유튜브 링크를 확인해 주세요</div>}
            <div style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1305", background: C.gold, borderRadius: 5, padding: "2px 7px" }}>{catLabel(v.cat)}</span>
                <span style={{ fontWeight: 700, flex: 1 }}>{v.title}</span>
                {admin && <><button onClick={() => setEdit(v)} style={iconBtn}><Pencil size={14} /></button><button onClick={() => remove(v.id)} style={iconBtn}><Trash2 size={14} /></button></>}
              </div>
              {v.desc && <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{v.desc}</div>}
            </div>
          </div>
        );
      })}
      {edit && (
        <Modal title={edit.id ? "영상 수정" : "영상 추가"} onClose={() => setEdit(null)}>
          <Field label="분류"><select style={inp} value={edit.cat} onChange={(e) => setEdit({ ...edit, cat: e.target.value })}>{VIDEO_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="제목"><input style={inp} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="예: 태극 1장 시범" /></Field>
          <Field label="유튜브 링크"><input style={inp} value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /><div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>유튜브 영상 주소를 그대로 붙여넣으세요. {edit.url && (ytId(edit.url) ? "✓ 인식됨" : "✗ 링크 확인 필요")}</div></Field>
          <Field label="설명 (선택)"><textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={edit.desc} onChange={(e) => setEdit({ ...edit, desc: e.target.value })} /></Field>
          <button disabled={!edit.title.trim() || !ytId(edit.url)} onClick={() => save(edit)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: (edit.title.trim() && ytId(edit.url)) ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════ 개인 사물함 (관장 전용) ═══════════
function LockerView({ data, persist }) {
  const [edit, setEdit] = useState(null); // {no, name, start, expiry, pw}
  const lockers = data.lockers || {};
  const used = Object.values(lockers).filter((l) => l && l.name).length;

  const save = () => {
    const next = { ...lockers };
    if (!edit.name && !edit.pw && !edit.start && !edit.expiry) delete next[edit.no];
    else next[edit.no] = { name: edit.name || "", start: edit.start || "", expiry: edit.expiry || "", pw: edit.pw || "", history: edit.history || [] };
    persist({ ...data, lockers: next }); setEdit(null);
  };
  const clear = () => { const next = { ...lockers }; delete next[edit.no]; persist({ ...data, lockers: next }); setEdit(null); };

  // 기간 연장(재등록) — months개월 연장 + 사물함료 수입 기록
  const extend = (months) => {
    const fee = (data.pricing?.extras || []).find((e) => e.id === "locker")?.price || 10000;
    const baseDate = edit.expiry && edit.expiry >= todayStr() ? edit.expiry : todayStr();
    const d2 = new Date(baseDate); d2.setMonth(d2.getMonth() + months);
    const newExpiry = d2.toISOString().slice(0, 10);
    const total = fee * months;
    const ok = confirm(`${edit.no}번 사물함 ${months}개월 연장\n만료일: ${newExpiry}\n사물함료 ${won(total)}원을 수입으로 기록할까요?`);
    const hist = [...(edit.history || []), { date: todayStr(), months, amount: total, expiry: newExpiry }];
    const next = { ...lockers, [edit.no]: { name: edit.name || "", start: edit.start || todayStr(), expiry: newExpiry, pw: edit.pw || "", history: hist } };
    let nd = { ...data, lockers: next };
    if (ok) nd = { ...nd, finance: [...(data.finance || []), { id: Date.now(), type: "수입", date: todayStr(), cat: "사물함", amount: total, memo: `${edit.no}번 사물함 ${months}개월${edit.name ? " · " + edit.name : ""}` }] };
    persist(nd); setEdit(null);
  };

  const isExpired = (l) => l?.expiry && l.expiry < todayStr();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>개인 사물함</span>
        <span style={{ fontSize: 11, color: C.dim2, marginLeft: 8 }}>· 관장 전용</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.dim }}>사용 {used} / 65</span>
      </div>
      <div style={{ fontSize: 11, color: C.dim2, marginBottom: 14 }}>칸을 누르면 회원·기간·비밀번호를 입력/수정할 수 있어요. 비우려면 내용을 지우고 저장하세요.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
        {Array.from({ length: 65 }, (_, i) => i + 1).map((no) => {
          const l = lockers[no];
          const filled = l && l.name;
          const expired = isExpired(l);
          return (
            <button key={no} onClick={() => setEdit({ no, name: l?.name || "", start: l?.start || "", expiry: l?.expiry || "", pw: l?.pw || "", history: l?.history || [] })}
              style={{ aspectRatio: "1", borderRadius: 10, border: `1px solid ${expired ? "#a23b3b" : filled ? C.gold : C.line}`, background: filled ? (expired ? "#2a1414" : "#181206") : C.card, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 2 }}>
              <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: filled ? C.gold : C.dim }}>{no}</span>
              {filled ? <span style={{ fontSize: 9, color: expired ? "#e0726a" : "#dadae0", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                : <span style={{ fontSize: 8, color: C.dim2 }}>비어있음</span>}
            </button>
          );
        })}
      </div>

      {edit && (
        <Modal title={`${edit.no}번 사물함`} onClose={() => setEdit(null)}>
          <Field label="사용 회원"><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="회원 이름" autoFocus /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="시작일"><input type="date" style={inp} value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></Field>
            <Field label="만료일"><input type="date" style={inp} value={edit.expiry} onChange={(e) => setEdit({ ...edit, expiry: e.target.value })} /></Field>
          </div>
          <Field label="비밀번호"><input style={inp} value={edit.pw} onChange={(e) => setEdit({ ...edit, pw: e.target.value })} placeholder="예: 1234" /></Field>

          <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 8 }}>기간 연장 (재등록)</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[1, 3, 6, 12].map((m) => (
              <button key={m} onClick={() => extend(m)} style={{ ...pill, flex: 1, justifyContent: "center", padding: "9px 0", fontSize: 12, color: C.gold, borderColor: "#5a4a22" }}>{m}개월</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim2, marginBottom: 14 }}>연장하면 만료일이 늘어나고, 사물함료가 수입으로 기록됩니다.</div>

          {(edit.history || []).length > 0 && (
            <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.dim2, marginBottom: 6 }}>등록 이력</div>
              {[...edit.history].reverse().map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: C.dim }}>
                  <span>{h.date} · {h.months}개월</span><span style={{ fontFamily: DISP }}>{won(h.amount)}원</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={clear} style={{ ...pill, flex: 1, justifyContent: "center", padding: "11px 0", color: "#e0726a", borderColor: "#5a2222" }}>비우기</button>
            <button onClick={save} style={{ ...btnGold, flex: 2, justifyContent: "center" }}><Check size={16} /> 저장</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════ 재무 (관장 전용) ═══════════
const won = (n) => (n || 0).toLocaleString("ko-KR");

// 결제/등록 모달 — 가격 자동 계산 + 추가항목 + 재무 자동 기록
function PaymentModal({ data, persist, member, onClose }) {
  const p = data.pricing || DEFAULT_PRICING;
  const [kind, setKind] = useState("정규반"); // 정규반 | 팀 | 기타
  const [isNew, setIsNew] = useState(false); // 신규/기존
  const [ses, setSes] = useState("오후");
  const [period, setPeriod] = useState("1개월");
  const [teamType, setTeamType] = useState("내부");
  const [extras, setExtras] = useState({}); // id → bool
  const [memo, setMemo] = useState("");
  const [discount, setDiscount] = useState(0);

  // 기본 수강료 계산
  let base = 0, baseLabel = "";
  if (kind === "정규반") {
    if (period === "1개월") { base = p.reg1[ses]; }
    else { base = (isNew ? p.newReg : p.oldReg)[period][ses]; }
    baseLabel = `정규반 ${ses} ${period}`;
  } else if (kind === "팀") {
    base = p.team[teamType]; baseLabel = `전문팀 ${teamType} (월)`;
  }
  const extraList = p.extras.filter((e) => extras[e.id]);
  const extraSum = extraList.reduce((s, e) => s + e.price, 0);
  const total = Math.max(0, base + extraSum - (Number(discount) || 0));

  const submit = () => {
    if (total <= 0 && extraList.length === 0) { alert("결제 항목을 선택해 주세요."); return; }
    const parts = [];
    if (kind !== "기타") parts.push(baseLabel);
    if (extraList.length) parts.push(extraList.map((e) => e.name).join("+"));
    const autoMemo = `${member.name} · ${parts.join(" + ")}${isNew && kind === "정규반" ? " (신규)" : ""}${memo ? " · " + memo : ""}`;
    const rec = { id: Date.now(), type: "수입", date: todayStr(), cat: kind === "팀" ? "팀비" : kind === "기타" ? "기타수입" : "수강료", amount: total, memo: autoMemo, memberId: member.id };
    persist({ ...data, finance: [...(data.finance || []), rec] });
    onClose();
  };

  const chipRow = (opts, val, set) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {opts.map((o) => <Chip key={o} on={val === o} color={C.gold} onClick={() => set(o)}>{o}</Chip>)}
    </div>
  );

  return (
    <Modal title={`${member.name} 결제 / 등록`} onClose={onClose}>
      <div style={{ fontSize: 12, color: C.dim2, marginBottom: 14 }}>결제하면 재무 장부에 수입으로 자동 기록됩니다.</div>

      <Field label="등록 종류">{chipRow(["정규반", "팀", "기타"], kind, setKind)}</Field>

      {kind === "정규반" && (
        <>
          <Field label="회원 구분">{chipRow(["기존", "신규"], isNew ? "신규" : "기존", (v) => setIsNew(v === "신규"))}</Field>
          <Field label="반">{chipRow(["오전", "오후", "통합"], ses, setSes)}</Field>
          <Field label="기간">{chipRow(["1개월", "3개월", "6개월", "1년"], period, setPeriod)}</Field>
        </>
      )}
      {kind === "팀" && <Field label="팀 구분">{chipRow(["내부", "외부", "지도진", "체험"], teamType, setTeamType)}</Field>}

      <Field label="추가 항목 (선택)">
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {p.extras.map((e) => (
            <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={!!extras[e.id]} onChange={(ev) => setExtras({ ...extras, [e.id]: ev.target.checked })} style={{ width: 16, height: 16, accentColor: C.gold }} />
              <span style={{ flex: 1 }}>{e.name}</span>
              <span style={{ fontFamily: DISP, color: C.dim }}>{won(e.price)}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="할인 (원, 선택)"><input type="number" style={inp} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></Field>
      <Field label="혜택·메모 (선택)"><input style={inp} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 6개월 등록 도복 증정, 사물함 6개월" /></Field>

      <div style={{ background: "#181206", border: `1px solid ${C.gold}`, borderRadius: 12, padding: "14px 16px", margin: "8px 0 16px" }}>
        {kind !== "기타" && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dim, marginBottom: 5 }}><span>{baseLabel}</span><span style={{ fontFamily: DISP }}>{won(base)}</span></div>}
        {extraList.map((e) => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dim, marginBottom: 5 }}><span>{e.name}</span><span style={{ fontFamily: DISP }}>{won(e.price)}</span></div>)}
        {Number(discount) > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#e0726a", marginBottom: 5 }}><span>할인</span><span style={{ fontFamily: DISP }}>−{won(Number(discount))}</span></div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 9, marginTop: 4 }}>
          <span style={{ fontWeight: 700, color: C.gold }}>총 결제액</span>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, color: C.gold }}>{won(total)}<span style={{ fontSize: 12, fontFamily: FONT }}>원</span></span>
        </div>
      </div>

      <button onClick={submit} style={{ ...btnGold, width: "100%", justifyContent: "center" }}><Check size={16} /> 결제 기록</button>
    </Modal>
  );
}

const FIN_CATS_IN = ["수강료", "팀비", "도복", "심사", "사물함", "쿠폰", "입관비", "기타수입"];
const FIN_CATS_OUT = ["임대료", "인건비", "공과금", "용품구입", "마케팅", "기타지출"];

function FinanceView({ data, persist }) {
  const [tab, setTab] = useState("ledger"); // ledger | stats | salary | pricing
  const tabs = [["ledger", "수입·지출"], ["stats", "집계·분석"], ["salary", "월급"], ["pricing", "가격 설정"]];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>재무 관리</span>
        <span style={{ fontSize: 11, color: C.dim2, marginLeft: 8 }}>· 관장 전용</span>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flexShrink: 0, ...pill, padding: "8px 15px", background: tab === k ? C.goldGrad : "transparent", color: tab === k ? "#1a1305" : C.dim, borderColor: tab === k ? "transparent" : C.line }}>{l}</button>
        ))}
      </div>
      {tab === "ledger" && <FinanceLedger data={data} persist={persist} />}
      {tab === "stats" && <FinanceStats data={data} />}
      {tab === "salary" && <FinanceSalary data={data} persist={persist} />}
      {tab === "pricing" && <FinancePricing data={data} persist={persist} />}
    </div>
  );
}

function FinanceLedger({ data, persist }) {
  const [month, setMonth] = useState(ym());
  const [form, setForm] = useState(null); // {type:"수입"|"지출", ...}
  const fin = data.finance || [];
  const monthRows = fin.filter((f) => (f.date || "").slice(0, 7) === month).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const income = monthRows.filter((f) => f.type === "수입").reduce((s, f) => s + (f.amount || 0), 0);
  const expense = monthRows.filter((f) => f.type === "지출").reduce((s, f) => s + (f.amount || 0), 0);
  const net = income - expense;

  const save = () => {
    if (!form.amount) { alert("금액을 입력해 주세요."); return; }
    const rec = { ...form, id: form.id || Date.now(), amount: Number(form.amount) };
    const next = form.id ? fin.map((x) => x.id === form.id ? rec : x) : [...fin, rec];
    persist({ ...data, finance: next }); setForm(null);
  };
  const remove = (id) => { if (confirm("이 내역을 삭제할까요?")) persist({ ...data, finance: fin.filter((x) => x.id !== id) }); };

  const shiftMonth = (d) => { const [y, m] = month.split("-").map(Number); const nd = new Date(y, m - 1 + d, 1); setMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
        <button onClick={() => shiftMonth(-1)} style={{ ...iconBtn, width: 34, height: 34 }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16 }}>{month.replace("-", ". ")}</span>
        <button onClick={() => shiftMonth(1)} style={{ ...iconBtn, width: 34, height: 34 }}><ChevronRight size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.dim2 }}>수입</div>
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: "#3fa86a", marginTop: 4 }}>{won(income)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.dim2 }}>지출</div>
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: "#e0726a", marginTop: 4 }}>{won(expense)}</div>
        </div>
        <div style={{ background: "#181206", border: `1px solid ${C.gold}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.gold }}>순이익</div>
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: net >= 0 ? C.gold : "#e0726a", marginTop: 4 }}>{won(net)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setForm({ type: "수입", date: todayStr(), cat: FIN_CATS_IN[0], memo: "", amount: "" })} style={{ ...btnGold, flex: 1, justifyContent: "center", background: "linear-gradient(135deg,#2e7d52,#246342)", color: "#fff" }}><Plus size={16} /> 수입 추가</button>
        <button onClick={() => setForm({ type: "지출", date: todayStr(), cat: FIN_CATS_OUT[0], memo: "", amount: "" })} style={{ ...btnGold, flex: 1, justifyContent: "center", background: "linear-gradient(135deg,#a23b3b,#822e2e)", color: "#fff" }}><Plus size={16} /> 지출 추가</button>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
        {monthRows.length === 0 ? <Empty>이 달 내역이 없습니다.</Empty> : monthRows.map((f) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: f.type === "수입" ? "#2e7d52" : "#a23b3b", borderRadius: 5, padding: "2px 7px" }}>{f.cat}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{f.memo || f.cat}</div>
              <div style={{ fontSize: 11, color: C.dim2, fontFamily: DISP }}>{f.date}</div>
            </div>
            <span style={{ fontFamily: DISP, fontWeight: 700, color: f.type === "수입" ? "#3fa86a" : "#e0726a" }}>{f.type === "수입" ? "+" : "−"}{won(f.amount)}</span>
            <button onClick={() => setForm(f)} style={iconBtn}><Pencil size={13} /></button>
            <button onClick={() => remove(f.id)} style={iconBtn}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {form && (
        <Modal title={`${form.type} ${form.id ? "수정" : "추가"}`} onClose={() => setForm(null)}>
          <Field label="날짜"><input type="date" style={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="항목">
            <select style={inp} value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
              {(form.type === "수입" ? FIN_CATS_IN : FIN_CATS_OUT).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="금액 (원)"><input type="number" style={inp} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="예: 180000" /></Field>
          <Field label="메모 (선택 · 회원명·혜택 등)"><input style={inp} value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="예: 김지훈 6개월 등록 (도복 증정)" /></Field>
          <button onClick={save} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// 집계·분석 — 월별 추이 + 항목별 비중
function FinanceStats({ data }) {
  const [unit, setUnit] = useState("month"); // month | year
  const isYear = unit === "year";
  const fin = data.finance || [];
  const periods = isYear ? activeYears(data) : recentMonths(6);
  const key = (f) => (f.date || "").slice(0, isYear ? 4 : 7);

  const rows = periods.map((pr) => {
    const inc = fin.filter((f) => f.type === "수입" && key(f) === pr).reduce((s, f) => s + (f.amount || 0), 0);
    const exp = fin.filter((f) => f.type === "지출" && key(f) === pr).reduce((s, f) => s + (f.amount || 0), 0);
    return { p: pr, inc, exp, net: inc - exp };
  });
  const maxV = Math.max(1, ...rows.map((r) => Math.max(r.inc, r.exp)));

  // 이번 기간 항목별 수입 비중
  const cur = isYear ? String(new Date().getFullYear()) : ym();
  const incByCat = {};
  fin.filter((f) => f.type === "수입" && key(f) === cur).forEach((f) => { incByCat[f.cat] = (incByCat[f.cat] || 0) + (f.amount || 0); });
  const catRows = Object.entries(incByCat).sort((a, b) => b[1] - a[1]);
  const catTotal = catRows.reduce((s, [, v]) => s + v, 0);
  const expByCat = {};
  fin.filter((f) => f.type === "지출" && key(f) === cur).forEach((f) => { expByCat[f.cat] = (expByCat[f.cat] || 0) + (f.amount || 0); });
  const expRows = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["month", "월별"], ["year", "연별"]].map(([v, l]) => (
          <button key={v} onClick={() => setUnit(v)} style={{ ...pill, padding: "7px 14px", background: unit === v ? C.goldGrad : "transparent", color: unit === v ? "#1a1305" : C.dim, borderColor: unit === v ? "transparent" : C.line }}>{l}</button>
        ))}
      </div>

      <Panel title={`수입 · 지출 추이 · ${isYear ? "연별" : "월별"}`}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130, padding: "0 2px" }}>
          {rows.map((r, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 95, width: "100%", justifyContent: "center" }}>
                <div title={`수입 ${won(r.inc)}`} style={{ width: "40%", height: `${Math.max(2, (r.inc / maxV) * 95)}px`, background: "#3fa86a", borderRadius: "3px 3px 0 0" }} />
                <div title={`지출 ${won(r.exp)}`} style={{ width: "40%", height: `${Math.max(2, (r.exp / maxV) * 95)}px`, background: "#e0726a", borderRadius: "3px 3px 0 0" }} />
              </div>
              <span style={{ fontSize: 9, color: r.net >= 0 ? C.gold : "#e0726a", fontFamily: DISP, fontWeight: 700 }}>{r.net >= 0 ? "+" : ""}{Math.round(r.net / 10000)}만</span>
              <span style={{ fontSize: 9, color: C.dim2 }}>{periodLabel(r.p, isYear)}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 12, fontSize: 11, color: C.dim }}>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#3fa86a", borderRadius: 2, marginRight: 4 }} />수입</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, background: "#e0726a", borderRadius: 2, marginRight: 4 }} />지출</span>
        </div>
      </Panel>

      <Panel title={`이번 ${isYear ? "해" : "달"} 수입 항목별`} sub={`합계 ${won(catTotal)}원`}>
        {catRows.length === 0 ? <Empty>수입 기록이 없습니다.</Empty> : catRows.map(([c, v]) => (
          <div key={c} style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <span>{c}</span><span style={{ fontFamily: DISP, fontWeight: 700, color: "#3fa86a" }}>{won(v)} <span style={{ fontSize: 11, color: C.dim2 }}>({Math.round(v / catTotal * 100)}%)</span></span>
            </div>
            <div style={{ height: 6, background: "#202028", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${v / catTotal * 100}%`, height: "100%", background: "#3fa86a" }} /></div>
          </div>
        ))}
      </Panel>

      {expRows.length > 0 && (
        <Panel title={`이번 ${isYear ? "해" : "달"} 지출 항목별`}>
          {expRows.map(([c, v]) => (
            <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
              <span>{c}</span><span style={{ fontFamily: DISP, fontWeight: 700, color: "#e0726a" }}>{won(v)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}

// 사범 월급 관리
function FinanceSalary({ data, persist }) {
  const [month, setMonth] = useState(ym());
  const [edit, setEdit] = useState(null);
  const salaries = data.salaries || {};
  const monthData = salaries[month] || {};
  // 사범 목록 (관리자 계정)
  const staff = data.admins.map((a) => {
    const auto = autoSalary(data, a.name, a.role, month);
    const rec = monthData[`a${a.id}`] || {};
    const extra = Number(rec.extra) || 0;
    const final = auto.amount + extra;
    return { key: `a${a.id}`, name: a.name, role: a.role, roleLabel: roleLabel(a.role), auto, extra, memo: rec.memo || "", final };
  });
  const total = staff.reduce((s, st) => s + st.final, 0);

  const shiftMonth = (d) => { const [y, m] = month.split("-").map(Number); const nd = new Date(y, m - 1 + d, 1); setMonth(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`); };
  const saveOne = (key, extra, memo) => {
    const md = { ...(salaries[month] || {}) };
    md[key] = { extra: Number(extra) || 0, memo: memo || "" };
    persist({ ...data, salaries: { ...salaries, [month]: md } });
    setEdit(null);
  };
  const postToLedger = () => {
    if (total <= 0) { alert("계산된 월급이 없습니다. 지도진 스케줄에 사범을 배정했는지 확인해 주세요."); return; }
    if (!confirm(`${month} 월급 합계 ${won(total)}원을 지출로 기록할까요?`)) return;
    const fin = data.finance || [];
    if (fin.find((f) => f.salaryMonth === month)) { alert("이 달 월급은 이미 지출에 기록되어 있습니다."); return; }
    const rec = { id: Date.now(), type: "지출", date: `${month}-25`, cat: "인건비", amount: total, memo: `${month} 사범 월급 (${staff.filter((s) => s.final > 0).length}명)`, salaryMonth: month };
    persist({ ...data, finance: [...fin, rec] });
    alert("지출로 기록되었습니다.");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
        <button onClick={() => shiftMonth(-1)} style={{ ...iconBtn, width: 34, height: 34 }}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16 }}>{month.replace("-", ". ")}</span>
        <button onClick={() => shiftMonth(1)} style={{ ...iconBtn, width: 34, height: 34 }}><ChevronRight size={16} /></button>
      </div>

      <div style={{ fontSize: 11, color: C.dim2, marginBottom: 12, lineHeight: 1.6 }}>지도진 스케줄에 배정된 정규수업으로 기본급이 자동 계산됩니다. (팀수업 제외) 추가 수당·공제는 각 사범 옆 연필을 눌러 입력하세요.</div>

      <div style={{ background: "#181206", border: `1px solid ${C.gold}`, borderRadius: 12, padding: "13px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, color: C.gold }}>월급 합계</span>
        <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 20, color: C.gold }}>{won(total)}<span style={{ fontSize: 12, fontFamily: FONT }}>원</span></span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
        {staff.map((st) => (
          <div key={st.key} style={{ padding: "12px 14px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{st.name} <span style={{ fontSize: 10, color: C.gold }}>{st.roleLabel}</span></div>
                <div style={{ fontSize: 11, color: C.dim2 }}>수업 {st.auto.count}회 · {st.auto.hours}시간 × {won(st.auto.rate)}{st.extra !== 0 ? ` · 추가 ${st.extra > 0 ? "+" : ""}${won(st.extra)}` : ""}</div>
                {st.memo && <div style={{ fontSize: 11, color: C.dim2 }}>{st.memo}</div>}
              </div>
              <span style={{ fontFamily: DISP, fontWeight: 800, color: st.final ? C.gold : C.dim2 }}>{won(st.final)}</span>
              <button onClick={() => setEdit({ key: st.key, name: st.name, auto: st.auto.amount, extra: st.extra || "", memo: st.memo })} style={iconBtn}><Pencil size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={postToLedger} style={{ ...btnGold, width: "100%", justifyContent: "center", background: "linear-gradient(135deg,#a23b3b,#822e2e)", color: "#fff" }}><Check size={16} /> 이 달 월급을 지출로 기록</button>
      <div style={{ fontSize: 11, color: C.dim2, marginTop: 8, textAlign: "center" }}>누르면 재무 장부에 인건비 지출로 반영됩니다.</div>

      {edit && (
        <Modal title={`${edit.name} 월급 (${month})`} onClose={() => setEdit(null)}>
          <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dim }}><span>자동 계산 기본급</span><span style={{ fontFamily: DISP, fontWeight: 700, color: C.text }}>{won(edit.auto)}</span></div>
          </div>
          <Field label="추가 / 공제 (원 · 공제는 마이너스)"><input type="number" style={inp} value={edit.extra} onChange={(e) => setEdit({ ...edit, extra: e.target.value })} placeholder="예: 50000 또는 -30000" autoFocus /></Field>
          <Field label="메모 (선택)"><input style={inp} value={edit.memo} onChange={(e) => setEdit({ ...edit, memo: e.target.value })} placeholder="예: 시범 수당, 결근 공제" /></Field>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, padding: "10px 2px 4px" }}><span>최종 지급액</span><span style={{ fontFamily: DISP, color: C.gold }}>{won(edit.auto + (Number(edit.extra) || 0))}</span></div>
          <button onClick={() => saveOne(edit.key, edit.extra, edit.memo)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

function FinancePricing({ data, persist }) {
  const p = data.pricing || DEFAULT_PRICING;
  const upd = (np) => persist({ ...data, pricing: np });
  const setReg1 = (k, v) => upd({ ...p, reg1: { ...p.reg1, [k]: Number(v) || 0 } });
  const setLong = (grp, period, k, v) => upd({ ...p, [grp]: { ...p[grp], [period]: { ...p[grp][period], [k]: Number(v) || 0 } } });
  const setTeam = (k, v) => upd({ ...p, team: { ...p.team, [k]: Number(v) || 0 } });
  const setDan = (k, v) => upd({ ...p, dan: { ...p.dan, [k]: Number(v) || 0 } });
  const setExtra = (id, v) => upd({ ...p, extras: p.extras.map((e) => e.id === id ? { ...e, price: Number(v) || 0 } : e) });

  const numInp = { ...inp, padding: "8px 10px", fontSize: 13, textAlign: "right", fontFamily: DISP };
  const SES = ["오전", "오후", "통합"];

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dim2, marginBottom: 14, lineHeight: 1.6 }}>가격이 바뀌면 여기서 수정하세요. 등록·결제 기록 시 이 가격이 적용됩니다. (단위: 원)</div>

      <Panel title="정규반 1개월">
        {SES.map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ width: 50, fontSize: 13, color: C.dim }}>{s}</span>
            <input type="number" style={{ ...numInp, flex: 1 }} value={p.reg1[s]} onChange={(e) => setReg1(s, e.target.value)} />
          </div>
        ))}
      </Panel>

      {[["newReg", "장기등록 (신규)"], ["oldReg", "장기등록 (기존)"]].map(([grp, label]) => (
        <Panel key={grp} title={label}>
          {["3개월", "6개월", "1년"].map((pe) => (
            <div key={pe} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 6 }}>{pe}</div>
              {SES.map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <span style={{ width: 50, fontSize: 12, color: C.dim }}>{s}</span>
                  <input type="number" style={{ ...numInp, flex: 1 }} value={p[grp][pe][s]} onChange={(e) => setLong(grp, pe, s, e.target.value)} />
                </div>
              ))}
            </div>
          ))}
        </Panel>
      ))}

      <Panel title="전문팀 (월)">
        {["내부", "외부", "지도진", "체험"].map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ width: 50, fontSize: 13, color: C.dim }}>{k}</span>
            <input type="number" style={{ ...numInp, flex: 1 }} value={p.team[k]} onChange={(e) => setTeam(k, e.target.value)} />
          </div>
        ))}
      </Panel>

      <Panel title="추가 항목">
        {p.extras.map((e) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ flex: 1, fontSize: 13, color: C.dim }}>{e.name}</span>
            <input type="number" style={{ ...numInp, width: 130 }} value={e.price} onChange={(ev) => setExtra(e.id, ev.target.value)} />
          </div>
        ))}
      </Panel>

      <Panel title="국기원 승단 심사">
        {Object.keys(p.dan).map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ width: 50, fontSize: 13, color: C.dim }}>{k}</span>
            <input type="number" style={{ ...numInp, flex: 1 }} value={p.dan[k]} onChange={(e) => setDan(k, e.target.value)} />
          </div>
        ))}
      </Panel>

      <Panel title="사범 수업 시급 (정규수업, 시간당)" sub="월급 자동 계산 기준 · 팀수업 제외">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <span style={{ flex: 1, fontSize: 13, color: C.dim }}>관장~정사범</span>
          <input type="number" style={{ ...numInp, width: 130 }} value={(p.wage || DEFAULT_PRICING.wage).senior} onChange={(e) => upd({ ...p, wage: { ...(p.wage || DEFAULT_PRICING.wage), senior: Number(e.target.value) || 0 } })} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <span style={{ flex: 1, fontSize: 13, color: C.dim }}>보조사범 이하</span>
          <input type="number" style={{ ...numInp, width: 130 }} value={(p.wage || DEFAULT_PRICING.wage).junior} onChange={(e) => upd({ ...p, wage: { ...(p.wage || DEFAULT_PRICING.wage), junior: Number(e.target.value) || 0 } })} />
        </div>
        <div style={{ fontSize: 11, color: C.dim2, marginTop: 6 }}>1시간 30분 수업은 1.5배로 계산됩니다. (수업 개설 시 길이 설정)</div>
      </Panel>
    </div>
  );
}

// ── 지도진 스케줄표 (관리자 전용) ──
const SCHED_SLOTS = ["메인", "보조", "교육"];
function ScheduleView({ data, persist, canEdit }) {
  const [base, setBase] = useState(new Date().toISOString().slice(0, 10));
  const [sel, setSel] = useState(todayStr());
  const [view, setView] = useState("cal");
  const [statUnit, setStatUnit] = useState("month");
  const sched = data.scheduleData || {};
  const coaches = [...new Set([...data.admins.map((a) => a.name), ...data.members.filter((m) => m.instructor).map((m) => m.name)])];

  // 그날 열리는 수업 (반복+1회성, 휴무 반영, 행사 제외)
  const dayClasses = classesOnDate(data.classes, sel, { kind: "수업", holidays: data.holidays });
  // 특정 수업의 배정 슬롯 (없으면 기본 메인/보조/교육)
  const slotsOf = (classId) => {
    const arr = sched[sel]?.[classId];
    if (Array.isArray(arr) && arr.length) return arr;
    return SCHED_SLOTS.map((role) => ({ role, name: "" }));
  };
  const writeSlots = (classId, slots) => {
    const day = { ...(sched[sel] || {}) };
    day[classId] = slots;
    persist({ ...data, scheduleData: { ...sched, [sel]: day } });
  };
  const setAssign = (classId, idx, name) => { const s = slotsOf(classId).map((x, i) => i === idx ? { ...x, name } : x); writeSlots(classId, s); };
  const addSlot = (classId) => writeSlots(classId, [...slotsOf(classId), { role: "보조", name: "" }]);
  const removeSlot = (classId, idx) => writeSlots(classId, slotsOf(classId).filter((_, i) => i !== idx));
  const setRole = (classId, idx, role) => { const s = slotsOf(classId).map((x, i) => i === idx ? { ...x, role } : x); writeSlots(classId, s); };

  // 통계: 기간 내 사범별 역할 횟수 (수업별 배정 합산)
  const period = statUnit === "month" ? base.slice(0, 7) : base.slice(0, 4);
  const stats = {};
  Object.entries(sched).forEach(([date, day]) => {
    const key = statUnit === "month" ? date.slice(0, 7) : date.slice(0, 4);
    if (key !== period) return;
    Object.values(day || {}).forEach((arr) => {
      if (!Array.isArray(arr)) return; // 구형 데이터 무시
      arr.forEach(({ role, name }) => {
        if (!name) return;
        if (!stats[name]) stats[name] = { 메인: 0, 보조: 0, 교육: 0, 합계: 0 };
        if (stats[name][role] != null) stats[name][role]++;
        stats[name].합계++;
      });
    });
  });
  const statRows = Object.entries(stats).sort((a, b) => b[1].합계 - a[1].합계);
  const ROLE_OPTS = ["메인", "보조", "교육"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>지도진 스케줄</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={() => setView("cal")} style={{ ...pill, padding: "7px 13px", background: view === "cal" ? C.goldGrad : "transparent", color: view === "cal" ? "#1a1305" : C.dim, borderColor: view === "cal" ? "transparent" : C.line }}>달력</button>
          <button onClick={() => setView("stat")} style={{ ...pill, padding: "7px 13px", background: view === "stat" ? C.goldGrad : "transparent", color: view === "stat" ? "#1a1305" : C.dim, borderColor: view === "stat" ? "transparent" : C.line }}>통계</button>
        </div>
      </div>

      {!canEdit && <div style={{ fontSize: 11, color: C.dim2, marginBottom: 10 }}>보기 전용입니다. 편집은 관장·지관장·수석사범만 가능합니다.</div>}

      {view === "cal" ? (
        <>
          <MonthCalendar monthBase={base} setMonthBase={setBase} classes={data.classes} opt={{ holidays: data.holidays }} selected={sel} onSelect={setSel} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, margin: "14px 0 10px" }}>{sel.slice(5).replace("-", "월 ")}일 ({DAYS[dowOf(sel)]}) 수업별 사범 배정</div>
          {dayClasses.length === 0 ? <Empty>이 날은 개설된 수업이 없습니다. (수업 탭에서 개설)</Empty> : dayClasses.map((c) => {
            const slots = slotsOf(c.id);
            return (
              <div key={c.id} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
                  <span style={{ fontWeight: 700 }}>{c.label}</span>
                  {(c.targets || []).map((t) => <span key={t} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(t), borderRadius: 5, padding: "2px 6px" }}>{t}</span>)}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim2 }}>{c.time}</span>
                </div>
                {slots.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <select disabled={!canEdit} value={s.role} onChange={(e) => setRole(c.id, idx, e.target.value)} style={{ ...inp, width: 78, padding: "8px 8px", fontSize: 12, opacity: canEdit ? 1 : 0.6 }}>
                      {ROLE_OPTS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                    <select disabled={!canEdit} value={s.name} onChange={(e) => setAssign(c.id, idx, e.target.value)} style={{ ...inp, flex: 1, padding: "8px 10px", fontSize: 13, opacity: canEdit ? 1 : 0.6 }}>
                      <option value="">— 미배정 —</option>
                      {coaches.map((cc) => <option key={cc}>{cc}</option>)}
                    </select>
                    {canEdit && slots.length > 1 && <button onClick={() => removeSlot(c.id, idx)} style={{ background: "transparent", border: "none", color: "#e58282", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>}
                  </div>
                ))}
                {canEdit && <button onClick={() => addSlot(c.id)} style={{ ...pill, padding: "6px 12px", fontSize: 12, color: C.gold, borderColor: "#5a4a22", marginTop: 2 }}>＋ 사범 칸 추가</button>}
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button onClick={() => setStatUnit("month")} style={{ ...pill, padding: "7px 14px", background: statUnit === "month" ? C.goldGrad : "transparent", color: statUnit === "month" ? "#1a1305" : C.dim, borderColor: statUnit === "month" ? "transparent" : C.line }}>월별</button>
            <button onClick={() => setStatUnit("year")} style={{ ...pill, padding: "7px 14px", background: statUnit === "year" ? C.goldGrad : "transparent", color: statUnit === "year" ? "#1a1305" : C.dim, borderColor: statUnit === "year" ? "transparent" : C.line }}>연별</button>
            <span style={{ marginLeft: "auto", fontSize: 13, color: C.gold, fontWeight: 700, alignSelf: "center" }}>{statUnit === "month" ? `${base.slice(0, 4)}년 ${Number(base.slice(5, 7))}월` : `${base.slice(0, 4)}년`}</span>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "10px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.dim2, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>지도진</span><span style={{ width: 44, textAlign: "center" }}>메인</span><span style={{ width: 44, textAlign: "center" }}>보조</span><span style={{ width: 44, textAlign: "center" }}>교육</span><span style={{ width: 44, textAlign: "center", color: C.gold }}>합계</span>
            </div>
            {statRows.length === 0 ? <Empty>해당 기간 배정 기록이 없습니다.</Empty> : statRows.map(([nm, s]) => (
              <div key={nm} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                <span style={{ flex: 1, fontWeight: 700 }}>{nm}</span>
                <span style={{ width: 44, textAlign: "center", color: C.dim }}>{s.메인}</span>
                <span style={{ width: 44, textAlign: "center", color: C.dim }}>{s.보조}</span>
                <span style={{ width: 44, textAlign: "center", color: C.dim }}>{s.교육}</span>
                <span style={{ width: 44, textAlign: "center", fontWeight: 800, color: C.gold, fontFamily: DISP }}>{s.합계}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 회원 개별 상품권 (발급/사용완료/회수) ──
function MemberVoucherModal({ data, persist, member, onClose }) {
  const templates = data.voucherTemplates || [];
  const [tab, setTab] = useState("list"); // list | issue
  const [tplId, setTplId] = useState(templates[0]?.id || 0);
  const [custom, setCustom] = useState({ name: "", desc: "", days: 30 });
  const [useCustom, setUseCustom] = useState(templates.length === 0);
  const vouchers = member.vouchers || [];

  const upd = (members) => persist({ ...data, members });
  const issue = () => {
    const tpl = templates.find((t) => t.id === Number(tplId));
    const name = useCustom ? custom.name.trim() : tpl?.name;
    if (!name) return alert("상품권을 선택하거나 명칭을 입력해 주세요.");
    const desc = useCustom ? custom.desc : tpl?.desc || "";
    const days = useCustom ? custom.days : tpl?.days;
    const v = { id: Date.now(), name, desc, expiry: expiryFromDays(days), issuedAt: todayStr(), usedAt: null };
    upd(data.members.map((m) => m.id === member.id ? { ...m, vouchers: [...(m.vouchers || []), v] } : m));
    setTab("list");
  };
  const markUsed = (vid) => upd(data.members.map((m) => m.id === member.id ? { ...m, vouchers: m.vouchers.map((v) => v.id === vid ? { ...v, usedAt: todayStr() } : v) } : m));
  const revoke = (vid) => { if (confirm("이 상품권을 회수(삭제)할까요?")) upd(data.members.map((m) => m.id === member.id ? { ...m, vouchers: m.vouchers.filter((v) => v.id !== vid) } : m)); };

  return (
    <Modal title={`${member.name} · 상품권`} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["list", `보유 ${vouchers.length}`], ["issue", "발급"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${tab === k ? "transparent" : C.line}`, background: tab === k ? C.goldGrad : "transparent", color: tab === k ? "#1a1305" : C.dim, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {tab === "list" ? (
        vouchers.length === 0 ? <Empty>발급된 상품권이 없습니다.</Empty> : vouchers.slice().reverse().map((v) => {
          const st = voucherState(v);
          return (
            <div key={v.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Ticket size={15} color={C.gold} />
                <span style={{ fontWeight: 700 }}>{v.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#0b0b0e", background: voucherColor(st), borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>{st}</span>
              </div>
              {v.desc && <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>{v.desc}</div>}
              <div style={{ fontSize: 11, color: C.dim2, marginTop: 6, fontFamily: DISP }}>발급 {v.issuedAt}{v.expiry ? ` · 유효 ~${v.expiry}` : " · 무기한"}{v.usedAt ? ` · 사용 ${v.usedAt}` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {st === "사용가능" && <button onClick={() => markUsed(v.id)} style={{ ...pill, flex: 1, justifyContent: "center", padding: "8px 0", background: "#2e7d52", color: "#fff", border: "none", fontWeight: 700 }}>사용완료 처리</button>}
                <button onClick={() => revoke(v.id)} style={{ ...pill, padding: "8px 14px", color: C.dim, borderColor: C.line }}>회수</button>
              </div>
            </div>
          );
        })
      ) : (
        <>
          {templates.length > 0 && (
            <Field label="상품권 종류">
              <select style={{ ...inp, opacity: useCustom ? 0.4 : 1 }} value={tplId} disabled={useCustom} onChange={(e) => setTplId(e.target.value)}>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, color: C.text, cursor: "pointer" }}>
                <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold }} /> 종류 없이 직접 입력
              </label>
            </Field>
          )}
          {useCustom && (
            <>
              <Field label="명칭"><input style={inp} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="예: 6월 행사 할인권" /></Field>
              <Field label="내용·사용방법"><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={custom.desc} onChange={(e) => setCustom({ ...custom, desc: e.target.value })} /></Field>
              <Field label="유효기간 (일)"><input style={inp} type="number" value={custom.days} onChange={(e) => setCustom({ ...custom, days: e.target.value })} placeholder="비우면 무기한" /></Field>
            </>
          )}
          <button onClick={issue} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8 }}><Ticket size={16} /> 발급</button>
        </>
      )}
    </Modal>
  );
}

// ── 정규수업 설정 (시간표 격자 + 편집) ──
function TimetableGrid({ data, persist, onClose }) {
  const [edit, setEdit] = useState(null);
  const lessons = data.classes.filter((c) => (c.kind || "수업") === "수업" && c.type === "weekly" && !(c.targets || []).some(isTeam));
  const times = [...new Set(lessons.map((c) => c.time))].sort();
  const cell = (time, day) => lessons.filter((c) => c.time === time && c.day === day);
  const save = (c) => {
    let next;
    if (c.id) next = { ...data, classes: data.classes.map((x) => x.id === c.id ? c : x) };
    else next = { ...data, classes: [...data.classes, { ...c, id: Math.max(0, ...data.classes.map((x) => x.id)) + 1 }] };
    persist(next); setEdit(null);
  };
  const remove = (id) => { if (confirm("이 수업을 삭제할까요?")) { persist({ ...data, classes: data.classes.filter((x) => x.id !== id) }); setEdit(null); } };
  const addAt = (day, time) => setEdit({ kind: "수업", type: "weekly", day, time, targets: ["오후"], label: "", desc: "" });

  return (
    <div>
      <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}><ChevronLeft size={16} /> 수업으로</button>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>정규수업 시간표</span>
        <button onClick={() => addAt(1, "19:00")} style={{ ...btnGold, marginLeft: "auto", padding: "8px 13px" }}><Plus size={15} /> 수업 추가</button>
      </div>
      <div style={{ fontSize: 12, color: C.dim2, marginBottom: 14 }}>칸을 누르면 그 요일·시간에 수업을 추가하고, 수업을 누르면 수정·삭제합니다. (좌우로 밀어서 전체 요일)</div>
      <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, background: C.card }}>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(6, 1fr)", gap: 3 }}>
            <div style={{ fontSize: 10, color: C.dim2, textAlign: "center", padding: "7px 0" }}>시간</div>
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, textAlign: "center", padding: "7px 0", color: i === 6 ? "#6a8fd0" : C.gold }}>{DAYS[i]}</div>)}
            {times.length === 0 && <div style={{ gridColumn: "1 / -1", textAlign: "center", color: C.dim, padding: "24px 0", fontSize: 13 }}>등록된 정규 수업이 없습니다. '수업 추가'를 눌러 시작하세요.</div>}
            {times.map((t) => (
              <React.Fragment key={t}>
                <div style={{ fontSize: 9, color: C.dim2, textAlign: "center", padding: "12px 0", fontFamily: DISP }}>{t}</div>
                {[1, 2, 3, 4, 5, 6].map((di) => {
                  const cs = cell(t, di);
                  return (
                    <div key={di} onClick={() => cs.length === 0 && addAt(di, t)} style={{ minHeight: 38, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center", cursor: cs.length === 0 ? "pointer" : "default", borderRadius: 5, background: cs.length === 0 ? "transparent" : undefined }}>
                      {cs.length === 0
                        ? <div style={{ height: "100%", minHeight: 30, border: `1px dashed ${C.line}`, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#3a3a42", fontSize: 14 }}>+</div>
                        : cs.map((c) => {
                          const col = mainColor(c.targets);
                          return <div key={c.id} onClick={(e) => { e.stopPropagation(); setEdit(c); }} style={{ background: `${col}28`, border: `1px solid ${col}66`, borderRadius: 5, fontSize: 9, color: "#fff", textAlign: "center", padding: "5px 2px", lineHeight: 1.25, cursor: "pointer" }}>{c.label}<div style={{ fontSize: 8, color: "#cfcfd6", marginTop: 1 }}>{(c.targets || [])[0]}</div></div>;
                        })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      {edit && <ClassForm cls={edit} names={LESSON_NAMES} onSave={save} onDelete={edit.id ? () => remove(edit.id) : null} onClose={() => setEdit(null)} />}
    </div>
  );
}

// ── 팀 수업 설정 (훈련 요일) 모달 ──
function TeamDaysModal({ data, persist, onClose }) {
  const td = data.teamDays || DEFAULT_TEAM_DAYS;
  const setDay = (team, dow) => persist({ ...data, teamDays: { ...td, [team]: Number(dow) } });
  return (
    <Modal title="팀 수업 설정" onClose={onClose}>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 16, lineHeight: 1.6 }}>전문팀 훈련 요일을 설정합니다. 팀 수강권의 만료일은 <b style={{ color: C.gold }}>매월 마지막 훈련 요일</b>로 자동 계산됩니다.</div>
      {TEAMS.map((t) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: tColor(t), borderRadius: 5, padding: "3px 8px" }}>{t}</span>
          <select style={{ ...inp, marginLeft: "auto", width: 120 }} value={td[t]} onChange={(e) => setDay(t, e.target.value)}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
          </select>
        </div>
      ))}
      <div style={{ fontSize: 11, color: C.dim2, marginTop: 14, lineHeight: 1.6 }}>예: 시범단을 금요일로 두면 6월 만료일은 마지막 금요일(6/26)이 됩니다.</div>
      <button onClick={onClose} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 16 }}><Check size={16} /> 완료</button>
    </Modal>
  );
}

// ── 상품권 관리 (템플릿 + 단체 발급) ──
function VouchersAdmin({ data, persist }) {
  const [tEdit, setTEdit] = useState(null);   // 템플릿 편집
  const [issue, setIssue] = useState(null);   // 발급 모달 {tpl}
  const templates = data.voucherTemplates || [];

  const saveTpl = (t) => {
    let next;
    if (t.id) next = { ...data, voucherTemplates: templates.map((x) => x.id === t.id ? t : x) };
    else next = { ...data, voucherTemplates: [...templates, { ...t, id: Math.max(0, ...templates.map((x) => x.id)) + 1 }] };
    persist(next); setTEdit(null);
  };
  const removeTpl = (id) => { if (confirm("이 상품권 종류를 삭제할까요? (이미 발급된 상품권은 그대로 유지됩니다)")) persist({ ...data, voucherTemplates: templates.filter((x) => x.id !== id) }); };

  // 단체 발급
  const doIssue = (tpl, memberIds, custom) => {
    const name = custom?.name || tpl?.name;
    const desc = custom?.desc || tpl?.desc || "";
    const days = custom ? custom.days : tpl?.days;
    const expiry = expiryFromDays(days);
    const stamp = Date.now();
    const next = {
      ...data, members: data.members.map((m) => memberIds.includes(m.id)
        ? { ...m, vouchers: [...(m.vouchers || []), { id: stamp + m.id, name, desc, expiry, issuedAt: todayStr(), usedAt: null }] }
        : m)
    };
    persist(next); setIssue(null);
    alert(`${memberIds.length}명에게 '${name}' 상품권을 발급했습니다.`);
  };

  // 전체 발급 현황
  const allIssued = [];
  data.members.forEach((m) => (m.vouchers || []).forEach((v) => allIssued.push({ m, v })));
  allIssued.sort((a, b) => (b.v.issuedAt || "").localeCompare(a.v.issuedAt || ""));

  return (
    <div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>상품권·할인권 종류를 만들어 두고 회원에게 발급합니다. 회원 명단의 각 회원에서 개별 발급도 가능합니다.</div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>상품권 종류</span>
        <button onClick={() => setTEdit({ name: "", desc: "", days: 30 })} style={{ ...btnGold, marginLeft: "auto", padding: "8px 13px" }}><Plus size={15} /> 종류 추가</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
        {templates.length === 0 ? <Empty>상품권 종류가 없습니다.</Empty> : templates.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#181206", border: `1px solid ${C.gold}`, color: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}><Ticket size={17} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{t.desc || "—"} · 유효 {t.days ? `${t.days}일` : "무기한"}</div>
            </div>
            <button onClick={() => setIssue({ tpl: t })} style={{ ...pill, padding: "7px 12px", background: C.goldGrad, color: "#1a1305", border: "none", fontWeight: 700 }}>발급</button>
            <button onClick={() => setTEdit(t)} style={iconBtn}><Pencil size={15} /></button>
            <button onClick={() => removeTpl(t.id)} style={iconBtn}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      <button onClick={() => setIssue({ tpl: null })} style={{ ...btnGold, width: "100%", justifyContent: "center", marginBottom: 24 }}><Ticket size={16} /> 직접 입력해 발급 (종류 없이)</button>

      <span style={{ fontSize: 14, fontWeight: 800 }}>발급 현황 · {allIssued.length}건</span>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
        {allIssued.length === 0 ? <Empty>발급된 상품권이 없습니다.</Empty> : allIssued.map(({ m, v }) => {
          const st = voucherState(v);
          return (
            <div key={`${m.id}-${v.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontWeight: 700 }}>{v.name}</span>
                  <span style={{ fontSize: 10, color: "#0b0b0e", background: voucherColor(st), borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{st}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim2, marginTop: 3, fontFamily: DISP }}>{m.name} {m.no} · 발급 {v.issuedAt}{v.expiry ? ` · ~${v.expiry}` : ""}</div>
              </div>
              {st === "사용가능"
                ? <button onClick={() => { if (confirm(`${m.name} 회원의 '${v.name}'을 사용완료 처리할까요?`)) persist({ ...data, members: data.members.map((x) => x.id === m.id ? { ...x, vouchers: x.vouchers.map((vv) => vv.id === v.id ? { ...vv, usedAt: todayStr() } : vv) } : x) }); }} style={{ ...pill, padding: "7px 12px", background: "#2e7d52", color: "#fff", border: "none", fontWeight: 700 }}>사용완료</button>
                : <button onClick={() => { if (confirm("이 상품권 발급을 취소(회수)할까요?")) persist({ ...data, members: data.members.map((x) => x.id === m.id ? { ...x, vouchers: x.vouchers.filter((vv) => vv.id !== v.id) } : x) }); }} style={iconBtn}><Trash2 size={15} /></button>}
            </div>
          );
        })}
      </div>

      {tEdit && (
        <Modal title={tEdit.id ? "상품권 종류 수정" : "상품권 종류 추가"} onClose={() => setTEdit(null)}>
          <Field label="명칭"><input style={inp} value={tEdit.name} onChange={(e) => setTEdit({ ...tEdit, name: e.target.value })} placeholder="예: 수련비 1만원 할인권" /></Field>
          <Field label="내용·사용방법"><textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={tEdit.desc} onChange={(e) => setTEdit({ ...tEdit, desc: e.target.value })} placeholder="예: 다음 달 수련비에서 1만원 할인" /></Field>
          <Field label="유효기간 (일)"><input style={inp} type="number" value={tEdit.days} onChange={(e) => setTEdit({ ...tEdit, days: e.target.value })} placeholder="비우면 무기한" /><div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>발급일로부터 며칠간 유효한지. 비우면 무기한.</div></Field>
          <button disabled={!tEdit.name.trim()} onClick={() => saveTpl({ ...tEdit, days: tEdit.days ? Number(tEdit.days) : 0 })} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: tEdit.name.trim() ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
      {issue && <VoucherIssueModal data={data} tpl={issue.tpl} onIssue={doIssue} onClose={() => setIssue(null)} />}
    </div>
  );
}

// ── 상품권 발급 모달 (여러 명 선택) ──
function VoucherIssueModal({ data, tpl, onIssue, onClose }) {
  const [sel, setSel] = useState([]);
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(tpl ? null : { name: "", desc: "", days: 30 });
  const list = data.members.filter((m) => m.name.includes(q) || m.no.includes(q)).sort((a, b) => a.no.localeCompare(b.no));
  const toggle = (id) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const ok = sel.length > 0 && (tpl || (custom && custom.name.trim()));
  return (
    <Modal title={tpl ? `'${tpl.name}' 발급` : "상품권 직접 발급"} onClose={onClose}>
      {!tpl && custom && (
        <>
          <Field label="명칭"><input style={inp} value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="예: 6월 행사 특별 할인권" /></Field>
          <Field label="내용·사용방법"><textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} value={custom.desc} onChange={(e) => setCustom({ ...custom, desc: e.target.value })} /></Field>
          <Field label="유효기간 (일)"><input style={inp} type="number" value={custom.days} onChange={(e) => setCustom({ ...custom, days: e.target.value })} placeholder="비우면 무기한" /></Field>
        </>
      )}
      <Field label={`받을 회원 선택 · ${sel.length}명`}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "0 12px", marginBottom: 10 }}>
          <Search size={15} color={C.dim} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·회원번호" style={{ flex: 1, background: "transparent", border: "none", color: C.text, padding: "10px 0", outline: "none", fontSize: 14, fontFamily: FONT }} />
        </div>
        <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10 }}>
          {list.map((m) => {
            const on = sel.includes(m.id);
            return (
              <button key={m.id} onClick={() => toggle(m.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 13px", background: on ? "#181206" : "transparent", border: "none", borderBottom: `1px solid ${C.line}`, cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `1px solid ${on ? C.gold : C.line}`, background: on ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={13} color="#1a1305" />}</div>
                <span style={{ fontWeight: 700, color: C.text }}>{m.instructor && <span style={{ color: C.gold }}>★</span>}{m.name}</span>
                <span style={{ fontSize: 11, color: C.dim2, fontFamily: DISP }}>{m.no}</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: C.dim, border: `1px solid ${C.line}`, borderRadius: 4, padding: "1px 5px" }}>{m.status}</span>
              </button>
            );
          })}
        </div>
      </Field>
      <button disabled={!ok} onClick={() => onIssue(tpl, sel, custom)} style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: ok ? 1 : 0.4 }}><Ticket size={16} /> {sel.length}명에게 발급</button>
    </Modal>
  );
}

// ── 관리자 계정 (관장·임원 전용) ──
function AdminAccounts({ data, persist, me }) {
  const [edit, setEdit] = useState(null);
  const isProtected = (a) => a.id === 1; // 최고관리자(맨 처음 관장 계정) 보호
  const save = (a) => {
    if (data.admins.some((x) => x.loginId === a.loginId.trim() && x.id !== a.id)) { alert("이미 사용 중인 아이디입니다."); return; }
    const fixed = isProtected(a) ? { ...a, role: "director", status: "활동중" } : a;
    let next;
    if (a.id) next = { ...data, admins: data.admins.map((x) => x.id === a.id ? fixed : x) };
    else next = { ...data, admins: [...data.admins, { ...a, id: Math.max(0, ...data.admins.map((x) => x.id)) + 1, role: a.role || "staff", status: a.status || "활동중" }] };
    persist(next); setEdit(null);
  };
  const remove = (a) => {
    if (isProtected(a)) return alert("최고관리자 계정은 삭제할 수 없습니다.");
    if (confirm(`${a.name} 계정을 삭제할까요?`)) persist({ ...data, admins: data.admins.filter((x) => x.id !== a.id) });
  };
  const sbadge = (s) => ({ 활동중: C.gold, 휴식중: "#8a8a92", 정지: "#c89042", 탈퇴: "#56565e" }[s] || C.dim);
  return (
    <div>
      <div style={{ fontSize: 12, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>관리자 계정을 만들고 등급(관장·임원 / 사범)과 상태를 지정합니다. <b style={{ color: C.gold }}>관장·임원</b>만 이 관리자 탭을 볼 수 있고, <b>사범</b>은 볼 수 없습니다. 정지·탈퇴 상태는 로그인할 수 없습니다.</div>
      <button onClick={() => setEdit({ name: "", loginId: "", pw: "", role: "regular", status: "활동중" })} style={{ ...btnGold, marginBottom: 16 }}><Plus size={16} /> 관리자 계정 추가</button>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, overflow: "hidden" }}>
        {data.admins.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: can(a.role, "accounts") ? C.goldGrad : C.card2, color: can(a.role, "accounts") ? "#1a1305" : C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {can(a.role, "accounts") ? <Shield size={18} /> : <User size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                {a.name}
                <span style={{ fontSize: 10, color: can(a.role, "accounts") ? C.gold : C.dim, border: `1px solid ${can(a.role, "accounts") ? C.gold : C.line}`, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{roleLabel(a.role)}</span>
                <span style={{ fontSize: 10, color: "#0b0b0e", background: sbadge(a.status), borderRadius: 5, padding: "2px 6px", fontWeight: 700 }}>{a.status}</span>
                {isProtected(a) && <span style={{ fontSize: 10, color: C.gold }}>최고관리자</span>}
              </div>
              <div style={{ fontSize: 12, color: C.dim, fontFamily: DISP, marginTop: 3 }}>ID {a.loginId} · PW {a.pw}{a.memberNo ? ` · 회원 ${a.memberNo}` : ""}</div>
            </div>
            <button onClick={() => setEdit(a)} style={iconBtn}><Pencil size={15} /></button>
            {!isProtected(a) && <button onClick={() => remove(a)} style={iconBtn}><Trash2 size={15} /></button>}
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={isProtected(edit) ? "최고관리자 정보 수정" : edit.id ? "관리자 계정 수정" : "관리자 계정 추가"} onClose={() => setEdit(null)}>
          <Field label="이름"><input style={inp} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="예: 이은지 사범" /></Field>
          <Field label="아이디"><input style={inp} value={edit.loginId} onChange={(e) => setEdit({ ...edit, loginId: e.target.value })} placeholder="영문 아이디" /></Field>
          <Field label="비밀번호"><input style={inp} value={edit.pw} onChange={(e) => setEdit({ ...edit, pw: e.target.value })} placeholder="비밀번호" /></Field>
          <Field label="등급">
            <select style={{ ...inp, opacity: isProtected(edit) ? 0.5 : 1 }} value={edit.role || "regular"} disabled={isProtected(edit)} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
              {ADMIN_ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div style={{ fontSize: 11, color: C.dim2, marginTop: 6, lineHeight: 1.6 }}>
              · 관장·지관장: 모든 편집 + 관리자 계정 관리<br />
              · 수석사범: 회원·수업·공지·스케줄 편집 (계정 관리 제외)<br />
              · 정사범: 수업 편집만<br />
              · 총무: 수업·공지 편집<br />
              · 보조사범·교범: 보기만 (편집 불가)
            </div>
          </Field>
          <Field label="상태">
            <select style={{ ...inp, opacity: isProtected(edit) ? 0.5 : 1 }} value={edit.status || "활동중"} disabled={isProtected(edit)} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
              {ADMIN_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>활동중·휴식중은 사용 가능 / 정지·탈퇴는 로그인 불가{isProtected(edit) ? " · 최고관리자는 항상 활동중" : ""}</div>
          </Field>
          <Field label="연결 회원번호 (선택)">
            <input style={{ ...inp, fontFamily: DISP }} value={edit.memberNo || ""} onChange={(e) => setEdit({ ...edit, memberNo: e.target.value })} placeholder="뒷번호만 입력 (예: 002)" />
            {(() => {
              const r = findMemberByNo(data.members, edit.memberNo);
              if (!edit.memberNo) return <div style={{ fontSize: 11, color: C.dim2, marginTop: 5 }}>이 관리자가 회원이기도 하면 본인 회원번호를 적어 주세요. <b>뒷번호만(예: 002)</b> 입력해도 자동 연결됩니다.</div>;
              if (!r.member) return <div style={{ fontSize: 11, color: "#e58282", marginTop: 5 }}>해당 번호의 회원을 찾을 수 없습니다.</div>;
              if (r.count > 1) return <div style={{ fontSize: 11, color: "#e0a86a", marginTop: 5 }}>같은 뒷번호 회원이 {r.count}명입니다. 전체 번호(예: 26-002)로 입력해 주세요.</div>;
              return <div style={{ fontSize: 11, color: "#7fd6a0", marginTop: 5 }}>연결됨 · {r.member.no} {r.member.name}</div>;
            })()}
          </Field>
          <button disabled={!edit.name.trim() || !edit.loginId.trim() || !edit.pw.trim()} onClick={() => save(edit)}
            style={{ ...btnGold, width: "100%", justifyContent: "center", marginTop: 8, opacity: edit.name.trim() && edit.loginId.trim() && edit.pw.trim() ? 1 : 0.4 }}><Check size={16} /> 저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════ 수련자 ═══════════
function Member({ data, persist, me, onLogout, asAdmin }) {
  const [tab, setTab] = useState("home");
  const [lang, setLang] = useState("ko");
  const [zoomImg, setZoomImg] = useState(false);
  const t = (k) => (LANG[lang] || LANG.ko)[k];
  const isOut = me.status === "탈퇴", isPaused = me.status === "정지중" || me.status === "휴식중";
  const tabs = isOut ? [["home", t("home"), User]]
    : isPaused ? [["home", t("home"), User], ["mine", t("mine"), BookOpen]]
    : [["home", t("home"), User], ["reserve", t("classes"), CalendarCheck], ["events", t("events"), Trophy], ["videos", t("videos"), Video], ["mine", t("mine"), BookOpen]];
  const total = trainTotal(data, me.id), month = trainMonth(data, me.id);
  const star = me.instructor ? "★ " : "";
  const langBtn = (
    <button onClick={() => setLang(lang === "ko" ? "en" : "ko")} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 8, color: C.gold, fontSize: 12, fontWeight: 700, padding: "0 11px", height: 38, cursor: "pointer", whiteSpace: "nowrap" }}>🌐 {lang === "ko" ? "EN" : "한"}</button>
  );

  return (
    <>
      {asAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#241f12", border: `1px solid #5a4a22`, borderRadius: 12, padding: "11px 14px", margin: "16px 0 0", fontSize: 13, color: "#dcc89a" }}>
          <Shield size={15} /> 관리자가 보는 수련자 화면입니다 · {star}{me.name}
        </div>
      )}
      <TopBar role={asAdmin ? t("instructor") : t("member")} name={`${star}${me.name} · ${me.no}`} onLogout={onLogout} logoutLabel={asAdmin ? t("toAdmin") : t("logout")} extra={langBtn} />
      {tab !== "home" && <button onClick={() => setTab("home")} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.dim, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0, marginTop: 12 }}><ChevronLeft size={16} /> {t("home")}</button>}
      {tab !== "home" && <TabBar tabs={tabs} tab={tab} setTab={setTab} />}
      <NoticeMarquee notices={data.notices} />
      {tab === "home" && (
        <div>
          {!isOut && (
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, marginBottom: 16,
              backgroundImage: "radial-gradient(500px circle at 100% 0%, rgba(216,180,90,0.10), transparent 60%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.dim, marginBottom: 10 }}><Flame size={15} color={C.gold} /> {t("myRecord")}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: 46, fontWeight: 700, lineHeight: 1, background: C.goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{total}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{t("totalTrain")}</div>
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: 30, fontWeight: 600, lineHeight: 1, color: C.text }}>{month}</div>
                  <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{t("thisMonth")}</div>
                </div>
              </div>
            </div>
          )}
          {me.status === "활동중" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9, marginBottom: 16 }}>
              {[["reserve", t("reserveApply"), CalendarCheck], ["events", t("events"), Trophy], ["videos", t("trainVideos"), Video], ["mine", t("mine"), BookOpen]].map(([id, label, Ic]) => (
                <button key={id} onClick={() => setTab(id)} style={{ textAlign: "center", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                  <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={21} color={C.gold} /></div>
                  <div style={{ fontSize: 10, color: "#cfcfd6", marginTop: 5 }}>{label}</div>
                </button>
              ))}
            </div>
          )}
          {isPaused && (
            <div style={{ background: "#241f12", border: "1px solid #5a4a22", borderRadius: 12, padding: "13px 15px", marginBottom: 16, fontSize: 13, color: "#dcc89a", lineHeight: 1.6 }}>
              {me.status === "휴식중" ? t("restMsg") : t("pauseMsg")} {t("inquiry")}: 010-8984-3725
              <button onClick={() => setTab("mine")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", marginTop: 12, padding: "10px 0", background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 10, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><BookOpen size={15} /> {t("viewRecord")}</button>
            </div>
          )}
          {!isOut && (
            <Panel title={t("myInfo")}>
              <InfoRow k={t("memberNo")} v={me.no} mono />
              <InfoRow k={lang === "ko" ? "상태" : "Status"} v={me.status} />
              <InfoRow k={t("enrolled")} v={(me.enrollments || []).join(", ") || (lang === "ko" ? "없음" : "None")} />
            </Panel>
          )}
          <Panel title={t("introTitle")}>
            <p style={{ fontSize: 13.5, color: "#e4e4e8", lineHeight: 1.75, margin: 0 }}>{t("intro")}</p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
              {t("feat").map((ft) => (
                <div key={ft} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#dadae0" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold, flexShrink: 0 }} />{ft}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={t("timetableTitle")}>
            <img src={lang === "en" ? "/timetable-en.png" : "/timetable.png"} alt="Gaon Taekwondo schedule" onClick={() => setZoomImg(true)} style={{ width: "100%", borderRadius: 10, display: "block", cursor: "zoom-in" }} />
            <div style={{ textAlign: "center", fontSize: 11, color: C.dim2, marginTop: 7 }}>{lang === "en" ? "Tap to enlarge" : "이미지를 누르면 크게 볼 수 있어요"}</div>
          </Panel>
          <Panel title={t("contactTitle")}>
            <InfoRow k={t("c_phone")} v="010-8984-3725" />
            <InfoRow k={t("c_addr")} v={t("c_addrV")} />
            <InfoRow k="Instagram" v="@gaon_tkd" />
            <InfoRow k={lang === "ko" ? "네이버카페" : "Naver Cafe"} v="cafe.naver.com/gaontkd" />
            <InfoRow k={lang === "ko" ? "카카오톡" : "KakaoTalk"} v="gaon-tkd" />
          </Panel>
          <Panel title={t("noticeTitle")}>
            {data.notices.length === 0 ? <Empty>{t("noNotice")}</Empty> : data.notices.map((n) => (
              <div key={n.id} style={{ padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontWeight: 700 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: C.dim2, margin: "3px 0 6px", fontFamily: DISP }}>{n.date}</div>
                <div style={{ fontSize: 13, color: "#dadae0", lineHeight: 1.6 }}>{n.body}</div>
                {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 9, fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: "none", border: `1px solid #5a4a22`, borderRadius: 8, padding: "6px 12px" }}>{t("detail")} →</a>}
              </div>
            ))}
          </Panel>
          {isOut && <p style={{ textAlign: "center", fontSize: 12, color: C.dim2, marginTop: 20 }}>{t("outMsg")}</p>}
        </div>
      )}
      {tab === "reserve" && !isOut && <ReserveMember data={data} persist={persist} me={me} locked={isPaused} kind="수업" lang={lang} />}
      {tab === "events" && !isOut && <ReserveMember data={data} persist={persist} me={me} locked={isPaused} kind="행사" lang={lang} />}
      {tab === "videos" && !isOut && <VideosView data={data} persist={persist} admin={false} lang={lang} />}
      {tab === "mine" && <MineRecord data={data} me={me} lang={lang} />}
      {zoomImg && (
        <div onClick={() => setZoomImg(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={() => setZoomImg(false)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${C.gold}`, borderRadius: 8, color: C.gold, fontSize: 13, fontWeight: 700, padding: "7px 13px", cursor: "pointer" }}><X size={15} /> {lang === "en" ? "Close" : "닫기"}</button>
          </div>
          <div style={{ flex: 1, width: "100%", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={lang === "en" ? "/timetable-en.png" : "/timetable.png"} alt="schedule" style={{ minWidth: 720, width: "180%", maxWidth: "none", height: "auto", borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 11, color: C.dim2, marginTop: 8 }}>{lang === "en" ? "Scroll to see all · tap outside to close" : "좌우로 밀어서 전체 보기 · 바깥을 누르면 닫힘"}</div>
        </div>
      )}
    </>
  );
}

function ReserveMember({ data, persist, me, locked, kind, lang = "ko" }) {
  const t = (k) => (LANG[lang] || LANG.ko)[k];
  const DW = lang === "en" ? DAYS_EN : DAYS;
  const [base, setBase] = useState(new Date().toISOString().slice(0, 10));
  const [monthBase, setMonthBase] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState(kind === "행사" ? null : todayStr());
  const [applyFor, setApplyFor] = useState(null);
  const week = weekDates(base);
  const isEv = kind === "행사";
  const today = todayStr();
  const items = isEv
    ? data.classes.filter((c) => c.kind === "행사" && (c.type !== "once" || c.date >= today))
        .map((c) => ({ c, date: c.type === "once" ? c.date : classDateInWeek(c, week) })).filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date))
    : data.classes.filter((c) => canReserve(me, c) && (c.kind || "수업") === kind)
        .map((c) => ({ c, date: classDateInWeek(c, week) })).filter((x) => x.date && !(x.c.type !== "once" && isClosed(data.holidays, x.date, x.c.id))).sort((a, b) => a.date.localeCompare(b.date));
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
  const renderCard = (c, date) => {
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
            <span style={{ fontWeight: 700 }}>{trName(c.label, lang)}</span>
            {(c.targets || []).map((tg) => <span key={tg} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: tColor(tg), borderRadius: 5, padding: "2px 6px" }}>{trTarget(tg, lang)}</span>)}
            {isApply && <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 5, padding: "1px 6px" }}>{t("applyForm")}</span>}
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{lang === "en" ? `${DW[dow]} ${c.time} · ${arr.length} ${isApply ? t("applyWord") : t("reserveWord")}` : `${DAYS[dow]}요일 ${c.time} · 현재 ${arr.length}명 ${isApply ? "신청" : "예약"}`}</div>
          {c.desc && <div style={{ fontSize: 12, color: C.dim2, marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>}
        </div>
        <button onClick={() => { if (locked) return; if (isApply) { on ? cancelApply(c, date) : setApplyFor({ c, date }); } else toggle(date, c.id); }}
          disabled={locked} style={{ ...pill, opacity: locked ? 0.4 : 1, padding: "9px 18px", background: on ? "#2e7d52" : "transparent", color: on ? "#fff" : C.gold, borderColor: on ? "#2e7d52" : "#5a4a22" }}>
          {on ? (isApply ? t("applied") : t("reserved")) : (isApply ? t("apply") : t("reserve"))}
        </button>
      </div>
    );
  };
  const dayItems = selected ? classesOnDate(data.classes, selected, { kind, me, holidays: data.holidays }) : [];
  const dayClosed = selected && isClosed(data.holidays, selected) && kind !== "행사";
  return (
    <div>
      {locked && <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#241f12", border: `1px solid #5a4a22`, borderRadius: 12, padding: "13px 15px", marginBottom: 16, fontSize: 13, color: "#dcc89a" }}><Lock size={16} /> {t("lockedMsg")}</div>}

      <MonthCalendar monthBase={monthBase} setMonthBase={setMonthBase} classes={data.classes} opt={{ kind, me, holidays: data.holidays }} selected={selected} onSelect={setSelected} />
      {dayClosed && <div style={{ background: "#2a1414", border: "1px solid #5a2222", borderRadius: 12, padding: "12px 15px", margin: "14px 0 0", fontSize: 13, color: "#e0a0a0", fontWeight: 700 }}>🚫 {data.holidays[selected].reason || t("closedDay")} · {t("holidayMsg")}{dayItems.length > 0 ? t("holidayMore") : ""}</div>}

      {selected && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginBottom: 10 }}>{lang === "en" ? `${DW[dowOf(selected)]} ${selected.slice(5).replace("-", "/")} · ${kind === "행사" ? t("evWord") : t("classWord")}` : `${selected.slice(5).replace("-", "월 ")}일 (${DAYS[dowOf(selected)]}) ${kind === "행사" ? "이벤트" : "수업"}`}</div>
          {dayItems.length === 0 ? <Empty>{kind === "행사" ? t("noEvDay") : t("noClassDay2")}</Empty> : dayItems.map((c) => renderCard(c, selected))}
        </div>
      )}

      {isEv && (
        <>
          <div style={{ height: 1, background: C.line, margin: "18px 0 16px" }} />
          <div style={{ fontSize: 12, color: C.dim2, marginBottom: 12 }}>{t("upcomingEv")}</div>
          {items.length === 0 ? <Empty>{t("noUpcomingEv")}</Empty> : items.map(({ c, date }) => renderCard(c, date))}
        </>
      )}
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

function MineRecord({ data, me, lang = "ko" }) {
  const t = (k) => (LANG[lang] || LANG.ko)[k];
  const total = trainTotal(data, me.id), month = trainMonth(data, me.id);
  const rows = [];
  Object.entries(data.reservations).forEach(([date, byClass]) => Object.entries(byClass).forEach(([cid, ids]) => {
    if (ids.includes(me.id)) { const c = data.classes.find((x) => x.id === Number(cid)); if (c) rows.push({ date, c, att: data.attendance[date]?.[me.id] }); }
  }));
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div>
      <Grid3>
        <Stat label={t("recTotal")} value={total} unit={t("cnt")} accent />
        <Stat label={t("thisMonth")} value={month} unit={t("cnt")} />
        <Stat label={t("career")} value={(me.history || []).length} unit={t("cntItem")} />
      </Grid3>

      {(() => {
        const months = recentMonths(6);
        const hasRec = months.some((m) => trainMonth(data, me.id, m) > 0);
        return hasRec ? <MemberTrainRecord data={data} mid={me.id} lang={lang} /> : null;
      })()}

      {(me.enrollments || []).length > 0 && (
        <Panel title={t("myTerm")} sub={t("myTermSub")}>
          {(me.enrollments || []).map((k) => {
            const tm = me.terms?.[k] || {}; const st = termStatus(tm);
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: tColor(k), borderRadius: 5, padding: "3px 8px" }}>{trTarget(k, lang)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.dim }}>{tm.start ? (lang === "en" ? `From ${tm.start}` : `${tm.start} 시작`) : (lang === "en" ? "Start date not set" : "시작일 미설정")}{tm.period ? ` · ${tm.period}` : ""}</div>
                  <div style={{ fontSize: 12, color: C.dim2, marginTop: 2 }}>{tm.expiry ? (lang === "en" ? `Until ${tm.expiry}` : `${tm.expiry}까지`) : (lang === "en" ? "Period not set" : "기간 미설정")}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{st.label}</span>
              </div>
            );
          })}
        </Panel>
      )}

      {(() => {
        const vs = me.vouchers || [];
        if (vs.length === 0) return null;
        const usable = vs.filter((v) => voucherState(v) === "사용가능");
        return (
          <Panel title={t("myVoucher")} sub={usable.length > 0 ? t("voucherUsable")(usable.length) : t("voucherOwned")}>
            {vs.slice().reverse().map((v) => {
              const st = voucherState(v);
              const usable = st === "사용가능";
              return (
                <div key={v.id} style={{ border: `1px solid ${usable ? C.gold : C.line}`, borderRadius: 12, padding: "14px 15px", marginBottom: 10, background: usable ? "#181206" : "transparent", opacity: usable ? 1 : 0.65 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Ticket size={16} color={usable ? C.gold : C.dim} />
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{v.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#0b0b0e", background: voucherColor(st), borderRadius: 5, padding: "2px 7px", fontWeight: 700 }}>{st}</span>
                  </div>
                  {v.desc && <div style={{ fontSize: 13, color: "#dadae0", marginTop: 7, lineHeight: 1.5 }}>{v.desc}</div>}
                  <div style={{ fontSize: 11, color: C.dim2, marginTop: 7, fontFamily: DISP }}>{v.expiry ? (lang === "en" ? `Valid ~${v.expiry}` : `유효기간 ~${v.expiry}`) : t("unlimited")}{v.usedAt ? (lang === "en" ? ` · used ${v.usedAt}` : ` · 사용완료 ${v.usedAt}`) : ""}</div>
                </div>
              );
            })}
          </Panel>
        );
      })()}
      {(me.history || []).length > 0 && (
        <Panel title={t("footprint")} sub={t("footprintSub")}>
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
function TopBar({ role, name, onLogout, logoutLabel, extra }) {
  return (
    <header style={{ display: "flex", alignItems: "center", padding: "26px 0 18px", borderBottom: `1px solid ${C.line}` }}>
      <div>
        <img src="/logo-h.png" alt="가온태권도장" style={{ width: 158, height: "auto", display: "block" }} />
        <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>{role} · {name}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {extra}
        <button onClick={onLogout} style={{ ...iconBtn, width: "auto", padding: "0 13px", gap: 6, fontSize: 13, height: 38 }}><LogOut size={14} /> {logoutLabel || "로그아웃"}</button>
      </div>
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
function MonthCalendar({ monthBase, setMonthBase, classes, opt, selected, onSelect }) {
  const cells = monthMatrix(monthBase);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => setMonthBase(shiftMonth(monthBase, -1))} style={iconBtn}><ChevronLeft size={18} /></button>
        <span style={{ fontWeight: 700, color: C.gold, fontFamily: DISP, fontSize: 15, letterSpacing: 0.5 }}>{monthLabel(monthBase)}</span>
        <button onClick={() => setMonthBase(shiftMonth(monthBase, 1))} style={iconBtn}><ChevronRight size={18} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", fontSize: 10, marginBottom: 6 }}>
        {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => <div key={d} style={{ color: i === 0 ? "#c86a5a" : i === 6 ? "#6a8fd0" : C.dim2 }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
        {cells.map((ds, i) => {
          if (!ds) return <div key={i} />;
          const cs = classesOnDate(classes, ds, opt);
          const sel = ds === selected;
          const dw = dowOf(ds);
          return (
            <button key={i} onClick={() => onSelect(sel ? null : ds)}
              style={{ padding: "5px 0 3px", borderRadius: 9, border: ds === today && !sel ? `1px solid ${C.gold}` : "1px solid transparent", cursor: "pointer",
                background: sel ? C.goldGrad : "transparent", color: sel ? "#1a1305" : (dw === 0 ? "#c86a5a" : dw === 6 ? "#6a8fd0" : C.text),
                fontSize: 12, fontWeight: sel ? 800 : 500, fontFamily: DISP }}>
              {Number(ds.slice(8))}
              <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 2, height: 4 }}>
                {cs.slice(0, 4).map((c, j) => <span key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: sel ? "#1a1305" : mainColor(c.targets) }} />)}
              </div>
            </button>
          );
        })}
      </div>
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
  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
    <span style={{ color: C.dim, flexShrink: 0, whiteSpace: "nowrap" }}>{k}</span>
    <span style={{ fontWeight: 700, fontFamily: mono ? DISP : FONT, letterSpacing: mono ? 1 : 0, textAlign: "right", wordBreak: "break-word", lineHeight: 1.5, minWidth: 0 }}>{v}</span>
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

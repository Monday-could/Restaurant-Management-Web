/**
 * Authentication — demo implementation (localStorage + in-memory constants).
 *
 * ---------------------------------------------------------------------------
 * 接入数据库 / 后端时：请保留此文件的导出函数签名，在函数体内改为 fetch/API
 * 调用，并删除或迁移本地 DEMO_USERS / localStorage 逻辑。
 * ---------------------------------------------------------------------------
 */

export const AUTH_SESSION_KEY = "toms-auth-session-v1";
export const AUTH_CUSTOMERS_KEY = "toms-auth-customers-v1";

/** 内置员工账号（后期改为服务端校验） */
export const DEMO_STAFF_USERNAME = "worker";
export const DEMO_STAFF_PASSWORD = "imworker";

/** 内置老板账号（后期改为服务端校验） */
export const DEMO_OWNER_USERNAME = "boss";
export const DEMO_OWNER_PASSWORD = "imboss";

export function getPersistedSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.username !== "string" || typeof o.role !== "string") return null;
    if (o.role !== "customer" && o.role !== "staff" && o.role !== "owner") return null;
    return { id: o.id, username: o.username, role: o.role };
  } catch {
    return null;
  }
}

export function persistSession(session) {
  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function loadRegisteredCustomers() {
  try {
    const raw = window.localStorage.getItem(AUTH_CUSTOMERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRegisteredCustomers(list) {
  window.localStorage.setItem(AUTH_CUSTOMERS_KEY, JSON.stringify(list));
}

/** 带 code 的错误，供 UI 层用 i18n 翻译（接入后端时可改为 API 错误码） */
export function authError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

/**
 * 登录（后期改为 `POST /api/auth/login` 等）
 * @returns {Promise<{ id: string, username: string, role: 'customer'|'staff'|'owner' }>}
 */
export async function login({ username, password }) {
  await Promise.resolve();
  const u = String(username ?? "").trim();
  const p = String(password ?? "");
  if (!u || !p) throw authError("AUTH_EMPTY");

  if (u === DEMO_STAFF_USERNAME && p === DEMO_STAFF_PASSWORD) {
    const session = { id: "demo-staff", username: u, role: "staff" };
    persistSession(session);
    return session;
  }
  if (u === DEMO_OWNER_USERNAME && p === DEMO_OWNER_PASSWORD) {
    const session = { id: "demo-owner", username: u, role: "owner" };
    persistSession(session);
    return session;
  }

  const reserved = new Set([DEMO_STAFF_USERNAME.toLowerCase(), DEMO_OWNER_USERNAME.toLowerCase()]);
  if (reserved.has(u.toLowerCase())) {
    throw authError("AUTH_RESERVED_LOGIN");
  }

  const customers = loadRegisteredCustomers();
  const found = customers.find((c) => c.username.toLowerCase() === u.toLowerCase());
  if (!found || found.password !== p) {
    throw authError("AUTH_BAD_CREDENTIALS");
  }
  const session = { id: found.id, username: found.username, role: "customer" };
  persistSession(session);
  return session;
}

/**
 * 顾客注册（后期改为 `POST /api/auth/register`）
 * 注意：当前为演示，密码以明文存于 localStorage，生产环境务必改为后端哈希。
 */
export async function registerCustomer({ username, password }) {
  await Promise.resolve();
  const u = String(username ?? "").trim();
  const p = String(password ?? "");
  if (u.length < 3) throw authError("REG_USERNAME_SHORT");
  if (p.length < 4) throw authError("REG_PASSWORD_SHORT");

  const lower = u.toLowerCase();
  const reserved = new Set([DEMO_STAFF_USERNAME.toLowerCase(), DEMO_OWNER_USERNAME.toLowerCase(), "worker", "boss"]);
  if (reserved.has(lower)) {
    throw authError("REG_RESERVED");
  }

  const customers = loadRegisteredCustomers();
  if (customers.some((c) => c.username.toLowerCase() === lower)) {
    throw authError("REG_USERNAME_TAKEN");
  }

  const row = { id: `cust-${Date.now()}`, username: u, password: p };
  saveRegisteredCustomers([...customers, row]);
  const session = { id: row.id, username: row.username, role: "customer" };
  persistSession(session);
  return session;
}

/** 登出（后期改为清除 httpOnly Cookie 或调用 `POST /api/auth/logout`） */
export function logout() {
  persistSession(null);
}

/** 与初次进入站点时的模式栏同步 */
export function initialModeFromSession() {
  const s = getPersistedSession();
  if (s?.role === "staff") return "staff";
  if (s?.role === "owner") return "owner";
  return "customer";
}

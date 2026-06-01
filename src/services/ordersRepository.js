import { getSupabase } from "../lib/supabaseClient.js";
import { MAX_ORDER_QUANTITY, clampInteger } from "../lib/securityLimits.js";

function normalizeOrderQuantity(value) {
  return clampInteger(value, 1, MAX_ORDER_QUANTITY, 1);
}

function assertOrderQuantityTotal(rows) {
  const total = rows.reduce((sum, row) => sum + normalizeOrderQuantity(row.quantity), 0);
  if (total > MAX_ORDER_QUANTITY) {
    const err = new Error(`Order quantity cannot exceed ${MAX_ORDER_QUANTITY}.`);
    err.code = "ORDER_QUANTITY_LIMIT_EXCEEDED";
    throw err;
  }
}

function mapOrderRow(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    price: Number(row.price),
    quantity: normalizeOrderQuantity(row.quantity),
    customerName: row.customer_name,
    notes: row.notes,
    status: row.status,
    ready: Boolean(row.ready),
    createdAt: row.created_at,
    placedById: row.placed_by_id,
  };
}

function toRow(o) {
  return {
    id: o.id,
    item_id: o.itemId,
    item_name: o.itemName,
    price: o.price,
    quantity: normalizeOrderQuantity(o.quantity),
    customer_name: o.customerName,
    notes: o.notes,
    status: o.status,
    ready: o.ready,
    created_at: o.createdAt,
    placed_by_id: o.placedById,
  };
}

/**
 * @param {{ id: string, role: string } | null} session
 * @param {AbortSignal} [signal]
 */
export async function fetchOrdersForSession(session, signal) {
  const sb = getSupabase();
  if (!sb) return [];

  if (!session) {
    return [];
  }

  if (session.role === "staff" || session.role === "owner") {
    let q = sb.from("orders").select("*");
    if (signal) q = q.abortSignal(signal);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOrderRow);
  }

  let q = sb.from("orders").select("*").eq("placed_by_id", session.id);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrderRow);
}

/**
 * @param {object[]} appOrders
 */
export async function insertOrders(appOrders) {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!appOrders.length) return;

  const rows = appOrders.map(toRow);
  assertOrderQuantityTotal(rows);
  const { error } = await sb.from("orders").insert(rows);
  if (error) throw error;
}

export async function updateOrderStatus(orderId, status) {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error } = await sb.from("orders").update({ status, ready: false }).eq("id", orderId);
  if (error) throw error;
}

export async function markOrderReady(orderId) {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error } = await sb.from("orders").update({ ready: true }).eq("id", orderId);
  if (error) throw error;
}

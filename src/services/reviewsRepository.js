import { getSupabase } from "../lib/supabaseClient.js";
import {
  MAX_REVIEW_AUTHOR_LENGTH,
  MAX_REVIEW_BODY_LENGTH,
  MIN_REVIEW_BODY_LENGTH,
  clampInteger,
  sanitizeText,
} from "../lib/securityLimits.js";

/**
 * @param {string} menuItemId
 * @param {{ rating: number, text: string, author: string }} review
 * @param {string} userId auth user id
 */
export async function insertReview(menuItemId, review, userId) {
  const sb = getSupabase();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");

  const body = sanitizeText(review.text, { maxLength: MAX_REVIEW_BODY_LENGTH });
  if (body.length < MIN_REVIEW_BODY_LENGTH) {
    const err = new Error("Review is too short.");
    err.code = "REVIEW_TOO_SHORT";
    throw err;
  }

  const row = {
    menu_item_id: menuItemId,
    author_id: userId,
    author_display: sanitizeText(review.author, { maxLength: MAX_REVIEW_AUTHOR_LENGTH, fallback: "Guest" }),
    rating: clampInteger(review.rating, 1, 5, 5),
    body,
  };

  const { data: existing, error: existingError } = await sb
    .from("reviews")
    .select("id")
    .eq("menu_item_id", menuItemId)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await sb.from("reviews").update(row).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await sb.from("reviews").insert(row);
  if (!error) return;

  if (error.code === "23505") {
    const { data: latest, error: latestError } = await sb
      .from("reviews")
      .select("id")
      .eq("menu_item_id", menuItemId)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    if (latest?.id) {
      const { error: updateError } = await sb.from("reviews").update(row).eq("id", latest.id);
      if (updateError) throw updateError;
      return;
    }
  }

  throw error;
}

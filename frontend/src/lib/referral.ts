import { supabase } from "@/lib/supabase";

/**
 * Generate a referral code from a user ID
 * Format: first 8 characters of the UUID
 */
export function generateReferralCode(userId: string): string {
  return userId.slice(0, 8).toUpperCase();
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
  invited: number;
  converted: number;
}> {
  const { data, error } = await supabase
    .from("referrals")
    .select("status")
    .eq("referrer_id", userId);

  if (error) throw error;

  const invited = data?.length ?? 0;
  const converted = data?.filter((r) => r.status === "joined").length ?? 0;

  return { invited, converted };
}

/**
 * Apply referral bonus when a new user joins
 */
export async function applyReferralBonus(
  referrerId: string,
  joineeId: string
): Promise<void> {
  // Update the referral record
  const { error: updateError } = await supabase
    .from("referrals")
    .update({ joinee_id: joineeId, status: "joined" })
    .eq("referrer_id", referrerId)
    .eq("status", "pending")
    .limit(1);

  if (updateError) throw updateError;

  // Insert bonus record
  const { error: bonusError } = await supabase.from("referral_bonuses").insert({
    referrer_id: referrerId,
    joinee_id: joineeId,
    bonus_type: "joined",
  });

  if (bonusError) throw bonusError;
}

/**
 * Create a referral entry when someone is invited
 */
export async function createReferral(
  referrerId: string,
  joineeEmail: string
): Promise<void> {
  const { error } = await supabase.from("referrals").insert({
    referrer_id: referrerId,
    joinee_email: joineeEmail,
    status: "pending",
  });

  if (error) throw error;
}

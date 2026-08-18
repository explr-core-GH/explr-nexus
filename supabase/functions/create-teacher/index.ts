import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Readable password: avoids ambiguous chars (0/O, 1/l/I), mixes case + digits.
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Guarantee at least one of each class, then fill to 12 chars.
  const chars = [pick(upper), pick(lower), pick(digits), pick(digits)];
  while (chars.length < 12) chars.push(pick(all));
  // Fisher–Yates shuffle so the guaranteed chars aren't always in front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  // Group as XXXX-XXXX-XXXX for easier reading/typing off a printout.
  const s = chars.join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin using their own token.
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerRoles, error: callerError } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("role", "admin");
    if (callerError || !callerRoles || callerRoles.length === 0) {
      return json({ error: "Only administrators can manage teacher accounts" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const action = body.action === "reset" ? "reset" : "create";

    // ---- Reset an existing account's password ------------------------------
    if (action === "reset") {
      const userId: string | undefined = body.userId;
      if (!userId) return json({ error: "userId is required to reset a password" }, 400);
      const password = generatePassword();
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) {
        console.error("Error resetting password:", error);
        return json({ error: "Failed to reset password" }, 500);
      }
      return json({ success: true, password });
    }

    // ---- Create a brand new teacher account --------------------------------
    const fullName: string = (body.fullName ?? "").trim();
    const email: string = (body.email ?? "").trim().toLowerCase();
    const address: string | null = body.address?.trim() ? body.address.trim() : null;

    if (!fullName) return json({ error: "Teacher name is required" }, 400);
    if (!email) return json({ error: "Email is required" }, 400);

    const password = generatePassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      const msg = createError?.message ?? "Failed to create account";
      const already = /already|exists|registered/i.test(msg);
      return json({ error: already ? "An account with that email already exists." : msg }, already ? 409 : 500);
    }

    const userId = created.user.id;

    // Grant the member role. A brand-new account has none yet, so a plain
    // insert is safe and doesn't depend on a unique constraint for upsert.
    const { error: roleError } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "member" });
    if (roleError) console.error("Error assigning member role:", roleError);

    // A DB trigger usually creates the profile row on user insert. Make sure it
    // exists and carries the name/email, then read its id for the teacher link.
    let profileId: string | null = null;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile?.id) {
      profileId = existingProfile.id;
      await admin.from("profiles").update({ full_name: fullName, email }).eq("id", profileId);
    } else {
      const { data: inserted, error: profileError } = await admin
        .from("profiles")
        .insert({ user_id: userId, full_name: fullName, email })
        .select("id")
        .single();
      if (profileError) console.error("Error creating profile:", profileError);
      profileId = inserted?.id ?? null;
    }

    // Create (or reuse) the teachers row linked to this profile.
    let teacherId: string | null = null;
    const { data: existingTeacher } = profileId
      ? await admin.from("teachers").select("id").eq("profile_id", profileId).maybeSingle()
      : { data: null };

    if (existingTeacher?.id) {
      teacherId = existingTeacher.id;
      await admin.from("teachers").update({ full_name: fullName, email, address }).eq("id", teacherId);
    } else {
      const { data: teacher, error: teacherError } = await admin
        .from("teachers")
        .insert({ full_name: fullName, email, address, profile_id: profileId })
        .select("id")
        .single();
      if (teacherError) console.error("Error creating teacher:", teacherError);
      teacherId = teacher?.id ?? null;
    }

    return json({ success: true, email, password, userId, profileId, teacherId });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

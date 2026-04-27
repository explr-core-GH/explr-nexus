import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRow {
  id: string;
  item_name: string;
  requester_name: string;
  requester_email: string | null;
  return_due_date: string;
}

const buildHtml = (row: ReminderRow) => {
  const due = new Date(row.return_due_date);
  const dueStr = `${due.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} at ${due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">NEXUS</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Lending Library Inventory System</p>
        </div>
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 16px 0; color: #92400e;">Return Reminder</h2>
          <p style="margin: 0 0 12px 0;">Hi ${row.requester_name},</p>
          <p style="margin: 0 0 16px 0;">
            This is a friendly reminder that <strong>${row.item_name}</strong> is due to be returned on:
          </p>
          <div style="background-color: #ffffff; border: 1px solid #fde68a; padding: 12px; border-radius: 4px; font-weight: 600; color: #92400e;">
            ${dueStr}
          </div>
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
            Please plan to return the item by the due date. Log in to NEXUS for details.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message from NEXUS. Please do not reply to this email.
        </p>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find approved requests with a return due date within the next ~28 hours
    // that haven't already been reminded.
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000); // 28h ahead

    const { data: rows, error } = await supabase
      .from("item_requests")
      .select("id, item_name, requester_name, requester_email, return_due_date")
      .eq("status", "approved")
      .is("return_reminder_sent_at", null)
      .not("return_due_date", "is", null)
      .gte("return_due_date", now.toISOString())
      .lte("return_due_date", windowEnd.toISOString());

    if (error) throw error;

    const reminders = (rows || []) as ReminderRow[];
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const row of reminders) {
      if (!row.requester_email) {
        results.push({ id: row.id, ok: false, error: "no email" });
        continue;
      }

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "NEXUS <onboarding@resend.dev>",
            to: [row.requester_email],
            subject: `Reminder: Return ${row.item_name} soon`,
            html: buildHtml(row),
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.message || `status ${res.status}`);
        }

        await supabase
          .from("item_requests")
          .update({ return_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);

        results.push({ id: row.id, ok: true });
      } catch (e: any) {
        console.error("Failed reminder for", row.id, e?.message);
        results.push({ id: row.id, ok: false, error: e?.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: reminders.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-return-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

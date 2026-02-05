import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  inviterName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the request is from an authenticated admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Only admins can send invites" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, inviterName }: InviteRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (userExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate the signup URL with the member code pre-filled
    const signupUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://explr-nexus.lovable.app'}/auth?invite=EXPLORE`;

    // Send the invite email
    const { error: emailError } = await resend.emails.send({
      from: "NEXUS <onboarding@resend.dev>",
      to: [email],
      subject: "You're Invited to NEXUS",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <h1 style="color: #00ff88; font-size: 32px; margin: 0 0 10px 0; font-weight: bold;">
                        NEXUS
                      </h1>
                      <p style="color: #888; font-size: 14px; margin: 0 0 30px 0;">
                        Lending Library Inventory Management System
                      </p>
                      
                      <div style="background-color: #0a0a0a; border-radius: 8px; padding: 30px; margin: 20px 0;">
                        <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 15px 0;">
                          You're Invited!
                        </h2>
                        <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0;">
                          ${inviterName || 'An administrator'} has invited you to join NEXUS as a member.
                        </p>
                      </div>
                      
                      <p style="color: #888; font-size: 14px; margin: 20px 0;">
                        As a member, you'll be able to browse our inventory and request items for lending.
                      </p>
                      
                      <a href="${signupUrl}" style="display: inline-block; background-color: #00ff88; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0;">
                        Accept Invitation
                      </a>
                      
                      <p style="color: #666; font-size: 12px; margin: 30px 0 0 0;">
                        Your access code is: <strong style="color: #00ff88;">EXPLORE</strong>
                      </p>
                      
                      <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 30px 0;">
                      
                      <p style="color: #666; font-size: 12px; margin: 0;">
                        If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending invite email:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send invitation email. Please verify your email domain is configured in Resend." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Invite sent successfully to ${email} by ${inviterName}`);

    return new Response(
      JSON.stringify({ success: true, message: `Invitation sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-invite function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

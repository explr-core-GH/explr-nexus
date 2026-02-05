import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  recipientEmail: string;
  recipientName: string;
  itemName: string;
  newStatus: string;
  adminResponse?: string;
  confirmedDate?: string;
  proposedDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      itemName, 
      newStatus, 
      adminResponse,
      confirmedDate,
      proposedDate
    }: NotifyRequest = await req.json();

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Recipient email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusText = {
      approved: "Approved ✓",
      denied: "Denied",
      pending_confirmation: "Updated - Action Required",
      pending: "Updated",
    }[newStatus] || "Updated";

    const statusColor = {
      approved: "#22c55e",
      denied: "#ef4444",
      pending_confirmation: "#3b82f6",
      pending: "#f59e0b",
    }[newStatus] || "#6b7280";

    let dateInfo = "";
    if (confirmedDate) {
      const date = new Date(confirmedDate);
      dateInfo = `
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #166534;">Confirmed Pickup Date:</p>
          <p style="margin: 4px 0 0 0; color: #15803d;">${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
        </div>
      `;
    } else if (proposedDate) {
      const date = new Date(proposedDate);
      dateInfo = `
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: #1d4ed8;">New Proposed Pickup Date:</p>
          <p style="margin: 4px 0 0 0; color: #2563eb;">${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Please log in to confirm or decline this date.</p>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0;">NEXUS</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Lending Library Inventory System</p>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Request Update</h2>
            
            <p style="margin: 0 0 12px 0;">Hi ${recipientName},</p>
            
            <p style="margin: 0 0 16px 0;">Your request for <strong>${itemName}</strong> has been updated.</p>
            
            <div style="display: inline-block; background-color: ${statusColor}20; color: ${statusColor}; padding: 6px 12px; border-radius: 20px; font-weight: 600; margin-bottom: 16px;">
              Status: ${statusText}
            </div>
            
            ${dateInfo}
            
            ${adminResponse ? `
              <div style="background-color: #faf5ff; border-left: 4px solid #8b5cf6; padding: 12px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: 600; color: #6d28d9;">Admin Message:</p>
                <p style="margin: 4px 0 0 0; color: #7c3aed;">${adminResponse}</p>
              </div>
            ` : ''}
            
            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">
              Log in to NEXUS to view more details or take action on your request.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated message from NEXUS. Please do not reply to this email.
          </p>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NEXUS <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `Request Update: ${itemName} - ${statusText}`,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Error sending email:", errorData);
      return new Response(
        JSON.stringify({ error: errorData.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-request-update:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

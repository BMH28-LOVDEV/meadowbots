import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    // Fetch all app data to give AI full context
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [scoutingRes, assignmentsRes, driveTeamRes, profilesRes] = await Promise.all([
      supabaseAdmin.from("scouting_entries").select("*").neq("team_number", "19792").order("timestamp", { ascending: false }),
      supabaseAdmin.from("team_assignments").select("*"),
      supabaseAdmin.from("drive_team_matches").select("*").neq("team_number", "19792").order("sort_order"),
      supabaseAdmin.from("profiles").select("display_name, role, approval_status"),
    ]);

    const scoutingData = scoutingRes.data || [];
    const assignments = assignmentsRes.data || [];
    const driveTeamMatches = driveTeamRes.data || [];
    const profiles = profilesRes.data || [];

    const dataContext = `
## CURRENT APP DATA (as of ${new Date().toISOString()})

### Scouting Entries (${scoutingData.length} total)
${JSON.stringify(scoutingData, null, 1)}

### Team Assignments (${assignments.length} total)
${JSON.stringify(assignments, null, 1)}

### Drive Team Matches (${driveTeamMatches.length} total)
${JSON.stringify(driveTeamMatches, null, 1)}

### Team Members (${profiles.length} total)
${JSON.stringify(profiles, null, 1)}
`;

    const systemPrompt = `You are the MeadowBot Scout AI — the official AI assistant for FRC Team "The Mighty MeadowBots Blue". You ONLY answer questions based on the team's scouting data provided below. You do NOT make up information or use external knowledge about other teams.

Your capabilities:
- Analyze scouting data (match performance, auto/teleop/endgame stats)
- Compare teams based on scouted metrics
- Summarize team assignments and who is scouting which teams
- Report on drive team match schedules
- Identify strengths and weaknesses of scouted teams
- Provide match strategy recommendations based on data

Rules:
- If asked about something not in the data, say "I don't have data on that yet — make sure the team scouts it!"
- Be enthusiastic and supportive — you're part of the team! 🤖
- Use specific numbers and stats when available
- Keep responses concise but thorough
- If there's no scouting data yet, let them know the team needs to start scouting
- ALWAYS end every response with a "**TL;DR:** " section — a 1-2 sentence summary of your answer for people who want the quick version. IMPORTANT: Always add TWO blank lines before the TL;DR line so it is visually spaced out from the rest of the text.

${dataContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-with-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

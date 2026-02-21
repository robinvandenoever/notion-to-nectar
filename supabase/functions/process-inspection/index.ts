import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const frameCount = parseInt(formData.get("frameCount") as string) || 10;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert audio to base64 for Gemini multimodal (chunked to avoid stack overflow)
    const arrayBuffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64Audio = btoa(binary);

    // Determine MIME type
    const mimeType = audioFile.type || "audio/webm";

    // Use tool calling to get structured output
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert beekeeping inspection transcriber. You will receive an audio recording of a beekeeper narrating their hive inspection. 

Your job is to:
1. Transcribe the audio
2. Extract structured frame-by-frame data from the narration
3. Note queen status, brood pattern, temperament, and health concerns
4. Generate follow-up questions if anything seems off

The hive has ${frameCount} frames. Only include frames that were explicitly mentioned in the narration.

For percentages, estimate based on the beekeeper's descriptions (e.g., "mostly honey" = ~80%, "half brood" = ~50%).
If a percentage is not mentioned, estimate based on context or set to 0.
All percentages for a frame must sum to 100%.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: base64Audio,
                    format: mimeType.includes("mp4") || mimeType.includes("m4a")
                      ? "m4a"
                      : mimeType.includes("mp3") || mimeType.includes("mpeg")
                      ? "mp3"
                      : "wav",
                  },
                },
                {
                  type: "text",
                  text: "Please transcribe this beekeeping inspection audio and extract structured frame data.",
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_inspection",
                description:
                  "Submit the structured inspection data extracted from the audio",
                parameters: {
                  type: "object",
                  properties: {
                    rawTranscript: {
                      type: "string",
                      description: "Full transcription of the audio",
                    },
                    frames: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          frameNumber: { type: "number" },
                          honeyPercent: { type: "number" },
                          broodPercent: { type: "number" },
                          pollenPercent: { type: "number" },
                          emptyPercent: { type: "number" },
                          eggsPresent: { type: "boolean" },
                          larvaePresent: { type: "boolean" },
                          droneBrood: { type: "boolean" },
                          queenCells: { type: "boolean" },
                          notes: { type: "string" },
                        },
                        required: [
                          "frameNumber",
                          "honeyPercent",
                          "broodPercent",
                          "pollenPercent",
                          "emptyPercent",
                          "eggsPresent",
                          "larvaePresent",
                          "droneBrood",
                          "queenCells",
                        ],
                        additionalProperties: false,
                      },
                    },
                    queenSeen: { type: "boolean" },
                    broodPattern: { type: "string" },
                    temperament: { type: "string" },
                    healthFlags: {
                      type: "array",
                      items: { type: "string" },
                    },
                    followUpQuestions: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "rawTranscript",
                    "frames",
                    "queenSeen",
                    "healthFlags",
                    "followUpQuestions",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "submit_inspection" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("AI did not return structured data");
    }

    const inspectionData = JSON.parse(toolCall.function.arguments);

    // Calculate equivalent frames
    const frames = inspectionData.frames || [];
    const honeyEquivFrames = frames.reduce(
      (sum: number, f: any) => sum + f.honeyPercent / 100,
      0
    );
    const broodEquivFrames = frames.reduce(
      (sum: number, f: any) => sum + f.broodPercent / 100,
      0
    );
    const pollenEquivFrames = frames.reduce(
      (sum: number, f: any) => sum + f.pollenPercent / 100,
      0
    );

    const result = {
      ...inspectionData,
      honeyEquivFrames: Math.round(honeyEquivFrames * 100) / 100,
      broodEquivFrames: Math.round(broodEquivFrames * 100) / 100,
      pollenEquivFrames: Math.round(pollenEquivFrames * 100) / 100,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-inspection error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

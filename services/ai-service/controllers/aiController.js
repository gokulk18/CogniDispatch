const express = require('express');
const dbAdapter = require('cognidispatch-shared').dbAdapter;
const https = require('https');
const { AzureOpenAI, OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const router = express.Router();

// Route 1: GET /api/speech-token
router.get('/speech-token', (req, res) => {
  const region = process.env.AZURE_SPEECH_REGION;
  const key = process.env.AZURE_SPEECH_KEY;

  const isMock = !region || !key || key.includes('your_azure') || key.includes('mock');

  if (isMock) {
    console.log("[RescuHome Speech] Azure Speech credentials missing or mock. Returning mock speech token.");
    return res.json({
      token: "mock_speech_token",
      region: "eastus",
      isDemo: true
    });
  }

  const options = {
    hostname: `${region}.api.cognitive.microsoft.com`,
    path: '/sts/v1.0/issueToken',
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Length': '0'
    }
  };

  const reqSpeech = https.request(options, (resSpeech) => {
    let data = '';
    resSpeech.on('data', (chunk) => {
      data += chunk;
    });

    resSpeech.on('end', () => {
      if (resSpeech.statusCode === 200) {
        res.json({ token: data.trim(), region });
      } else {
        res.status(resSpeech.statusCode).json({
          error: "Failed to retrieve speech token",
          detail: `Azure STS returned status code ${resSpeech.statusCode}: ${data}`
        });
      }
    });
  });

  reqSpeech.on('error', (err) => {
    res.status(500).json({
      error: "Failed to retrieve speech token",
      detail: err.message
    });
  });

  reqSpeech.end();
});

// Route 2: POST /api/triage
router.post('/triage', async (req, res) => {
  const { transcription } = req.body;

  if (!transcription || transcription.trim() === '') {
    return res.status(400).json({ error: "transcription field is required" });
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  const isMock = !endpoint || !apiKey || !deployment || 
                 apiKey.includes('your_azure') || apiKey.includes('mock') || 
                 endpoint.includes('your-resource');

  // Helper to calculate Indian Rupees service fee estimates
  function calculateTriageAmount(category, urgency) {
    let baseRate = 3000; // Plumbing default
    const cat = (category || 'PLUMBING').toUpperCase();
    const urg = (urgency || 'STANDARD').toUpperCase();

    if (cat === 'ELECTRICAL') baseRate = 4500;
    else if (cat === 'HVAC') baseRate = 4000;
    else if (cat === 'STRUCTURAL') baseRate = 6000;

    let multiplier = 1.0;
    if (urg === 'HIGH') multiplier = 1.2;
    else if (urg === 'CRITICAL') multiplier = 1.5;

    return Math.round(baseRate * multiplier);
  }

  if (isMock) {
    console.log(`[CogniDispatch Triage] Running in OFFLINE DEMO MODE for transcription: "${transcription}"`);
    
    // Simple rule-based mock triage extraction
    const text = transcription.toUpperCase();
    let category = "PLUMBING";
    let urgency = "HIGH";
    let hazard_flags = ["WATER_INGRESS"];
    let summary = `Reported: ${transcription}`;
    let mitigation_steps = [
      "Locate and shut off the main water valve immediately.",
      "Move all portable electronics, furniture, and valuables off the floor.",
      "Do not touch any electrical switches or devices if standing in water.",
      "Clear a path to the leak area for the arriving technician."
    ];

    if (text.includes("SPARK") || text.includes("WIRE") || text.includes("POWER") || text.includes("SHOCK") || text.includes("OUTLET") || text.includes("ELECTR") || text.includes("LIGHT") || text.includes("BREAKER")) {
      category = "ELECTRICAL";
      urgency = "CRITICAL";
      hazard_flags = ["SHOCK_RISK", "FIRE_RISK"];
      mitigation_steps = [
        "Go to the main circuit breaker panel and switch off power to the affected area.",
        "Do not touch any exposed or sparking wires under any circumstances.",
        "Unplug nearby devices if it is safe to do so.",
        "Keep a dry fire extinguisher nearby, but evacuate if smoke develops."
      ];
    } else if (text.includes("HEAT") || text.includes("COLD") || text.includes("AIR") || text.includes("FURNACE") || text.includes("HVAC") || text.includes("AC ") || text.includes("TEMP") || text.includes("BOILER") || text.includes("FREEZE") || text.includes("GAS") || text.includes("SMELL")) {
      category = "HVAC";
      urgency = text.includes("GAS") ? "CRITICAL" : "STANDARD";
      hazard_flags = text.includes("GAS") ? ["GAS_LEAK", "FIRE_RISK"] : [];
      mitigation_steps = text.includes("GAS") ? [
        "Immediately evacuate all occupants from the home.",
        "Do not flip any light switches or use phones inside (potential spark hazard).",
        "Leave doors open behind you to ventilate the property.",
        "Call the emergency gas line from a safe distance outside."
      ] : [
        "Turn off the HVAC system at the thermostat.",
        "Check that intake and exhaust vents are not blocked by debris.",
        "Avoid using space heaters unattended.",
        "Seal off the room to preserve residual temperature."
      ];
    } else if (text.includes("WALL") || text.includes("ROOF") || text.includes("CRACK") || text.includes("COLLAPSE") || text.includes("CEILING") || text.includes("BREACH") || text.includes("STRUCT") || text.includes("DOOR") || text.includes("WINDOW") || text.includes("FLOOD")) {
      category = "STRUCTURAL";
      urgency = text.includes("COLLAPSE") ? "CRITICAL" : "HIGH";
      hazard_flags = ["STRUCTURAL_COLLAPSE"];
      mitigation_steps = [
        "Evacuate the immediate area beneath or adjacent to the structural breach.",
        "Do not attempt to support collapsing materials or structure yourself.",
        "Shut off utility supplies (water, gas, electric) if safe to prevent secondary damage.",
        "Secure any pets and ensure all family members are in a safe zone."
      ];
    }

    // Delay slightly to simulate AI processing latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    const amount = calculateTriageAmount(category, urgency);

    return res.json({
      success: true,
      triage: {
        category,
        urgency,
        hazard_flags,
        summary: `Simulated assessment: ${summary}`,
        mitigation_steps,
        amount
      }
    });
  }

  try {
    // Determine SDK client layout
    let client;
    let isLegacy = false;

    // Check if standard AzureOpenAI class from newer SDK is available
    if (typeof AzureOpenAI === 'function') {
      client = new AzureOpenAI({
        endpoint,
        apiKey,
        apiVersion: "2024-02-01",
        deployment
      });
    } else {
      // Fallback to OpenAIClient
      const credential = new AzureKeyCredential(apiKey);
      client = new OpenAIClient(endpoint, credential);
      isLegacy = true;
    }

    const systemPrompt = `You are CogniDispatch's emergency triage AI. You analyze homeowner emergency descriptions and output ONLY a valid minified JSON object with NO markdown, NO code blocks, NO explanation, NO preamble. Your entire response must be parseable by JSON.parse() with zero pre-processing.

Output schema (strict):
{
  "category": one of ["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL"],
  "urgency": one of ["CRITICAL", "HIGH", "STANDARD"],
  "hazard_flags": array of zero or more strings from ["WATER_INGRESS", "FIRE_RISK", "SHOCK_RISK", "GAS_LEAK", "STRUCTURAL_COLLAPSE", "MOLD_RISK"],
  "summary": "concise 1-2 sentence factual description of the structural or mechanical symptom reported",
  "mitigation_steps": array of 3-5 short imperative action strings the homeowner should take immediately before the technician arrives
}`;

    let rawText = '';

    if (!isLegacy && client.chat && client.chat.completions) {
      const response = await client.chat.completions.create({
        model: deployment,
        max_tokens: 600,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcription }
        ]
      });
      rawText = response.choices[0].message.content;
    } else {
      // Use getChatCompletions (legacy or client structure match)
      const targetMethod = client.getChatCompletions ? 'getChatCompletions' : (client.chat && client.chat.getCompletions ? 'chat.getCompletions' : null);
      
      let response;
      if (client.getChatCompletions) {
        response = await client.getChatCompletions(
          deployment,
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcription }
          ],
          { maxTokens: 600, temperature: 0.1 }
        );
      } else {
        // Ultimate fallback: assume modern openai shape if any
        response = await client.chat.completions.create({
          model: deployment,
          max_tokens: 600,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: transcription }
          ]
        });
      }
      rawText = response.choices[0].message.content;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("LLM response could not be parsed as JSON: " + rawText);
      }
    }

    // Attach local Indian Rupee amount dynamically
    parsed.amount = calculateTriageAmount(parsed.category, parsed.urgency);

    return res.json({ success: true, triage: parsed });

  } catch (err) {
    return res.status(500).json({
      error: "LLM triage operation failed",
      detail: err.message
    });
  }
});

// ============================================================
// FUTURE HOOK 1: VIDEO DISASTER INGESTION PIPELINE
// Route: POST /api/vision/analyze-stream
// Purpose: Accept multipart video frame data or an RTSP stream URL.
// Integration: Azure AI Vision (Computer Vision v4.0 Analyze API)
// with "denseCaptions", "objects", and "tags" visual features enabled.
// The pipeline will detect structural damage indicators such as
// wall cracks, water stains, smoke presence, and exposed wiring
// from live video frames and append severity scores to the triage object.
// Implementation requires: @azure/ai-vision-image-analysis SDK,
// frame extraction using ffmpeg child_process pipe, and a
// damage severity scoring rubric mapped to CRITICAL/HIGH/STANDARD urgency.
// ============================================================
router.post('/vision/analyze-stream', async (req, res) => {
  res.status(501).json({ message: "Video disaster ingestion pipeline — not yet implemented. See architecture comments." });
});

// ============================================================
// FUTURE HOOK 2: DYNAMIC PREDICTIVE PRICING ENGINE
// Route: POST /api/pricing/predict
// Purpose: Accepts { category, urgency, region, timestamp } and returns
// a dynamic service cost multiplier (e.g., 1.0x to 3.5x base rate).
// Data sources:
//   - Local vendor availability index (ratio of available/total vendors per category)
//   - Historical insurance claim cost database (Azure Blob Storage CSV)
//   - Real-time weather severity index (NOAA API or Azure Maps Weather)
//   - Regional demand spike detector (rolling 15-minute dispatch frequency)
// Multiplier formula: baseRate * availabilityFactor * weatherFactor * demandFactor
// Output: { baseRate, multiplier, estimatedCost, confidence, breakdown }
// ============================================================
router.post('/pricing/predict', async (req, res) => {
  res.status(501).json({ message: "Predictive pricing engine — not yet implemented. See architecture comments." });
});

module.exports = router;

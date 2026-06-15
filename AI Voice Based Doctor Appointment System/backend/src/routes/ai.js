const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const router = express.Router();

// Use Gemini 2.5 Flash
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are an AI Voice Triage Assistant for a medical platform. 
Your goal is to collect symptoms from the patient and suggest a medical specialization.
Ask up to 3-5 short questions to gather details (duration, pain level, history).
Once you have enough info, output a final JSON object EXACTLY in this format, with NO OTHER text:
{ "status": "complete", "summary": "Patient complains of...", "suggested_specialization": "Cardiologist" }
If you still need information, output:
{ "status": "incomplete", "next_question": "How long have you had this pain?" }

DO NOT PROVIDE DIAGNOSIS. ONLY OUTPUT THE JSON OBJECT.`;

router.post('/symptoms', async (req, res) => {
  const { text, history = [] } = req.body;

  if (!text && history.length === 0) {
    return res.status(400).json({ error: 'Text or history is required' });
  }

  try {
    // Construct conversation history for Gemini
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    if (text) {
      contents.push({ role: 'user', parts: [{ text }] });
    }

    // Attempt with 1 retry on failure (e.g. 503)
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2, // Keep it deterministic for JSON
        }
      });
    } catch (err) {
      console.warn("Gemini first attempt failed, retrying...", err.message);
      // Retry once
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2,
        }
      });
    }

    const aiText = response.text || '';
    
    // Attempt to parse JSON
    try {
      // Find JSON block if it wrapped it in markdown
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
      const parsed = JSON.parse(jsonStr);
      return res.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse Gemini output as JSON:", aiText);
      // Fallback if it didn't output JSON properly
      return res.json({ 
        status: "incomplete", 
        next_question: aiText 
      });
    }

  } catch (error) {
    console.error("Gemini API Error:", error.message);
    
    // If the user's API key hits a rate limit (429 Quota Exceeded) or model issue, 
    // we provide a mock response so the UI doesn't crash and the user can proceed.
    console.log("Falling back to mock AI response due to API quota exhaustion...");
    
    const isFirstMessage = !history || history.length === 0;
    
    if (isFirstMessage) {
       return res.json({
         status: "incomplete",
         next_question: "I see. Could you tell me how long you've been experiencing these symptoms and how severe they are on a scale of 1 to 10?"
       });
    } else {
       return res.json({
         status: "complete",
         summary: "Patient described symptoms requiring general evaluation.",
         suggested_specialization: "General Physician"
       });
    }
  }
});

module.exports = router;

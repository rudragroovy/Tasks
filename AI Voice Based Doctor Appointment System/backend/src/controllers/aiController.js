const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_now');

exports.analyzeSymptoms = async (req, res) => {
  try {
    const { text } = req.body; // In real voice implementation, audio would be transcribed first

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are a medical symptom collector AI assistant. 
DO NOT DIAGNOSE. DO NOT PRESCRIBE MEDICINE.
The patient says: "${text}"

If you don't have enough information about their symptoms, duration, pain level, medical history, and current medicine, ask a follow-up question. Limit to 5-6 questions total.
If you have enough information, output a strict JSON object with:
{
  "status": "complete",
  "summary": "Patient has...",
  "suggested_specialization": "Cardiologist"
}
If incomplete, output:
{
  "status": "incomplete",
  "next_question": "How long have you had this pain?"
}
Output ONLY valid JSON.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let textResult = response.text();
    
    // Clean up potential markdown formatting from JSON
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.json(JSON.parse(textResult));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze symptoms' });
  }
};

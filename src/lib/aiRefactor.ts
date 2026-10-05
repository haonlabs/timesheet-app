export async function refactorActivity(text: string, apiKey: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  if (!apiKey) throw new Error('API Key is missing');

  const prompt = `Refactor the following timesheet activity to be more professional, concise, and grammatically correct in Indonesian. 
If it's already professional, just keep it. Return only the refactored text without any explanations or quotes.
Text: "${text}"`;

  try {
    // gemini-2.0-flash is shut down; key goes in a header so it never lands in URLs/logs
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to connect to Gemini API');
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return result ? result.trim() : text;
  } catch (err) {
    console.error('AI Refactor Error:', err);
    throw err;
  }
}

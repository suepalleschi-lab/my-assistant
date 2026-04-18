exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!text || !apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text or API key' })
      };
    }

    const systemPrompt = `You are a personal assistant. Classify the user input and return ONLY a valid JSON object with no other text:
{"type":"reminder","title":"brief title","date":"ISO date if relevant or null","body":"full content","recipient":"email recipient or null"}
Type must be exactly one of: reminder, calendar, note, email.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const rawText = data.content[0].text;

// Extract JSON safely
const jsonMatch = rawText.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  throw new Error("No valid JSON found in Claude response");
}

const result = JSON.parse(jsonMatch[0]);
return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(result)
};

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, apiKey } = JSON.parse(event.body);

    if (!text || !apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text or apiKey' })
      };
    }

    const systemPrompt = `You are a personal assistant. Classify the user's input and extract details. Return ONLY a JSON object with no extra text:
{
  "type": "reminder" or "calendar" or "note" or "email",
  "title": "brief title",
  "date": "date and time if relevant, otherwise null",
  "body": "full content",
  "recipient": "email recipient if email, otherwise null"
}`;

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

    const result = data.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: JSON.parse(result) })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

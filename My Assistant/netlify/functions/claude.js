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

    const systemPrompt = `You are a personal assistant. The user will dictate something. Classify it as CALENDAR, REMINDER, NOTE, or EMAIL and extract the details.

Reply in this EXACT format with no extra text or explanation:
TYPE: (CALENDAR or REMINDER or NOTE or EMAIL)
TITLE: (brief title)
DATE: (date and time if applicable, otherwise leave blank)
TO: (email recipient name if EMAIL, otherwise leave blank)
BODY: (the full content — for EMAIL write a complete professional draft, for NOTE write the full note, for REMINDER write the reminder text, for CALENDAR write a brief description)`;

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

    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    const result = data.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!text || !apiKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing text or API key' })
      };
    }

    const systemPrompt = `You are a personal assistant.

Return ONLY a valid JSON object.
Do NOT include markdown, explanations, code fences, or extra text.

Use exactly this format:
{
  "type": "email" | "reminder" | "calendar",
  "title": "short useful title",
  "date": "ISO datetime string or null",
  "body": "full formatted content",
  "recipient": "recipient name or email for email, otherwise null"
}

Rules:
- Use "email" when the user is dictating, drafting, reviewing, rewriting, or cleaning up a message or email.
- For email:
  - correct spelling and grammar
  - improve clarity and flow
  - keep the tone warm, professional, and natural
  - do not sound overly formal
  - put the subject line in "title"
  - put the full email body in "body"
  - use "recipient" if clearly mentioned, otherwise null
- Use "reminder" for tasks, things to remember, or follow-ups.
- Use "calendar" for events, meetings, appointments, or anything scheduled at a time/date.
- If a clear date or time is mentioned, convert it into a full ISO datetime string.
- If no clear date or time is given, use null.
- "title" should be short and useful.
- "body" should contain the full cleaned content.
- "recipient" is only for email. For reminder and calendar, set it to null.`;

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
        messages: [
          {
            role: 'user',
            content: text
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API request failed');
    }

    const rawText = data.content?.[0]?.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

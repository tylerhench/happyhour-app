export const config = {
  maxDuration: 60,
};
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }
 
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }
 
    const text = data.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('');
 
    const clean = text.replace(/```json|```/g, '').trim();
 
    // Try parsing as array first, then object
    let results = null;
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        results = parsed;
        return res.status(200).json({ results });
      } else {
        // It's an object (venue detail response)
        return res.status(200).json({ results: parsed });
      }
    } catch {
      // Try extracting array
      const arrMatch = clean.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          results = JSON.parse(arrMatch[0]);
          return res.status(200).json({ results });
        } catch {}
      }
      // Try extracting object
      const objMatch = clean.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          return res.status(200).json({ results: obj });
        } catch {}
      }
    }
 
    return res.status(200).json({ results: [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

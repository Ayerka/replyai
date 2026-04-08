export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, context, tone } = req.body;

  if (!conversation || conversation.trim() === '') {
    return res.status(400).json({ error: 'Brak treści rozmowy' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Brak klucza API na serwerze' });
  }

  const prompt = `Jesteś ekspertem od komunikacji i relacji interpersonalnych.
Użytkownik wkleił rozmowę i chce dostać propozycję odpowiedzi.

Rozmowa:
${conversation}

${context ? 'Kontekst sytuacji: ' + context : ''}

Ton odpowiedzi: ${tone || 'profesjonalny'}

Napisz jedną, gotową do wysłania odpowiedź w podanym tonie.
Odpowiedź powinna być naturalna, autentyczna i dopasowana do kontekstu rozmowy.
Napisz TYLKO samą wiadomość do wysłania, bez wyjaśnień ani wstępu.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const reply = data.content?.map(b => b.text || '').join('') || '';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Błąd połączenia z API: ' + err.message });
  }
}

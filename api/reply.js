export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, context, tone, app, image } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Brak klucza API' });

  const appContext = app ? `Rozmowa odbywa się na: ${app}.` : '';
const toneInstructions = tone === 'genz'
  ? 'Odpowiadasz w stylu Gen Z — używasz skrótów (XD, lol, omg, ngl, fr fr, no cap, slay, lowkey, bestie), emojis (💀😭🔥✨), piszesz z luzem i humorem, czasem celowo robisz literówki dla efektu, używasz "serio?", "no to pa", "to jest peak", "cringe", "vibe". Piszesz jakbyś pisała do znajomej na insta.'
  : `Odpowiadasz w tonie: ${tone || 'profesjonalny'}.`;
const systemPrompt = `Jesteś ekspertem od komunikacji i relacji interpersonalnych. ${appContext} Piszesz w języku polskim. ${toneInstructions} Odpowiadasz TYLKO gotową wiadomością do wysłania, bez żadnych wyjaśnień, wstępów ani komentarzy.`;

  const userContent = [];

  if (image) {
    userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } });
    userContent.push({ type: 'text', text: `Przeanalizuj tę rozmowę ze screenshota i napisz odpowiedź w tonie: ${tone || 'profesjonalny'}.${context ? ' Kontekst: ' + context : ''}` });
  } else {
    userContent.push({ type: 'text', text: `Rozmowa:\n${conversation}\n\n${context ? 'Kontekst: ' + context + '\n\n' : ''}Napisz odpowiedź w tonie: ${tone || 'profesjonalny'}.` });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: image ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const reply = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

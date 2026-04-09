export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, context, tone, app, image, personType, history } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Brak klucza API' });

  const appContext = app ? `Platforma: ${app}.` : '';
  const personContext = {
    szef: 'Piszesz do szefa — profesjonalnie, ale po ludzku.',
    wykładowca: 'Piszesz do wykładowcy — uprzejmie i rzeczowo.',
    rodzina: 'Piszesz do rodziny — ciepło i bezpośrednio.',
    partner: 'Piszesz do partnera/partnerki — autentycznie i emocjonalnie.',
    znajomy: 'Piszesz do znajomego — swobodnie i naturalnie.',
    klient: 'Piszesz do klienta — profesjonalnie i pomocnie.',
    rekruter: 'Piszesz do rekrutera — profesjonalnie, konkretnie.',
    były: 'Piszesz do byłego/byłej — spokojnie, z dystansem.',
  }[personType] || '';

  const toneMap = {
    profesjonalny: 'profesjonalnie ale naturalnie, bez korporacyjnego sztywniactwa',
    przyjazny: 'ciepło i przyjaźnie, jak do dobrego znajomego',
    asertywny: 'asertywnie — jasno i spokojnie wyrażasz swoje zdanie',
    empatyczny: 'empatycznie — pokazujesz że rozumiesz drugą osobę',
    perswazyjny: 'perswazyjnie — przekonujesz do swojego punktu widzenia',
    sarkatyczny: 'z inteligentnym sarkazmem, nie złośliwie',
    przepraszający: 'przepraszająco — szczerze, bez przesady',
    stanowczy: 'stanowczo — twardo trzymasz swoje stanowisko',
    akademicki: 'akademicko — precyzyjnie, merytorycznie',
    flirtujący: 'flirtująco — lekko, z humorem i zainteresowaniem',
    genz: 'w stylu Gen Z — naturalnie, luzacko, z emojis (💀🔥✨😭), używasz: lol, omg, ngl, fr, no cap, slay, lowkey. Piszesz jak na insta do znajomej',
  };

  const systemPrompt = `Jesteś ekspertem od komunikacji. Piszesz po polsku. ${appContext} ${personContext}

Twój styl: ${toneMap[tone] || 'naturalnie i autentycznie'}.
${context ? 'Kontekst: ' + context : ''}

ZASADY — BARDZO WAŻNE:
1. Piszesz jak PRAWDZIWY CZŁOWIEK, nie jak chatbot
2. NIE zaczynaj od: "Oczywiście", "Jasne", "Rozumiem", "Dziękuję za wiadomość", "Świetnie"
3. Bądź KRÓTKI — ludzie piszą krótko na telefonie. Maks 2-3 zdania chyba że sytuacja wymaga więcej
4. Używaj prostego języka — nie "pragnę poinformować" tylko "chcę powiedzieć"
5. Pisz TYLKO gotową wiadomość — zero komentarzy, zero wyjaśnień przed ani po
6. Dopasuj długość do tego co napisała druga osoba`;

  const messages = [{ role: 'system', content: systemPrompt }];

  if (history && history.length > 0) {
    history.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
  }

  const userContent = [];
  if (image) {
    userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } });
    userContent.push({ type: 'text', text: 'Przeanalizuj tę rozmowę i napisz odpowiedź.' });
  } else {
    userContent.push({ type: 'text', text: `Napisz odpowiedź na tę wiadomość:\n${conversation}` });
  }

  messages.push({ role: 'user', content: userContent });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: image ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 1.0,
        messages
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

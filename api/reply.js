export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, context, tone, customTone, app, image, personType, history, count, relationship, situation, feeling, goal } = req.body;
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

  const contextDetails = [
    relationship ? `Relacja: ${relationship}` : '',
    situation ? `Sytuacja: ${situation}` : '',
    feeling ? `Uczucia: ${feeling}` : '',
    goal ? `Cel: ${goal}` : '',
    context ? `Dodatkowy kontekst: ${context}` : '',
  ].filter(Boolean).join('\n');

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
    genz: 'w stylu Gen Z — naturalnie, luzacko, z emojis (💀🔥✨😭), używasz: lol, omg, ngl, fr, no cap. Piszesz jak na insta do znajomej',
  };

  const toneInstruction = customTone
    ? `Styl: ${customTone}`
    : `Styl: ${toneMap[tone] || 'naturalnie i autentycznie'}`;

  const replyCount = Math.min(parseInt(count) || 1, 4);

  const variantInstruction = replyCount > 1
    ? `Wygeneruj DOKŁADNIE ${replyCount} różne warianty odpowiedzi. Każdy wariant zacznij od nowej linii i poprzedź go tekstem "Wariant 1:", "Wariant 2:" itd. Każdy wariant powinien być inny w stylu lub podejściu. Po etykiecie "Wariant X:" napisz tylko samą wiadomość.`
    : 'Napisz TYLKO gotową wiadomość — zero komentarzy, zero etykiet.';

  const systemPrompt = `Jesteś ekspertem od komunikacji. Piszesz po polsku. ${appContext} ${personContext}
${toneInstruction}
${contextDetails ? contextDetails : ''}

ZASADY:
1. Piszesz jak PRAWDZIWY CZŁOWIEK, nie jak chatbot
2. NIE zaczynaj od: "Oczywiście", "Jasne", "Rozumiem", "Dziękuję", "Świetnie"
3. Bądź KRÓTKI — maks 2-3 zdania chyba że sytuacja wymaga więcej
4. Używaj prostego języka
5. ${variantInstruction}`;

  const messages = [{ role: 'system', content: systemPrompt }];

  if (history && history.length > 0) {
    history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
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
        max_tokens: replyCount > 1 ? 800 : 300,
        temperature: 1.0,
        messages
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const fullReply = data.choices?.[0]?.message?.content?.trim() || '';

    if (replyCount > 1) {
      const variants = fullReply
        .split(/Wariant \d+:/i)
        .map(v => v.trim())
        .filter(Boolean);
      return res.status(200).json({ reply: variants[0] || fullReply, variants: variants.length > 1 ? variants : [fullReply] });
    }

    return res.status(200).json({ reply: fullReply, variants: [fullReply] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

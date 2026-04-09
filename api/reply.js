export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { conversation, context, tone, app, image, personType } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Brak klucza API' });

  const appContext = app ? `Rozmowa odbywa się na: ${app}.` : '';

  const personContext = personType ? {
    szef: 'Ta osoba to szef lub przełożony — zachowaj profesjonalizm ale bądź asertywny.',
    wykładowca: 'Ta osoba to wykładowca lub nauczyciel — bądź uprzejmy i rzeczowy.',
    rodzina: 'Ta osoba to członek rodziny — możesz być bardziej bezpośredni i ciepły.',
    partner: 'Ta osoba to partner lub partnerka — bądź autentyczny i emocjonalny.',
    znajomy: 'Ta osoba to znajomy — możesz być swobodny i naturalny.',
    klient: 'Ta osoba to klient — bądź profesjonalny i pomocny.',
    rekruter: 'Ta osoba to rekruter — bądź profesjonalny, konkretny i zaprezentuj się dobrze.',
    były: 'Ta osoba to były partner lub była partnerka — zachowaj spokój i dystans emocjonalny.',
    inne: ''
  }[personType] || '' : '';

  const toneInstructions = {
    profesjonalny: 'Pisz profesjonalnie ale naturalnie — jak prawdziwy człowiek, nie korporacyjny robot.',
    przyjazny: 'Pisz ciepło i przyjaźnie — jak do dobrego znajomego.',
    asertywny: 'Pisz asertywnie — jasno wyrażaj swoje zdanie, bez agresji.',
    empatyczny: 'Pisz empatycznie — pokaż że rozumiesz uczucia drugiej osoby.',
    perswazyjny: 'Pisz perswazyjnie — przekonaj rozmówcę do swojego punktu widzenia.',
    sarkatyczny: 'Pisz z lekką dozą sarkazmu — inteligentnie, nie złośliwie.',
    przepraszający: 'Pisz przepraszająco — szczerze i bez nadmiernego biczowania się.',
    stanowczy: 'Pisz stanowczo — twardo trzymaj swoje stanowisko.',
    akademicki: 'Pisz akademicko — używaj precyzyjnego języka, odwołuj się do logiki.',
    flirtujący: 'Pisz flirtująco — lekko, z humorem i zainteresowaniem.',
    genz: 'Pisz w stylu Gen Z — używaj skrótów (lol, omg, ngl, fr fr, no cap), emojis (💀😭🔥✨), piszesz jakbyś pisała do znajomej na insta. Naturalnie, luźno, z humorem.'
  }[tone] || 'Pisz naturalnie i autentycznie.';

  const systemPrompt = `Jesteś ekspertem od komunikacji interpersonalnej. Piszesz w języku polskim.
${appContext}
${personContext}
Styl odpowiedzi: ${toneInstructions}
${context ? 'Kontekst sytuacji: ' + context : ''}

WAŻNE ZASADY NATURALNOŚCI:
- Pisz jak prawdziwy człowiek, nie jak AI
- Unikaj formalnych zwrotów jak "Rozumiem Twoje obawy" czy "Dziękuję za wiadomość"
- Nie zaczynaj od "Oczywiście", "Jasne", "Świetnie" ani podobnych
- Pisz krótko i na temat — tak jak ludzie piszą SMS-y i wiadomości
- Dopasuj długość do kontekstu — jeśli ktoś napisał jedno zdanie, odpowiedz jednym zdaniem
- Odpowiadasz TYLKO gotową wiadomością do wysłania, bez wyjaśnień i komentarzy`;

  const userContent = [];
  if (image) {
    userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } });
    userContent.push({ type: 'text', text: `Przeanalizuj tę rozmowę ze screenshota i napisz odpowiedź.` });
  } else {
    userContent.push({ type: 'text', text: `Rozmowa:\n${conversation}` });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: image ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.9,
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

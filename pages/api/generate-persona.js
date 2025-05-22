// All-in-one API file with no external imports

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function createPersonaPrompt(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;

  return `You are an expert at creating ideal client personas for therapists. Generate exactly 1 persona and 3 marketing hooks.

THERAPIST INFORMATION:
- Name: ${therapistName}
- Focus: ${focus}
- Preferred Client Type: ${preferredClientType}
- Fulfilling traits: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Draining traits: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

REQUIREMENTS:
1. Create a 100-150 word persona describing the ideal client
2. Create 3 marketing hooks with headlines and sublines
3. Write in an emotionally specific, authentic voice
4. Avoid therapy clichés and clinical jargon

OUTPUT FORMAT:
**PERSONA TITLE:** [Creative, specific title]

**PERSONA:** [100-150 word narrative about the client's inner experience]

**MARKETING HOOKS:**
**Hook 1:** [Emotionally resonant headline]
([SEO subline with relevant terms])

**Hook 2:** [Emotionally resonant headline]
([SEO subline with relevant terms])

**Hook 3:** [Emotionally resonant headline]
([SEO subline with relevant terms])

Generate the persona now following this exact format.`;
}

function parsePersonaOutput(rawOutput) {
  try {
    const lines = rawOutput.split('\n').filter(line => line.trim());
    
    const result = {
      title: '',
      persona: '',
      hooks: []
    };
    
    let currentSection = '';
    let personaLines = [];
    let currentHook = null;
    
    for (const line of lines) {
      if (line.includes('**PERSONA TITLE:**')) {
        result.title = line.replace('**PERSONA TITLE:**', '').trim();
      } else if (line.includes('**PERSONA:**')) {
        currentSection = 'persona';
      } else if (line.includes('**MARKETING HOOKS:**')) {
        currentSection = 'hooks';
      } else if (line.includes('**Hook') && currentSection === 'hooks') {
        if (currentHook) result.hooks.push(currentHook);
        currentHook = {
          headline: line.replace(/\*\*Hook \d+:\*\*/, '').trim(),
          subline: ''
        };
      } else if (line.startsWith('(') && line.endsWith(')') && currentHook) {
        currentHook.subline = line.slice(1, -1);
      } else if (currentSection === 'persona' && line.trim()) {
        personaLines.push(line);
      }
    }
    
    if (currentHook) result.hooks.push(currentHook);
    result.persona = personaLines.join(' ');
    
    return result;
  } catch (error) {
    throw new Error(`Failed to parse persona: ${error.message}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    console.log('🎯 Generating persona for:', therapistName);

    const prompt = createPersonaPrompt({
      therapistName,
      focus,
      preferredClientType,
      fulfillingTraits,
      drainingTraits
    });

    const rawPersona = await callAnthropicAPI(prompt);
    console.log('✅ Persona generated');

    const structuredPersona = parsePersonaOutput(rawPersona);

    return res.status(200).json({
      success: true,
      persona: structuredPersona,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate persona',
      details: error.message
    });
  }
}

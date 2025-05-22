// All-in-one AI API with fixed persona parsing

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
- Fulfilling traits: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits || 'Not specified'}
- Draining traits: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits || 'Not specified'}

REQUIREMENTS:
1. Create a 100-150 word persona describing the ideal client's inner experience
2. Create 3 marketing hooks with headlines and sublines
3. Write in an emotionally specific, authentic voice
4. Avoid therapy clichés and clinical jargon
5. Focus on how the client FEELS and shows up in the world

OUTPUT FORMAT (follow this EXACTLY):
**PERSONA TITLE:** [Creative, specific title]

**PERSONA:** [100-150 word narrative about the client's inner experience, struggles, and readiness for change]

**MARKETING HOOKS:**

**Hook 1:** [Emotionally resonant headline]
([SEO subline with relevant terms])

**Hook 2:** [Emotionally resonant headline]
([SEO subline with relevant terms])

**Hook 3:** [Emotionally resonant headline]
([SEO subline with relevant terms])

Generate the complete persona now following this exact format.`;
}

function parsePersonaOutput(rawOutput) {
  try {
    console.log('Raw AI output:', rawOutput);
    
    const lines = rawOutput.split('\n').map(line => line.trim()).filter(line => line);
    
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
        currentSection = 'title';
      } else if (line.includes('**PERSONA:**')) {
        currentSection = 'persona';
        // Capture any text after **PERSONA:** on the same line
        const afterPersona = line.replace('**PERSONA:**', '').trim();
        if (afterPersona) {
          personaLines.push(afterPersona);
        }
      } else if (line.includes('**MARKETING HOOKS:**')) {
        currentSection = 'hooks';
      } else if (line.includes('**Hook') && currentSection === 'hooks') {
        // Save previous hook if exists
        if (currentHook) {
          result.hooks.push(currentHook);
        }
        // Start new hook
        const hookText = line.replace(/\*\*Hook \d+:\*\*/, '').trim();
        currentHook = {
          headline: hookText,
          subline: ''
        };
      } else if (line.startsWith('(') && line.endsWith(')') && currentHook) {
        // This is a subline for the current hook
        currentHook.subline = line.slice(1, -1); // Remove parentheses
      } else if (currentSection === 'persona' && line && !line.includes('**')) {
        // Add to persona if we're in persona section and it's not a header
        personaLines.push(line);
      }
    }
    
    // Add the last hook if exists
    if (currentHook) {
      result.hooks.push(currentHook);
    }
    
    // Join persona lines
    result.persona = personaLines.join(' ').trim();
    
    console.log('Parsed result:', result);
    
    return result;
  } catch (error) {
    console.error('Parsing error:', error);
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
    console.log('✅ Raw persona generated');

    const structuredPersona = parsePersonaOutput(rawPersona);
    console.log('✅ Persona parsed and structured');

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

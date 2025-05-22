// All-in-one AI API with refined creative direction

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

  return `You are a world-class creative director with a PhD in psychology, known for wise, thoughtful, and eloquent writing. Create an ideal client persona for this therapist.

THERAPIST INFORMATION:
- Name: ${therapistName}
- Focus: ${focus}
- Preferred Client Type: ${preferredClientType}
- What energizes them about clients: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits || 'Not specified'}
- What drains them about clients: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits || 'Not specified'}

WRITING STYLE:
- Write like a wise friend, not a textbook
- Use emotionally specific language that captures inner experience
- Avoid therapy jargon and clinical terminology
- Create vivid, relatable scenarios that feel human
- Write with warmth, insight, and authenticity

REQUIREMENTS:
1. "Here's You" section: Describe the therapist's unique approach and what makes them perfect for this client (60-80 words)
2. Persona description: Paint a picture of the client's inner world, struggles, and readiness (120-150 words)
3. Three marketing hooks: Emotionally resonant headlines with SEO-optimized sublines

OUTPUT FORMAT (follow this EXACTLY):
**PERSONA TITLE:** [A compelling, specific title that captures their essence]

**HERE'S YOU:** [60-80 words describing the therapist's approach, strengths, and unique fit for this client type. Focus on what makes them special and why this client would choose them.]

**PERSONA:** [120-150 words painting a vivid picture of the client's inner experience. Show don't tell - use specific scenarios, internal thoughts, and emotional moments. Make them feel real and three-dimensional.]

**MARKETING HOOKS:**

**Hook 1:** [A headline that immediately resonates with the client's core struggle]
([SEO subline with relevant therapy terms and location/specialty])

**Hook 2:** [A headline about their readiness for change or deeper work]
([SEO subline emphasizing the therapeutic approach and client type])

**Hook 3:** [A headline about moving beyond surface solutions]
([SEO subline highlighting transformation and outcomes])

Generate a persona that feels authentic, specific, and emotionally resonant. Make the therapist and client feel like real people, not concepts.`;
}

function parsePersonaOutput(rawOutput) {
  try {
    console.log('Raw AI output:', rawOutput);
    
    const lines = rawOutput.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = {
      title: '',
      heresYou: '',
      persona: '',
      hooks: []
    };
    
    let currentSection = '';
    let heresYouLines = [];
    let personaLines = [];
    let currentHook = null;
    
    for (const line of lines) {
      if (line.includes('**PERSONA TITLE:**')) {
        result.title = line.replace('**PERSONA TITLE:**', '').trim();
        currentSection = 'title';
      } else if (line.includes('**HERE\'S YOU:**')) {
        currentSection = 'heresYou';
        const afterHeresYou = line.replace('**HERE\'S YOU:**', '').trim();
        if (afterHeresYou) {
          heresYouLines.push(afterHeresYou);
        }
      } else if (line.includes('**PERSONA:**')) {
        currentSection = 'persona';
        const afterPersona = line.replace('**PERSONA:**', '').trim();
        if (afterPersona) {
          personaLines.push(afterPersona);
        }
      } else if (line.includes('**MARKETING HOOKS:**')) {
        currentSection = 'hooks';
      } else if (line.includes('**Hook') && currentSection === 'hooks') {
        if (currentHook) {
          result.hooks.push(currentHook);
        }
        const hookText = line.replace(/\*\*Hook \d+:\*\*/, '').trim();
        currentHook = {
          headline: hookText,
          subline: ''
        };
      } else if (line.startsWith('(') && line.endsWith(')') && currentHook) {
        currentHook.subline = line.slice(1, -1);
      } else if (currentSection === 'heresYou' && line && !line.includes('**')) {
        heresYouLines.push(line);
      } else if (currentSection === 'persona' && line && !line.includes('**')) {
        personaLines.push(line);
      }
    }
    
    if (currentHook) {
      result.hooks.push(currentHook);
    }
    
    result.heresYou = heresYouLines.join(' ').trim();
    result.persona = personaLines.join(' ').trim();
    
    console.log('Parsed result:', result);
    
    return result;
  } catch (error) {
    console.error('Parsing error:', error);
    throw new Error(`Failed to parse persona: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

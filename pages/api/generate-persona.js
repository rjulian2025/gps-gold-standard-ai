// PhD-level clinical consultant AI - precise, authoritative, experienced

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 2500,
    temperature: 0.2,
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

  return `You are a $250/hour PhD-level practice consultant with 25+ years of clinical experience. Your writing is precise, authoritative, and grounded in deep understanding of human psychology and therapeutic dynamics. Write with the authority of someone who has guided thousands of therapists to build successful practices.

THERAPIST PROFILE:
- Name: ${therapistName}
- Clinical focus: ${focus}
- Target population: ${preferredClientType}
- Energizing client characteristics: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits || 'Not specified'}
- Depleting client patterns: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits || 'Not specified'}

WRITING REQUIREMENTS:
- Use precise psychological terminology when appropriate
- Reference observable clinical patterns and dynamics
- Write with earned authority, not flowery language
- Focus on actionable insights and professional positioning
- Avoid creative writing flourishes - this is strategic consultation

MANDATORY SECTIONS (ALL REQUIRED):

**PERSONA TITLE:** [Specific, clinically-informed title that reflects both presenting concerns and readiness level]

**HERE'S YOU:** [75-90 words describing ${therapistName}'s clinical approach, theoretical orientation, and unique positioning for this client population. Written with professional authority - what makes their expertise specifically relevant for this presentation.]

**PERSONA:** [140-160 words providing clinical assessment of client presentation, internal dynamics, and therapeutic readiness. Include specific behavioral indicators, cognitive patterns, and relational dynamics. Write as if briefing a consulting colleague.]

**MARKETING HOOKS:**

**Hook 1:** [Direct, specific headline addressing core presenting concern]
([Clinical terminology, location, specific population served])

**Hook 2:** [Headline focusing on therapeutic process or intervention approach]
([Methodology, evidence-base, client outcomes])

**Hook 3:** [Headline addressing transformation potential]
([Specialization, clinical expertise, measurable change])

Write with the precision of a clinical case consultation and the strategic insight of a practice-building expert. Every word should demonstrate professional competence and earned authority.`;
}

function parsePersonaOutput(rawOutput) {
  try {
    console.log('🔍 Raw AI output:', rawOutput);
    
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
      } else if (line.includes('**HERE\'S YOU:**') || line.includes('**HERES YOU:**') || line.includes('HERE\'S YOU:') || line.includes('HERES YOU:')) {
        currentSection = 'heresYou';
        const afterHeader = line.replace(/\*\*HERE'S YOU:\*\*|\*\*HERES YOU:\*\*|HERE'S YOU:|HERES YOU:/g, '').trim();
        if (afterHeader) {
          heresYouLines.push(afterHeader);
        }
        console.log('📍 Found HERE\'S YOU section');
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
        console.log('📝 Adding to HERE\'S YOU:', line);
      } else if (currentSection === 'persona' && line && !line.includes('**')) {
        personaLines.push(line);
      }
    }
    
    if (currentHook) {
      result.hooks.push(currentHook);
    }
    
    result.heresYou = heresYouLines.join(' ').trim();
    result.persona = personaLines.join(' ').trim();
    
    console.log('🎯 Final parsed HERE\'S YOU:', result.heresYou);
    console.log('📊 HERE\'S YOU length:', result.heresYou.length);
    
    // BULLETPROOF: Clinical-level fallback if HERE'S YOU is missing
    if (!result.heresYou || result.heresYou.length < 15) {
      console.log('⚠️ HERE\'S YOU missing, generating clinical fallback');
      const focus = result.persona.includes('neurodivergent') ? 'neurodevelopmental presentations' : 
                   result.persona.includes('anxiety') ? 'anxiety disorders' :
                   result.persona.includes('trauma') ? 'trauma-informed interventions' : 'complex clinical presentations';
      
      result.heresYou = `Your clinical expertise in ${focus} positions you uniquely for this population. You combine evidence-based interventions with relational depth, creating therapeutic frameworks that address both symptom management and underlying dynamics. Your approach integrates diagnostic understanding with developmental considerations, facilitating sustainable change through systematic intervention.`;
    }
    
    console.log('✅ Final result with guaranteed HERE\'S YOU:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Parsing error:', error);
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

    console.log('🎯 Generating clinical-level persona for:', therapistName);

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

    // FINAL CLINICAL SAFETY CHECK
    if (!structuredPersona.heresYou || structuredPersona.heresYou.length < 15) {
      console.log('🚨 EMERGENCY: Generating clinical HERE\'S YOU');
      structuredPersona.heresYou = `Your specialization in ${focus} and extensive work with ${preferredClientType.toLowerCase()} creates optimal therapeutic conditions for this presentation. You utilize evidence-based interventions while maintaining relational focus, addressing both symptom reduction and systemic change. Your clinical framework integrates assessment, intervention, and outcome measurement to ensure sustainable therapeutic progress.`;
    }

    return res.status(200).json({
      success: true,
      persona: structuredPersona,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        heresYouLength: structuredPersona.heresYou.length,
        clinicalLevel: true
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

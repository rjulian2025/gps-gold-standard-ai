// COMPLETE V2 API - Self-contained, no imports needed

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1500,
    temperature: 0.15,
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

// Check if therapist works with minors (teens/kids)
function isMinorSpecialist(preferredClientType, focus) {
  const minorKeywords = ['teen', 'teenager', 'adolescent', 'child', 'children', 'kid', 'youth', 'minor', 'student'];
  const clientType = (preferredClientType || '').toLowerCase();
  const focusArea = (focus || '').toLowerCase();
  
  return minorKeywords.some(keyword => 
    clientType.includes(keyword) || focusArea.includes(keyword)
  );
}

// Generate HERE'S YOU content
async function generateHeresYou(therapistData) {
  const { therapistName, focus, preferredClientType } = therapistData;
  
  const heresYouPrompt = `Write a "Here's You" section for therapist ${therapistName}.

Describe the THERAPIST'S approach and expertise in 75-90 words.

Focus on:
- Their clinical strengths in ${focus}
- Why they're suited for ${preferredClientType}
- Their therapeutic approach

Write professionally, addressing the therapist as "You."`;

  return await callAnthropicAPI(heresYouPrompt);
}

// Generate persona content with TEMPLATE approach (V2 improved version)
async function generatePersonaContentV2(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `You are creating a professional client profile for therapist ${therapistName}.

${isForParents ? 'The client is a PARENT dealing with struggling teens/children.' : 'The client is an ADULT seeking therapy.'}

FOLLOW THIS EXACT STRUCTURE:

**PERSONA TITLE:** [Create a compelling title - no "The" prefix needed]

**WHO THEY ARE**
[Start with one of these natural openings, then continue for 150-180 words in 2 paragraphs:
- "In the quiet of your office, they..."
- "Behind their composed exterior..."  
- "They arrive carrying..."
- "Their hesitant voice reveals..."
- "Sitting across from you, they..."]

[First paragraph: 60-80 words about their surface presentation and immediate concerns]

[Second paragraph: 70-100 words about deeper psychological patterns and inner experience]

**WHAT THEY NEED** 
[45-60 words about therapeutic support needed, using professional language]

**THERAPIST FIT**
[45-60 words starting with "You understand..." explaining why you're the right therapist]

**KEY HOOKS**
* *"[First person quote showing their inner experience]"*
* *"[Second quote about their struggle]"*  
* *"[Third quote about their hopes/fears]"*

CONTENT GUIDANCE:
- Client traits that energize the therapist: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Client traits that can be challenging: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

CRITICAL RULES:
- Use complete sentences with proper grammar
- Include specific psychological insights and behavioral details
- Create emotional resonance through concrete examples
- STOP immediately after the third key hook
- NEVER add "How to Use" sections or usage instructions

Write professionally with empathy and psychological depth.`;

  return await callAnthropicAPI(personaPrompt);
}

function parsePersonaContent(rawContent) {
  const result = {
    title: '',
    persona: '',
    whatTheyNeed: '',
    therapistFit: '',
    hooks: []
  };

  try {
    // Extract title
    const titleMatch = rawContent.match(/\*\*PERSONA TITLE:\*\*(.*?)(?=\n|\*\*)/);
    if (titleMatch) {
      result.title = titleMatch[1].trim().replace(/^The\s+/, '');
    }

    // Extract persona (look for "WHO THEY ARE" section)
    const personaMatch = rawContent.match(/\*\*WHO THEY ARE\*\*(.*?)(?=\*\*WHAT THEY NEED|\*\*THERAPIST FIT|\*\*KEY HOOKS|$)/s);
    if (personaMatch) {
      result.persona = personaMatch[1].trim().replace(/\n\s*\n/g, '\n\n');
    }

    // Extract What They Need
    const whatTheyNeedMatch = rawContent.match(/\*\*WHAT THEY NEED\*\*(.*?)(?=\*\*THERAPIST FIT|\*\*KEY HOOKS|$)/s);
    if (whatTheyNeedMatch) {
      result.whatTheyNeed = whatTheyNeedMatch[1].trim();
    }

    // Extract Therapist Fit
    const therapistFitMatch = rawContent.match(/\*\*THERAPIST FIT\*\*(.*?)(?=\*\*KEY HOOKS|$)/s);
    if (therapistFitMatch) {
      result.therapistFit = therapistFitMatch[1].trim();
    }

    // Extract hooks
    const hookPattern = /\*\s*\*"([^"]+)"\*/g;
    const keyHooksStart = rawContent.indexOf('**KEY HOOKS**');
    
    if (keyHooksStart > -1) {
      let hooksSection = rawContent.substring(keyHooksStart);
      const hookMatches = [...hooksSection.matchAll(hookPattern)];
      
      for (const match of hookMatches) {
        const hookText = match[1].trim();
        result.hooks.push({
          headline: hookText,
          subline: '' // V2 uses simple quote format
        });
      }
    }
  } catch (error) {
    console.log('⚠️ V2 Parsing error:', error.message);
  }

  return result;
}

export default async function handler(req, res) {
  console.log('🚨 V2 TEMPLATE VERSION - TIMESTAMP:', new Date().toISOString());
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Processing V2 request...');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating V2 for:', therapistName);

    // Generate HERE'S YOU
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content with NEW TEMPLATE approach
    const rawPersonaContent = await generatePersonaContentV2(therapistData);
    console.log('📄 V2 content generated, length:', rawPersonaContent.length);
    
    const parsedPersona = parsePersonaContent(rawPersonaContent);
    console.log('✅ V2 content parsed successfully');

    // Light grammar cleanup
    if (parsedPersona.persona) {
      parsedPersona.persona = parsedPersona.persona
        .replace(/They arrive with,/gi, 'They arrive with a heavy expression,')
        .replace(/In the quiet of your office,/gi, 'In the quiet of your office, they')
        .replace(/Behind their composed exterior,/gi, 'Behind their composed exterior, there lies');
    }

    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Adult Seeking Support'),
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}.`,
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding.`,
      therapistFit: parsedPersona.therapistFit || `You understand the complexities of ${focus} and provide both clinical skill and authentic connection.`,
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    console.log('✅ V2 Success - sending response');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        version: 'TEMPLATE_V2'
      }
    });

  } catch (error) {
    console.error('❌ V2 Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate V2 persona',
      details: error.message
    });
  }
}

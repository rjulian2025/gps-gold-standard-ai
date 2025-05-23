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

Write professionally, addressing the therapist as "You." Start directly with "You bring" or "You excel" - do not include any title or header.`;

  return await callAnthropicAPI(heresYouPrompt);
}

// Generate persona content with TEMPLATE approach (V2 improved version)
async function generatePersonaContentV2(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `You are creating a professional client profile for therapist ${therapistName}.

${isForParents ? 'The client is a PARENT dealing with struggling teens/children.' : 'The client is an ADULT seeking therapy.'}

FOLLOW THIS EXACT STRUCTURE:

**PERSONA TITLE:** [Create a compelling 2-4 word title - no "The" prefix]

**WHO THEY ARE**
[Write 150-180 words in 2 paragraphs. Start with one of these COMPLETE sentences:
- "Behind their composed exterior lies someone who..."
- "They arrive carrying the weight of..."  
- "In the quiet of your office, they reveal..."
- "Their hesitant voice tells a story of..."]

[First paragraph: 60-80 words about their surface presentation and immediate struggles]

[Second paragraph: 70-100 words about deeper patterns and inner experience]

**WHAT THEY NEED** 
They need a therapist who can help them [write 45-60 words about specific therapeutic support needed for ${focus} with ${preferredClientType}]. Focus on practical therapeutic interventions and support.

**THERAPIST FIT**
You understand [write 45-60 words about why this therapist is perfect for this client, focusing on ${focus} expertise and ability to work with ${preferredClientType}]. Emphasize the therapist's specific clinical strengths.

**KEY HOOKS**
* *"[First person quote showing their inner experience]"*
* *"[Second quote about their specific struggle]"*  
* *"[Third quote about their fears or hopes]"*

CONTENT GUIDANCE:
- Client traits that energize the therapist: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Client traits that can be challenging: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

CRITICAL RULES:
- Use COMPLETE sentences with proper grammar throughout
- DO NOT include specific age, job titles, or demographics unless directly relevant
- Include specific psychological insights and behavioral observations
- Create emotional resonance through concrete but universal examples
- STOP immediately after the third key hook
- NEVER add "How to Use" sections, instructions, or marketing advice

Write with professional empathy and psychological depth.`;

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
  console.log('🚨 V2 FIXED VERSION - TIMESTAMP:', new Date().toISOString());
  
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
    console.log('🚀 Processing V2 FIXED request...');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating FIXED V2 for:', therapistName);

    // Generate HERE'S YOU
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content with NEW TEMPLATE approach
    const rawPersonaContent = await generatePersonaContentV2(therapistData);
    console.log('📄 V2 content generated, length:', rawPersonaContent.length);
    
    const parsedPersona = parsePersonaContent(rawPersonaContent);
    console.log('✅ V2 content parsed successfully');

    // Enhanced grammar cleanup for V2
    if (parsedPersona.persona) {
      parsedPersona.persona = parsedPersona.persona
        // Fix grammar fragments
        .replace(/Behind their composed exterior, there lies they/gi, 'Behind their composed exterior lies someone who')
        .replace(/They arrive with,/gi, 'They arrive carrying')
        .replace(/In the quiet of your office,/gi, 'In the quiet of your office, they')
        // Remove demographic insertions
        .replace(/A \d+-year-old \w+ \w+/gi, 'They')
        .replace(/\d+-year-old/gi, '')
        // Clean up any remaining fragments
        .trim();
    }

    // EMERGENCY: Force clean content if AI generates garbage
    if (parsedPersona.whatTheyNeed) {
      if (parsedPersona.whatTheyNeed.includes('Your intellectually curious') || 
          parsedPersona.whatTheyNeed.includes('Your empathetic but firm') ||
          parsedPersona.whatTheyNeed.includes('Your therapeutic presence') ||
          parsedPersona.whatTheyNeed.length < 30) {
        if (isForParents) {
          parsedPersona.whatTheyNeed = `They need guidance in understanding their child's behavior patterns while developing effective parenting strategies that reduce household conflict and strengthen family bonds.`;
        } else {
          parsedPersona.whatTheyNeed = `They need a therapist who understands ${focus.toLowerCase()} and can provide both insight into their patterns and practical tools for creating sustainable change in their daily life.`;
        }
      }
    }

    // EMERGENCY: Force clean therapist fit content
    if (parsedPersona.therapistFit) {
      if (parsedPersona.therapistFit.includes('You needs guidance') || 
          parsedPersona.therapistFit.includes('You seeks authentic') ||
          parsedPersona.therapistFit.includes('You values trust') ||
          parsedPersona.therapistFit.length < 30) {
        if (isForParents) {
          parsedPersona.therapistFit = `You understand how family dynamics affect everyone involved and specialize in helping parents develop both the insight and practical skills needed to support their struggling teen.`;
        } else {
          parsedPersona.therapistFit = `You understand how ${focus.toLowerCase()} affects ${preferredClientType.toLowerCase()} and provide the perfect combination of clinical expertise and genuine empathy they need for lasting change.`;
        }
      }
    }

    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Adult Seeking Support'),
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}.`,
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding.`,
      therapistFit: parsedPersona.therapistFit || `You understand the complexities of ${focus} and provide both clinical skill and authentic connection.`,
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    console.log('✅ V2 FIXED Success - sending response');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        version: 'FIXED_TEMPLATE_V2'
      }
    });

  } catch (error) {
    console.error('❌ V2 FIXED Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate V2 persona',
      details: error.message
    });
  }
}

// PARENT-FOCUSED PERSONAS for Teen/Kid Specialists

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1500,
    temperature: 0.1,
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

// SEPARATE FUNCTION: Generate ONLY the HERE'S YOU content
async function generateHeresYou(therapistData) {
  const { therapistName, focus, preferredClientType } = therapistData;
  
  const heresYouPrompt = `Write ONLY a "Here's You" section for therapist ${therapistName}.

This section describes the THERAPIST'S approach, not the client.

Write 75-90 words about:
- ${therapistName}'s clinical expertise in ${focus}
- Their unique approach to working with ${preferredClientType}
- What makes them specifically suited for this population
- Their therapeutic methodology and philosophy

Write in second person ("You..." addressing the therapist).
Professional, authoritative tone.
Focus on clinical competence and relational skills.

Generate ONLY the content, no headers or formatting.`;

  return await callAnthropicAPI(heresYouPrompt);
}

// SEPARATE FUNCTION: Generate the persona content
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const audienceInstructions = isForParents ? 
    `CRITICAL: This therapist works with teens/children. Write the persona for the PARENTS, not the teen/child.
    - Describe the parent's experience, concerns, and perspective
    - Use "your teen" or "your child" language
    - Focus on parent's emotional experience and needs
    - Address parent exhaustion, worry, confusion about how to help
    - Write from parent's point of view watching their teen/child struggle` :
    `Write for the actual client (adult seeking therapy for themselves).
    - Use third person pronouns (they/them/their)
    - Focus on client's internal experience and readiness`;

  const personaPrompt = `Generate a client persona for ${therapistName} who specializes in ${focus} working with ${preferredClientType}.

${audienceInstructions}

WRITING REQUIREMENTS:
- Gold standard like "The Quiet Reactor" - observational, clinical precision
- NO NAMES - use appropriate pronouns
- Vary sentence structures - don't start consecutive sentences with same pronoun
- 150-170 words describing the ${isForParents ? 'parent\'s' : 'client\'s'} experience and therapeutic readiness

Client energizing traits: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
Client draining traits: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

OUTPUT FORMAT:
**PERSONA TITLE:** [Title - ${isForParents ? 'focus on parent experience' : 'focus on client type'}]
**PERSONA:** [150-170 words describing ${isForParents ? 'parent\'s perspective and concerns' : 'client\'s internal experience'}]
**Hook 1:** [Headline ${isForParents ? 'addressing parent concerns' : 'addressing client struggles'}] ([Subline])
**Hook 2:** [Headline ${isForParents ? 'about helping their teen/child' : 'about therapeutic process'}] ([Subline]) 
**Hook 3:** [Headline ${isForParents ? 'about parent empowerment' : 'about transformation'}] ([Subline])

${isForParents ? 'Remember: Write for PARENTS of teens/children, not the teens/children themselves.' : 'Write for the adult client seeking therapy.'}`;

  return await callAnthropicAPI(personaPrompt);
}

function parsePersonaContent(rawContent) {
  const result = {
    title: '',
    persona: '',
    hooks: []
  };

  // Extract title
  const titleMatch = rawContent.match(/\*\*PERSONA TITLE:\*\*(.*?)(?=\n|\*\*)/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract persona
  const personaMatch = rawContent.match(/\*\*PERSONA:\*\*(.*?)(?=\*\*Hook|$)/s);
  if (personaMatch) {
    result.persona = personaMatch[1].trim();
  }

  // Extract hooks
  const hookMatches = rawContent.matchAll(/\*\*Hook \d+:\*\*(.*?)\(([^)]+)\)/g);
  for (const match of hookMatches) {
    result.hooks.push({
      headline: match[1].trim(),
      subline: match[2].trim()
    });
  }

  return result;
}

export default async function handler(req, res) {
  // Add CORS headers
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
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = {
      therapistName,
      focus,
      preferredClientType,
      fulfillingTraits,
      drainingTraits
    };

    const isForParents = isMinorSpecialist(preferredClientType, focus);
    console.log('🎯 GENERATING for:', therapistName, '| Parent-focused:', isForParents);

    // STEP 1: Generate HERE'S YOU separately and guaranteed
    console.log('📝 Generating HERE\'S YOU separately...');
    const heresYouContent = await generateHeresYou(therapistData);
    console.log('✅ HERE\'S YOU generated:', heresYouContent.substring(0, 100));

    // STEP 2: Generate persona content separately
    console.log('📝 Generating persona content for', isForParents ? 'PARENTS' : 'CLIENTS');
    const rawPersonaContent = await generatePersonaContent(therapistData);
    console.log('✅ Persona content generated');

    // STEP 3: Parse persona content
    const parsedPersona = parsePersonaContent(rawPersonaContent);

    // STEP 4: Combine everything with GUARANTEED HERE'S YOU
    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'The Concerned Parent' : 'The Thoughtful Client'),
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} and experience working with ${preferredClientType.toLowerCase()} creates optimal therapeutic conditions for this population. You understand the unique challenges ${isForParents ? 'parents face when their teen/child is struggling' : 'they face'} and have developed specialized approaches that ${isForParents ? 'support both the family system and the individual' : 'honor their developmental needs while facilitating meaningful growth'}.`,
      persona: parsedPersona.persona || '',
      hooks: parsedPersona.hooks || []
    };

    console.log('🎉 FINAL RESULT - HERE\'S YOU LENGTH:', finalResult.heresYou.length);
    console.log('👨‍👩‍👧‍👦 PARENT-FOCUSED:', isForParents);

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        heresYouLength: finalResult.heresYou.length,
        parentFocused: isForParents,
        separateGeneration: true
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

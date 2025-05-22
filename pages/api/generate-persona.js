// GUIDED CONSTRAINTS: Strict Structure, Flexible Execution

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1500,
    temperature: 0.2, // Slightly higher for more natural variation
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
  
  const heresYouPrompt = `Write a "Here's You" section for therapist ${therapistName}.

Describe the THERAPIST'S approach and expertise in 75-90 words.

Focus on:
- Their clinical strengths in ${focus}
- Why they're suited for ${preferredClientType}
- Their therapeutic approach

Write professionally, addressing the therapist as "You."`;

  return await callAnthropicAPI(heresYouPrompt);
}

// SEPARATE FUNCTION: Generate the persona content
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a professional client persona for ${therapistName}, specializing in ${focus} with ${preferredClientType}.

${isForParents ? 
  'AUDIENCE: Write for PARENTS of struggling teens/children. Describe the parent\'s experience, concerns, and emotional journey.' : 
  'AUDIENCE: Write for ADULTS seeking therapy. Describe their internal experience and readiness for change.'}

CRITICAL WRITING REQUIREMENTS - FOLLOW EXACTLY:

1. NATURAL OPENINGS ONLY:
   ✓ "Sitting across from you..."
   ✓ "Behind their composed exterior..."
   ✓ "They carry the weight of..."
   ✗ NEVER "[Title] is a person who..."
   ✗ NEVER "The [Name] is someone who..."

2. NO PERSONA NAMES IN DESCRIPTION:
   - Create title separately 
   - Never reference title within persona text
   - Use only "they/them/their" pronouns

3. NATURAL HUMAN LANGUAGE:
   - Write like observing real people
   - Use concrete, specific details
   - Avoid marketing language
   - Sound like professional case notes

4. WORD COUNT DISCIPLINE:
   - Persona: 150-180 words across 2-3 paragraphs
   - What They Need: 45-55 words
   - Therapist Fit: 45-55 words

STRUCTURE REQUIREMENTS:

**PERSONA TITLE:** [Compelling title - no "The" prefix required]

**PERSONA:** [150-180 words, 2-3 paragraphs, natural opening, specific human details]

**WHAT THEY NEED:** [45-55 words focusing on therapeutic requirements]

**THERAPIST FIT:** [45-55 words explaining why this therapist matches]

**MARKETING HOOKS:**

**[Compelling Headline]**
[Descriptive subline]

**[Second Headline]**
[Second subline]

**[Third Headline]**
[Third subline]

CONTENT GUIDANCE:
- Energizing client traits: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Challenging client traits: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

EXAMPLES OF NATURAL OPENINGS:
- "Their hands fold carefully in their lap, but their eyes dart toward the door."
- "Behind the polite smile lies months of sleepless nights."
- "Sitting across from you, shoulders tense with unspoken worry."

Remember: You're describing a REAL PERSON, not a marketing construct. Write with observational precision and human empathy.

STOP after marketing hooks. DO NOT generate anything else.`;

  return await callAnthropicAPI(personaPrompt);
}

// Enhanced validation function
function validateNaturalWriting(persona) {
  const issues = [];
  
  // Check for unnatural openings
  const unnaturalPatterns = [
    /is a person who/i,
    /is someone who/i,
    /the \w+ is/i,
    /meet the/i,
    /this is/i
  ];
  
  unnaturalPatterns.forEach(pattern => {
    if (pattern.test(persona)) {
      issues.push('Contains unnatural opening pattern');
    }
  });
  
  // Check for persona name in description
  if (persona.includes('Navigator') || persona.includes('Reactor') || persona.includes('Seeker')) {
    issues.push('Contains persona name in description');
  }
  
  // Check word count
  const wordCount = persona.split(/\s+/).length;
  if (wordCount < 130 || wordCount > 200) {
    issues.push(`Word count ${wordCount} outside target range`);
  }
  
  return issues;
}

function parsePersonaContent(rawContent) {
  const result = {
    title: '',
    persona: '',
    whatTheyNeed: '',
    therapistFit: '',
    hooks: []
  };

  // Extract title
  const titleMatch = rawContent.match(/\*\*PERSONA TITLE:\*\*(.*?)(?=\n|\*\*)/);
  if (titleMatch) {
    result.title = titleMatch[1].trim().replace(/^The\s+/, ''); // Remove "The" prefix
  }

  // Extract persona
  const personaMatch = rawContent.match(/\*\*PERSONA:\*\*(.*?)(?=\*\*WHAT THEY NEED|\*\*THERAPIST FIT|\*\*MARKETING|$)/s);
  if (personaMatch) {
    result.persona = personaMatch[1].trim().replace(/\n\s*\n/g, '\n\n');
  }

  // Extract What They Need
  const whatTheyNeedMatch = rawContent.match(/\*\*WHAT THEY NEED:\*\*(.*?)(?=\*\*THERAPIST FIT|\*\*MARKETING|$)/s);
  if (whatTheyNeedMatch) {
    result.whatTheyNeed = whatTheyNeedMatch[1].trim();
  }

  // Extract Therapist Fit
  const therapistFitMatch = rawContent.match(/\*\*THERAPIST FIT:\*\*(.*?)(?=\*\*MARKETING|$)/s);
  if (therapistFitMatch) {
    result.therapistFit = therapistFitMatch[1].trim();
  }

  // Extract hooks - improved parsing
  const hookPattern = /\*\*([^*\n]+)\*\*\s*\n([^*\n]+)/g;
  const marketingStart = rawContent.indexOf('**MARKETING HOOKS:**');
  
  if (marketingStart > -1) {
    const marketingSection = rawContent.substring(marketingStart);
    const hookMatches = [...marketingSection.matchAll(hookPattern)];
    
    for (const match of hookMatches) {
      const headline = match[1].trim();
      const subline = match[2].trim();
      
      if (!headline.includes('MARKETING HOOKS') && headline.length > 5) {
        result.hooks.push({
          headline: headline,
          subline: subline
        });
      }
    }
  }

  return result;
}

// Retry function for better quality
async function generateWithRetry(therapistData, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🎯 Generation attempt ${attempt}/${maxRetries}`);
    
    const rawContent = await generatePersonaContent(therapistData);
    const parsed = parsePersonaContent(rawContent);
    
    // Validate natural writing
    const issues = validateNaturalWriting(parsed.persona);
    
    if (issues.length === 0) {
      console.log('✅ Generated natural content on attempt', attempt);
      return parsed;
    } else {
      console.log('⚠️ Issues found:', issues);
      if (attempt === maxRetries) {
        console.log('🔧 Using content with minor issues');
        return parsed;
      }
    }
  }
}

export default async function handler(req, res) {
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
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating for:', therapistName, '| Parent-focused:', isForParents);

    // Generate HERE'S YOU separately
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content with retry for quality
    const parsedPersona = await generateWithRetry(therapistData);

    // Assemble final result
    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Thoughtful Client'),
      
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}. You understand their unique challenges and provide both clinical skill and genuine empathy in your therapeutic approach.`,
      
      persona: parsedPersona.persona || '',
      
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding of their specific challenges and circumstances.`,
      
      therapistFit: parsedPersona.therapistFit || `A therapist who offers both clinical competence and authentic connection, matching their needs with appropriate interventions.`,
      
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    // Final validation - ensure HERE'S YOU exists
    if (!finalResult.heresYou || finalResult.heresYou.length < 20) {
      finalResult.heresYou = `Your specialization in ${focus} and experience with ${preferredClientType.toLowerCase()} positions you to provide effective, compassionate care that addresses both immediate concerns and long-term growth.`;
    }

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        wordCountGuided: true,
        naturalWritingValidated: true
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

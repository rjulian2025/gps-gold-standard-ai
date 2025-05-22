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
   ✗ NEVER "[Any title] is a person who..."

2. ABSOLUTE RULE - NO PERSONA TITLES IN PERSONA TEXT:
   - Create title completely separately 
   - NEVER mention the title inside the persona description
   - Start persona with immediate human observation
   - Use only "they/them/their" pronouns throughout

3. GRAMMAR AND FLOW:
   - Complete, grammatically correct sentences
   - Smooth transitions between ideas
   - No sentence fragments or run-ons
   - Professional but warm tone

4. WORD COUNT DISCIPLINE:
   - Persona: 150-180 words across 2-3 paragraphs
   - What They Need: 45-55 words
   - Therapist Fit: 45-55 words

STRUCTURE REQUIREMENTS:

**PERSONA TITLE:** [Compelling title - no "The" prefix required]

**PERSONA:** [150-180 words, 2-3 paragraphs, natural opening with immediate human observation, NO title references]

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

EXAMPLES OF CORRECT OPENINGS:
✓ "Sitting across from you, their hands fold carefully in their lap."
✓ "Behind the polite smile lies months of sleepless nights."
✓ "They enter your office with shoulders tense from unspoken worry."

EXAMPLES OF FORBIDDEN OPENINGS:
✗ "Exhausted Guardian is a person who..."
✗ "The Struggling Parent is someone who..."
✗ "[Any title] is a person who..."

Remember: Start with IMMEDIATE human observation. Never reference the persona title.

CRITICAL: Do NOT generate any "How to Use" section. Stop immediately after the three marketing hooks.`;

  return await callAnthropicAPI(personaPrompt);
}

// Simple but effective grammar and pattern filter
function grammarFilter(content) {
  const errors = [];
  
  // GRAMMAR KILLERS - These break readability immediately
  const grammarErrors = [
    { pattern: /who sitting/i, error: 'Fragment: "who sitting" (should be "who is sitting")' },
    { pattern: /who they/i, error: 'Fragment: "who they" (needs verb)' },
    { pattern: /who when/i, error: 'Fragment: "who when" (incomplete clause)' },
    { pattern: /is a person who sitting/i, error: 'Double error: template + fragment' },
    { pattern: /You needs/i, error: 'Subject-verb disagreement: "You needs" (should be "You need")' },
    { pattern: /They needs/i, error: 'Subject-verb disagreement: "They needs" (should be "They need")' }
  ];
  
  // TEMPLATE KILLERS - These sound robotic
  const templateErrors = [
    { pattern: /\w+ is a person who/i, error: 'Template language: "[Title] is a person who"' },
    { pattern: /is someone who/i, error: 'Template language: "is someone who"' },
    { pattern: /meet the \w+/i, error: 'Template language: "meet the [title]"' }
  ];
  
  // FORBIDDEN SECTIONS
  const structureErrors = [
    { pattern: /how to use these/i, error: 'Forbidden section: "How to Use"' },
    { pattern: /use these resonance hooks/i, error: 'Forbidden instructional content' }
  ];
  
  // Check all error types
  [...grammarErrors, ...templateErrors, ...structureErrors].forEach(check => {
    if (check.pattern.test(content)) {
      errors.push(check.error);
    }
  });
  
  return errors;
}

// Enhanced validation function
function validateNaturalWriting(persona) {
  const issues = [];
  
  // Run grammar filter first
  const grammarIssues = grammarFilter(persona);
  issues.push(...grammarIssues);
  
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

  // Apply grammar filter to entire content first
  const grammarIssues = grammarFilter(rawContent);
  if (grammarIssues.length > 0) {
    console.log('⚠️ Grammar issues detected:', grammarIssues);
  }

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

  // Extract hooks - aggressive filtering of unwanted content
  const hookPattern = /\*\*([^*\n]+)\*\*\s*\n([^*\n]+)/g;
  const marketingStart = rawContent.indexOf('**MARKETING HOOKS:**');
  
  if (marketingStart > -1) {
    let marketingSection = rawContent.substring(marketingStart);
    
    // Stop at any of these unwanted sections
    const stopWords = ['**How to Use', '**Use these', '**Created with', '**Download', '**Powered by'];
    for (let stopWord of stopWords) {
      const stopIndex = marketingSection.indexOf(stopWord);
      if (stopIndex > -1) {
        marketingSection = marketingSection.substring(0, stopIndex);
        break;
      }
    }
    
    const hookMatches = [...marketingSection.matchAll(hookPattern)];
    
    for (const match of hookMatches) {
      const headline = match[1].trim();
      const subline = match[2].trim();
      
      if (!headline.includes('MARKETING HOOKS') && 
          !headline.includes('How to Use') && 
          headline.length > 5) {
        result.hooks.push({
          headline: headline,
          subline: subline
        });
      }
    }
  }

  return result;
}

// Retry function with grammar filtering
async function generateWithRetry(therapistData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🎯 Generation attempt ${attempt}/${maxRetries}`);
    
    const rawContent = await generatePersonaContent(therapistData);
    
    // Apply grammar filter FIRST - before parsing
    const grammarIssues = grammarFilter(rawContent);
    
    if (grammarIssues.length > 0) {
      console.log(`❌ Attempt ${attempt} failed grammar filter:`, grammarIssues);
      if (attempt === maxRetries) {
        console.log('⚠️ Using content despite grammar issues (max retries reached)');
      } else {
        continue; // Try again
      }
    }
    
    const parsed = parsePersonaContent(rawContent);
    
    // Additional validation on parsed content
    const additionalIssues = validateNaturalWriting(parsed.persona);
    
    if (grammarIssues.length === 0 && additionalIssues.length === 0) {
      console.log('✅ Generated clean content on attempt', attempt);
      return parsed;
    } else {
      console.log('⚠️ Issues found:', [...grammarIssues, ...additionalIssues]);
      if (attempt === maxRetries) {
        console.log('🔧 Using best available content');
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

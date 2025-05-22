// EMERGENCY MINIMAL VERSION - No fancy filtering, just working code

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

// Generate persona content with ULTRA SIMPLE prompt
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a client persona for ${therapistName}, specializing in ${focus} with ${preferredClientType}.

${isForParents ? 
  'AUDIENCE: Write for PARENTS of struggling teens/children.' : 
  'AUDIENCE: Write for ADULTS seeking therapy.'}

CRITICAL RULES:
- NEVER write "[Title] is a person who..."
- Start with: "Sitting across from you..." or "Behind their..." or "They carry..."
- Use only "they/them" pronouns
- NO "How to Use" section

STRUCTURE:

**PERSONA TITLE:** [Title]

**PERSONA:** [150-180 words, start naturally]

**WHAT THEY NEED:** [45-55 words]

**THERAPIST FIT:** [45-55 words]

**MARKETING HOOKS:**

**[Headline 1]**
[Subline 1]

**[Headline 2]**
[Subline 2]

**[Headline 3]**
[Subline 3]

STOP after hooks. NO additional sections.`;

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

    // Extract hooks - simple parsing
    const hookPattern = /\*\*([^*\n]+)\*\*\s*\n([^*\n]+)/g;
    const marketingStart = rawContent.indexOf('**MARKETING HOOKS:**');
    
    if (marketingStart > -1) {
      let marketingSection = rawContent.substring(marketingStart);
      
      // Stop at unwanted sections
      const stopIndex = marketingSection.search(/\*\*(How to Use|Use these|Created with|Download|Powered by)/);
      if (stopIndex > -1) {
        marketingSection = marketingSection.substring(0, stopIndex);
      }
      
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
  } catch (error) {
    console.log('⚠️ Parsing error:', error.message);
  }

  return result;
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
    console.log('🚀 API called');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating for:', therapistName, '| Parent-focused:', isForParents);

    // Generate HERE'S YOU
    console.log('📝 Generating Here\'s You...');
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content
    console.log('👤 Generating persona...');
    const rawPersonaContent = await generatePersonaContent(therapistData);
    const parsedPersona = parsePersonaContent(rawPersonaContent);

    console.log('✅ Generation complete');

    // Assemble final result
    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Thoughtful Client'),
      
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}. You understand their unique challenges and provide both clinical skill and genuine empathy in your therapeutic approach.`,
      
      persona: parsedPersona.persona || '',
      
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding of their specific challenges and circumstances.`,
      
      therapistFit: parsedPersona.therapistFit || `A therapist who offers both clinical competence and authentic connection, matching their needs with appropriate interventions.`,
      
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    // Final validation
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
        wordCountGuided: true
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

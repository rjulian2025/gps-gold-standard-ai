// EMERGENCY ROLLBACK - Last known working version with basic fixes

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

// SIMPLE WORKING VERSION - Generate persona content
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a client persona for ${therapistName}, specializing in ${focus} with ${preferredClientType}.

${isForParents ? 'Focus on PARENTS dealing with troubled teens.' : 'Focus on ADULTS seeking therapy.'}

RULES:
- Start with "Sitting across from you," or "Behind their composed exterior," or "They arrive with"
- NEVER write "[Title] is a person who..."
- Use "they/them" pronouns
- Write 150-180 words for persona section
- NO "How to Use" section

STRUCTURE:

**PERSONA TITLE:** [Title]

**PERSONA:** 
[Start naturally, 150-180 words]

**WHAT THEY NEED:** 
[45-55 words]

**THERAPIST FIT:** 
[45-55 words using "You" to address therapist]

**MARKETING HOOKS:**

**[Headline]**
[Subline]

**[Headline]** 
[Subline]

**[Headline]**
[Subline]

STOP after hooks.`;

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

    // Extract hooks
    const hookPattern = /\*\*([^*\n]+)\*\*\s*\n([^*\n]+)/g;
    const marketingStart = rawContent.indexOf('**MARKETING HOOKS:**');
    
    if (marketingStart > -1) {
      let marketingSection = rawContent.substring(marketingStart);
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
  console.log('🚨 EMERGENCY ROLLBACK VERSION - TIMESTAMP:', new Date().toISOString());
  
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
    console.log('🚀 Processing request...');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating for:', therapistName);

    // Generate HERE'S YOU
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content
    const rawPersonaContent = await generatePersonaContent(therapistData);
    const parsedPersona = parsePersonaContent(rawPersonaContent);

    // Basic grammar fixes
    if (parsedPersona.persona) {
      parsedPersona.persona = parsedPersona.persona
        .replace(/\w+ is a person who sitting/gi, 'Sitting')
        .replace(/\w+ is a person who/gi, 'They are someone who')
        .replace(/who sitting/gi, 'who is sitting');
    }
    
    if (parsedPersona.therapistFit) {
      parsedPersona.therapistFit = parsedPersona.therapistFit
        .replace(/You needs/gi, 'You need')
        .replace(/You seeks/gi, 'You seek')
        .replace(/You values/gi, 'You value');
    }

    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Thoughtful Client'),
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}.`,
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding.`,
      therapistFit: parsedPersona.therapistFit || `A therapist who offers both clinical competence and authentic connection.`,
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    console.log('✅ Success - sending response');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        version: 'EMERGENCY_ROLLBACK'
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

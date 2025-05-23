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

// NUCLEAR OPTION - Ultra-aggressive prompt to stop bad patterns
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `You are writing a client description for therapist ${therapistName}.

${isForParents ? 'The client is a PARENT dealing with troubled teens.' : 'The client is an ADULT seeking therapy.'}

FOLLOW THIS EXACT FORMAT:

**PERSONA TITLE:** [Write a compelling title]

**PERSONA:** 
Sitting across from you, they [write 150-180 words describing this person's experience and challenges using only "they/them/their" pronouns]

**WHAT THEY NEED:** 
These clients need [45-55 words about therapeutic support]

**THERAPIST FIT:**
You understand [45-55 words about why you're the right therapist]

**MARKETING HOOKS:**

**[Write compelling headline]**
[Write supporting text]

**[Write second headline]** 
[Write supporting text]

**[Write third headline]**
[Write supporting text]

CRITICAL GRAMMAR RULES:
1. Start the persona with "Sitting across from you, they"
2. Never write the persona title inside the persona description
3. Use "You understand" or "You offer" for therapist fit
4. Use complete sentences only
5. Stop writing after the third marketing hook

Write professionally and naturally. Begin now.`;

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

    // NUCLEAR grammar fixes - catch everything
    console.log('🔧 Applying nuclear grammar fixes...');
    
    if (parsedPersona.persona) {
      const originalPersona = parsedPersona.persona;
      
      parsedPersona.persona = parsedPersona.persona
        // Remove any "[Title] is a person who" patterns
        .replace(/^.*is a person who sitting/gi, 'Sitting')
        .replace(/^.*is a person who/gi, 'They are')
        .replace(/who sitting/gi, 'who is sitting')
        .replace(/Silent Sufferer is a person who/gi, '')
        .replace(/Desperate Navigator is a person who/gi, '')
        .replace(/Functional Struggler is a person who/gi, '')
        .replace(/Exhausted Guardian is a person who/gi, '')
        .replace(/High-Achieving Burnout Survivor is a person who/gi, '')
        .replace(/Family Peacemaker is a person who/gi, '')
        // Clean up any remaining fragments
        .replace(/^sitting across from you,/gi, 'Sitting across from you,')
        .trim();
      
      console.log('🔧 Original start:', originalPersona.substring(0, 80));
      console.log('🔧 Fixed start:', parsedPersona.persona.substring(0, 80));
    }
    
    if (parsedPersona.whatTheyNeed) {
      parsedPersona.whatTheyNeed = parsedPersona.whatTheyNeed
        .replace(/Build a trusting therapeutic relationship through authentic connection. Provide specialized expertise that addresses their specific challenges. Offer a safe space for vulnerability and growth/gi, 
          'Professional expertise combined with genuine understanding of their specific challenges and circumstances.');
    }
    
    if (parsedPersona.therapistFit) {
      const originalFit = parsedPersona.therapistFit;
      
      parsedPersona.therapistFit = parsedPersona.therapistFit
        .replace(/You needs/gi, 'You need')
        .replace(/You seeks/gi, 'You seek')
        .replace(/You values/gi, 'You value')
        // Replace generic content
        .replace(/You needs guidance through emotional challenges. You seeks authentic connection and understanding. You values trust and expertise in therapeutic relationships./gi,
          'You offer both clinical competence and authentic connection, matching their needs with appropriate interventions.');
      
      console.log('🔧 Original therapist fit:', originalFit);
      console.log('🔧 Fixed therapist fit:', parsedPersona.therapistFit);
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

// V2 MINIMAL WORKING VERSION - Rollback to stable state

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

function isMinorSpecialist(preferredClientType, focus) {
  const minorKeywords = ['teen', 'teenager', 'adolescent', 'child', 'children', 'kid', 'youth', 'minor', 'student'];
  const clientType = (preferredClientType || '').toLowerCase();
  const focusArea = (focus || '').toLowerCase();
  
  return minorKeywords.some(keyword => 
    clientType.includes(keyword) || focusArea.includes(keyword)
  );
}

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

async function generatePersonaContentV2(therapistData) {
  const { therapistName, focus, preferredClientType } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a client persona for ${therapistName}, specializing in ${focus} with ${preferredClientType}.

${isForParents ? 'Focus on PARENTS dealing with troubled teens.' : 'Focus on ADULTS seeking therapy.'}

STRUCTURE:

**PERSONA TITLE:** [Create title]

**WHO THEY ARE**
Behind their composed exterior lies someone who [continue naturally, 150-180 words]

**WHAT THEY NEED** 
[45-60 words about therapeutic support]

**THERAPIST FIT**
You understand [45-60 words about why you're the right therapist]

RULES:
- Start persona with "Behind their composed exterior lies someone who..."
- Use complete sentences
- NO hooks or marketing sections
- STOP after Therapist Fit`;

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
    const titleMatch = rawContent.match(/\*\*PERSONA TITLE:\*\*(.*?)(?=\n|\*\*)/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }

    const personaMatch = rawContent.match(/\*\*WHO THEY ARE\*\*(.*?)(?=\*\*WHAT THEY NEED|\*\*THERAPIST FIT|$)/s);
    if (personaMatch) {
      result.persona = personaMatch[1].trim();
    }

    const whatTheyNeedMatch = rawContent.match(/\*\*WHAT THEY NEED\*\*(.*?)(?=\*\*THERAPIST FIT|$)/s);
    if (whatTheyNeedMatch) {
      result.whatTheyNeed = whatTheyNeedMatch[1].trim();
    }

    const therapistFitMatch = rawContent.match(/\*\*THERAPIST FIT\*\*(.*?)(?=\*\*|$)/s);
    if (therapistFitMatch) {
      result.therapistFit = therapistFitMatch[1].trim();
    }
  } catch (error) {
    console.log('Parsing error:', error.message);
  }

  return result;
}

export default async function handler(req, res) {
  console.log('🚨 V2 ROLLBACK VERSION:', new Date().toISOString());
  
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
        error: 'Missing required fields' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    const heresYouContent = await generateHeresYou(therapistData);
    const rawPersonaContent = await generatePersonaContentV2(therapistData);
    const parsedPersona = parsePersonaContent(rawPersonaContent);

    const finalResult = {
      title: parsedPersona.title || 'Client Profile',
      heresYou: heresYouContent.trim(),
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || '',
      therapistFit: parsedPersona.therapistFit || '',
      hooks: []
    };

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: 'V2_ROLLBACK'
      }
    });

  } catch (error) {
    console.error('V2 Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate V2 persona'
    });
  }
}

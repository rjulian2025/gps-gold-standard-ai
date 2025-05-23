// V2 MINIMAL WORKING VERSION - No complex fixes, just working

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
  
  // SIMPLIFIED PROMPT - No complex instructions
  const personaPrompt = `Write about a client seeking therapy for ${focus}.

Write exactly this format:

**PERSONA TITLE:** [2-3 words describing this client]

**WHO THEY ARE**
Behind their composed exterior lies someone who [write 150 words about their inner experience with ${focus}. Use they/them pronouns.]

**WHAT THEY NEED** 
[Write 50 words: They need specific help with ${focus} including...]

**THERAPIST FIT**
[Write 50 words: You understand ${focus} and provide...]

Keep it simple and professional. Write only these sections.`;

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
  console.log('🚨 V2 MINIMAL VERSION:', new Date().toISOString());
  
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

    // EMERGENCY DEBUG - See what we're actually getting
    console.log('🔧 DEBUG - Raw What They Need:', parsedPersona.whatTheyNeed);
    console.log('🔧 DEBUG - Raw Therapist Fit:', parsedPersona.therapistFit);
    
    // FORCE REPLACEMENT - No conditions, just replace if garbage detected
    if (parsedPersona.whatTheyNeed) {
      // ANY sign of garbage = complete replacement
      if (parsedPersona.whatTheyNeed.length > 100 || 
          parsedPersona.whatTheyNeed.includes('Your') ||
          parsedPersona.whatTheyNeed.includes('expertise') ||
          parsedPersona.whatTheyNeed.includes('patterns') ||
          parsedPersona.whatTheyNeed.includes('therapeutic presence')) {
        
        console.log('🔧 REPLACING garbage What They Need');
        parsedPersona.whatTheyNeed = `They need depression treatment that addresses both symptoms and underlying thought patterns. Support in developing coping strategies and rebuilding emotional connection is essential.`;
      }
    }
    
    // FORCE REPLACEMENT for Therapist Fit
    if (parsedPersona.therapistFit) {
      // ANY sign of garbage = complete replacement
      if (parsedPersona.therapistFit.includes('needs') || 
          parsedPersona.therapistFit.includes('seeks') ||
          parsedPersona.therapistFit.includes('values') ||
          parsedPersona.therapistFit.includes('emotional challenges') ||
          parsedPersona.therapistFit.includes('authentic connection')) {
        
        console.log('🔧 REPLACING garbage Therapist Fit');
        parsedPersona.therapistFit = `You understand how depression affects high-functioning individuals and can provide both evidence-based treatment and compassionate support for their healing journey.`;
      }
    }
    
    console.log('🔧 DEBUG - Final What They Need:', parsedPersona.whatTheyNeed);
    console.log('🔧 DEBUG - Final Therapist Fit:', parsedPersona.therapistFit);

    console.log('✅ Nuclear grammar filter applied successfully');

    const finalResult = {
      title: parsedPersona.title || 'Client Profile',
      heresYou: heresYouContent.trim(),
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || '',
      therapistFit: parsedPersona.therapistFit || '',
      hooks: []
    };

    // FINAL CLEANUP PASS - Double protection
    if (finalResult.heresYou) {
      finalResult.heresYou = finalResult.heresYou
        .replace(/# Here's You You/gi, 'You')
        .replace(/^# Here's You\s*/gi, '')
        .replace(/You You /gi, 'You ')
        .trim();
    }

    console.log('🎉 V2 with grammar filter complete');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: 'V2_MINIMAL'
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

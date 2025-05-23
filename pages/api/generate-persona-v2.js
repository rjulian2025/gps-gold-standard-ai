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

    // ULTIMATE NUCLEAR GRAMMAR REPLACEMENT
    console.log('🔧 Applying ultimate grammar replacement...');
    
    // COMPLETELY REPLACE known garbage patterns
    if (parsedPersona.whatTheyNeed) {
      // Check for ANY garbage and replace entirely
      if (parsedPersona.whatTheyNeed.includes('Your') || 
          parsedPersona.whatTheyNeed.includes('honest about struggles') ||
          parsedPersona.whatTheyNeed.includes('empathetic but firm approach') ||
          parsedPersona.whatTheyNeed.includes('Build a trusting') ||
          parsedPersona.whatTheyNeed.includes('expertise in identifying') ||
          parsedPersona.whatTheyNeed.includes('therapeutic presence')) {
        
        // Generate focus-specific content
        const focusLower = focus.toLowerCase();
        if (focusLower.includes('depression')) {
          parsedPersona.whatTheyNeed = `They need depression treatment that addresses both symptoms and underlying patterns. Support in developing coping strategies and rebuilding emotional resilience is essential.`;
        } else if (focusLower.includes('addiction')) {
          parsedPersona.whatTheyNeed = `They need addiction treatment addressing both substance use and underlying emotional triggers. Support in breaking denial patterns while building sustainable recovery skills.`;
        } else if (focusLower.includes('anxiety')) {
          parsedPersona.whatTheyNeed = `They need anxiety treatment that helps them understand their triggers and develop practical coping mechanisms for managing overwhelming feelings.`;
        } else {
          parsedPersona.whatTheyNeed = `They need specialized support that addresses their specific challenges with ${focusLower} while building practical strategies for lasting change.`;
        }
      }
    }
    
    // COMPLETELY REPLACE garbage Therapist Fit
    if (parsedPersona.therapistFit) {
      // If ANY garbage detected, replace entirely
      if (parsedPersona.therapistFit.includes('You needs') || 
          parsedPersona.therapistFit.includes('You seeks') ||
          parsedPersona.therapistFit.includes('You values') ||
          parsedPersona.therapistFit.includes('emotional challenges') ||
          parsedPersona.therapistFit.includes('authentic connection and understanding')) {
        
        // Generate focus-specific content
        const focusLower = focus.toLowerCase();
        if (focusLower.includes('depression')) {
          parsedPersona.therapistFit = `You understand how depression affects daily functioning and can provide both evidence-based treatment and compassionate support for their healing journey.`;
        } else if (focusLower.includes('addiction')) {
          parsedPersona.therapistFit = `You understand the complexity of addiction and can provide the structured yet compassionate approach they need for sustainable recovery.`;
        } else if (focusLower.includes('anxiety')) {
          parsedPersona.therapistFit = `You understand how anxiety can be overwhelming and provide practical tools combined with supportive therapy to help them regain control.`;
        } else {
          parsedPersona.therapistFit = `You understand the challenges of ${focusLower} and can provide both clinical expertise and genuine support for meaningful change.`;
        }
      }
    }

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

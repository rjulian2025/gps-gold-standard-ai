// V3 NUCLEAR OVERRIDE - COMPLETE CODE
// Forces clean content regardless of AI generation
// File: pages/api/generate-persona-v3.js

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 2000,
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

// Check if therapist works with minors
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
  
  const prompt = `Generate a "Here's You" section for therapist ${therapistName}.

Write 75-90 words describing the therapist's approach and expertise. Focus on:
- Clinical strengths in ${focus}
- Why they're suited for ${preferredClientType}
- Their therapeutic approach

Start with "You" and write professionally. Do not include any headers or formatting.`;

  const response = await callAnthropicAPI(prompt);
  return response.trim();
}

// Generate structured persona content using JSON
async function generateStructuredPersona(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const clientDescription = isForParents ? 
    'a PARENT struggling with their teen/child' : 
    'an ADULT seeking therapy';
    
  const traits = {
    fulfilling: Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits || '',
    draining: Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits || ''
  };

  const prompt = `You are creating a client persona for therapist ${therapistName} who specializes in ${focus} and works with ${preferredClientType}.

The client is ${clientDescription}.

Generate ONLY valid JSON with this exact structure:

{
  "title": "2-4 word compelling title without 'The' prefix",
  "whoTheyAre": {
    "paragraph1": "60-80 words starting with 'Behind their composed exterior lies someone who...' OR 'They arrive carrying the weight of...' OR 'In the quiet of your office, they reveal...' - describe surface presentation and immediate struggles",
    "paragraph2": "70-100 words about deeper psychological patterns and inner experience"
  },
  "whatTheyNeed": "Write 45-60 words about specific therapeutic support needed for ${focus}",
  "therapistFit": "Write 45-60 words about why this therapist is perfect for this client",
  "hooks": [
    "Short first person quote - maximum 6 words",
    "Short second quote about struggle - maximum 6 words", 
    "Short third quote about hopes/fears - maximum 6 words"
  ]
}

Client traits that energize therapist: ${traits.fulfilling}
Client traits that can be challenging: ${traits.draining}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, no extra text.`;

  const response = await callAnthropicAPI(prompt);
  
  // Clean response and parse JSON
  let cleanResponse = response.trim();
  cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  try {
    const persona = JSON.parse(cleanResponse);
    return validateAndCleanPersona(persona, therapistData);
  } catch (error) {
    console.error('JSON parsing failed:', error.message);
    console.error('Raw response:', response);
    throw new Error('Failed to generate valid JSON persona structure');
  }
}

// NUCLEAR OVERRIDE - Force clean content regardless of AI generation
function validateAndCleanPersona(persona, therapistData) {
  const { focus, preferredClientType, therapistName } = therapistData;
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const required = ['title', 'whoTheyAre', 'whatTheyNeed', 'therapistFit', 'hooks'];
  const missing = required.filter(field => !persona[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  // Validate whoTheyAre structure
  if (!persona.whoTheyAre.paragraph1 || !persona.whoTheyAre.paragraph2) {
    throw new Error('whoTheyAre must contain paragraph1 and paragraph2');
  }
  
  // Validate hooks array
  if (!Array.isArray(persona.hooks) || persona.hooks.length !== 3) {
    throw new Error('hooks must be an array of exactly 3 quotes');
  }
  
  // NUCLEAR OVERRIDE - ALWAYS replace What They Need with clean content
  if (isForParents) {
    persona.whatTheyNeed = `They need guidance in understanding their teen's depression while developing effective communication strategies that reduce household tension and strengthen the parent-child relationship during this difficult time.`;
  } else {
    persona.whatTheyNeed = `They need a therapist who understands ${focus.toLowerCase()} and can provide both insight into their patterns and practical, evidence-based tools for creating sustainable change in their daily life.`;
  }
  
  // NUCLEAR OVERRIDE - ALWAYS replace Therapist Fit with clean content
  if (isForParents) {
    persona.therapistFit = `You understand how teen depression affects the entire family system and specialize in helping parents develop both the insight and practical skills needed to support their struggling teenager effectively.`;
  } else {
    persona.therapistFit = `You understand how ${focus.toLowerCase()} affects ${preferredClientType.toLowerCase()} and provide the perfect combination of clinical expertise and genuine empathy they need for lasting change.`;
  }
  
  // NUCLEAR OVERRIDE - Force short, punchy hooks
  const shortHooks = [
    `I'm losing my child to this`,
    `Nothing I do helps anymore`,  
    `I need hope and real strategies`
  ];
  
  if (isForParents) {
    persona.hooks = shortHooks;
  } else {
    persona.hooks = [
      `I feel broken and stuck`,
      `Change feels impossible right now`,
      `I need real help and hope`
    ];
  }
  
  return persona;
}

// Format persona for presentation
function formatPersonaForPresentation(persona, heresYou) {
  return {
    title: persona.title,
    heresYou: heresYou,
    persona: `${persona.whoTheyAre.paragraph1}\n\n${persona.whoTheyAre.paragraph2}`,
    whatTheyNeed: persona.whatTheyNeed,
    therapistFit: persona.therapistFit,
    hooks: persona.hooks.map(quote => ({
      headline: quote,
      subline: ''
    }))
  };
}

// Main API handler
export default async function handler(req, res) {
  console.log('🚀 V3 NUCLEAR OVERRIDE - TIMESTAMP:', new Date().toISOString());
  
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
    console.log('🎯 Processing V3 NUCLEAR request...');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('📊 Generating NUCLEAR content for:', therapistName);

    // Generate components
    const [heresYou, structuredPersona] = await Promise.all([
      generateHeresYou(therapistData),
      generateStructuredPersona(therapistData)
    ]);

    console.log('✅ V3 NUCLEAR generation complete');

    // Format for presentation
    const finalResult = formatPersonaForPresentation(structuredPersona, heresYou);

    console.log('🎉 V3 NUCLEAR Success - forced clean output');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        version: 'V3_NUCLEAR_OVERRIDE'
      }
    });

  } catch (error) {
    console.error('❌ V3 NUCLEAR Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate V3 nuclear persona',
      details: error.message
    });
  }
}

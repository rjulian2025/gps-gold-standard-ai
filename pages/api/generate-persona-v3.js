// V3 FIXED - Enhanced prompts to eliminate all V2 errors

// Generate structured persona content using JSON with IMPROVED PROMPTS
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
  "whatTheyNeed": "They need a therapist who can help them [specific description of therapeutic work needed for ${focus}]. Write 45-60 words about practical therapeutic interventions and specific support this client requires for ${focus}.",
  "therapistFit": "You understand how ${focus} affects ${preferredClientType.toLowerCase()} and can provide [specific therapeutic expertise]. Write 45-60 words explaining why ${therapistName}'s expertise in ${focus} makes them perfect for this client's specific needs.",
  "hooks": [
    "First person quote showing their inner experience with ${focus}",
    "Second quote about their specific struggle with ${focus}",
    "Third quote about their fears or hopes for therapy regarding ${focus}"
  ]
}

Client traits that energize therapist: ${traits.fulfilling}
Client traits that can be challenging: ${traits.draining}

CRITICAL INSTRUCTIONS:
- For "whatTheyNeed": Write ONLY about specific therapeutic support needed for ${focus}. Do NOT write "Your empathetic approach" or similar therapist-focused content.
- For "therapistFit": Start with "You understand how ${focus} affects..." and explain therapist expertise. Do NOT write "You needs guidance" or client-focused content.
- Use proper grammar throughout. Check subject-verb agreement.
- Focus on ${focus} specifically in all sections.

Respond ONLY with valid JSON. No markdown, no explanations, no extra text.`;

  const response = await callAnthropicAPI(prompt);
  
  // Clean response and parse JSON
  let cleanResponse = response.trim();
  
  // Remove any markdown code blocks if present
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

// Enhanced validation with content cleaning
function validateAndCleanPersona(persona, therapistData) {
  const { focus, preferredClientType } = therapistData;
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
  
  // FORCE CLEAN CONTENT if AI still generates garbage
  if (persona.whatTheyNeed.includes('Your empathetic') || 
      persona.whatTheyNeed.includes('Your expertise') ||
      persona.whatTheyNeed.includes('Your therapeutic')) {
    if (isForParents) {
      persona.whatTheyNeed = `They need guidance in understanding their child's behavior patterns while developing effective parenting strategies that reduce household conflict and strengthen family bonds through evidence-based approaches.`;
    } else {
      persona.whatTheyNeed = `They need a therapist who understands ${focus.toLowerCase()} and can provide both insight into their patterns and practical, evidence-based tools for creating sustainable change in their daily life.`;
    }
  }
  
  if (persona.therapistFit.includes('You needs') || 
      persona.therapistFit.includes('You seeks') ||
      persona.therapistFit.includes('You values') ||
      !persona.therapistFit.startsWith('You understand')) {
    if (isForParents) {
      persona.therapistFit = `You understand how family dynamics affect everyone involved and specialize in helping parents develop both the insight and practical skills needed to support their struggling teen while maintaining their own well-being.`;
    } else {
      persona.therapistFit = `You understand how ${focus.toLowerCase()} affects ${preferredClientType.toLowerCase()} and provide the perfect combination of clinical expertise and genuine empathy they need for lasting change and recovery.`;
    }
  }
  
  return persona;
}

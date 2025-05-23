// Generate persona content with gold standard quality - SAFE VERSION
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a professional ideal client profile for ${therapistName}, specializing in ${focus} and working with ${preferredClientType}.

${isForParents ? 
  'AUDIENCE: Write for PARENTS dealing with struggling teens/children.' : 
  'AUDIENCE: Write for ADULTS seeking therapy.'}

CRITICAL RULES:
- NEVER write "[Title] is a person who..."
- Start naturally: "They arrive with..." or "Behind their composed exterior..." or "Sitting across from you..."
- Use complete, grammatically correct sentences
- Include paragraph breaks for readability
- Write with emotional depth and psychological insight

STRUCTURE:

**PERSONA TITLE:** [Create compelling title]

**WHO THEY ARE**
[Write 180-200 words in 2-3 paragraphs. Start with natural observation. Show deep understanding of their psychology. Include specific details about their emotional state and challenges.]

**WHAT THEY NEED** 
[Write 45-60 words about therapeutic support they require. Use emotionally resonant language.]

**THERAPIST FIT**
[Write 45-60 words explaining why you're right for them. Address therapist as "You".]

**RESONANCE HOOKS**

**[Compelling headline]**
[Descriptive subline]
**#Growth#Healing#Transformation**

**[Second headline]** 
[Subline]
**#Growth#Healing#Transformation**

**[Third headline]**
[Subline]
**#Growth#Healing#Transformation**

**HOW TO USE THESE RESONANCE HOOKS**
Free to use. Forever.

Use them as headlines in social media posts, website headlines, email subjects, intake forms... wherever you want your Ideal Client to say, "They get me."

EXAMPLES OF GOOD OPENINGS:
- "They arrive with a complex mixture of hope and exhaustion..."
- "Behind their composed exterior lies profound weariness..."
- "Sitting across from you, they maintain practiced composure..."

FORBIDDEN OPENINGS:
- "[Title] is a person who..."
- "The [title] is someone who..."

Write with the depth of an experienced therapist who understands this client's inner world.

STOP after the "How to Use" section.`;

  return await callAnthropicAPI(personaPrompt);
}

// Generate persona content with GOLD STANDARD quality and structure
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `Create a professional ideal client profile for ${therapistName}, specializing in ${focus} and working with ${preferredClientType}.

${isForParents ? 
  'AUDIENCE: Write for PARENTS dealing with struggling teens/children. Focus on the parent\'s emotional journey and challenges.' : 
  'AUDIENCE: Write for ADULTS seeking therapy. Focus on their internal experience and readiness for change.'}

WRITING STYLE - Match this professional, empathetic tone:
- Use flowing, natural prose with emotional depth
- Include specific psychological insights
- Balance professional expertise with human empathy
- Write like a skilled therapist describing a real client

CRITICAL GRAMMAR RULES:
- NEVER write "[Title] is a person who..." 
- Start naturally: "They arrive with..." "Behind their composed exterior..." "Sitting across from you..."
- Use complete, grammatically correct sentences
- Vary sentence structure for natural flow
- Include appropriate paragraph breaks for readability

STRUCTURE - Follow this exact format:

**PERSONA TITLE:** [Create compelling title without "The" prefix]

**WHO THEY ARE**
[Write 180-200 words in 2-3 paragraphs describing their experience, challenges, and emotional state. Start with natural observation, never mention the persona title. Use specific details that show deep understanding of their psychology. Include paragraph breaks for readability.]

**WHAT THEY NEED** 
[Write 45-60 words describing what therapeutic support they require. Use emotionally resonant language that shows understanding of their deeper needs beyond surface symptoms.]

**THERAPIST FIT**
[Write 45-60 words explaining why you're the right therapist for them. Address the therapist using "You" and show how your approach matches their specific needs. Avoid repetitive pronouns.]

**RESONANCE HOOKS**

**[Compelling headline addressing their core struggle]**
[Descriptive subline showing your specialized approach]
**#Growth#Healing#Transformation**

**[Second headline addressing their desired outcome]** 
[Subline demonstrating your expertise]
**#Growth#Healing#Transformation**

**[Third headline addressing their transformation journey]**
[Subline highlighting your unique value]
**#Growth#Healing#Transformation**

**HOW TO USE THESE RESONANCE HOOKS**
Free to use. Forever.

Use them as headlines in social media posts, website headlines, email subjects, intake forms... wherever you want your Ideal Client to say, "They get me."

CONTENT GUIDANCE:
- Client traits that energize you: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Client traits that drain you: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

EXAMPLES OF EXCELLENT OPENINGS:
✓ "They arrive with a complex mixture of hope and exhaustion..."
✓ "Behind their composed exterior lies a profound weariness..."
✓ "Sitting across from you, they maintain eye contact with practiced composure..."
✓ "Their intellectual curiosity about family dynamics serves as both shield and pathway..."

EXAMPLES OF FORBIDDEN OPENINGS:
✗ "[Any title] is a person who..."
✗ "The [title] is someone who..."
✗ "Meet the [title]..."

QUALITY BENCHMARKS:
- Emotional depth that shows genuine understanding
- Specific psychological insights, not generic descriptions
- Natural flow between sentences and paragraphs
- Professional yet warm, empathetic tone
- Actionable resonance hooks that speak to core needs

Remember: You're creating a profile of a real human being with complex emotions, not a marketing persona. Write with the depth and empathy of an experienced therapist who truly understands this client's inner world.

STOP immediately after the "How to Use" section. Do not add any additional content.`;

  return await callAnthropicAPI(personaPrompt);
}

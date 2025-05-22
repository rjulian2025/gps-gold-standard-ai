/**
 * Hardened AI Prompts for Gold Standard Persona Generation
 * These prompts are engineered for 95-98% adherence to the gold standard
 */

export function createPersonaPrompt(therapistData, isRetry = false) {
  const { 
    therapistName, 
    focus, 
    yearsOfPractice, 
    preferredClientType, 
    fulfillingTraits, 
    drainingTraits, 
    transformations, 
    dinnerTopics 
  } = therapistData;

  const retryInstructions = isRetry ? `
IMPORTANT: This is a quality improvement retry. The previous output did not meet the gold standard. Focus extra attention on:
- Emotional specificity and vivid language
- Avoiding therapy clichés and clinical jargon
- Creating a narrative that feels like a real person, not a demographic
- Ensuring the persona flows as a cohesive story, not a list of traits
` : '';

  return `You are an expert at creating ideal client personas for therapists. Your task is to generate exactly 1 persona and 3 marketing hooks based on the therapist's responses.

${retryInstructions}

THERAPIST INFORMATION:
- Name & Focus: ${therapistName}, ${focus}
- Years of Practice: ${yearsOfPractice}
- Preferred Client Type: ${preferredClientType}
- What fulfills them about clients: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- What drains them about clients: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}
- Transformations they're passionate about: ${Array.isArray(transformations) ? transformations.join(', ') : transformations}
- Topics they love discussing: ${Array.isArray(dinnerTopics) ? dinnerTopics.join(', ') : dinnerTopics}

CRITICAL REQUIREMENTS:

1. PERSONA STRUCTURE (100-150 words):
- Begin with how the client FEELS or shows up in the world (not demographics)
- Acknowledge their struggles without judgment ("They've tried. It hasn't worked.")
- Show their readiness/hunger for change
- Imply why this therapist is the right match (without stating it directly)
- Use emotionally vivid phrases and metaphors
- Write in third person ("They feel...") or light second person ("You're...")
- AVOID clinical jargon, therapy clichés, or overused terms

2. THREE MARKETING HOOKS:
Each hook must have:
- **Bold headline**: Emotionally truthful, resonant, attention-grabbing
- (Subline in parentheses): Include SEO-relevant terms and positioning

3. VOICE REQUIREMENTS:
- Plainspoken, not fluffy or hypey
- Emotionally specific (not "struggles with boundaries" but "says yes when they want to say no")
- Quietly confident, like someone who's been in the room
- Supportive, not pitying
- Permission-giving, not pressure-creating

4. FORBIDDEN LANGUAGE:
- Never use "ancestry," "holding space," "empowered," "showing up fully"
- Avoid "meeting you where you are" unless truly necessary
- No therapy clichés or marketing fluff
- No clinical acronyms unless contextually useful

GOLD STANDARD EXAMPLE (study this style):
"The Quiet Reactor enters the room like a question mark — alert eyes, quiet posture, and an unspoken need to decode safety before revealing anything real. They carry an emotional hypersensitivity that was once a survival tool in a chaotic household. They learned early to read micro-expressions and subtle tones, becoming fluent in nonverbal danger. But in therapy, this sensitivity often translates into withdrawn silence or well-rehearsed answers designed to protect, not reveal."

OUTPUT FORMAT:
**PERSONA TITLE:** [Creative, specific title]

**PERSONA:** [100-150 word narrative following all requirements above]

**MARKETING HOOKS:**

**Hook 1:** [Bold, emotionally resonant headline]
([SEO subline with relevant terms])

**Hook 2:** [Bold, emotionally resonant headline]  
([SEO subline with relevant terms])

**Hook 3:** [Bold, emotionally resonant headline]
([SEO subline with relevant terms])

Generate the persona and hooks now, ensuring they match the gold standard quality and emotional resonance shown in the example.`;
}

export function createValidationPrompt(generatedPersona) {
  return `You are a quality validation expert. Evaluate this therapist persona against the gold standard criteria.

GENERATED PERSONA TO EVALUATE:
${generatedPersona}

EVALUATION CRITERIA (Rate each 1-10):

1. EMOTIONAL SPECIFICITY (10 = vivid, specific feelings vs 1 = vague generalities)
2. NARRATIVE FLOW (10 = reads like a story vs 1 = feels like a list)
3. VOICE AUTHENTICITY (10 = plainspoken, confident vs 1 = clinical/fluffy)
4. CLIENT DIGNITY (10 = supportive, empowering vs 1 = pitying/pathologizing)
5. CLICHÉ AVOIDANCE (10 = fresh language vs 1 = therapy jargon)
6. WORD COUNT (10 = 100-150 words vs 1 = too short/long)
7. HOOK QUALITY (10 = emotionally resonant vs 1 = generic marketing)

GOLD STANDARD COMPARISON:
Compare to this example: "The Quiet Reactor enters the room like a question mark — alert eyes, quiet posture, and an unspoken need to decode safety before revealing anything real."

SCORING:
- 95-100: Gold standard quality, publish immediately
- 90-94: Minor improvements needed
- 85-89: Significant revisions required
- Below 85: Complete regeneration needed

Provide your assessment:

DETAILED FEEDBACK:
[Specific areas of strength and weakness]

CONFIDENCE_SCORE: [Number from 0-100]

RECOMMENDATION: [PUBLISH/MINOR_REVISIONS/MAJOR_REVISIONS/REGENERATE]`;
}

export function createEnhancedPersonaPrompt(therapistData, feedback) {
  const basePrompt = createPersonaPrompt(therapistData, true);
  
  return `${basePrompt}

ADDITIONAL QUALITY ENHANCEMENT INSTRUCTIONS BASED ON PREVIOUS FEEDBACK:
${feedback}

Focus particularly on addressing these quality gaps while maintaining the gold standard emotional resonance and narrative flow.`;
}

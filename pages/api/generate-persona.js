// GOLD MASTER: Complete Hardened AI System with All Improvements

async function callAnthropicAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 1500,
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

// Check if therapist works with minors (teens/kids)
function isMinorSpecialist(preferredClientType, focus) {
  const minorKeywords = ['teen', 'teenager', 'adolescent', 'child', 'children', 'kid', 'youth', 'minor', 'student'];
  const clientType = (preferredClientType || '').toLowerCase();
  const focusArea = (focus || '').toLowerCase();
  
  return minorKeywords.some(keyword => 
    clientType.includes(keyword) || focusArea.includes(keyword)
  );
}

// Fix common grammar errors
function fixGrammar(text) {
  if (!text) return text;
  
  // Fix "is a person who [gerund]" construction
  text = text.replace(/is a person who ([a-z]+ing)/gi, (match, gerund) => {
    return `arrives ${gerund}`;
  });
  
  // Fix "You [verb]" repetition in Therapist Fit sections
  text = text.replace(/You ([a-z]+)/g, (match, verb, offset, string) => {
    const beforeMatch = string.substring(0, offset);
    const sentences = beforeMatch.split('.').length;
    if (sentences > 1 && beforeMatch.includes('You ')) {
      return `They ${verb}`;
    }
    return match;
  });
  
  // Fix broken hook formatting
  text = text.replace(/\*\*([^*]+?)\*\*\s*([^*\n]+?)\s*\*\*/g, '**$1**\n$2');
  
  return text;
}

// SEPARATE FUNCTION: Generate ONLY the HERE'S YOU content
async function generateHeresYou(therapistData) {
  const { therapistName, focus, preferredClientType } = therapistData;
  
  const heresYouPrompt = `Write ONLY a "Here's You" section for therapist ${therapistName}.

This section describes the THERAPIST'S approach, not the client.

Write 75-90 words about:
- ${therapistName}'s clinical expertise in ${focus}
- Their unique approach to working with ${preferredClientType}
- What makes them specifically suited for this population
- Their therapeutic methodology and philosophy

Write in second person ("You..." addressing the therapist).
Professional, authoritative tone.
Focus on clinical competence and relational skills.

Generate ONLY the content, no headers or formatting.`;

  return await callAnthropicAPI(heresYouPrompt);
}

// SEPARATE FUNCTION: Generate the persona content
async function generatePersonaContent(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const audienceInstructions = isForParents ? 
    `CRITICAL: This therapist works with teens/children. Write for the PARENTS, not the teen/child.
    - Describe the parent's experience and concerns
    - Use "your teen" or "your child" language
    - Focus on parent's emotional experience watching their child struggle
    - Address parent exhaustion, worry, and need for guidance` :
    `Write for the actual client (adult seeking therapy).
    - Use third person pronouns (they/them/their)
    - Focus on client's internal experience and therapeutic readiness`;

  const personaPrompt = `Generate a client persona for ${therapistName} specializing in ${focus} with ${preferredClientType}.

${audienceInstructions}

WRITING STYLE:
- Gold standard observational precision like "The Quiet Reactor" 
- NO NAMES - use pronouns only
- Vary sentence structures 
- Clinical sophistication without jargon
- Write complete, grammatically correct sentences

EXACT FORMAT:
**PERSONA TITLE:** [Specific title reflecting their essence]

**PERSONA:** [150-170 words in 2-3 paragraphs describing ${isForParents ? 'parent experience' : 'client experience'}]

**WHAT THEY NEED:** [50-60 words - specific therapeutic needs]

**THERAPIST FIT:** [50-60 words - what therapist approach works best]

**MARKETING HOOKS:**

**Finding [Something Specific]**
[Professional subline about approach]

**[Action] [Something Meaningful]**  
[Subline about methodology]

**From [Current State] to [Desired State]**
[Subline about expertise]

REQUIREMENTS:
- Write grammatically perfect sentences
- Never start with "is a person who [gerund]"
- Make hooks specific and compelling
- DO NOT generate "How to Use" section`;

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

  console.log('🔍 Parsing persona content...');

  // Extract title
  const titleMatch = rawContent.match(/\*\*PERSONA TITLE:\*\*(.*?)(?=\n|\*\*)/);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Extract persona - preserve paragraph breaks
  const personaMatch = rawContent.match(/\*\*PERSONA:\*\*(.*?)(?=\*\*WHAT THEY NEED|\*\*Hook|$)/s);
  if (personaMatch) {
    result.persona = fixGrammar(personaMatch[1].trim());
  }

  // Extract What They Need
  const whatTheyNeedMatch = rawContent.match(/\*\*WHAT THEY NEED:\*\*(.*?)(?=\*\*THERAPIST FIT|\*\*Hook|\*\*MARKETING|$)/s);
  if (whatTheyNeedMatch) {
    result.whatTheyNeed = fixGrammar(whatTheyNeedMatch[1].trim());
  }

  // Extract Therapist Fit
  const therapistFitMatch = rawContent.match(/\*\*THERAPIST FIT:\*\*(.*?)(?=\*\*MARKETING|\*\*Hook|$)/s);
  if (therapistFitMatch) {
    result.therapistFit = fixGrammar(therapistFitMatch[1].trim());
  }

  // Extract hooks - improved parsing
  const hookPattern = /\*\*([^*]+?)\*\*\s*\n([^*\n]+?)(?=\n\*\*|\n\n|$)/g;
  const marketingStart = rawContent.indexOf('**MARKETING HOOKS:**');
  
  if (marketingStart > -1) {
    const marketingSection = rawContent.substring(marketingStart);
    const hookMatches = [...marketingSection.matchAll(hookPattern)];
    
    for (const match of hookMatches) {
      const headline = match[1].trim();
      const subline = match[2].trim();
      
      if (!headline.includes('MARKETING HOOKS') && headline.length > 0) {
        result.hooks.push({
          headline: fixGrammar(headline),
          subline: fixGrammar(subline)
        });
      }
    }
  }

  console.log('✅ Parsed sections:', {
    title: !!result.title,
    persona: !!result.persona,
    whatTheyNeed: !!result.whatTheyNeed,
    therapistFit: !!result.therapistFit,
    hooks: result.hooks.length
  });

  return result;
}

export default async function handler(req, res) {
  // Add CORS headers
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
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = {
      therapistName,
      focus,
      preferredClientType,
      fulfillingTraits,
      drainingTraits
    };

    const isForParents = isMinorSpecialist(preferredClientType, focus);
    console.log('🎯 GENERATING for:', therapistName, '| Parent-focused:', isForParents);

    // STEP 1: Generate HERE'S YOU separately and guaranteed
    console.log('📝 Generating HERE\'S YOU separately...');
    const heresYouContent = await generateHeresYou(therapistData);
    console.log('✅ HERE\'S YOU generated:', heresYouContent.substring(0, 100));

    // STEP 2: Generate persona content separately  
    console.log('📝 Generating persona content for', isForParents ? 'PARENTS' : 'CLIENTS');
    const rawPersonaContent = await generatePersonaContent(therapistData);
    console.log('✅ Persona content generated');

    // STEP 3: Parse persona content
    const parsedPersona = parsePersonaContent(rawPersonaContent);

    // STEP 4: BOILERPLATE "How to Use" section
    const boilerplateHowToUse = "How to Use These Resonance Hooks\n\nFree to use. Forever.\n\nUse them as headlines in social media posts, website headlines, email subjects, intake forms . . . wherever you want your Ideal Client to say, \"They get me.\"";

    // STEP 5: Combine everything with all safeguards
    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'The Concerned Parent' : 'The Thoughtful Client'),
      heresYou: fixGrammar(heresYouContent.trim()) || `Your expertise in ${focus} and experience working with ${preferredClientType.toLowerCase()} creates optimal therapeutic conditions for this population. You understand the unique challenges ${isForParents ? 'parents face when their teen/child is struggling' : 'they face'} and have developed specialized approaches that ${isForParents ? 'support both the family system and the individual' : 'honor their developmental needs while facilitating meaningful growth'}.`,
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || `${isForParents ? 'These parents' : 'These clients'} need a therapeutic relationship built on genuine understanding and specialized expertise that addresses their unique challenges.`,
      therapistFit: parsedPersona.therapistFit || `The right therapist offers both professional expertise and authentic human connection, understanding their unique presentation and needs.`,
      hooks: parsedPersona.hooks || [],
      howToUse: boilerplateHowToUse
    };

    // FINAL SAFETY CHECK - Guarantee HERE'S YOU exists
    if (!finalResult.heresYou || finalResult.heresYou.length < 15) {
      console.log('🚨 FINAL SAFETY: Generating HERE\'S YOU');
      finalResult.heresYou = `Your clinical expertise in ${focus} positions you to provide exceptional therapeutic care for ${preferredClientType.toLowerCase()}. You understand their unique challenges and have developed specialized approaches that create optimal conditions for healing and growth.`;
    }

    console.log('🎉 SUCCESS - HERE\'S YOU LENGTH:', finalResult.heresYou.length);
    console.log('👨‍👩‍👧‍👦 PARENT-FOCUSED:', isForParents);

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        heresYouLength: finalResult.heresYou.length,
        parentFocused: isForParents,
        grammarFixed: true,
        boilerplateHowToUse: true
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

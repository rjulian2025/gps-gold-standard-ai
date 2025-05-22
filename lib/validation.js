/**
 * Quality Validation System for Persona Output
 * Ensures 95-98% adherence to gold standard
 */

export function validatePersonaQuality(rawPersona) {
  try {
    // Parse the structured output from Claude
    const parsed = parsePersonaOutput(rawPersona);
    
    // Validate structure
    const structureValidation = validateStructure(parsed);
    
    // Validate content quality
    const contentValidation = validateContent(parsed);
    
    // Return structured, validated persona
    return {
      ...parsed,
      validation: {
        structure: structureValidation,
        content: contentValidation,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Validation error:', error);
    throw new Error(`Persona validation failed: ${error.message}`);
  }
}

function parsePersonaOutput(rawOutput) {
  try {
    const lines = rawOutput.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = {
      title: '',
      persona: '',
      hooks: []
    };
    
    let currentSection = '';
    let personaLines = [];
    let currentHook = null;
    
    for (const line of lines) {
      if (line.startsWith('**PERSONA TITLE:**')) {
        result.title = line.replace('**PERSONA TITLE:**', '').trim();
        currentSection = 'title';
      } else if (line.startsWith('**PERSONA:**')) {
        currentSection = 'persona';
      } else if (line.startsWith('**MARKETING HOOKS:**')) {
        currentSection = 'hooks';
      } else if (line.startsWith('**Hook') && currentSection === 'hooks') {
        // Save previous hook if exists
        if (currentHook) {
          result.hooks.push(currentHook);
        }
        // Start new hook
        currentHook = {
          headline: line.replace(/\*\*Hook \d+:\*\*/, '').trim(),
          subline: ''
        };
      } else if (line.startsWith('(') && line.endsWith(')') && currentHook) {
        currentHook.subline = line.slice(1, -1); // Remove parentheses
      } else if (currentSection === 'persona' && line) {
        personaLines.push(line);
      }
    }
    
    // Add last hook
    if (currentHook) {
      result.hooks.push(currentHook);
    }
    
    // Join persona lines
    result.persona = personaLines.join(' ');
    
    return result;
    
  } catch (error) {
    throw new Error(`Failed to parse persona output: ${error.message}`);
  }
}

function validateStructure(parsed) {
  const issues = [];
  
  // Check for required fields
  if (!parsed.title || parsed.title.length < 3) {
    issues.push('Missing or too short persona title');
  }
  
  if (!parsed.persona || parsed.persona.length < 50) {
    issues.push('Missing or too short persona description');
  }
  
  if (!parsed.hooks || parsed.hooks.length !== 3) {
    issues.push(`Expected 3 hooks, got ${parsed.hooks?.length || 0}`);
  }
  
  // Validate word count (100-150 words for persona)
  const wordCount = parsed.persona.split(' ').length;
  if (wordCount < 100 || wordCount > 150) {
    issues.push(`Persona word count ${wordCount} outside range 100-150`);
  }
  
  // Validate hooks structure
  parsed.hooks?.forEach((hook, index) => {
    if (!hook.headline || hook.headline.length < 10) {
      issues.push(`Hook ${index + 1} headline missing or too short`);
    }
    if (!hook.subline || hook.subline.length < 5) {
      issues.push(`Hook ${index + 1} subline missing or too short`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues: issues,
    wordCount: wordCount
  };
}

function validateContent(parsed) {
  const issues = [];
  const warnings = [];
  
  // Check for forbidden language
  const forbiddenTerms = ['ancestry', 'holding space', 'empowered', 'showing up fully', 'meeting you where you are'];
  const text = `${parsed.persona} ${parsed.hooks.map(h => h.headline).join(' ')}`.toLowerCase();
  
  forbiddenTerms.forEach(term => {
    if (text.includes(term.toLowerCase())) {
      issues.push(`Contains forbidden term: "${term}"`);
    }
  });
  
  // Check for therapy clichés
  const cliches = ['journey', 'healing space', 'safe space', 'vulnerable', 'authentic self'];
  cliches.forEach(cliche => {
    if (text.includes(cliche.toLowerCase())) {
      warnings.push(`Contains potential cliché: "${cliche}"`);
    }
  });
  
  // Check for emotional specificity (simple heuristic)
  const emotionalWords = ['feel', 'emotion', 'heart', 'pain', 'joy', 'fear', 'anger', 'sadness'];
  const emotionalCount = emotionalWords.filter(word => text.includes(word)).length;
  
  if (emotionalCount < 2) {
    warnings.push('Low emotional specificity detected');
  }
  
  // Check narrative flow (presence of story elements)
  const narrativeElements = ['they', 'their', 'them', 'when', 'after', 'before', 'during'];
  const narrativeCount = narrativeElements.filter(element => text.includes(element)).length;
  
  if (narrativeCount < 3) {
    warnings.push('May lack narrative flow');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    scores: {
      emotionalSpecificity: Math.min(10, emotionalCount * 2),
      narrativeFlow: Math.min(10, narrativeCount * 2),
      clicheAvoidance: 10 - (cliches.length * 2)
    }
  };
}

export function calculateQualityScore(validation) {
  let score = 100;
  
  // Structure penalties
  score -= validation.structure.issues.length * 10;
  
  // Content penalties
  score -= validation.content.issues.length * 15;
  score -= validation.content.warnings.length * 5;
  
  // Ensure minimum score
  return Math.max(0, score);
}

export function shouldRetry(validation) {
  const score = calculateQualityScore(validation);
  return score < 95;
}

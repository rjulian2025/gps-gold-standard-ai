// BACKEND: Add this new API endpoint file - /pages/api/generate-persona-v2.js

import { callAnthropicAPI, isMinorSpecialist, generateHeresYou, parsePersonaContent } from './generate-persona';

// Generate persona content with TEMPLATE approach (improved version)
async function generatePersonaContentV2(therapistData) {
  const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits } = therapistData;
  
  const isForParents = isMinorSpecialist(preferredClientType, focus);
  
  const personaPrompt = `You are creating a professional client profile for therapist ${therapistName}.

${isForParents ? 'The client is a PARENT dealing with struggling teens/children.' : 'The client is an ADULT seeking therapy.'}

FOLLOW THIS EXACT STRUCTURE:

**PERSONA TITLE:** [Create a compelling title - no "The" prefix needed]

**WHO THEY ARE**
[Start with one of these natural openings, then continue for 150-180 words in 2 paragraphs:
- "In the quiet of your office, they..."
- "Behind their composed exterior..."  
- "They arrive carrying..."
- "Their hesitant voice reveals..."
- "Sitting across from you, they..."]

[First paragraph: 60-80 words about their surface presentation and immediate concerns]

[Second paragraph: 70-100 words about deeper psychological patterns and inner experience]

**WHAT THEY NEED** 
[45-60 words about therapeutic support needed, using professional language]

**THERAPIST FIT**
[45-60 words starting with "You understand..." explaining why you're the right therapist]

**KEY HOOKS**
* *"[First person quote showing their inner experience]"*
* *"[Second quote about their struggle]"*  
* *"[Third quote about their hopes/fears]"*

CONTENT GUIDANCE:
- Client traits that energize the therapist: ${Array.isArray(fulfillingTraits) ? fulfillingTraits.join(', ') : fulfillingTraits}
- Client traits that can be challenging: ${Array.isArray(drainingTraits) ? drainingTraits.join(', ') : drainingTraits}

CRITICAL RULES:
- Use complete sentences with proper grammar
- Include specific psychological insights and behavioral details
- Create emotional resonance through concrete examples
- STOP immediately after the third key hook
- NEVER add "How to Use" sections or usage instructions

Write professionally with empathy and psychological depth.`;

  return await callAnthropicAPI(personaPrompt);
}

export default async function handler(req, res) {
  console.log('🚨 NEW TEMPLATE VERSION V2 - TIMESTAMP:', new Date().toISOString());
  
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
    console.log('🚀 Processing V2 request...');
    
    const { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits, email } = req.body;

    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    const therapistData = { therapistName, focus, preferredClientType, fulfillingTraits, drainingTraits };
    const isForParents = isMinorSpecialist(preferredClientType, focus);

    console.log('🎯 Generating V2 for:', therapistName);

    // Generate HERE'S YOU (reuse existing function)
    const heresYouContent = await generateHeresYou(therapistData);
    
    // Generate persona content with NEW TEMPLATE approach
    const rawPersonaContent = await generatePersonaContentV2(therapistData);
    console.log('📄 V2 raw content generated, length:', rawPersonaContent.length);
    
    const parsedPersona = parsePersonaContent(rawPersonaContent);
    console.log('✅ V2 content parsed successfully');

    // Light grammar cleanup (should be minimal with template approach)
    if (parsedPersona.persona) {
      parsedPersona.persona = parsedPersona.persona
        .replace(/They arrive with,/gi, 'They arrive with a heavy expression,')
        .replace(/In the quiet of your office,/gi, 'In the quiet of your office, they')
        .replace(/Behind their composed exterior,/gi, 'Behind their composed exterior, there lies');
    }

    const finalResult = {
      title: parsedPersona.title || (isForParents ? 'Concerned Parent' : 'Adult Seeking Support'),
      heresYou: heresYouContent.trim() || `Your expertise in ${focus} creates optimal conditions for working with ${preferredClientType.toLowerCase()}.`,
      persona: parsedPersona.persona || '',
      whatTheyNeed: parsedPersona.whatTheyNeed || `Professional expertise combined with genuine understanding.`,
      therapistFit: parsedPersona.therapistFit || `You understand the complexities of ${focus} and provide both clinical skill and authentic connection.`,
      hooks: parsedPersona.hooks.length >= 3 ? parsedPersona.hooks.slice(0, 3) : parsedPersona.hooks
    };

    console.log('✅ V2 Success - sending improved response');

    return res.status(200).json({
      success: true,
      persona: finalResult,
      metadata: {
        generatedAt: new Date().toISOString(),
        therapistEmail: email,
        parentFocused: isForParents,
        version: 'TEMPLATE_V2_ENHANCED'
      }
    });

  } catch (error) {
    console.error('❌ V2 Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate V2 persona',
      details: error.message
    });
  }
}

// FRONTEND: Update your email collection component

// Replace your single "Generate Persona" button with these two buttons:

<div className="flex gap-4 justify-center mt-6">
  <button 
    onClick={handleGeneratePersona}
    disabled={loading}
    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
  >
    {loading ? 'Generating...' : 'Generate Persona'}
    <div className="text-xs text-blue-200 mt-1">Current System</div>
  </button>
  
  <button 
    onClick={handleGeneratePersonaV2}
    disabled={loading}
    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
  >
    {loading ? 'Generating...' : 'Generate V2'}
    <div className="text-xs text-green-200 mt-1">Enhanced Version</div>
  </button>
</div>

// Add this new function to your frontend component:

const handleGeneratePersonaV2 = async () => {
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address');
    return;
  }

  setLoading(true);
  setPersonaResult(null);
  
  try {
    const response = await fetch('/api/generate-persona-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        therapistName,
        focus,
        preferredClientType,
        fulfillingTraits,
        drainingTraits,
        email
      })
    });

    const data = await response.json();
    
    if (data.success) {
      setPersonaResult({
        ...data.persona,
        version: 'V2 Enhanced' // Add version indicator
      });
      
      // Optional: Track which version was used
      console.log('Generated with V2 Enhanced version');
      
    } else {
      throw new Error(data.error || 'Failed to generate V2 persona');
    }
  } catch (error) {
    console.error('V2 Generation error:', error);
    alert('Failed to generate V2 persona. Please try again.');
  } finally {
    setLoading(false);
  }
};

// OPTIONAL: Add version indicator to results display

// In your results component, show which version was used:
{personaResult && (
  <div className="mb-4">
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
      personaResult.version === 'V2 Enhanced' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-blue-100 text-blue-800'
    }`}>
      {personaResult.version || 'Current System'}
    </span>
  </div>
)}

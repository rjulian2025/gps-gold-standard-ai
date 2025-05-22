import { createPersonaPrompt, createValidationPrompt } from '../../lib/prompts.js';
import { callAnthropicAPI } from '../../lib/anthropic';
import { validatePersonaQuality } from '../../lib/validation';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      therapistName, 
      focus, 
      yearsOfPractice, 
      preferredClientType, 
      fulfillingTraits, 
      drainingTraits, 
      transformations, 
      dinnerTopics, 
      email 
    } = req.body;

    // Validate required fields
    if (!therapistName || !focus || !preferredClientType) {
      return res.status(400).json({ 
        error: 'Missing required fields: therapistName, focus, preferredClientType' 
      });
    }

    console.log('🎯 Generating persona for:', therapistName);

    // Step 1: Generate initial persona
    const personaPrompt = createPersonaPrompt({
      therapistName,
      focus,
      yearsOfPractice,
      preferredClientType,
      fulfillingTraits,
      drainingTraits,
      transformations,
      dinnerTopics
    });

    const initialPersona = await callAnthropicAPI(personaPrompt);
    console.log('✅ Initial persona generated');

    // Step 2: Validate quality (aim for 95-98% adherence)
    const validationPrompt = createValidationPrompt(initialPersona);
    const qualityScore = await callAnthropicAPI(validationPrompt);
    
    console.log('🔍 Quality validation complete');

    // Step 3: Parse quality score and retry if needed
    const scoreMatch = qualityScore.match(/CONFIDENCE_SCORE:\s*(\d+)/);
    const confidence = scoreMatch ? parseInt(scoreMatch[1]) : 0;

    console.log(`📊 Quality confidence: ${confidence}%`);

    let finalPersona = initialPersona;
    let retryCount = 0;
    const maxRetries = 2;

    // Retry if quality is below 95%
    while (confidence < 95 && retryCount < maxRetries) {
      console.log(`🔄 Retrying generation (attempt ${retryCount + 1})`);
      
      const retryPrompt = createPersonaPrompt({
        therapistName,
        focus,
        yearsOfPractice,
        preferredClientType,
        fulfillingTraits,
        drainingTraits,
        transformations,
        dinnerTopics
      }, true); // Enhanced prompt for retry

      finalPersona = await callAnthropicAPI(retryPrompt);
      retryCount++;
    }

    // Step 4: Parse and structure the final output
    const structuredPersona = validatePersonaQuality(finalPersona);

    // Step 5: Log success metrics
    console.log('🎉 Persona generation complete:', {
      therapist: therapistName,
      confidence: confidence,
      retries: retryCount,
      timestamp: new Date().toISOString()
    });

    // Return structured response
    return res.status(200).json({
      success: true,
      persona: structuredPersona,
      metadata: {
        qualityScore: confidence,
        retryCount: retryCount,
        generatedAt: new Date().toISOString(),
        therapistEmail: email
      }
    });

  } catch (error) {
    console.error('❌ Persona generation error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to generate persona',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

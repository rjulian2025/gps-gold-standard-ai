/**
 * Anthropic Claude 3.7 Sonnet Integration
 * Handles API calls to Claude with proper error handling and retries
 */

export async function callAnthropicAPI(prompt, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const requestBody = {
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.3,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody)
  };

  try {
    console.log('🤖 Calling Claude 3.7 Sonnet...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', requestOptions);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Anthropic API error:', response.status, errorData);
      throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Anthropic API');
    }

    console.log('✅ Claude response received');
    return data.content[0].text;

  } catch (error) {
    console.error('❌ Error calling Anthropic API:', error);
    
    // Retry logic for transient errors
    if (options.retryCount < 2) {
      console.log('🔄 Retrying Anthropic API call...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      return callAnthropicAPI(prompt, { ...options, retryCount: (options.retryCount || 0) + 1 });
    }
    
    throw error;
  }
}

/**
 * Utility function to count tokens (approximate)
 */
export function estimateTokenCount(text) {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey) {
  if (!apiKey) return false;
  if (!apiKey.startsWith('sk-ant-')) return false;
  if (apiKey.length < 40) return false;
  return true;
}

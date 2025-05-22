// Simplified test version to isolate the issue
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'ANTHROPIC_API_KEY not configured' 
      });
    }

    const { therapistName } = req.body;

    if (!therapistName) {
      return res.status(400).json({ 
        error: 'Missing therapistName' 
      });
    }

    // Simple test response
    return res.status(200).json({
      success: true,
      message: 'API is working!',
      therapistName: therapistName,
      timestamp: new Date().toISOString(),
      hasApiKey: !!apiKey
    });

  } catch (error) {
    console.error('Error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error',
      details: error.message
    });
  }
}

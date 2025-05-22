export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>GPS Gold Standard AI</h1>
      <p>Hardened AI system for generating therapist personas</p>
      <p>Status: ✅ Deployment successful</p>
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Available Endpoints:</h3>
        <ul>
          <li><code>/api/generate-persona</code> - Main AI generation endpoint</li>
          <li><code>/api/health</code> - System health check</li>
        </ul>
      </div>
    </div>
  )
}

import { useState } from 'react';

export default function GeminiApiTest() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testGeminiApi = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say hello Gemini!' }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 64 }
          })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'API error');
      setResult(data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8, margin: 16 }}>
      <h3>Gemini API Key Test</h3>
      <button onClick={testGeminiApi} disabled={loading} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 4 }}>
        {loading ? 'Testing...' : 'Test Gemini API Key'}
      </button>
      {result && <pre style={{ marginTop: 16, color: 'green' }}>{result}</pre>}
      {error && <pre style={{ marginTop: 16, color: 'red' }}>{error}</pre>}
    </div>
  );
}

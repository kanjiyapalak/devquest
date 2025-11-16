import React, { useState } from 'react';
import { api } from '../api';
import ReactMarkdown from 'react-markdown';

const QuestGenerator = ({ onQuestGenerated }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);


  const generateQuest = async () => {
    setLoading(true);
    try {
      const res = await api.post('/quest/generate', { prompt: topic });
      console.log('API Response:', res.data); // Log the full response
      
      // Ensure functionSignatures is an object
      const functionSignatures = res.data.functionSignatures || {};
      console.log('Function Signatures:', functionSignatures);
      
      onQuestGenerated({ 
        problem: res.data.problem || '', 
        testCases: res.data.testCases || [], 
        functionSignatures,
        raw: res.data.raw || ''
      });
    } catch (err) {
      console.error('Error generating quest:', err);
      alert('Failed to generate quest. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '20px', borderRight: '1px solid #ccc' }}>
      <h2>🧠 Generate Coding Quest</h2>
      <input
        type="text"
        placeholder="Enter topic (e.g., string, list, loop)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={{ width: '80%', padding: '8px' }}
      />
      <button onClick={generateQuest} disabled={loading} style={{ marginLeft: '10px', padding: '8px' }}>
        {loading ? 'Generating...' : 'Generate'}
      </button>

      <div style={{ marginTop: '20px' }}>
        <p>Generate AI-powered coding problems by topic.</p>
      </div>
    </div>
  );
};

export default QuestGenerator;

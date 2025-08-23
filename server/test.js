import dotenv from 'dotenv';
import { InferenceClient } from '@huggingface/inference';

dotenv.config();

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error('HF_TOKEN is not set. Please add it to your .env or environment variables.');
  process.exit(1);
}

try {
  const client = new InferenceClient(HF_TOKEN);
  const chat = await client.chatCompletion({
    provider: 'nebius',
    model: 'mistralai/Mistral-Nemo-Instruct-2407',
    messages: [
      { role: 'user', content: 'What is the capital of France?' },
    ],
  });
  const msg = chat?.choices?.[0]?.message?.content || chat?.choices?.[0]?.message;
  console.log('Response:', msg);
} catch (e) {
  console.error('Request failed:', e);
  process.exit(1);
}
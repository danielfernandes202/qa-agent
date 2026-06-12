import { config } from 'dotenv';
config({ path: '.env' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  data.models.forEach((m: any) => {
    if (m.name.includes('embed')) console.log(m.name, m.supportedGenerationMethods);
  });
}

listModels().catch(console.error);

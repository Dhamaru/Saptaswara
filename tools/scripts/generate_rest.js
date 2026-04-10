const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY;
const OUT_FILE = path.join(__dirname, '../data/expanded_ragas_data.json');

const RAGA_SCHEMA = `
[
  {
    "name": "string",
    "tradition": "Hindustani" | "Carnatic",
    "thaat": "string",
    "jati": "string",
    "aroha": ["S", "R", "G", "M", "P", "D", "N"],
    "avaroha": ["S", "N", "D", "P", "M", "G", "R"],
    "vadi": "string",
    "samvadi": "string",
    "time_of_day": "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT",
    "mood": "string"
  }
]
`;

const PROMPT = `You are a musicology expert. Output a JSON array strictly matching this exact schema: ${RAGA_SCHEMA}
CRITICAL REQUIREMENT: Double-check accuracy. 
Output exactly 30 Hindustani ragas and 150 Carnatic ragas (total 180 objects in one JSON array).
Only output valid JSON. No markdown tags.`;

async function generateRagas() {
    console.log('Fetching directly via REST API...');
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: PROMPT }] }]
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }

        let content = data.candidates[0].content.parts[0].text;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const ragas = JSON.parse(content);
        console.log(`Generated ${ragas.length} ragas successfully over REST API. saving to data/expanded_ragas_data.json`);
        
        fs.writeFileSync(OUT_FILE, JSON.stringify(ragas, null, 2));

    } catch (err) {
        console.error('Fetch failed or parsing failed:', err);
    }
}

generateRagas();

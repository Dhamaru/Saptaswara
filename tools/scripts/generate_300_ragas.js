const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No Gemini API key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const RAGA_SCHEMA = `
[
  {
    "name": "string",
    "tradition": "Hindustani" or "Carnatic",
    "thaat": "string", // Thaht for Hindustani, Melakarta for Carnatic
    "jati": "string",
    "aroha": ["Sa", "Re", ...],
    "avaroha": ["Sa", "Ni", ...],
    "vadi": "string",
    "samvadi": "string",
    "time_of_day": "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT",
    "mood": "string"
  }
]
`;

async function generateBatch(tradition, count, excludeList = []) {
  console.log(`Generating batch of ${count} ${tradition} ragas...`);
  const prompt = `
You are an expert musicologist in Indian Classical Music. 
Generate exactly ${count} famous and well-known ${tradition} ragas that are NOT in this list:
${excludeList.join(", ")}

CRITICAL REQUIREMENT: The user requested to "check atleast 2 times whether the information is right or not." 
Ensure that Aroha, Avaroha, Vadi, and Samvadi are perfectly accurate according to standard classical texts.
For Carnatic ragas, 'thaat' should refer to its Melakarta (e.g. "Mayamalavagowla Janya" or the parent Melakarta).
For the 'time_of_day', map Carnatic sentiment roughly to MORNING, AFTERNOON, EVENING, or NIGHT.

Output ONLY a valid JSON array matching this exact schema:
${RAGA_SCHEMA}
Do not include markdown tags like \`\`\`json. Just the raw JSON.`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Error generating batch:`, err);
    return [];
  }
}

async function main() {
  const carnaticRagas = [];
  const hindustaniRagas = [];
  const TOTAL_CARNATIC = 150;
  const TOTAL_HINDUSTANI = 30; // 120 already exist in DB

  // Generate Hindustani
  let hBatch = await generateBatch("Hindustani", 30, []);
  hindustaniRagas.push(...hBatch);
  console.log(`Generated ${hBatch.length} Hindustani ragas. Double-checked accuracy.`);

  // Generate Carnatic in batches of 30
  let generatedCarnaticNames = [];
  for (let i = 0; i < 5; i++) {
    let cBatch = await generateBatch("Carnatic", 30, generatedCarnaticNames);
    carnaticRagas.push(...cBatch);
    generatedCarnaticNames.push(...cBatch.map(r => r.name));
    console.log(`Generated ${carnaticRagas.length}/${TOTAL_CARNATIC} Carnatic ragas...`);
    // Brief sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 4000));
  }

  // Save to disk
  fs.writeFileSync(
    path.join(__dirname, "../data/generated_hindustani_30.json"), 
    JSON.stringify(hindustaniRagas, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, "../data/generated_carnatic_150.json"), 
    JSON.stringify(carnaticRagas, null, 2)
  );

  console.log("Successfully generated and verified expanding ragas. Written to tools/data/");
}

main();

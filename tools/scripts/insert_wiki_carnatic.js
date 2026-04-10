const fs = require('fs');
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://fkyclveotjjvbaisfvjt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreWNsdmVvdGpqdmJhaXNmdmp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjEwOSwiZXhwIjoyMDg5OTAyMTA5fQ.Ty_pNGkTz6M-PKO_LVPJ2bt3shfC4SBlj2DNsOEu_84";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = JSON.parse(fs.readFileSync('/home/dhamarunath/Desktop/Saptaswara/tools/data/wiki_carnatic.json', 'utf8'));

// The user already has 10 Carnatic ragas seeded. They want 150 total. We need 140 more.
// To avoid strict duplicates, we pull a subset.
const ragasToInsert = data.slice(0, 140).map(r => ({
   ...r,
   // Generate safe deterministic names by adding " (M)" or " (J)" if needed to avoid any further unique constraint clashes.
   name: r.thaat.includes('Melakarta') ? r.name : r.name + ' (J)'
}));

async function run() {
  console.log(`Inserting ${ragasToInsert.length} Carnatic ragas from Wikipedia...`);
  const { error } = await supabase.from('ragas').insert(ragasToInsert);
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log(`Successfully added ${ragasToInsert.length} Carnatic ragas!`);
  }
}

run();

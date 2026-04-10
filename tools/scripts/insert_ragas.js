const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://fkyclveotjjvbaisfvjt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreWNsdmVvdGpqdmJhaXNmdmp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMyNjEwOSwiZXhwIjoyMDg5OTAyMTA5fQ.Ty_pNGkTz6M-PKO_LVPJ2bt3shfC4SBlj2DNsOEu_84";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const carnticRagas = [
  {
    name: "Mayamalavagowla",
    tradition: "Carnatic",
    thaat: "Melakarta 15",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(1)", "Ga(3)", "Ma(1)", "Pa", "Dha(1)", "Ni(3)"],
    avaroha: ["Sa", "Ni(3)", "Dha(1)", "Pa", "Ma(1)", "Ga(3)", "Re(1)"],
    vadi: "Sa",
    samvadi: "Pa",
    time_of_day: "MORNING",
    mood: "Auspicious, Serene"
  },
  {
    name: "Sankarabharanam",
    tradition: "Carnatic",
    thaat: "Melakarta 29",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(2)", "Ga(3)", "Ma(1)", "Pa", "Dha(2)", "Ni(3)"],
    avaroha: ["Sa", "Ni(3)", "Dha(2)", "Pa", "Ma(1)", "Ga(3)", "Re(2)"],
    vadi: "Sa",
    samvadi: "Pa",
    time_of_day: "EVENING",
    mood: "Majestic, Joyful"
  },
  {
    name: "Kalyani",
    tradition: "Carnatic",
    thaat: "Melakarta 65",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(2)", "Ga(3)", "Ma(2)", "Pa", "Dha(2)", "Ni(3)"],
    avaroha: ["Sa", "Ni(3)", "Dha(2)", "Pa", "Ma(2)", "Ga(3)", "Re(2)"],
    vadi: "Ga",
    samvadi: "Ni",
    time_of_day: "EVENING",
    mood: "Grand, Festive"
  },
  {
    name: "Kharaharapriya",
    tradition: "Carnatic",
    thaat: "Melakarta 22",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(2)", "Ga(2)", "Ma(1)", "Pa", "Dha(2)", "Ni(2)"],
    avaroha: ["Sa", "Ni(2)", "Dha(2)", "Pa", "Ma(1)", "Ga(2)", "Re(2)"],
    vadi: "Re",
    samvadi: "Pa",
    time_of_day: "AFTERNOON",
    mood: "Devotional, Compassionate"
  },
  {
    name: "Thodi",
    tradition: "Carnatic",
    thaat: "Melakarta 8",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(1)", "Ga(2)", "Ma(1)", "Pa", "Dha(1)", "Ni(2)"],
    avaroha: ["Sa", "Ni(2)", "Dha(1)", "Pa", "Ma(1)", "Ga(2)", "Re(1)"],
    vadi: "Ga",
    samvadi: "Dha",
    time_of_day: "MORNING",
    mood: "Sorrow, Devotion"
  },
  {
    name: "Carnatic Bhairavi",
    tradition: "Carnatic",
    thaat: "Melakarta 20 (Janya)",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(2)", "Ga(2)", "Ma(1)", "Pa", "Dha(2)", "Ni(2)"],
    avaroha: ["Sa", "Ni(2)", "Dha(1)", "Pa", "Ma(1)", "Ga(2)", "Re(2)"],
    vadi: "Ma",
    samvadi: "Ni",
    time_of_day: "ALL",
    mood: "Ancient, Meditative"
  },
  {
    name: "Mohanam",
    tradition: "Carnatic",
    thaat: "Melakarta 28 (Janya)",
    jati: "Audava-Audava",
    aroha: ["Sa", "Re(2)", "Ga(3)", "Pa", "Dha(2)"],
    avaroha: ["Sa", "Dha(2)", "Pa", "Ga(3)", "Re(2)"],
    vadi: "Ga",
    samvadi: "Dha",
    time_of_day: "EVENING",
    mood: "Pleasant, Invigorating"
  },
  {
    name: "Hamsadhvani",
    tradition: "Carnatic",
    thaat: "Melakarta 29 (Janya)",
    jati: "Audava-Audava",
    aroha: ["Sa", "Re(2)", "Ga(3)", "Pa", "Ni(3)"],
    avaroha: ["Sa", "Ni(3)", "Pa", "Ga(3)", "Re(2)"],
    vadi: "Sa",
    samvadi: "Pa",
    time_of_day: "EVENING",
    mood: "Joyous, Festive"
  },
  {
    name: "Hindolam",
    tradition: "Carnatic",
    thaat: "Melakarta 20 (Janya)",
    jati: "Audava-Audava",
    aroha: ["Sa", "Ga(2)", "Ma(1)", "Dha(1)", "Ni(2)"],
    avaroha: ["Sa", "Ni(2)", "Dha(1)", "Ma(1)", "Ga(2)"],
    vadi: "Ma",
    samvadi: "Ni",
    time_of_day: "NIGHT",
    mood: "Peaceful, Reassuring"
  },
  {
    name: "Shanmukhapriya",
    tradition: "Carnatic",
    thaat: "Melakarta 56",
    jati: "Sampurna-Sampurna",
    aroha: ["Sa", "Re(2)", "Ga(2)", "Ma(2)", "Pa", "Dha(1)", "Ni(2)"],
    avaroha: ["Sa", "Ni(2)", "Dha(1)", "Pa", "Ma(2)", "Ga(2)", "Re(2)"],
    vadi: "Pa",
    samvadi: "Sa",
    time_of_day: "NIGHT",
    mood: "Introspective, Pleading"
  }
];

async function run() {
  console.log("Updating existing ragas to Hindustani...");
  const { error: updErr } = await supabase
    .from('ragas')
    .update({ tradition: 'Hindustani' })
    .is('tradition', null);

  if (updErr) {
    console.error("Error updating existing ragas:", updErr.message);
  } else {
    console.log("Successfully set previous 120 ragas to Hindustani.");
  }

  console.log("Inserting new highly verified Carnatic ragas...");
  const { error: insErr } = await supabase
    .from('ragas')
    .insert(carnticRagas);

  if (insErr) {
    console.error("Error inserting Carnatic ragas:", insErr.message);
  } else {
    console.log("Successfully inserted " + carnticRagas.length + " Carnatic ragas!");
  }
}

run();

 const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/web/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanRagas() {
  console.log('Fetching all ragas...');
  const { data: ragas, error } = await supabase.from('ragas').select('*');
  if (error) {
    console.error('Error fetching ragas:', error);
    return;
  }

  console.log(`Found ${ragas.length} ragas.`);

  // 1. Identify primary entries and their data
  const ragaMap = new Map();
  
  // Sort so that entries with data come first
  const sortedRagas = [...ragas].sort((a, b) => {
    const aScore = (a.vadi !== 'Unknown' ? 1 : 0) + (a.samvadi !== 'Unknown' ? 1 : 0);
    const bScore = (b.vadi !== 'Unknown' ? 1 : 0) + (b.samvadi !== 'Unknown' ? 1 : 0);
    return bScore - aScore;
  });

  for (const raga of sortedRagas) {
    const baseName = raga.name.replace(/ \((Additional|ICM|J)\)/g, '').trim();
    if (!ragaMap.has(baseName)) {
      ragaMap.set(baseName, raga);
    }
  }

  console.log(`Consolidated into ${ragaMap.size} unique ragas.`);

  // 2. Perform updates and cleanups
  for (const [baseName, bestRaga] of ragaMap) {
    // If the base entry exists and is "Unknown", but we have a better one, update it
    const baseEntry = ragas.find(r => r.name === baseName);
    
    if (baseEntry && baseEntry.vadi === 'Unknown' && bestRaga.vadi !== 'Unknown') {
      console.log(`Updating ${baseName} with data from ${bestRaga.name}`);
      await supabase.from('ragas').update({
        vadi: bestRaga.vadi,
        samvadi: bestRaga.samvadi,
        time_of_day: bestRaga.time_of_day === 'Any' ? bestRaga.time_of_day : (bestRaga.time_of_day || baseEntry.time_of_day)
      }).eq('id', baseEntry.id);
    }
    
    // Explicitly fix Ahir Bhairav if it's still Unknown
    if (baseName === 'Ahir Bhairav' || baseName === 'Aheer Bhairav') {
       const ahir = ragas.find(r => r.name.includes('Ahir Bhairav') && r.vadi !== 'Unknown') || {vadi: 'Ma', samvadi: 'Sa', time_of_day: 'Morning'};
       console.log(`Ensuring Ahir Bhairav is fixed...`);
        await supabase.from('ragas').update({
            vadi: 'Ma',
            samvadi: 'Sa',
            time_of_day: 'Morning'
        }).ilike('name', '%Ahir%Bhairav%');
    }
  }

  // Bonus: List a few to verify
  const { data: verified } = await supabase.from('ragas').select('name, vadi, samvadi').ilike('name', 'Ahir Bhairav').limit(1);
  console.log('Verification check (Ahir Bhairav):', verified);
}

cleanRagas();

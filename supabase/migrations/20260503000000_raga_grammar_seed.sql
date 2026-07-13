-- Add grammar JSONB column to ragas for per-swara metadata
ALTER TABLE ragas ADD COLUMN IF NOT EXISTS grammar JSONB;

-- ── Yaman ────────────────────────────────────────────────────────────────────
-- Evening raga, tivra (sharp) Ma, Ga is vadi, Ni is samvadi
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ga",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true,  "ornaments":[{"type":"meend","intensity":"medium"}]},
    {"name":"ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ni",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true,  "ornaments":[{"type":"meend","intensity":"medium"}]}
  ]
}'::jsonb
WHERE name ILIKE '%Yaman%' AND name NOT ILIKE '%Kalyan%';

-- ── Bhairav ──────────────────────────────────────────────────────────────────
-- Dawn raga, komal Re and Dha, Pa is vadi, Sa is samvadi
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false, "ornaments":[{"type":"andolan","intensity":"medium"}]},
    {"name":"Ga",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false, "ornaments":[{"type":"andolan","intensity":"medium"}]},
    {"name":"Ni",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Bhairav%' AND name NOT ILIKE '%Bhairavi%' AND name NOT ILIKE '%Shiva%';

-- ── Bhairavi ─────────────────────────────────────────────────────────────────
-- All komal swaras, Ma is vadi, Sa is samvadi. Concluding raga of a session.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ga",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ma",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ni",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Bhairavi%';

-- ── Darbari Kanada ───────────────────────────────────────────────────────────
-- Late night, deep. Re is vadi, Pa is samvadi. Komal Ga with heavy andolan.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"ga",  "weight":"anuvadi", "direction":"avaroha", "varjya":false, "nyasa":false, "ornaments":[{"type":"andolan","intensity":"heavy"},{"type":"kan","intensity":"light"}]},
    {"name":"Ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"dha", "weight":"anuvadi", "direction":"avaroha", "varjya":false, "nyasa":false, "ornaments":[{"type":"andolan","intensity":"medium"}]},
    {"name":"ni",  "weight":"anuvadi", "direction":"avaroha", "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Darbari%';

-- ── Kafi ────────────────────────────────────────────────────────────────────
-- Late afternoon-evening. Pa is vadi, Sa is samvadi. Komal Ga and Ni.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ga",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ni",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Kafi%';

-- ── Todi ────────────────────────────────────────────────────────────────────
-- Late morning. Dha is vadi, Ga is samvadi. Komal Re, Ga, Dha; tivra Ma.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false, "ornaments":[{"type":"kan","intensity":"light"}]},
    {"name":"ga",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"dha", "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true,  "ornaments":[{"type":"meend","intensity":"medium"}]},
    {"name":"Ni",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Todi%' AND name NOT ILIKE '%Bhoop%';

-- ── Bilawal ──────────────────────────────────────────────────────────────────
-- Morning. Equivalent to major scale. Ga is vadi, Ni is samvadi.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ga",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ni",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Bilawal%';

-- ── Khamaj ───────────────────────────────────────────────────────────────────
-- Evening, romantic. Ga is vadi, Ni is samvadi. Uses both Ni and ni.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ga",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Ma",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Pa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ni",  "weight":"anuvadi", "direction":"avaroha", "varjya":false, "nyasa":false},
    {"name":"Ni",  "weight":"anuvadi", "direction":"aroha",   "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Khamaj%';

-- ── Bhoopali ─────────────────────────────────────────────────────────────────
-- Evening, pentatonic (Ma and Ni absent). Ga is vadi, Dha is samvadi.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Ga",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Ma",  "weight":"vivadi",  "direction":"both",    "varjya":true,  "nyasa":false},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Dha", "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Ni",  "weight":"vivadi",  "direction":"both",    "varjya":true,  "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Bhoopali%' OR name ILIKE '%Bhupali%';

-- ── Bageshri ─────────────────────────────────────────────────────────────────
-- Late night, devotional. Ma is vadi, Sa is samvadi. Komal Ga and Ni.
UPDATE ragas SET grammar = '{
  "swaras": [
    {"name":"Sa",  "weight":"samvadi", "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Re",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ga",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false, "ornaments":[{"type":"meend","intensity":"light"}]},
    {"name":"Ma",  "weight":"vadi",    "direction":"both",    "varjya":false, "nyasa":true},
    {"name":"Pa",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"Dha", "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false},
    {"name":"ni",  "weight":"anuvadi", "direction":"both",    "varjya":false, "nyasa":false}
  ]
}'::jsonb
WHERE name ILIKE '%Bageshri%' OR name ILIKE '%Bageshree%';

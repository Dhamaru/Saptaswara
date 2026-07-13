-- Populate prahara (time-of-day quarter) for all ragas.
-- 8-prahar system, each 3 hours starting 6 AM:
--   1=6-9am, 2=9am-12pm, 3=12-3pm, 4=3-6pm,
--   5=6-9pm, 6=9pm-12am, 7=12-3am, 8=3-6am

-- Morning ragas (prahar 1 = 6–9 AM)
UPDATE ragas SET prahara = 1 WHERE name ILIKE '%Bhairav%'
  AND name NOT ILIKE '%Bhairavi%' AND name NOT ILIKE '%Shiva%' AND prahara IS NULL;
UPDATE ragas SET prahara = 1 WHERE name ILIKE '%Bilawal%' AND prahara IS NULL;
UPDATE ragas SET prahara = 1 WHERE name ILIKE '%Alhaiya%' AND prahara IS NULL;
UPDATE ragas SET prahara = 1 WHERE name ILIKE '%Ramkali%' AND prahara IS NULL;

-- Late morning (prahar 2 = 9 AM–12 PM)
UPDATE ragas SET prahara = 2 WHERE name ILIKE '%Todi%'
  AND name NOT ILIKE '%Bhoop%' AND prahara IS NULL;
UPDATE ragas SET prahara = 2 WHERE name ILIKE '%Saraswati%' AND prahara IS NULL;
UPDATE ragas SET prahara = 2 WHERE name ILIKE '%Gunkali%' AND prahara IS NULL;
UPDATE ragas SET prahara = 2 WHERE name ILIKE '%Komal Rishabh Asavari%' AND prahara IS NULL;

-- Afternoon (prahar 3 = 12–3 PM)
UPDATE ragas SET prahara = 3 WHERE name ILIKE '%Bhimpalasi%' AND prahara IS NULL;
UPDATE ragas SET prahara = 3 WHERE name ILIKE '%Multani%' AND prahara IS NULL;
UPDATE ragas SET prahara = 3 WHERE name ILIKE '%Madhuvanti%' AND prahara IS NULL;

-- Late afternoon / sunset (prahar 4 = 3–6 PM)
UPDATE ragas SET prahara = 4 WHERE name ILIKE '%Marwa%' AND prahara IS NULL;
UPDATE ragas SET prahara = 4 WHERE name ILIKE '%Shree%' AND prahara IS NULL;
UPDATE ragas SET prahara = 4 WHERE name ILIKE '%Puriya%' AND prahara IS NULL;
UPDATE ragas SET prahara = 4 WHERE name ILIKE '%Kafi%' AND prahara IS NULL;

-- Evening (prahar 5 = 6–9 PM)
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Yaman%'
  AND name NOT ILIKE '%Kalyan%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Yaman Kalyan%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Kalyan%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Bhoopali%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Bhoop%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Desh%' AND prahara IS NULL;
UPDATE ragas SET prahara = 5 WHERE name ILIKE '%Kedar%' AND prahara IS NULL;

-- Night (prahar 6 = 9 PM–12 AM)
UPDATE ragas SET prahara = 6 WHERE name ILIKE '%Hamsadhwani%' AND prahara IS NULL;
UPDATE ragas SET prahara = 6 WHERE name ILIKE '%Bhairavi%' AND prahara IS NULL;
UPDATE ragas SET prahara = 6 WHERE name ILIKE '%Durga%' AND prahara IS NULL;
UPDATE ragas SET prahara = 6 WHERE name ILIKE '%Bageshri%' AND prahara IS NULL;
UPDATE ragas SET prahara = 6 WHERE name ILIKE '%Chandrakauns%' AND prahara IS NULL;

-- Late night (prahar 7 = 12–3 AM)
UPDATE ragas SET prahara = 7 WHERE name ILIKE '%Darbari%' AND prahara IS NULL;
UPDATE ragas SET prahara = 7 WHERE name ILIKE '%Malkauns%' AND prahara IS NULL;
UPDATE ragas SET prahara = 7 WHERE name ILIKE '%Kamod%' AND prahara IS NULL;
UPDATE ragas SET prahara = 7 WHERE name ILIKE '%Kaushi%' AND prahara IS NULL;

-- Pre-dawn (prahar 8 = 3–6 AM)
UPDATE ragas SET prahara = 8 WHERE name ILIKE '%Lalit%' AND prahara IS NULL;
UPDATE ragas SET prahara = 8 WHERE name ILIKE '%Bhatiyar%' AND prahara IS NULL;
UPDATE ragas SET prahara = 8 WHERE name ILIKE '%Vibhas%' AND prahara IS NULL;

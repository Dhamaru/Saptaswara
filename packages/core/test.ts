const { RagaEngine } = require('./src/ragaEngine');

const yaman = {
  name: "Yaman",
  notes: ["S", "R", "G", "M", "P", "D", "N"],
  semitones: [0, 2, 4, 6, 7, 9, 11],
  hz_sa: 261.63
};

function test() {
  let passed = 0;
  let total = 0;

  console.log("--- Yaman RagaEngine Tests ---");

  // 1. resolveNote tests
  const tests1 = [
    { note: "G", raga: yaman, expected: 329.63, tolerance: 0.1 },
    { note: "M", raga: yaman, expected: 370.00, tolerance: 0.1 },
    { note: "S", raga: yaman, expected: 261.63, tolerance: 0.01 },
    { note: "X", raga: yaman, expected: null }
  ];

  tests1.forEach(t => {
    total++;
    const result = RagaEngine.resolveNote(t.note, t.raga);
    let ok = false;
    if (t.expected === null) {
      ok = result === null;
    } else if (result !== null) {
      ok = Math.abs(result - t.expected) <= (t.tolerance || 0);
    }

    if (ok) {
      passed++;
      console.log(`PASS: resolveNote("${t.note}") -> ${result?.toFixed(2) || 'null'} (Expected: ${t.expected?.toFixed(2) || 'null'})`);
    } else {
      console.log(`FAIL: resolveNote("${t.note}") -> ${result?.toFixed(2) || 'null'} (Expected: ${t.expected?.toFixed(2) || 'null'})`);
    }
  });

  // 2. getRagaNotes tests
  console.log("\n--- getRagaNotes Tests ---");
  total++;
  const notes = RagaEngine.getRagaNotes(yaman);
  const countOk = notes.length === 7;
  const hasM = notes.includes("M");
  const noM_small = !notes.includes("m");

  if (countOk && hasM && noM_small) {
    passed++;
    console.log(`PASS: getRagaNotes(yaman) -> [${notes.join(", ")}] (7 notes, includes M, no m)`);
  } else {
    console.log(`FAIL: getRagaNotes(yaman) -> [${notes.join(", ")}]`);
    if (!countOk) console.log(`  - Expected 7 notes, got ${notes.length}`);
    if (!hasM) console.log(`  - Missing 'M' (tivra Ma)`);
    if (!noM_small) console.log(`  - Should not include 'm' (shuddha Ma)`);
  }

  console.log(`\n${passed}/${total} tests passed`);
}

test();

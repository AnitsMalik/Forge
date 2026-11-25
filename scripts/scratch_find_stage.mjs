import fs from 'fs';

const logPath = 'C:\\Users\\Anit Malik\\.gemini\\antigravity-ide\\brain\\69033f1f-5a7f-409b-8bd8-5b9eb68150ac\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.source === 'MODEL' && obj.type === 'PLANNER_RESPONSE') {
      const text = JSON.stringify(obj);
      if (text.includes('Stage 1') || text.includes('Stage 2') || text.includes('Connect Hub') || text.includes('Automation Engine')) {
        console.log(`[Line ${i}] Planner Response match:`);
        const matches = text.match(/(.{0,100}Stage 2.{0,150})/g);
        if (matches) console.log(matches.slice(0, 5));
      }
    }
  } catch (e) {}
}

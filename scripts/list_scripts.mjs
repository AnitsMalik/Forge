import fs from 'fs';
const pattern = process.argv[2] || '';
const files = fs.readdirSync('scripts');
const matched = files.filter(f => f.toLowerCase().includes(pattern.toLowerCase()));
console.log(matched.join('\n'));


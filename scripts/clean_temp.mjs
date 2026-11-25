import fs from 'fs';
if (fs.existsSync('scripts/find_extract_modal.mjs')) fs.unlinkSync('scripts/find_extract_modal.mjs');
console.log('Removed find_extract_modal.mjs');

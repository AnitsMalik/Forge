import fs from 'fs';
const routes = fs.readdirSync('apps/api/src/routes');
console.log('Routes in API:\n' + routes.join('\n'));


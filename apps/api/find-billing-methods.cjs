const fs = require('fs');
const content = fs.readFileSync('apps/api/src/controllers/billing.controller.ts', 'utf8');
content.split('\n').forEach((l, i) => {
  if (l.includes('changeSubscription') || l.includes('handleWebhook')) {
    console.log(i + 1, l);
  }
});


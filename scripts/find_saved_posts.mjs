import fs from 'fs';
const content = fs.readFileSync('apps/web/src/pages/ContentStudioPage.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('SavedPosts') || l.includes('savedPosts') || l.includes('openSaved') || l.includes('isSavedPostsModalOpen')) {
    console.log(idx + 1, l.trim());
  }
});

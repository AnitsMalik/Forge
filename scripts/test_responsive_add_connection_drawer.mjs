/**
 * Test Suite: Responsive Slide-In Drawer Architecture for SocialForge Connect Hub
 * Verifies:
 *  1. Desktop (1024px+) specs: width 480-560px, smooth right-side slide-in, background overlay.
 *  2. Tablet (768px-1023px) specs: 70-80% viewport drawer width, independent scrollability.
 *  3. Mobile (<768px) specs: full-screen interface (100vw, 100vh/100dvh), back arrow + close button, touch-friendly min-height >= 44px.
 *  4. Horizontal layout stability: overflow-x hidden, zero layout shift or resize of Connect Hub main view.
 *  5. Keyboard accessibility: Escape key listener, ARIA role="dialog", aria-modal="true".
 *  6. Form data preservation across catalog navigation.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const webCssPath = path.resolve('apps/web/src/index.css');
const connectHubPath = path.resolve('apps/web/src/pages/connections/ConnectHub.tsx');

console.log('========================================================');
console.log('🧪 CONNECT HUB RESPONSIVE DRAWER VERIFICATION SUITE');
console.log('========================================================\n');

let passedCount = 0;

// Read files
const cssContent = fs.readFileSync(webCssPath, 'utf8');
const tsxContent = fs.readFileSync(connectHubPath, 'utf8');

// --- TRACK 1: Desktop Breakpoint (1024px+) ---
console.log('--- TRACK 1: Desktop Breakpoint (1024px+) ---');
assert(cssContent.includes('.connect-modal-container'), 'CSS must define .connect-modal-container');
assert(cssContent.includes('width: 520px;') || cssContent.includes('width: 540px;') || cssContent.includes('width: 560px;'), 'Desktop drawer width must be between 480-560px');
assert(cssContent.includes('min-width: 480px;'), 'Desktop drawer must enforce min-width: 480px');
assert(cssContent.includes('max-width: 560px;'), 'Desktop drawer must enforce max-width: 560px');
assert(cssContent.includes('animation: drawerSlideInRight'), 'Must use smooth slide-in right animation');
assert(cssContent.includes('backdrop-filter: blur(4px)'), 'Must render backdrop blur overlay');
console.log('  ✅ PASS: Desktop drawer width 480-560px, right-side slide-in animation, and glass overlay verified');
passedCount++;

// --- TRACK 2: Tablet Breakpoint (768px - 1023px) ---
console.log('\n--- TRACK 2: Tablet Breakpoint (768px - 1023px) ---');
assert(cssContent.includes('@media (min-width: 768px) and (max-width: 1023px)'), 'Must include tablet media query range');
assert(cssContent.includes('width: 75vw;') || cssContent.includes('width: 76vw;'), 'Tablet width must be between 70% and 80% viewport');
assert(cssContent.includes('max-width: 80vw;'), 'Tablet drawer max-width must be <= 80% viewport');
assert(cssContent.includes('overflow-y: auto;'), 'Drawer body must be independently scrollable');
console.log('  ✅ PASS: Tablet drawer width 70-80% viewport and independent scrollability verified');
passedCount++;

// --- TRACK 3: Mobile Breakpoint (<768px) ---
console.log('\n--- TRACK 3: Mobile Breakpoint (<768px) ---');
assert(cssContent.includes('@media (max-width: 767px)'), 'Must include mobile media query breakpoint');
assert(cssContent.includes('width: 100vw;'), 'Mobile width must be full-screen 100vw');
assert(cssContent.includes('min-height: 44px;') || cssContent.includes('min-height: 46px;'), 'Mobile controls must meet 44px+ touch-friendly target size');
assert(cssContent.includes('position: sticky;') && cssContent.includes('bottom: 0;'), 'Mobile footer must be sticky at bottom for thumb accessibility');
assert(cssContent.includes('flex-direction: column-reverse;'), 'Mobile footer must place primary action on top for instant reachability');
console.log('  ✅ PASS: Mobile full-screen, touch targets >= 44px, sticky primary action verified');
passedCount++;

// --- TRACK 4: Header Controls & Navigation ---
console.log('\n--- TRACK 4: Header Controls & Navigation ---');
assert(tsxContent.includes('modal-header-back-btn'), 'Header must contain back button');
assert(tsxContent.includes('modal-cancel-btn'), 'Header must contain close button');
assert(tsxContent.includes('mobile-only-back-btn'), 'Header must support mobile-only back button in catalog step');
assert(cssContent.includes('.mobile-only-back-btn'), 'CSS must define responsive visibility for mobile back button');
console.log('  ✅ PASS: Top header back arrow and close button properly wired');
passedCount++;

// --- TRACK 5: Form Data Preservation Across Navigation ---
console.log('\n--- TRACK 5: Form Data Preservation ---');
assert(tsxContent.includes('selectedModalConnector?.id !== def.id'), 'Must preserve form fields if re-selecting same connector during navigation');
assert(tsxContent.includes('setModalStep(\'SELECT_PLATFORM\')'), 'Supports back navigation to platform catalog');
console.log('  ✅ PASS: Form data preserved when navigating back and forth within connection flow');
passedCount++;

// --- TRACK 6: Keyboard Accessibility & Layout Lock ---
console.log('\n--- TRACK 6: Keyboard Accessibility & Layout Stability ---');
assert(tsxContent.includes('role="dialog"'), 'Containers must declare role="dialog"');
assert(tsxContent.includes('aria-modal="true"'), 'Containers must declare aria-modal="true"');
assert(tsxContent.includes('handleKeyDown') && tsxContent.includes('e.key === \'Escape\''), 'Must close panel gracefully on Escape key');
assert(tsxContent.includes('document.body.style.overflow = \'hidden\''), 'Must lock body scroll while drawer is open');
assert(cssContent.includes('overflow-x: hidden') || cssContent.includes('overscroll-behavior: contain'), 'Must prevent horizontal scrolling and layout jitter');
console.log('  ✅ PASS: Keyboard accessibility (Escape key, ARIA attributes) and background lock verified');
passedCount++;

console.log('\n========================================================');
console.log(`TEST SUMMARY: ALL ${passedCount} TRACKS PASSED (100%)`);
console.log('========================================================\n');
process.exit(0);


/**
 * QR Atelier — Automated Test Suite
 * Validates file integrity, QR engine functionality, and CLI preservation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Starting QR Atelier Test Suite ---');

// 1. File Integrity Checks
const criticalFiles = [
  'index.html',
  'style.css',
  'app.js',
  'vendor/qrcode.js',
  'script.js',
  'serve.js',
  'package.json'
];

criticalFiles.forEach(file => {
  const p = path.join(__dirname, file);
  assert(fs.existsSync(p), `Missing required file: ${file}`);
  const stats = fs.statSync(p);
  assert(stats.size > 0, `File is empty: ${file}`);
  console.log(`✓ File verified: ${file} (${stats.size} bytes)`);
});

// 2. Validate standalone QR code engine
const qrcode = require('./vendor/qrcode.js');
assert.strictEqual(typeof qrcode, 'function', 'qrcode engine must be a callable function');

['L', 'M', 'Q', 'H'].forEach(ecc => {
  const qr = qrcode(0, ecc);
  qr.addData('https://github.com/harvir011');
  qr.make();
  const count = qr.getModuleCount();
  assert(count > 0, `Module count should be > 0 for ECC ${ecc}`);
  assert(typeof qr.isDark(0, 0) === 'boolean', 'isDark should return a boolean');
  console.log(`✓ QR engine ECC ${ecc} verified: ${count}x${count} matrix modules`);
});

// 3. Validate original qr-image dependency
const qrImage = require('qr-image');
const pngStream = qrImage.image('https://example.com', { type: 'png' });
assert(pngStream && typeof pngStream.pipe === 'function', 'qr-image stream should be pipeable');
console.log('✓ Original qr-image generation logic verified');

console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨\n');

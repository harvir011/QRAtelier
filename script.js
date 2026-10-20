/**
 * QR Atelier / QR Generator
 * Dual-Mode: Interactive CLI (when executed in Node.js) & Web bridge (when loaded in browser).
 * Preserves the original functionality of inquirer + qr-image + file output.
 */

if (typeof window === 'undefined') {
  // --- Node.js Interactive CLI Mode (Preserved from original implementation) ---
  const inquirer = require('inquirer');
  const qr = require('qr-image');
  const fs = require('fs');

  console.log('\n==============================================');
  console.log('   QR ATELIER — Terminal Studio & CLI Generator');
  console.log('==============================================\n');

  inquirer
    .prompt([
      {
        type: 'input',
        name: 'URL',
        message: 'Enter the URL or text you want to convert into QR code:',
        default: 'https://github.com/harvir011',
      },
    ])
    .then(function (answers) {
      const url = answers.URL;
      console.log('\nYou entered:', url);

      // Generate PNG using qr-image
      const qr_png = qr.image(url, { type: 'png' });
      const outStream = fs.createWriteStream('qr_code.png');
      qr_png.pipe(outStream);

      outStream.on('finish', () => {
        // Save URL.txt
        fs.writeFile('URL.txt', url, function (err) {
          if (err) {
            console.error('Error saving URL.txt:', err);
            return;
          }
          console.log('\n✨ QR Code successfully generated: qr_code.png');
          console.log('📄 Content successfully recorded: URL.txt');
          console.log('🌐 Tip: Run "npm start" to launch the full visual Web Studio at http://localhost:3000\n');
        });
      });
    })
    .catch((error) => {
      if (error.isTtyError) {
        console.error('Prompt could not be rendered in the current terminal environment.');
      } else {
        console.error('An error occurred:', error);
      }
    });
} else {
  // Browser environment
  console.log('QR Atelier Studio loaded in browser.');
}

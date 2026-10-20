# QR Atelier — Creative QR Code Studio & Vector Generator

> **Make your mark. Share anything.**  
> A visually stunning, modern, distinctive, fully responsive QR Code Generator web application and CLI studio.

---

## 🎨 Visual Direction & Aesthetics

**QR Atelier** combines the elegance of a creative design studio with the utility of a high-performance developer tool:
- **Midnight Studio Palette**: Deep midnight background (`#0B0D13`), dark layered surfaces, warm off-white typography, and vivid electric-lime accents (`#C8FF00`).
- **Precision Preview Stage**: High-contrast pedestal with framing crosshairs, live module count, WCAG contrast auditing, and atmospheric backlighting.
- **Custom Module Geometry**: Toggle between classic square pixels, smooth rounded squircle modules, and circular dot matrices.
- **Scannability Guarantee**: Real-time WCAG 2.1 contrast ratio calculator warns if colors have insufficient contrast to scan reliably.

---

## 🚀 Key Features

1. **Content Type Support**:
   - 🔗 **URL**: Direct links with auto-protocol formatting.
   - 📝 **Plain Text**: Raw messages, keys, or hashes.
   - ✉️ **Email**: Mailto links with pre-filled recipient, subject, and body.
   - 📞 **Phone Number**: Direct telephone dialer links (`tel:`).
   - 📶 **Wi-Fi**: Instant network credentials (WPA/WPA2/WPA3, WEP, Open) with hidden SSID toggle.
   - 📇 **vCard Contact**: Name, organization, phone, and email formatting.

2. **Studio Customization Controls**:
   - **Foreground & Background Pickers**: Native color pickers, curated studio presets, and one-click color inversion.
   - **Module Geometry**: Square, Rounded, and Dots styling.
   - **Quiet Margin**: Configurable padding (0, 1, 2, 4 modules).
   - **Error Correction Levels**: Low (7% - L), Medium (15% - M), Quartile (25% - Q), High (30% - H).
   - **Center Emblem Badges**: Integrated glyphs (Link, Wi-Fi, Mail, Star, Heart) with automatic High error-correction safeguards.
   - **Export Resolutions**: Standard (512px), HD (1024px), and Print-Ready 4K (2048px).

3. **Export & Sharing Options**:
   - 📥 **Download PNG**: High-resolution raster images at selectable dimensions.
   - 📐 **Download SVG**: Infinitely scalable vector graphics ready for Figma, Illustrator, or laser cutters.
   - 📋 **Copy to Clipboard**: One-click copying of image blob or SVG markup directly to system clipboard.

4. **Local History (Recent Codes)**:
   - Persisted securely in the browser's `localStorage` sandbox.
   - Thumbnail previews, content tags, and timestamps.
   - One-click restore: load any past configuration back into the studio workspace.

5. **Dual Architecture (Web + Terminal CLI)**:
   - **Web Application**: Zero-server client-side web application in `index.html`.
   - **Terminal CLI**: Preserves the original `inquirer` and `qr-image` workflow via `npm run cli` or `node script.js`.

---

## 🛠️ Getting Started

### 1. Web Studio (Browser)
You can open `index.html` directly in any modern web browser without needing a build step:
```bash
# Option A: Open directly in browser
double-click index.html

# Option B: Run the built-in local server
npm start
# Opens at http://localhost:3000
```

### 2. Terminal CLI (Node.js)
Run the interactive terminal prompt:
```bash
npm run cli
# or
node script.js
```

### 3. Automated Tests
Run the test suite to verify module matrices, ECC levels, and dependencies:
```bash
npm test
```

---

## ⌨️ Keyboard Shortcuts
- `Ctrl + Enter` / `Cmd + Enter`: Generate QR code and save to history.
- `Escape`: Close mobile drawer or notifications.

---

## 📜 License
MIT / ISC — Created with precision by Harvir Kaur.

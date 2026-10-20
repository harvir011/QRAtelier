/**
 * QR Atelier — Creative QR Code Studio
 * Premium, client-side, zero-tracking QR generator engine & UI controller.
 */

(function () {
  'use strict';

  // --- Constants & Defaults ---
  const STORAGE_KEY = 'qr_atelier_history_v1';
  const MAX_HISTORY = 12;

  const DEFAULT_STATE = {
    type: 'url',
    data: 'https://github.com',
    fgColor: '#C8FF00', // Electric Lime
    bgColor: '#0B0D13', // Deep Midnight
    ecc: 'M',           // L, M, Q, H
    style: 'square',    // square, dots, rounded
    margin: 2,          // 0, 1, 2, 4
    size: 1024,         // Download dimension
    centerIcon: 'none', // none, link, wifi, mail, star, heart
    liveUpdate: true,
  };

  let state = { ...DEFAULT_STATE };
  let currentQrInstance = null;
  let currentSvgString = '';
  let toastTimeout = null;

  // --- DOM Elements ---
  const els = {
    // Navigation & Actions
    navToggle: document.getElementById('nav-toggle'),
    mobileNav: document.getElementById('mobile-nav'),
    resetBtn: document.getElementById('btn-reset'),
    heroCta: document.getElementById('hero-cta'),

    // Type Tabs
    typeTabs: document.querySelectorAll('.type-tab-btn'),
    formSections: document.querySelectorAll('.type-form-section'),

    // Inputs
    urlInput: document.getElementById('input-url'),
    textInput: document.getElementById('input-text'),
    emailTo: document.getElementById('input-email-to'),
    emailSubject: document.getElementById('input-email-subject'),
    emailBody: document.getElementById('input-email-body'),
    phoneInput: document.getElementById('input-phone'),
    wifiSsid: document.getElementById('input-wifi-ssid'),
    wifiPass: document.getElementById('input-wifi-pass'),
    wifiType: document.getElementById('input-wifi-type'),
    wifiHidden: document.getElementById('input-wifi-hidden'),
    wifiPassToggle: document.getElementById('btn-toggle-wifi-pass'),
    vcardFirst: document.getElementById('input-vcard-first'),
    vcardLast: document.getElementById('input-vcard-last'),
    vcardPhone: document.getElementById('input-vcard-phone'),
    vcardEmail: document.getElementById('input-vcard-email'),
    vcardOrg: document.getElementById('input-vcard-org'),

    // Customization Controls
    fgColorInput: document.getElementById('fg-color-picker'),
    fgColorText: document.getElementById('fg-color-hex'),
    bgColorInput: document.getElementById('bg-color-picker'),
    bgColorText: document.getElementById('bg-color-hex'),
    swapColorsBtn: document.getElementById('btn-swap-colors'),
    colorSwatches: document.querySelectorAll('.color-swatch'),
    styleOptions: document.querySelectorAll('input[name="qr-style"]'),
    marginOptions: document.querySelectorAll('input[name="qr-margin"]'),
    eccOptions: document.querySelectorAll('input[name="qr-ecc"]'),
    sizeSelect: document.getElementById('select-size'),
    iconSelect: document.getElementById('select-icon'),
    contrastBadge: document.getElementById('contrast-badge'),

    // Primary CTA
    generateBtn: document.getElementById('btn-generate-main'),

    // Preview Stage
    previewCanvas: document.getElementById('qr-preview-canvas'),
    previewSvgContainer: document.getElementById('qr-svg-container'),
    previewPlaceholder: document.getElementById('qr-placeholder'),
    previewStage: document.getElementById('preview-stage'),
    metaModules: document.getElementById('meta-modules'),
    metaSize: document.getElementById('meta-size'),
    metaEcc: document.getElementById('meta-ecc'),
    metaPayload: document.getElementById('meta-payload'),
    scannableStatus: document.getElementById('scannable-status'),

    // Action Buttons
    downloadPngBtn: document.getElementById('btn-download-png'),
    downloadSvgBtn: document.getElementById('btn-download-svg'),
    copyClipboardBtn: document.getElementById('btn-copy-clipboard'),
    copySvgBtn: document.getElementById('btn-copy-svg'),

    // History
    historyGrid: document.getElementById('history-grid'),
    historyEmpty: document.getElementById('history-empty'),
    historyCountBadge: document.getElementById('history-count-badge'),
    clearHistoryBtn: document.getElementById('btn-clear-history'),

    // Toast
    toast: document.getElementById('toast-notification'),
    toastMsg: document.getElementById('toast-message'),
  };

  // --- Utility Functions ---

  /** Show accessible floating notification */
  function showToast(message, duration = 3200) {
    if (!els.toast || !els.toastMsg) return;
    els.toastMsg.textContent = message;
    els.toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      els.toast.classList.remove('visible');
    }, duration);
  }

  /** Hex to RGB */
  function hexToRgb(hex) {
    if (hex === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1
    };
  }

  /** Relative Luminance for WCAG Contrast Calculation */
  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  /** Calculate Contrast Ratio between two hex colors */
  function getContrastRatio(hex1, hex2) {
    if (hex1 === 'transparent' || hex2 === 'transparent') return 21; // Assume high contrast against page
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /** Evaluate Scannability and Contrast */
  function updateContrastIndicator() {
    if (!els.contrastBadge) return;
    const ratio = getContrastRatio(state.fgColor, state.bgColor);
    const formatted = ratio.toFixed(1);

    if (ratio >= 4.5) {
      els.contrastBadge.className = 'contrast-badge contrast-great';
      els.contrastBadge.innerHTML = `<span class="dot"></span> ${formatted}:1 Contrast (Ideal)`;
      if (els.scannableStatus) {
        els.scannableStatus.className = 'status-pill status-verified';
        els.scannableStatus.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> 100% Scannable`;
      }
    } else if (ratio >= 3.0) {
      els.contrastBadge.className = 'contrast-badge contrast-fair';
      els.contrastBadge.innerHTML = `<span class="dot"></span> ${formatted}:1 Contrast (Acceptable)`;
      if (els.scannableStatus) {
        els.scannableStatus.className = 'status-pill status-warning';
        els.scannableStatus.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Moderate Contrast`;
      }
    } else {
      els.contrastBadge.className = 'contrast-badge contrast-poor';
      els.contrastBadge.innerHTML = `<span class="dot"></span> ${formatted}:1 Contrast (Low — May Not Scan)`;
      if (els.scannableStatus) {
        els.scannableStatus.className = 'status-pill status-danger';
        els.scannableStatus.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Contrast Too Low`;
      }
    }
  }

  // --- Payload Formatter ---
  function getPayload() {
    switch (state.type) {
      case 'url': {
        let val = (els.urlInput ? els.urlInput.value : '').trim();
        if (!val) return '';
        // If user typed domain without protocol, auto-prepend https://
        if (!/^[a-zA-Z]+:\/\//i.test(val) && !val.startsWith('/') && val.includes('.')) {
          val = 'https://' + val;
        }
        return val;
      }
      case 'text':
        return (els.textInput ? els.textInput.value : '').trim();

      case 'email': {
        const to = (els.emailTo ? els.emailTo.value : '').trim();
        const subject = (els.emailSubject ? els.emailSubject.value : '').trim();
        const body = (els.emailBody ? els.emailBody.value : '').trim();
        if (!to) return '';
        let str = `mailto:${encodeURIComponent(to)}`;
        const params = [];
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        if (params.length > 0) str += `?${params.join('&')}`;
        return str;
      }

      case 'phone': {
        const phone = (els.phoneInput ? els.phoneInput.value : '').trim();
        return phone ? `tel:${phone}` : '';
      }

      case 'wifi': {
        const ssid = (els.wifiSsid ? els.wifiSsid.value : '').trim();
        const pass = (els.wifiPass ? els.wifiPass.value : '').trim();
        const type = els.wifiType ? els.wifiType.value : 'WPA';
        const hidden = els.wifiHidden && els.wifiHidden.checked ? 'true' : 'false';
        if (!ssid) return '';
        // WIFI:S:MySSID;T:WPA;P:MyPass;H:false;;
        return `WIFI:S:${ssid};T:${type};P:${pass};H:${hidden};;`;
      }

      case 'vcard': {
        const first = (els.vcardFirst ? els.vcardFirst.value : '').trim();
        const last = (els.vcardLast ? els.vcardLast.value : '').trim();
        const phone = (els.vcardPhone ? els.vcardPhone.value : '').trim();
        const email = (els.vcardEmail ? els.vcardEmail.value : '').trim();
        const org = (els.vcardOrg ? els.vcardOrg.value : '').trim();
        if (!first && !last && !phone && !email) return '';

        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${last};${first};;;`,
          `FN:${first} ${last}`.trim(),
          org ? `ORG:${org}` : '',
          phone ? `TEL;TYPE=CELL:${phone}` : '',
          email ? `EMAIL;TYPE=INTERNET:${email}` : '',
          'END:VCARD'
        ].filter(Boolean).join('\n');
      }

      default:
        return '';
    }
  }

  // --- QR Generation Core ---
  /**
   * Generates a QR code instance using qrcode-generator
   */
  function generateQrInstance(payload, eccLevel) {
    if (typeof qrcode === 'undefined') {
      console.error('qrcode-generator library is not loaded');
      return null;
    }

    // Auto-detect optimal typeNumber (0 = auto-detect size 1 to 40)
    let typeNumber = 0;
    let qr = null;

    try {
      qr = qrcode(typeNumber, eccLevel);
      qr.addData(payload);
      qr.make();
      return qr;
    } catch (e) {
      console.warn('Type 0 auto-size failed, falling back through higher versions:', e);
      for (let t = 1; t <= 40; t++) {
        try {
          qr = qrcode(t, eccLevel);
          qr.addData(payload);
          qr.make();
          return qr;
        } catch (err) {
          // continue search
        }
      }
      throw new Error('Payload too large for QR Code specifications.');
    }
  }

  /**
   * Draws the QR Code matrix to HTML5 Canvas with custom styles
   */
  function renderToCanvas(canvas, qr, options) {
    const {
      fgColor = '#C8FF00',
      bgColor = '#0B0D13',
      style = 'square',
      margin = 2,
      targetSize = 1024,
      centerIcon = 'none',
    } = options;

    const moduleCount = qr.getModuleCount();
    const totalCells = moduleCount + margin * 2;
    const ctx = canvas.getContext('2d');

    // Scale canvas for crystal-clear retina rendering
    canvas.width = targetSize;
    canvas.height = targetSize;

    const cellSize = targetSize / totalCells;

    // 1. Draw Background
    if (bgColor === 'transparent') {
      ctx.clearRect(0, 0, targetSize, targetSize);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetSize, targetSize);
    }

    // Helper: is cell part of the 3 main corner finder patterns
    function isCornerPattern(r, c) {
      // Top-left
      if (r < 7 && c < 7) return true;
      // Top-right
      if (r < 7 && c >= moduleCount - 7) return true;
      // Bottom-left
      if (r >= moduleCount - 7 && c < 7) return true;
      return false;
    }

    // Helper: is cell in center icon area
    const centerRadius = centerIcon !== 'none' ? Math.floor(moduleCount * 0.16) : 0;
    const centerMid = Math.floor(moduleCount / 2);

    function isCenterArea(r, c) {
      if (centerRadius === 0) return false;
      return Math.abs(r - centerMid) <= centerRadius && Math.abs(c - centerMid) <= centerRadius;
    }

    ctx.fillStyle = fgColor;

    // 2. Draw Body Modules
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!qr.isDark(r, c)) continue;
        if (isCenterArea(r, c)) continue; // Keep clear zone for center icon

        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;

        if (isCornerPattern(r, c)) {
          // Keep corner finder patterns crisp and recognizable
          ctx.beginPath();
          if (style === 'dots') {
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.48, 0, Math.PI * 2);
            ctx.fill();
          } else if (style === 'rounded') {
            const rad = cellSize * 0.35;
            ctx.roundRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, rad);
            ctx.fill();
          } else {
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
          }
          continue;
        }

        // Standard body module
        ctx.beginPath();
        if (style === 'dots') {
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.44, 0, Math.PI * 2);
          ctx.fill();
        } else if (style === 'rounded') {
          const rad = cellSize * 0.4;
          ctx.roundRect(x + 0.75, y + 0.75, cellSize - 1.5, cellSize - 1.5, rad);
          ctx.fill();
        } else {
          // Sharp square
          ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }

    // 3. Draw Center Icon if selected
    if (centerIcon !== 'none') {
      const iconBoxSize = (centerRadius * 2 + 1) * cellSize;
      const iconX = (centerMid - centerRadius + margin) * cellSize;
      const iconY = (centerMid - centerRadius + margin) * cellSize;

      // Draw background shield
      ctx.fillStyle = bgColor === 'transparent' ? '#0B0D13' : bgColor;
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconBoxSize, iconBoxSize, iconBoxSize * 0.25);
      ctx.fill();

      // Border for badge
      ctx.strokeStyle = fgColor;
      ctx.lineWidth = Math.max(2, cellSize * 0.6);
      ctx.stroke();

      // Draw vector icon inside
      drawCenterIcon(ctx, iconX, iconY, iconBoxSize, centerIcon, fgColor);
    }
  }

  /**
   * Draw crisp vector iconography inside the center badge
   */
  function drawCenterIcon(ctx, x, y, size, iconName, color) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    const s = size * 0.5;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (iconName) {
      case 'link':
        // Modern chain link
        ctx.beginPath();
        ctx.arc(-s * 0.25, -s * 0.25, s * 0.35, Math.PI * 0.75, Math.PI * 1.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * 0.25, s * 0.25, s * 0.35, -Math.PI * 0.25, Math.PI * 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 0.2);
        ctx.lineTo(s * 0.2, s * 0.2);
        ctx.stroke();
        break;

      case 'wifi':
        // Wi-Fi arcs
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(0, s * 0.3, s * 0.35 * i, -Math.PI * 0.75, -Math.PI * 0.25);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, s * 0.3, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'mail':
        // Envelope
        ctx.beginPath();
        ctx.roundRect(-s * 0.5, -s * 0.35, s, s * 0.7, s * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, -s * 0.3);
        ctx.lineTo(0, s * 0.05);
        ctx.lineTo(s * 0.45, -s * 0.3);
        ctx.stroke();
        break;

      case 'star':
        // 5-point star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i * 72 - 90) * Math.PI / 180;
          const a2 = ((i * 72) + 36 - 90) * Math.PI / 180;
          const r1 = s * 0.55;
          const r2 = s * 0.24;
          if (i === 0) ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
          else ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
          ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'heart':
        // Heart
        ctx.beginPath();
        ctx.moveTo(0, s * 0.4);
        ctx.bezierCurveTo(-s * 0.6, 0, -s * 0.6, -s * 0.5, 0, -s * 0.2);
        ctx.bezierCurveTo(s * 0.6, -s * 0.5, s * 0.6, 0, 0, s * 0.4);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  /**
   * Generates clean SVG markup representation
   */
  function buildSvgString(qr, options) {
    const {
      fgColor = '#C8FF00',
      bgColor = '#0B0D13',
      style = 'square',
      margin = 2,
      size = 1024,
    } = options;

    const moduleCount = qr.getModuleCount();
    const totalCells = moduleCount + margin * 2;
    const cellSize = (size / totalCells).toFixed(2);

    let rects = '';

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!qr.isDark(r, c)) continue;
        const x = ((c + margin) * cellSize).toFixed(2);
        const y = ((r + margin) * cellSize).toFixed(2);

        if (style === 'dots') {
          const cx = ((c + margin + 0.5) * cellSize).toFixed(2);
          const cy = ((r + margin + 0.5) * cellSize).toFixed(2);
          const rad = (cellSize * 0.44).toFixed(2);
          rects += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fgColor}"/>\n`;
        } else if (style === 'rounded') {
          const rx = (cellSize * 0.38).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${rx}" fill="${fgColor}"/>\n`;
        } else {
          rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>\n`;
        }
      }
    }

    const bgElement = bgColor === 'transparent'
      ? ''
      : `<rect width="${size}" height="${size}" fill="${bgColor}"/>\n`;

    return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <metadata>Generated by QR Atelier (https://qratelier.studio)</metadata>
  ${bgElement}
  ${rects}
</svg>`;
  }

  // --- Main Update Flow ---
  function updateQrCode(shouldSaveHistory = false) {
    const payload = getPayload();

    if (!payload) {
      if (els.previewPlaceholder) els.previewPlaceholder.style.display = 'flex';
      if (els.previewCanvas) els.previewCanvas.style.display = 'none';
      if (els.scannableStatus) {
        els.scannableStatus.className = 'status-pill status-idle';
        els.scannableStatus.innerHTML = `<span class="dot"></span> Awaiting Input`;
      }
      return;
    }

    try {
      // Auto upgrade ECC to High if center icon is requested
      let effectiveEcc = state.ecc;
      if (state.centerIcon !== 'none' && effectiveEcc !== 'H') {
        effectiveEcc = 'H';
        // reflect in UI
        const hRadio = document.querySelector('input[name="qr-ecc"][value="H"]');
        if (hRadio) hRadio.checked = true;
      }

      currentQrInstance = generateQrInstance(payload, effectiveEcc);

      if (!currentQrInstance) return;

      // Update Canvas
      if (els.previewCanvas) {
        els.previewCanvas.style.display = 'block';
        if (els.previewPlaceholder) els.previewPlaceholder.style.display = 'none';

        renderToCanvas(els.previewCanvas, currentQrInstance, {
          fgColor: state.fgColor,
          bgColor: state.bgColor,
          style: state.style,
          margin: state.margin,
          targetSize: 1024, // High preview sharpness
          centerIcon: state.centerIcon,
        });
      }

      // Build SVG
      currentSvgString = buildSvgString(currentQrInstance, {
        fgColor: state.fgColor,
        bgColor: state.bgColor,
        style: state.style,
        margin: state.margin,
        size: state.size,
      });

      // Update Meta Telemetry
      const moduleCount = currentQrInstance.getModuleCount();
      if (els.metaModules) els.metaModules.textContent = `${moduleCount} × ${moduleCount}`;
      if (els.metaSize) els.metaSize.textContent = `${state.size} × ${state.size} px`;
      if (els.metaEcc) els.metaEcc.textContent = `Level ${effectiveEcc} (~${{ L: '7%', M: '15%', Q: '25%', H: '30%' }[effectiveEcc]})`;
      if (els.metaPayload) {
        els.metaPayload.textContent = payload.length > 40 ? payload.substring(0, 37) + '...' : payload;
        els.metaPayload.title = payload;
      }

      // Update contrast & scannability badge
      updateContrastIndicator();

      // Trigger subtle pulse on preview stage
      if (els.previewStage) {
        els.previewStage.classList.remove('pulse-generate');
        void els.previewStage.offsetWidth; // trigger reflow
        els.previewStage.classList.add('pulse-generate');
      }

      // Optionally save to history
      if (shouldSaveHistory) {
        saveToHistory({
          type: state.type,
          payload: payload,
          fgColor: state.fgColor,
          bgColor: state.bgColor,
          ecc: effectiveEcc,
          style: state.style,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('QR Generation Error:', err);
      showToast(`Error: ${err.message || 'Could not generate QR'}`);
    }
  }

  // --- History Management ---
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistoryList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Storage quota exceeded');
    }
  }

  function saveToHistory(item) {
    let list = loadHistory();
    // Remove duplicate identical payload if exists
    list = list.filter(x => x.payload !== item.payload);
    list.unshift(item);
    if (list.length > MAX_HISTORY) list.pop();
    saveHistoryList(list);
    renderHistory();
  }

  function renderHistory() {
    const list = loadHistory();

    if (els.historyCountBadge) {
      els.historyCountBadge.textContent = list.length;
    }

    if (!els.historyGrid) return;

    if (list.length === 0) {
      if (els.historyEmpty) els.historyEmpty.style.display = 'block';
      els.historyGrid.querySelectorAll('.history-card').forEach(c => c.remove());
      return;
    }

    if (els.historyEmpty) els.historyEmpty.style.display = 'none';

    // Clear old cards
    els.historyGrid.querySelectorAll('.history-card').forEach(c => c.remove());

    list.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'history-card';

      // Generate a mini thumbnail canvas
      const thumb = document.createElement('canvas');
      thumb.className = 'history-thumb';
      thumb.width = 72;
      thumb.height = 72;

      try {
        const miniQr = generateQrInstance(item.payload, item.ecc || 'M');
        if (miniQr) {
          renderToCanvas(thumb, miniQr, {
            fgColor: item.fgColor || '#C8FF00',
            bgColor: item.bgColor || '#0B0D13',
            style: item.style || 'square',
            margin: 1,
            targetSize: 72,
          });
        }
      } catch (e) {
        // Fallback
      }

      const dateStr = formatRelativeTime(item.timestamp);
      const displayLabel = item.payload.length > 28 ? item.payload.substring(0, 25) + '...' : item.payload;

      card.innerHTML = `
        <div class="history-thumb-wrap"></div>
        <div class="history-info">
          <div class="history-header">
            <span class="history-badge type-${item.type}">${item.type.toUpperCase()}</span>
            <span class="history-time">${dateStr}</span>
          </div>
          <p class="history-payload" title="${escapeHtml(item.payload)}">${escapeHtml(displayLabel)}</p>
          <div class="history-actions">
            <button type="button" class="btn-history-load" title="Load into Studio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2"/></svg>
              Load
            </button>
            <button type="button" class="btn-history-dl" title="Quick Download">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button type="button" class="btn-history-del" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;

      card.querySelector('.history-thumb-wrap').appendChild(thumb);

      // Event listeners
      card.querySelector('.btn-history-load').addEventListener('click', () => {
        restoreHistoryItem(item);
      });

      card.querySelector('.btn-history-dl').addEventListener('click', () => {
        downloadQuick(item);
      });

      card.querySelector('.btn-history-del').addEventListener('click', () => {
        deleteHistoryItem(index);
      });

      els.historyGrid.appendChild(card);
    });
  }

  function restoreHistoryItem(item) {
    // Set type
    state.type = item.type;
    els.typeTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-type') === item.type);
    });
    els.formSections.forEach(f => {
      f.classList.toggle('active', f.getAttribute('data-type') === item.type);
    });

    // Populate input
    if (item.type === 'url' && els.urlInput) els.urlInput.value = item.payload;
    if (item.type === 'text' && els.textInput) els.textInput.value = item.payload;

    // Restore colors
    if (item.fgColor) {
      state.fgColor = item.fgColor;
      if (els.fgColorInput) els.fgColorInput.value = item.fgColor;
      if (els.fgColorText) els.fgColorText.value = item.fgColor;
    }
    if (item.bgColor) {
      state.bgColor = item.bgColor;
      if (els.bgColorInput) els.bgColorInput.value = item.bgColor;
      if (els.bgColorText) els.bgColorText.value = item.bgColor;
    }

    // Restore ecc & style
    if (item.ecc) {
      state.ecc = item.ecc;
      const r = document.querySelector(`input[name="qr-ecc"][value="${item.ecc}"]`);
      if (r) r.checked = true;
    }
    if (item.style) {
      state.style = item.style;
      const s = document.querySelector(`input[name="qr-style"][value="${item.style}"]`);
      if (s) s.checked = true;
    }

    updateQrCode(false);
    showToast('Loaded configuration from history!');
    // Smooth scroll to generator
    const gen = document.getElementById('generator');
    if (gen) gen.scrollIntoView({ behavior: 'smooth' });
  }

  function deleteHistoryItem(index) {
    const list = loadHistory();
    list.splice(index, 1);
    saveHistoryList(list);
    renderHistory();
    showToast('Entry removed from history');
  }

  function downloadQuick(item) {
    try {
      const qr = generateQrInstance(item.payload, item.ecc || 'M');
      if (!qr) return;

      const tempCanvas = document.createElement('canvas');
      renderToCanvas(tempCanvas, qr, {
        fgColor: item.fgColor || '#C8FF00',
        bgColor: item.bgColor || '#0B0D13',
        style: item.style || 'square',
        margin: 2,
        targetSize: 1024,
      });

      const link = document.createElement('a');
      link.download = `qr-atelier-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
      showToast('Downloaded PNG (1024px)');
    } catch (e) {
      showToast('Could not download');
    }
  }

  function formatRelativeTime(ts) {
    if (!ts) return 'recently';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Downloads & Clipboard Actions ---

  /** Download PNG at selected resolution */
  function downloadPng() {
    if (!currentQrInstance) {
      showToast('Please generate a QR code first');
      return;
    }

    const size = parseInt(els.sizeSelect ? els.sizeSelect.value : state.size, 10) || 1024;
    const exportCanvas = document.createElement('canvas');

    renderToCanvas(exportCanvas, currentQrInstance, {
      fgColor: state.fgColor,
      bgColor: state.bgColor,
      style: state.style,
      margin: state.margin,
      targetSize: size,
      centerIcon: state.centerIcon,
    });

    exportCanvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-atelier-${size}x${size}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded PNG (${size}×${size}px)`);
    }, 'image/png');
  }

  /** Download Vector SVG */
  function downloadSvg() {
    if (!currentQrInstance || !currentSvgString) {
      showToast('Please generate a QR code first');
      return;
    }

    const blob = new Blob([currentSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-atelier-vector-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded scalable vector SVG');
  }

  /** Copy PNG directly to Clipboard */
  async function copyToClipboard() {
    if (!els.previewCanvas || !currentQrInstance) {
      showToast('Please generate a QR code first');
      return;
    }

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        els.previewCanvas.toBlob(async blob => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('QR Code image copied to clipboard!');
          } catch (err) {
            fallbackCopyDataUrl();
          }
        }, 'image/png');
      } else {
        fallbackCopyDataUrl();
      }
    } catch (e) {
      fallbackCopyDataUrl();
    }
  }

  function fallbackCopyDataUrl() {
    try {
      const dataUrl = els.previewCanvas.toDataURL('image/png');
      navigator.clipboard.writeText(dataUrl).then(() => {
        showToast('Base64 image string copied to clipboard!');
      });
    } catch (e) {
      showToast('Clipboard access unavailable');
    }
  }

  /** Copy SVG Code */
  function copySvgCode() {
    if (!currentSvgString) {
      showToast('Please generate a QR code first');
      return;
    }
    navigator.clipboard.writeText(currentSvgString).then(() => {
      showToast('SVG XML copied to clipboard!');
    }).catch(() => {
      showToast('Clipboard error');
    });
  }

  /** Reset Workspace to Clean Initial State */
  function resetStudio() {
    state = { ...DEFAULT_STATE };

    if (els.urlInput) els.urlInput.value = 'https://github.com';
    if (els.textInput) els.textInput.value = '';
    if (els.emailTo) els.emailTo.value = '';
    if (els.emailSubject) els.emailSubject.value = '';
    if (els.emailBody) els.emailBody.value = '';
    if (els.phoneInput) els.phoneInput.value = '';
    if (els.wifiSsid) els.wifiSsid.value = '';
    if (els.wifiPass) els.wifiPass.value = '';
    if (els.vcardFirst) els.vcardFirst.value = '';
    if (els.vcardLast) els.vcardLast.value = '';

    // Reset controls
    if (els.fgColorInput) els.fgColorInput.value = state.fgColor;
    if (els.fgColorText) els.fgColorText.value = state.fgColor;
    if (els.bgColorInput) els.bgColorInput.value = state.bgColor;
    if (els.bgColorText) els.bgColorText.value = state.bgColor;

    const defStyle = document.querySelector(`input[name="qr-style"][value="${state.style}"]`);
    if (defStyle) defStyle.checked = true;

    const defEcc = document.querySelector(`input[name="qr-ecc"][value="${state.ecc}"]`);
    if (defEcc) defEcc.checked = true;

    const defMargin = document.querySelector(`input[name="qr-margin"][value="${state.margin}"]`);
    if (defMargin) defMargin.checked = true;

    if (els.sizeSelect) els.sizeSelect.value = state.size;
    if (els.iconSelect) els.iconSelect.value = state.centerIcon;

    // Switch to URL tab
    els.typeTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-type') === 'url'));
    els.formSections.forEach(f => f.classList.toggle('active', f.getAttribute('data-type') === 'url'));

    updateQrCode(false);
    showToast('Studio reset to default');
  }

  // --- Event Bindings ---
  function initEvents() {
    // 1. Content Type Switcher
    els.typeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const type = tab.getAttribute('data-type');
        state.type = type;

        els.typeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        els.formSections.forEach(sec => {
          sec.classList.toggle('active', sec.getAttribute('data-type') === type);
        });

        updateQrCode(false);
      });
    });

    // 2. Real-time Input Listeners
    const inputsToWatch = [
      els.urlInput, els.textInput, els.emailTo, els.emailSubject, els.emailBody,
      els.phoneInput, els.wifiSsid, els.wifiPass, els.wifiType,
      els.vcardFirst, els.vcardLast, els.vcardPhone, els.vcardEmail, els.vcardOrg
    ];

    inputsToWatch.forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (state.liveUpdate) updateQrCode(false);
      });
    });

    if (els.wifiHidden) {
      els.wifiHidden.addEventListener('change', () => {
        if (state.liveUpdate) updateQrCode(false);
      });
    }

    // Toggle Wi-Fi Password visibility
    if (els.wifiPassToggle && els.wifiPass) {
      els.wifiPassToggle.addEventListener('click', () => {
        const isPass = els.wifiPass.type === 'password';
        els.wifiPass.type = isPass ? 'text' : 'password';
        els.wifiPassToggle.setAttribute('aria-label', isPass ? 'Hide password' : 'Show password');
      });
    }

    // 3. Colors
    if (els.fgColorInput) {
      els.fgColorInput.addEventListener('input', e => {
        state.fgColor = e.target.value;
        if (els.fgColorText) els.fgColorText.value = state.fgColor;
        updateQrCode(false);
      });
    }
    if (els.fgColorText) {
      els.fgColorText.addEventListener('change', e => {
        let val = e.target.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          state.fgColor = val;
          if (els.fgColorInput) els.fgColorInput.value = val;
          updateQrCode(false);
        }
      });
    }

    if (els.bgColorInput) {
      els.bgColorInput.addEventListener('input', e => {
        state.bgColor = e.target.value;
        if (els.bgColorText) els.bgColorText.value = state.bgColor;
        updateQrCode(false);
      });
    }
    if (els.bgColorText) {
      els.bgColorText.addEventListener('change', e => {
        let val = e.target.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val) || val === 'transparent') {
          state.bgColor = val;
          if (val !== 'transparent' && els.bgColorInput) els.bgColorInput.value = val;
          updateQrCode(false);
        }
      });
    }

    // Color Swatches
    els.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const target = swatch.getAttribute('data-target'); // 'fg' or 'bg'
        const color = swatch.getAttribute('data-color');
        if (target === 'fg') {
          state.fgColor = color;
          if (els.fgColorInput) els.fgColorInput.value = color;
          if (els.fgColorText) els.fgColorText.value = color;
        } else {
          state.bgColor = color;
          if (color !== 'transparent' && els.bgColorInput) els.bgColorInput.value = color;
          if (els.bgColorText) els.bgColorText.value = color;
        }
        updateQrCode(false);
      });
    });

    // Swap Colors
    if (els.swapColorsBtn) {
      els.swapColorsBtn.addEventListener('click', () => {
        if (state.bgColor === 'transparent') {
          showToast('Cannot invert transparent background');
          return;
        }
        const temp = state.fgColor;
        state.fgColor = state.bgColor;
        state.bgColor = temp;
        if (els.fgColorInput) els.fgColorInput.value = state.fgColor;
        if (els.fgColorText) els.fgColorText.value = state.fgColor;
        if (els.bgColorInput) els.bgColorInput.value = state.bgColor;
        if (els.bgColorText) els.bgColorText.value = state.bgColor;
        updateQrCode(false);
        showToast('Colors inverted');
      });
    }

    // 4. Style & Geometry
    els.styleOptions.forEach(opt => {
      opt.addEventListener('change', e => {
        if (e.target.checked) {
          state.style = e.target.value;
          updateQrCode(false);
        }
      });
    });

    // Quiet Margin
    els.marginOptions.forEach(opt => {
      opt.addEventListener('change', e => {
        if (e.target.checked) {
          state.margin = parseInt(e.target.value, 10);
          updateQrCode(false);
        }
      });
    });

    // Error Correction
    els.eccOptions.forEach(opt => {
      opt.addEventListener('change', e => {
        if (e.target.checked) {
          state.ecc = e.target.value;
          updateQrCode(false);
        }
      });
    });

    // Size
    if (els.sizeSelect) {
      els.sizeSelect.addEventListener('change', e => {
        state.size = parseInt(e.target.value, 10);
        updateQrCode(false);
      });
    }

    // Center Icon
    if (els.iconSelect) {
      els.iconSelect.addEventListener('change', e => {
        state.centerIcon = e.target.value;
        updateQrCode(false);
      });
    }

    // 5. Main Action Buttons
    if (els.generateBtn) {
      els.generateBtn.addEventListener('click', () => {
        updateQrCode(true); // Saves to history on explicit button click
        showToast('QR Code generated and saved to history!');
      });
    }

    if (els.downloadPngBtn) {
      els.downloadPngBtn.addEventListener('click', downloadPng);
    }

    if (els.downloadSvgBtn) {
      els.downloadSvgBtn.addEventListener('click', downloadSvg);
    }

    if (els.copyClipboardBtn) {
      els.copyClipboardBtn.addEventListener('click', copyToClipboard);
    }

    if (els.copySvgBtn) {
      els.copySvgBtn.addEventListener('click', copySvgCode);
    }

    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetStudio);
    }

    // History Clear
    if (els.clearHistoryBtn) {
      els.clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear all saved QR codes from history?')) {
          localStorage.removeItem(STORAGE_KEY);
          renderHistory();
          showToast('History cleared');
        }
      });
    }

    // Mobile Navigation Drawer
    if (els.navToggle && els.mobileNav) {
      els.navToggle.addEventListener('click', () => {
        const isOpen = els.mobileNav.classList.toggle('open');
        els.navToggle.setAttribute('aria-expanded', isOpen);
      });

      els.mobileNav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          els.mobileNav.classList.remove('open');
          els.navToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Hero CTA button
    if (els.heroCta) {
      els.heroCta.addEventListener('click', () => {
        const target = document.getElementById('generator');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Keyboard Shortcuts: Ctrl+Enter / Cmd+Enter to generate
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        updateQrCode(true);
        showToast('Generated via shortcut [Ctrl + Enter]!');
      }
    });
  }

  // --- Bootstrap Initialization ---
  function init() {
    initEvents();
    renderHistory();
    // Initial render with default URL
    updateQrCode(false);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose to window for testing or developer console integration
  window.QRAtelier = {
    getState: () => ({ ...state }),
    update: updateQrCode,
    downloadPng,
    downloadSvg,
    reset: resetStudio,
  };
})();

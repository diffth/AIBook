function initApp() {
  // --- DOM Elements ---
  const qrTextInput = document.getElementById('qr-text');
  const colorDarkInput = document.getElementById('color-dark');
  const colorLightInput = document.getElementById('color-light');
  const qrMarginInput = document.getElementById('qr-margin');
  const errorLevelSelect = document.getElementById('error-level');
  
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const presetItems = document.querySelectorAll('.preset-item');
  
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('logo-file');
  const logoPreviewContainer = document.getElementById('logo-preview-container');
  const logoFileName = document.getElementById('logo-file-name');
  const btnRemoveLogo = document.getElementById('btn-remove-logo');
  const logoSizeInput = document.getElementById('logo-size');
  
  const showTextCheckbox = document.getElementById('show-text');
  const textOptionsArea = document.getElementById('text-options-area');
  const customPreviewInput = document.getElementById('custom-preview-text');
  const textColorInput = document.getElementById('text-color');
  const textSizeInput = document.getElementById('text-size');
  
  const mainCanvas = document.getElementById('qr-canvas');
  const btnDownload = document.getElementById('btn-download');
  
  // Download Modal Elements
  const downloadModal = document.getElementById('download-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalOk = document.getElementById('btn-modal-ok');
  const modalQrImg = document.getElementById('modal-qr-img');

  // --- State Variables ---
  let activeTab = 'preset'; // 'preset' or 'upload'
  let selectedPreset = 'none'; // 'none', 'github', 'globe', 'mail', 'heart'
  let uploadedLogoImage = null; // Image object for uploaded file
  let logoFile = null; // File object

  // --- Helper: SVG Preset Data URL Generator ---
  // Generates inline SVGs with dynamic stroke color based on QR code color for premium integration.
  function getPresetSvgDataUrl(presetName, strokeColor) {
    let svgContent = '';
    const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`;
    
    if (presetName === 'github') {
      svgContent = `${svgHeader}<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`;
    } else if (presetName === 'globe') {
      svgContent = `${svgHeader}<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    } else if (presetName === 'mail') {
      svgContent = `${svgHeader}<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
    } else if (presetName === 'heart') {
      svgContent = `${svgHeader}<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    }
    
    if (!svgContent) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
  }

  // --- Helper: Format URL Domain for Preview ---
  function getAutoPreviewText(text) {
    if (!text) return '';
    try {
      // If it looks like a URL but doesn't have protocol, add it temporarily for URL parser
      let urlString = text.trim();
      if (!/^https?:\/\//i.test(urlString)) {
        urlString = 'http://' + urlString;
      }
      const url = new URL(urlString);
      // Return host (e.g. github.com)
      let host = url.hostname;
      if (host.startsWith('www.')) {
        host = host.substring(4);
      }
      return host.toUpperCase();
    } catch (e) {
      // If not a URL, truncate text
      const cleanText = text.trim();
      if (cleanText.length > 25) {
        return cleanText.substring(0, 22) + '...';
      }
      return cleanText;
    }
  }

  // --- Core Function: Render QR Code to Canvas ---
  function renderQRCode() {
    if (typeof QRCode === 'undefined') {
      console.error('QRCode library is not loaded yet!');
      return;
    }
    const textValue = qrTextInput.value.trim() || ' ';
    const darkColor = colorDarkInput.value;
    const lightColor = colorLightInput.value;
    const margin = parseInt(qrMarginInput.value, 10);
    const errorLevel = errorLevelSelect.value;
    
    const qrSize = 340; // Base QR Code rendering size
    const textSectionHeight = showTextCheckbox.checked ? 65 : 0;
    
    // Create an off-screen temporary canvas to render raw QR Code first
    const tempCanvas = document.createElement('canvas');
    
    const qrOptions = {
      errorCorrectionLevel: errorLevel,
      width: qrSize,
      margin: margin,
      color: {
        dark: darkColor,
        light: lightColor
      }
    };

    // 1. Generate QR Code onto temp canvas
    QRCode.toCanvas(tempCanvas, textValue, qrOptions, (error) => {
      if (error) {
        console.error('QR Code Generation Error:', error);
        return;
      }

      // 2. Adjust main canvas dimensions based on options
      mainCanvas.width = qrSize;
      mainCanvas.height = qrSize + textSectionHeight;
      const ctx = mainCanvas.getContext('2d');

      // Clear with background color
      ctx.fillStyle = lightColor;
      ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

      // Draw QR Code from temp canvas
      ctx.drawImage(tempCanvas, 0, 0);

      // 3. Draw Logo Image if selected/uploaded
      let logoImg = null;
      
      if (activeTab === 'preset' && selectedPreset !== 'none') {
        const svgDataUrl = getPresetSvgDataUrl(selectedPreset, darkColor);
        if (svgDataUrl) {
          logoImg = new Image();
          logoImg.src = svgDataUrl;
        }
      } else if (activeTab === 'upload' && uploadedLogoImage) {
        logoImg = uploadedLogoImage;
      }

      // If we have a logo, draw it when loaded or draw immediately if cached
      if (logoImg) {
        const drawLogo = () => {
          const logoSizePercent = parseInt(logoSizeInput.value, 10);
          const logoWidth = qrSize * (logoSizePercent / 100);
          const logoHeight = logoWidth;
          
          const lx = (qrSize - logoWidth) / 2;
          const ly = (qrSize - logoHeight) / 2;

          // Background box behind logo (to clear QR code cells)
          // Uses rounded rectangle for luxury visual styling
          const padding = 6;
          const bgX = lx - padding;
          const bgY = ly - padding;
          const bgW = logoWidth + padding * 2;
          const bgH = logoHeight + padding * 2;
          const radius = 10;

          ctx.fillStyle = lightColor;
          ctx.beginPath();
          ctx.moveTo(bgX + radius, bgY);
          ctx.lineTo(bgX + bgW - radius, bgY);
          ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + radius);
          ctx.lineTo(bgX + bgW, bgY + bgH - radius);
          ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - radius, bgY + bgH);
          ctx.lineTo(bgX + radius, bgY + bgH);
          ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - radius);
          ctx.lineTo(bgX, bgY + radius);
          ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
          ctx.closePath();
          ctx.fill();

          // Render Logo
          ctx.drawImage(logoImg, lx, ly, logoWidth, logoHeight);
          
          // Re-render text overlay in case logo load asynchronous race overlaps
          if (showTextCheckbox.checked) {
            renderTextOverlay(ctx, qrSize, textSectionHeight, textValue);
          }
        };

        if (logoImg.complete) {
          drawLogo();
        } else {
          logoImg.onload = () => {
            drawLogo();
          };
        }
      }

      // 4. Draw preview text if enabled
      if (showTextCheckbox.checked) {
        renderTextOverlay(ctx, qrSize, textSectionHeight, textValue);
      }
    });
  }

  // --- Sub-function: Draw text on canvas footer ---
  function renderTextOverlay(ctx, qrSize, textSectionHeight, originalText) {
    const textColor = textColorInput.value;
    const textSize = parseInt(textSizeInput.value, 10);
    const customText = customPreviewInput.value.trim();
    const displayText = customText || getAutoPreviewText(originalText);

    // Subtle divider line at the bottom of the QR code
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, qrSize);
    ctx.lineTo(qrSize - 30, qrSize);
    ctx.stroke();

    // Text Style Setup
    ctx.fillStyle = textColor;
    ctx.font = `600 ${textSize}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw Text centered in the footer area
    ctx.fillText(displayText, qrSize / 2, qrSize + (textSectionHeight / 2) - 2);
  }

  // --- Event Listeners: Inputs & Sliders ---
  const liveControls = [
    qrTextInput, colorDarkInput, colorLightInput, qrMarginInput,
    errorLevelSelect, logoSizeInput, customPreviewInput, textColorInput, textSizeInput
  ];

  liveControls.forEach(control => {
    control.addEventListener('input', (e) => {
      // Sync color display text
      if (e.target.type === 'color') {
        const span = e.target.nextElementSibling;
        if (span) span.textContent = e.target.value.toUpperCase();
      }
      // Sync range display text
      if (e.target.type === 'range') {
        const span = e.target.nextElementSibling;
        if (span) {
          const suffix = e.target.id === 'logo-size' ? '%' : (e.target.id === 'text-size' ? 'px' : '');
          span.textContent = e.target.value + suffix;
        }
      }
      renderQRCode();
    });
  });

  // Toggle Text Section
  showTextCheckbox.addEventListener('change', () => {
    if (showTextCheckbox.checked) {
      textOptionsArea.classList.remove('hidden');
    } else {
      textOptionsArea.classList.add('hidden');
    }
    renderQRCode();
  });

  // --- Tab Switcher Logic ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      document.getElementById(tabId).classList.add('active');
      activeTab = btn.dataset.tab;
      
      renderQRCode();
    });
  });

  // --- Preset Selection ---
  presetItems.forEach(item => {
    item.addEventListener('click', () => {
      presetItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      selectedPreset = item.dataset.preset;
      renderQRCode();
    });
  });

  // --- File Upload Logic ---
  // Handle click on drag zone
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file choice
  fileInput.addEventListener('change', handleFileSelect);

  // Drag-and-Drop Handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect();
    }
  });

  function handleFileSelect() {
    if (fileInput.files && fileInput.files[0]) {
      logoFile = fileInput.files[0];
      logoFileName.textContent = logoFile.name;
      logoPreviewContainer.classList.remove('hidden');

      // Convert file to Image Object
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedLogoImage = new Image();
        uploadedLogoImage.src = e.target.result;
        uploadedLogoImage.onload = () => {
          renderQRCode();
        };
      };
      reader.readAsDataURL(logoFile);
    }
  }

  // Remove Uploaded Logo
  btnRemoveLogo.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering dropZone click
    logoFile = null;
    uploadedLogoImage = null;
    fileInput.value = '';
    logoPreviewContainer.classList.add('hidden');
    renderQRCode();
  });

  // --- High Quality PNG Download ---
  btnDownload.addEventListener('click', () => {
    try {
      // 1. Generate Data URL synchronously to preserve User Gesture Context
      const dataURL = mainCanvas.toDataURL('image/png');
      
      // 2. Force download MIME-type (octet-stream) to bypass rendering navigation blocks
      const forcedDownloadURL = dataURL.replace(/^data:image\/[^;]+/, 'data:application/octet-stream');
      
      // 3. Generate intelligent file name supporting English, Korean and numbers
      const textSample = customPreviewInput.value.trim() || getAutoPreviewText(qrTextInput.value);
      const safeName = textSample ? textSample.replace(/[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '_').trim() : 'qr_code';
      const fileName = `qrcode_${safeName || 'code'}.png`;

      // 4. Create temporary anchor and set properties
      const link = document.createElement('a');
      link.download = fileName;
      link.href = forcedDownloadURL;
      
      // 5. Append to DOM (Required for modern browsers to respect user gesture & download attribute)
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 6. Show friendly fallback modal for immediate right-click manual save
      if (modalQrImg) modalQrImg.src = dataURL;
      if (downloadModal) downloadModal.classList.remove('hidden');

    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드 도중 오류가 발생했습니다. QR 코드 이미지를 마우스 우클릭(모바일은 길게 터치)하여 "이미지를 다른 이름으로 저장"을 이용해 주세요!');
    }
  });

  // --- Modal Close Events ---
  const closeModal = () => {
    if (downloadModal) downloadModal.classList.add('hidden');
    if (modalQrImg) modalQrImg.src = '';
  };

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnModalOk) btnModalOk.addEventListener('click', closeModal);
  
  // Close modal when clicking outside content
  if (downloadModal) {
    downloadModal.addEventListener('click', (e) => {
      if (e.target === downloadModal) {
        closeModal();
      }
    });
  }

  // --- Initial Render ---
  renderQRCode();
}

// Ensure the app initializes regardless of whether DOMContentLoaded has already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

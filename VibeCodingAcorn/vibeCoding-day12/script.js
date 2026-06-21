/**
 * Acorn AutoML Dashboard Controller (script.js)
 * Manages UI, CSV Parsing, Canvas Heatmaps, and Training Orchestration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const AppState = {
    fileName: '',
    rawDataset: [],       // Raw parsed data
    sampledDataset: [],   // Sampled 100 rows
    headers: [],          // Columns list
    targetColumn: '',     // Selected target variable
    taskType: 'classification', // 'classification' or 'regression'
    numericalCols: [],
    categoricalCols: [],
    excludeCols: [],
    splitRatio: 0.2,      // Test set ratio
    
    // Split Train/Test sets
    trainX: [], trainY: [],
    testX: [], testY: [],
    
    // Trained Models instances
    models: {
      dt: null,
      rf: null,
      gb: null
    },
    
    // Evaluation Results
    metrics: {
      dt: {},
      rf: {},
      gb: {}
    },
    
    // Feature Importances from best model
    featureImportances: {},
    topFeatures: [],
    
    // Encoders/Decoders for any structural preprocessing
    categoriesMap: {}, // { colName: Set of unique values }
    
    // Chart.js references
    charts: {
      targetDist: null,
      metricsCompare: null,
      importance: null
    }
  };

  // UI Elements
  const el = {
    menuItems: document.querySelectorAll('.menu-item'),
    tabContents: document.querySelectorAll('.tab-content'),
    pageHeading: document.getElementById('page-heading'),
    pageSubheading: document.getElementById('page-subheading'),
    appStatus: document.getElementById('app-status'),
    dataChip: document.getElementById('data-chip'),
    dataChipName: document.getElementById('data-chip-name'),
    dataChipRows: document.getElementById('data-chip-rows'),
    
    // Tabs buttons to enable
    navEda: document.getElementById('nav-eda'),
    navTraining: document.getElementById('nav-training'),
    navEvaluation: document.getElementById('nav-evaluation'),
    navTree: document.getElementById('nav-tree'),
    navPredictor: document.getElementById('nav-predictor'),
    
    // Overview tab
    dropzone: document.getElementById('dropzone'),
    csvFileInput: document.getElementById('csvFileInput'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    loadDemoBtn: document.getElementById('loadDemoBtn'),
    metaPlaceholder: document.querySelector('.meta-placeholder'),
    metaContent: document.querySelector('.meta-content'),
    metaFilename: document.getElementById('meta-filename'),
    metaOriginalShape: document.getElementById('meta-original-shape'),
    metaSampledShape: document.getElementById('meta-sampled-shape'),
    metaTarget: document.getElementById('meta-target'),
    metaTask: document.getElementById('meta-task'),
    metaFeaturesCount: document.getElementById('meta-features-count'),
    previewSection: document.getElementById('preview-section'),
    previewTable: document.getElementById('previewTable'),
    downloadSampleBtn: document.getElementById('downloadSampleBtn'),
    
    // EDA tab
    statsTable: document.getElementById('statsTable').querySelector('tbody'),
    heatmapCanvas: document.getElementById('heatmapCanvas'),
    heatmapTooltip: document.getElementById('heatmapTooltip'),
    
    // Training tab
    targetColumnSelect: document.getElementById('targetColumnSelect'),
    excludeFeaturesBox: document.getElementById('excludeFeaturesBox'),
    startTrainingBtn: document.getElementById('startTrainingBtn'),
    recommendPlaceholder: document.getElementById('recommend-placeholder'),
    recommendDetails: document.getElementById('recommend-details'),
    recommendedModelName: document.getElementById('recommendedModelName'),
    recommendReasonText: document.getElementById('recommendReasonText'),
    recommendGuides: document.getElementById('recommendGuides'),
    consoleBody: document.getElementById('consoleBody'),
    
    // Parameters display
    testSplitRange: document.getElementById('testSplitRange'),
    testSplitVal: document.getElementById('testSplitVal'),
    maxDepthRange: document.getElementById('maxDepthRange'),
    maxDepthVal: document.getElementById('maxDepthVal'),
    rfTreesRange: document.getElementById('rfTreesRange'),
    rfTreesVal: document.getElementById('rfTreesVal'),
    gbTreesRange: document.getElementById('gbTreesRange'),
    gbTreesVal: document.getElementById('gbTreesVal'),
    gbLrRange: document.getElementById('gbLrRange'),
    gbLrVal: document.getElementById('gbLrVal'),
    
    // Evaluation tab
    importanceModelSelect: document.getElementById('importanceModelSelect'),
    confMatrixTitle: document.getElementById('confMatrixTitle'),
    
    // Tree visualizer tab
    treeContainer: document.getElementById('treeContainer'),
    
    // Predict playground tab
    dynamicFieldsContainer: document.getElementById('dynamicFieldsContainer'),
    predictModelSelect: document.getElementById('predictModelSelect'),
    gaugeFill: document.getElementById('gaugeFill'),
    gaugePercentage: document.getElementById('gaugePercentage'),
    resultClass: document.getElementById('resultClass'),
    resultDescription: document.getElementById('resultDescription')
  };

  /* ==========================================
   * 1. Navigation & Tab Control
   * ========================================== */
  el.menuItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.hasAttribute('disabled')) return;
      
      const tabId = item.getAttribute('data-tab');
      
      // Update sidebar menu items
      el.menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      
      // Update tab content displays
      el.tabContents.forEach(tab => {
        if (tab.id === `tab-${tabId}`) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      
      // Update titles
      const tabTitles = {
        'overview': { title: '대시보드 개요', sub: '분석할 CSV 파일을 업로드하여 자동화된 머신러닝 프로세스를 시작하세요.' },
        'eda': { title: '탐색적 데이터 분석 (EDA)', sub: '데이터셋의 기본 통계 및 피처 간의 피어슨 상관관계를 분석합니다.' },
        'training': { title: 'AutoML 모델 학습', sub: '브라우저 상에서 머신러닝 최적 모델 추천 및 실시간 오프라인 학습을 수행합니다.' },
        'evaluation': { title: '모델 검증 및 비교', sub: '학습 완료된 3개 알고리즘의 성능 평가 지표와 피처 기여도를 검증합니다.' },
        'tree-viewer': { title: '의사결정나무 시각화', sub: '생성된 Decision Tree 구조의 룰 분할 계통도를 분석합니다.' },
        'predictor': { title: '예측 플레이그라운드', sub: '주요 피처를 조정하며 실시간 머신러닝 추론 결과를 체험해 보세요.' }
      };
      
      el.pageHeading.textContent = tabTitles[tabId].title;
      el.pageSubheading.textContent = tabTitles[tabId].sub;
      
      // Special redraw trigger for Heatmap Canvas when showing EDA tab
      if (tabId === 'eda') {
        setTimeout(drawHeatmap, 50);
      }
    });
  });

  function updateAppStatus(type, text) {
    const dot = el.appStatus.querySelector('.status-dot');
    const label = el.appStatus.querySelector('.status-text');
    
    dot.className = 'status-dot';
    dot.classList.add(type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'red');
    label.textContent = text;
  }

  /* ==========================================
   * 2. Range Sliders Value Updates
   * ========================================== */
  el.testSplitRange.addEventListener('input', (e) => el.testSplitVal.textContent = e.target.value);
  el.maxDepthRange.addEventListener('input', (e) => el.maxDepthVal.textContent = e.target.value);
  el.rfTreesRange.addEventListener('input', (e) => el.rfTreesVal.textContent = e.target.value);
  el.gbTreesRange.addEventListener('input', (e) => el.gbTreesVal.textContent = e.target.value);
  el.gbLrRange.addEventListener('input', (e) => el.gbLrVal.textContent = e.target.value);

  /* ==========================================
   * 3. CSV File Upload & Parsing
   * ========================================== */
  
  // Drag & drop handlers
  el.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropzone.style.borderColor = 'var(--color-primary)';
    el.dropzone.style.backgroundColor = 'rgba(139, 92, 246, 0.08)';
  });
  
  el.dropzone.addEventListener('dragleave', () => {
    el.dropzone.style.borderColor = 'rgba(139, 92, 246, 0.3)';
    el.dropzone.style.backgroundColor = 'transparent';
  });
  
  el.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.dropzone.style.borderColor = 'rgba(139, 92, 246, 0.3)';
    el.dropzone.style.backgroundColor = 'transparent';
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleCSVFile(file);
    } else {
      alert('CSV 형식의 파일만 업로드 가능합니다.');
    }
  });

  el.selectFileBtn.addEventListener('click', () => el.csvFileInput.click());
  el.csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleCSVFile(file);
  });

  // Fetch and Load Demo Data
  el.loadDemoBtn.addEventListener('click', () => {
    updateAppStatus('warning', '데모 데이터 가져오는 중...');
    
    // We can try to load locally first (from relative day06 directory).
    // In browser, relative URL '../vibeCoding-day06/churn.csv' works if served on localhost.
    // If it fails (e.g. cross-origin/not served), we fall back to Github raw.
    const localUrl = '../vibeCoding-day06/churn.csv';
    const fallbackUrl = 'https://raw.githubusercontent.com/diffth/AIBook/main/VibeCodingAcorn/vibeCoding-day06/churn.csv';

    fetch(localUrl)
      .then(res => {
        if (!res.ok) throw new Error('Local fetch failed');
        return res.text();
      })
      .then(csvText => parseCSVContent('churn.csv', csvText))
      .catch(err => {
        console.log('Demo local load failed, trying remote github raw...', err);
        fetch(fallbackUrl)
          .then(res => {
            if (!res.ok) throw new Error('Remote fetch failed');
            return res.text();
          })
          .then(csvText => parseCSVContent('churn.csv', csvText))
          .catch(err2 => {
            alert('데모 데이터를 로드하지 못했습니다. 로컬 CSV 파일을 수동으로 선택해 주세요.');
            updateAppStatus('error', '데이터 로드 실패');
          });
      });
  });

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      parseCSVContent(file.name, e.target.result);
    };
    reader.readAsText(file);
  }

  function parseCSVContent(filename, csvText) {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          processParsedData(filename, results.data);
        } else {
          alert('CSV 데이터가 유효하지 않거나 비어 있습니다.');
        }
      },
      error: (err) => {
        alert('CSV 파싱 중 오류가 발생했습니다: ' + err.message);
      }
    });
  }

  function processParsedData(filename, rawData) {
    AppState.fileName = filename;
    AppState.rawDataset = rawData;
    AppState.headers = Object.keys(rawData[0]);

    // Clean data strings (trim and parse numeric values, handle churn dot typings)
    AppState.rawDataset.forEach(row => {
      for (const col in row) {
        if (row[col] !== undefined && row[col] !== null) {
          let cleanedVal = row[col].trim();
          
          // Specific telecom churn dot cleanser: e.g. "True." -> "True"
          if (col.toLowerCase() === 'churn') {
            cleanedVal = cleanedVal.replace(/\.$/, ''); // Remove ending dot
          }
          
          row[col] = cleanedVal;
        }
      }
    });

    // Detect numeric vs categorical columns based on values content
    AppState.numericalCols = [];
    AppState.categoricalCols = [];
    AppState.categoriesMap = {};
    
    AppState.headers.forEach(col => {
      let isNumeric = true;
      let numericHits = 0;
      let nonNullHits = 0;
      
      const valuesSet = new Set();
      
      AppState.rawDataset.forEach(row => {
        const val = row[col];
        if (val !== undefined && val !== null && val !== '') {
          nonNullHits++;
          valuesSet.add(val);
          if (isNaN(Number(val))) {
            isNumeric = false;
          } else {
            numericHits++;
          }
        }
      });
      
      AppState.categoriesMap[col] = valuesSet;

      // Rule: if 90%+ of non-null fields are numerical, classify column as numerical
      if (isNumeric && nonNullHits > 0 && numericHits / nonNullHits > 0.90) {
        AppState.numericalCols.push(col);
        // Cast values to actual Javascript float values for computation efficiency
        AppState.rawDataset.forEach(row => {
          if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
            row[col] = Number(row[col]);
          } else {
            row[col] = null; // represent missing
          }
        });
      } else {
        AppState.categoricalCols.push(col);
      }
    });

    // Auto-detect target column: search labels like 'churn', 'class', 'target', 'y'
    let detectedTarget = AppState.headers[AppState.headers.length - 1]; // Fallback to last column
    for (const col of AppState.headers) {
      const lowCol = col.toLowerCase();
      if (lowCol === 'churn' || lowCol === 'target' || lowCol === 'class' || lowCol === 'label' || lowCol === 'y') {
        detectedTarget = col;
        break;
      }
    }
    AppState.targetColumn = detectedTarget;

    // Detect Task Type (Regression if target is numerical with > 10 distinct values, else Classification)
    const targetUniqueCount = AppState.categoriesMap[detectedTarget]?.size || 0;
    if (AppState.numericalCols.includes(detectedTarget) && targetUniqueCount > 10) {
      AppState.taskType = 'regression';
    } else {
      AppState.taskType = 'classification';
    }

    // Auto-select columns to exclude: e.g. Phone number (high unique strings)
    AppState.excludeCols = [];
    AppState.categoricalCols.forEach(col => {
      // If a categorical feature has unique values equal to rows (or nearly equal), exclude it
      const uniqueCount = AppState.categoriesMap[col].size;
      if (col.toLowerCase() === 'phone' || uniqueCount > AppState.rawDataset.length * 0.95) {
        AppState.excludeCols.push(col);
      }
    });

    // Perform automatic 100-instance sampling (shuffle & slice)
    const shuffled = [...AppState.rawDataset].sort(() => 0.5 - Math.random());
    AppState.sampledDataset = shuffled.slice(0, 100);

    // Update UI Elements
    el.dataChipName.textContent = filename;
    el.dataChipRows.textContent = `${AppState.sampledDataset.length} 샘플링`;
    el.dataChip.style.display = 'flex';
    
    updateAppStatus('success', '데이터셋 샘플링 완료');

    // Enable navigation tabs
    el.navEda.removeAttribute('disabled');
    el.navTraining.removeAttribute('disabled');
    
    // Update overview metadata cards
    el.metaFilename.textContent = filename;
    el.metaOriginalShape.textContent = `${AppState.rawDataset.length} 행 x ${AppState.headers.length} 열`;
    el.metaSampledShape.textContent = `${AppState.sampledDataset.length} 행 x ${AppState.headers.length} 열 (100개 샘플링)`;
    el.metaTarget.textContent = AppState.targetColumn;
    el.metaTask.textContent = AppState.taskType === 'classification' ? '분류 (Classification)' : '회귀 (Regression)';
    el.metaFeaturesCount.textContent = `${AppState.headers.length - 1} 개 피처`;
    
    el.metaPlaceholder.style.display = 'none';
    el.metaContent.style.display = 'block';

    // Populate data preview
    renderPreviewTable();

    // Populate training setup fields
    populateTrainingSetup();
    
    // Run EDA Calculations
    calculateEDAStats();
    renderTargetDistribution();
    
    // Pre-calculate recommendations
    generateAutoMLRecommendation();

    // Transition to preview section display
    el.previewSection.style.display = 'block';
  }

  function renderPreviewTable() {
    const thead = el.previewTable.querySelector('thead');
    const tbody = el.previewTable.querySelector('tbody');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Render headers
    const trHeader = document.createElement('tr');
    AppState.headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      trHeader.appendChild(th);
    });
    thead.appendChild(trHeader);
    
    // Render top 5 rows of sampled dataset
    const topRows = AppState.sampledDataset.slice(0, 5);
    topRows.forEach(row => {
      const tr = document.createElement('tr');
      AppState.headers.forEach(h => {
        const td = document.createElement('td');
        td.textContent = row[h] === null ? 'NaN' : row[h];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // Export Sampled 100 rows back as CSV file
  el.downloadSampleBtn.addEventListener('click', () => {
    if (AppState.sampledDataset.length === 0) return;
    const csvContent = Papa.unparse(AppState.sampledDataset);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sampled_100_${AppState.fileName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  /* ==========================================
   * 4. Exploratory Data Analysis (EDA) Logic
   * ========================================== */
  
  function calculateEDAStats() {
    el.statsTable.innerHTML = '';
    
    const totalRows = AppState.sampledDataset.length;
    
    AppState.headers.forEach(col => {
      const type = AppState.numericalCols.includes(col) ? '수치형 (Numeric)' : '범주형 (Category)';
      
      // Calculate missing values
      let nullCount = 0;
      const values = [];
      
      AppState.sampledDataset.forEach(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          nullCount++;
        } else {
          values.push(row[col]);
        }
      });
      
      const missingPct = ((nullCount / totalRows) * 100).toFixed(1);
      const uniqueCount = AppState.categoriesMap[col]?.size || 0;
      
      let mean = '-';
      let std = '-';
      let min = '-';
      let max = '-';
      
      if (type.startsWith('수치형')) {
        const numericVals = values.map(Number);
        if (numericVals.length > 0) {
          const sum = numericVals.reduce((a, b) => a + b, 0);
          const computedMean = sum / numericVals.length;
          mean = computedMean.toFixed(3);
          
          let variance = 0;
          numericVals.forEach(v => variance += (v - computedMean) ** 2);
          std = Math.sqrt(variance / numericVals.length).toFixed(3);
          
          min = Math.min(...numericVals).toFixed(2);
          max = Math.max(...numericVals).toFixed(2);
        }
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-bold text-white">${col}</td>
        <td>${type}</td>
        <td class="${missingPct > 0 ? 'text-rose-red' : ''}">${missingPct}%</td>
        <td>${uniqueCount}</td>
        <td>${mean}</td>
        <td>${std}</td>
        <td>${min}</td>
        <td>${max}</td>
      `;
      el.statsTable.appendChild(tr);
    });
  }

  function renderTargetDistribution() {
    const target = AppState.targetColumn;
    const counts = {};
    
    AppState.sampledDataset.forEach(row => {
      const val = row[target];
      if (val !== undefined && val !== null) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    
    // Destroy previous chart
    if (AppState.charts.targetDist) {
      AppState.charts.targetDist.destroy();
    }
    
    const ctx = document.getElementById('targetDistChart').getContext('2d');
    
    const chartColors = [
      'rgba(139, 92, 246, 0.7)',  // Purple
      'rgba(6, 182, 212, 0.7)',   // Cyan
      'rgba(16, 185, 129, 0.7)',  // Green
      'rgba(244, 63, 94, 0.7)',   // Red
      'rgba(245, 158, 11, 0.7)'    // Orange
    ];
    const borderColors = chartColors.map(c => c.replace('0.7', '1'));
    
    AppState.charts.targetDist = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: chartColors.slice(0, labels.length),
          borderColor: borderColors.slice(0, labels.length),
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#d1d5db',
              font: { family: 'Noto Sans KR', size: 11 }
            }
          }
        }
      }
    });
  }

  /* ==========================================
   * 4b. Pearson Correlation Canvas Heatmap
   * ========================================== */
  
  function getPearsonCorrelationMatrix() {
    const cols = AppState.numericalCols.filter(col => col !== AppState.targetColumn);
    const n = AppState.sampledDataset.length;
    const matrix = {};
    
    cols.forEach(c => matrix[c] = {});
    
    const means = {};
    cols.forEach(col => {
      let sum = 0;
      let count = 0;
      AppState.sampledDataset.forEach(row => {
        if (row[col] !== null) {
          sum += row[col];
          count++;
        }
      });
      means[col] = count > 0 ? sum / count : 0;
    });
    
    for (let i = 0; i < cols.length; i++) {
      for (let j = i; j < cols.length; j++) {
        const colA = cols[i];
        const colB = cols[j];
        
        if (colA === colB) {
          matrix[colA][colB] = 1.0;
          continue;
        }
        
        let num = 0;
        let denA = 0;
        let denB = 0;
        
        AppState.sampledDataset.forEach(row => {
          const valA = row[colA];
          const valB = row[colB];
          if (valA !== null && valB !== null) {
            const diffA = valA - means[colA];
            const diffB = valB - means[colB];
            num += diffA * diffB;
            denA += diffA * diffA;
            denB += diffB * diffB;
          }
        });
        
        const r = denA === 0 || denB === 0 ? 0 : num / Math.sqrt(denA * denB);
        matrix[colA][colB] = r;
        matrix[colB][colA] = r;
      }
    }
    
    return { cols, matrix };
  }

  function drawHeatmap() {
    const { cols, matrix } = getPearsonCorrelationMatrix();
    if (cols.length === 0) return;
    
    const canvas = el.heatmapCanvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const k = cols.length;
    const paddingLeft = 100;
    const paddingBottom = 100;
    
    const chartWidth = canvas.width - paddingLeft - 20;
    const chartHeight = canvas.height - paddingBottom - 20;
    
    const cellSize = Math.min(chartWidth / k, chartHeight / k);
    
    // Draw cells
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        const colA = cols[i];
        const colB = cols[j];
        const r = matrix[colA][colB];
        
        // Define color based on correlation coefficient
        let fillColor = 'rgba(255, 255, 255, 0.05)';
        if (r > 0) {
          fillColor = `rgba(244, 63, 94, ${r})`; // Red shades for positive
        } else if (r < 0) {
          fillColor = `rgba(6, 182, 212, ${Math.abs(r)})`; // Cyan shades for negative
        }
        
        const x = paddingLeft + i * cellSize;
        const y = 20 + j * cellSize;
        
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
        
        // Border outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeRect(x, y, cellSize, cellSize);
        
        // Draw numeric value if cells are large enough
        if (cellSize > 25) {
          ctx.fillStyle = Math.abs(r) > 0.5 ? '#ffffff' : '#9ca3af';
          ctx.font = '9px Outfit';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(r.toFixed(2), x + cellSize/2, y + cellSize/2);
        }
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px Outfit';
    
    // Y-axis labels (left)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let j = 0; j < k; j++) {
      const label = cols[j].length > 13 ? cols[j].substring(0, 11) + '..' : cols[j];
      ctx.fillText(label, paddingLeft - 8, 20 + j * cellSize + cellSize/2);
    }
    
    // X-axis labels (rotated at bottom)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < k; i++) {
      const x = paddingLeft + i * cellSize + cellSize/2;
      const y = 20 + k * cellSize + 8;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4); // Rotate 45 deg
      const label = cols[i].length > 13 ? cols[i].substring(0, 11) + '..' : cols[i];
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    
    // Interactive Hover Event
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      // Calculate scaled coordinate positions on canvas
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      const gridX = Math.floor((mouseX - paddingLeft) / cellSize);
      const gridY = Math.floor((mouseY - 20) / cellSize);
      
      if (gridX >= 0 && gridX < k && gridY >= 0 && gridY < k) {
        const colA = cols[gridX];
        const colB = cols[gridY];
        const r = matrix[colA][colB];
        
        el.heatmapTooltip.style.display = 'block';
        el.heatmapTooltip.style.left = `${e.clientX - rect.left + 15}px`;
        el.heatmapTooltip.style.top = `${e.clientY - rect.top + 15}px`;
        el.heatmapTooltip.innerHTML = `<strong>Feature A:</strong> ${colA}\n<strong>Feature B:</strong> ${colB}\n<strong>Correlation r:</strong> <span class="${r >= 0 ? 'text-rose-red' : 'text-cyan'}">${r.toFixed(4)}</span>`;
      } else {
        el.heatmapTooltip.style.display = 'none';
      }
    };
    
    canvas.onmouseleave = () => {
      el.heatmapTooltip.style.display = 'none';
    };
  }

  /* ==========================================
   * 5. AutoML Settings & Recommendations
   * ========================================== */
  
  function populateTrainingSetup() {
    // Populate Target column select dropdown
    el.targetColumnSelect.innerHTML = '';
    AppState.headers.forEach(h => {
      const option = document.createElement('option');
      option.value = h;
      option.textContent = h;
      if (h === AppState.targetColumn) {
        option.selected = true;
      }
      el.targetColumnSelect.appendChild(option);
    });

    // Populate Exclude Features list
    el.excludeFeaturesBox.innerHTML = '';
    AppState.headers.forEach(h => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `exclude-${h}`;
      checkbox.value = h;
      
      // Default excluded target and custom filters (like Phone)
      if (h === AppState.targetColumn) {
        checkbox.checked = true;
        checkbox.disabled = true;
      } else if (AppState.excludeCols.includes(h)) {
        checkbox.checked = true;
      }
      
      const label = document.createElement('label');
      label.htmlFor = `exclude-${h}`;
      label.textContent = h;
      
      div.appendChild(checkbox);
      div.appendChild(label);
      el.excludeFeaturesBox.appendChild(div);
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!AppState.excludeCols.includes(h)) AppState.excludeCols.push(h);
        } else {
          AppState.excludeCols = AppState.excludeCols.filter(c => c !== h);
        }
        // Recalculate AutoML recommendation
        generateAutoMLRecommendation();
      });
    });

    // Handle target column change
    el.targetColumnSelect.addEventListener('change', (e) => {
      const prevTarget = AppState.targetColumn;
      AppState.targetColumn = e.target.value;
      
      // Enable previous target checkbox
      const prevCheck = document.getElementById(`exclude-${prevTarget}`);
      if (prevCheck) {
        prevCheck.checked = false;
        prevCheck.disabled = false;
      }
      
      // Disable new target checkbox
      const newCheck = document.getElementById(`exclude-${AppState.targetColumn}`);
      if (newCheck) {
        newCheck.checked = true;
        newCheck.disabled = true;
      }
      
      // Update task type
      const targetUniqueCount = AppState.categoriesMap[AppState.targetColumn]?.size || 0;
      if (AppState.numericalCols.includes(AppState.targetColumn) && targetUniqueCount > 10) {
        AppState.taskType = 'regression';
      } else {
        AppState.taskType = 'classification';
      }
      
      // Update Exclude list lists
      AppState.excludeCols = AppState.excludeCols.filter(c => c !== AppState.targetColumn);
      
      // Recalculate EDA
      calculateEDAStats();
      renderTargetDistribution();
      
      // Generate new recommendation
      generateAutoMLRecommendation();
    });
  }

  function generateAutoMLRecommendation() {
    const target = AppState.targetColumn;
    const numSamples = AppState.sampledDataset.length;
    
    // Analyze features and target counts
    const features = AppState.headers.filter(h => h !== target && !AppState.excludeCols.includes(h));
    const targetValues = Array.from(AppState.categoriesMap[target] || []);
    
    let recommendedModel = 'Random Forest';
    let reasoningText = '';
    const guides = [];

    // Analyze class imbalance (classification only)
    if (AppState.taskType === 'classification') {
      const counts = {};
      AppState.sampledDataset.forEach(row => {
        const val = row[target];
        counts[val] = (counts[val] || 0) + 1;
      });
      
      const countsVals = Object.values(counts);
      const minClass = Math.min(...countsVals);
      const maxClass = Math.max(...countsVals);
      const imbalanceRatio = minClass / maxClass;

      if (imbalanceRatio < 0.4) {
        recommendedModel = 'GBDT (XGBoost)';
        reasoningText = `타겟 클래스(${target})의 비율 불균형 비율이 심한 상태입니다(소수 클래스 비율: ${(imbalanceRatio * 100).toFixed(1)}%). 
                         그레디언트 부스팅(GBDT/XGBoost) 또는 배깅 기반 랜덤 포레스트 앙상블이 소수 이탈 고객 판별에 뛰어난 복원도를 보여줄 것입니다.`;
        guides.push('과적합을 방지하기 위해 GBDT의 학습률(Learning Rate)을 0.05~0.1 사이로 정의하고 트리 깊이를 4 이하로 설정하는 것을 추천합니다.');
        guides.push('랜덤 포레스트에서 특성 배깅(Feature Bagging: sqrt)을 활성화하여 노이즈 특징에 대한 저항력을 향상시키세요.');
      } else {
        recommendedModel = 'Random Forest';
        reasoningText = `데이터의 클래스 불균형이 적당하고(비율: ${(imbalanceRatio * 100).toFixed(1)}%) 피처 개수가 많습니다.
                         랜덤 포레스트는 100개라는 적은 인스턴스 샘플 환경에서도 강력한 일반화 성능을 제공합니다.`;
        guides.push('의사결정나무는 샘플 수 100개에서 과적합(Overfitting) 위험이 상대적으로 크므로 최대 깊이(Max Depth)를 5 이하로 제어하세요.');
      }
    } else {
      // Regression
      recommendedModel = 'GBDT (XGBoost)';
      reasoningText = `연속형 변수(${target})를 타겟으로 예측하는 회귀 작업(Regression)입니다. 잔차(Residual) 오차를 점진적으로 줄여가는 GBDT(XGBoost) 회귀 방식이 미세 조정 학습에 가장 이상적입니다.`;
      guides.push('수치형 변수 편차가 큰 경우, 트리 기반 모델은 스케일링에 둔감하지만 예측 정밀도를 올리기 위해 하이퍼파라미터 트리 개수를 늘릴 수 있습니다.');
    }

    // Checking high categorical features
    const highCardinals = [];
    features.forEach(f => {
      if (AppState.categoricalCols.includes(f)) {
        const cardinality = AppState.categoriesMap[f]?.size || 0;
        if (cardinality > 15) {
          highCardinals.push(f);
        }
      }
    });

    if (highCardinals.length > 0) {
      guides.push(`카테고리 고유값 수가 너무 많은 피처(${highCardinals.join(', ')})가 확인되었습니다. 노이즈 예방을 위해 제외 피처 등록을 권장합니다.`);
    }
    
    guides.push('수치형 피처의 결측치는 자동으로 각 컬럼의 중간값(Median)으로 보간 처리됩니다.');
    guides.push('문자 범주형 피처는 자동으로 라벨 인코딩 전처리 기법이 연동됩니다.');

    // Update UI
    el.recommendPlaceholder.style.display = 'none';
    el.recommendDetails.style.display = 'block';
    
    el.recommendedModelName.textContent = recommendedModel;
    el.recommendReasonText.textContent = reasoningText;
    
    el.recommendGuides.innerHTML = '';
    guides.forEach(g => {
      const li = document.createElement('li');
      li.textContent = g;
      el.recommendGuides.appendChild(li);
    });
  }

  /* ==========================================
   * 6. AutoML Training Pipeline
   * ========================================== */
  
  el.startTrainingBtn.addEventListener('click', async () => {
    if (AppState.sampledDataset.length === 0) return;
    
    // Lock training button and reset logs
    el.startTrainingBtn.setAttribute('disabled', 'true');
    el.startTrainingBtn.textContent = 'AutoML 파이프라인 학습 중...';
    el.consoleBody.innerHTML = '';
    
    updateAppStatus('warning', '파이프라인 학습 실행 중');

    // Load hyperparameters from sliders
    const testPct = Number(el.testSplitRange.value) / 100;
    const maxDepth = Number(el.maxDepthRange.value);
    const rfTrees = Number(el.rfTreesRange.value);
    const gbTrees = Number(el.gbTreesRange.value);
    const gbLr = Number(el.gbLrRange.value);

    // Filter features
    const target = AppState.targetColumn;
    const features = AppState.headers.filter(h => h !== target && !AppState.excludeCols.includes(h));

    await logToConsole('Initializing AutoML Training Pipeline...', 'info');
    await sleep(200);
    await logToConsole(`Target variable detected: [${target}] (${AppState.taskType === 'classification' ? '분류' : '회귀'})`, 'info');
    await logToConsole(`Active features list: ${JSON.stringify(features)}`, 'info');
    await sleep(200);

    // 1. Data preprocessing: median/mode imputation
    await logToConsole('Step 1: 데이터 정화 및 결측치 결합 처리 (Imputation)...', 'warning');
    const processedData = AppState.sampledDataset.map(row => {
      const newRow = { ...row };
      features.forEach(col => {
        if (newRow[col] === null || newRow[col] === undefined || newRow[col] === '') {
          // Impute numerical with Median, categorical with Mode
          if (AppState.numericalCols.includes(col)) {
            const vals = AppState.sampledDataset.map(r => r[col]).filter(v => v !== null).sort((a,b)=>a-b);
            newRow[col] = vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 0;
          } else {
            const counts = {};
            AppState.sampledDataset.forEach(r => {
              if (r[col]) counts[r[col]] = (counts[r[col]] || 0) + 1;
            });
            let mode = '';
            let maxCount = -1;
            for (const key in counts) {
              if (counts[key] > maxCount) { maxCount = counts[key]; mode = key; }
            }
            newRow[col] = mode;
          }
        }
      });
      return newRow;
    });
    await logToConsole('=> 결측치 Imputation 처리 완료.', 'success');
    await sleep(200);

    // Convert target variable: binary classification mappings (True/False -> 1/0)
    let processedY = processedData.map(row => row[target]);
    if (AppState.taskType === 'classification') {
      const uniqueVals = Array.from(new Set(processedY));
      await logToConsole(`Target unique classes: ${JSON.stringify(uniqueVals)}`, 'info');
      
      // If classification target values are strings like 'True'/'False' or 'yes'/'no', map them to 1/0
      processedY = processedY.map(yVal => {
        const strVal = String(yVal).toLowerCase();
        if (strVal === 'true' || strVal === '1' || strVal === 'yes' || strVal === 't' || strVal === 'y') {
          return 1;
        }
        return 0;
      });
    } else {
      processedY = processedY.map(Number);
    }

    // 2. Train / Test split
    await logToConsole(`Step 2: 데이터셋 분할 (Train: ${(100 - testPct * 100).toFixed(0)}% / Test: ${(testPct * 100).toFixed(0)}%)...`, 'warning');
    const indices = Array.from({ length: processedData.length }, (_, i) => i);
    // Shuffle indices
    const shuffledIndices = window.AutoML.MathUtils.shuffle(indices);
    const testSize = Math.floor(processedData.length * testPct);
    const testIdx = shuffledIndices.slice(0, testSize);
    const trainIdx = shuffledIndices.slice(testSize);

    AppState.trainX = trainIdx.map(i => processedData[i]);
    AppState.trainY = trainIdx.map(i => processedY[i]);
    AppState.testX = testIdx.map(i => processedData[i]);
    AppState.testY = testIdx.map(i => processedY[i]);

    await logToConsole(`=> 학습 세트 크기: ${AppState.trainX.length} 행, 검증 세트 크기: ${AppState.testX.length} 행`, 'success');
    await sleep(200);

    // 3. Train Decision Tree
    await logToConsole('Step 3: Decision Tree 학습 시작...', 'warning');
    await sleep(150);
    
    if (AppState.taskType === 'classification') {
      AppState.models.dt = new window.AutoML.DecisionTreeClassifier({ maxDepth: maxDepth, minSamplesSplit: 2 });
    } else {
      AppState.models.dt = new window.AutoML.DecisionTreeRegressor({ maxDepth: maxDepth, minSamplesSplit: 2 });
    }
    
    AppState.models.dt.fit(AppState.trainX, AppState.trainY, features);
    
    // Evaluate Decision Tree
    const dtPred = AppState.models.dt.predict(AppState.testX);
    AppState.metrics.dt = calculateMetrics(dtPred, AppState.testY);
    await logToConsole(`=> [Decision Tree] 학습 완료. 테스트 정확도/오차: ${AppState.metrics.dt.mainScoreText}`, 'success');
    await sleep(200);

    // 4. Train Random Forest
    await logToConsole(`Step 4: Random Forest 학습 시작 (트리 수: ${rfTrees}, 특성 배깅 활성)...`, 'warning');
    await sleep(250);
    
    if (AppState.taskType === 'classification') {
      AppState.models.rf = new window.AutoML.RandomForestClassifier({
        nEstimators: rfTrees,
        maxDepth: maxDepth,
        minSamplesSplit: 2,
        maxFeatures: 'sqrt'
      });
    } else {
      AppState.models.rf = new window.AutoML.RandomForestRegressor({
        nEstimators: rfTrees,
        maxDepth: maxDepth,
        minSamplesSplit: 2,
        maxFeatures: 0.33
      });
    }
    
    AppState.models.rf.fit(AppState.trainX, AppState.trainY, features);
    const rfPred = AppState.models.rf.predict(AppState.testX);
    AppState.metrics.rf = calculateMetrics(rfPred, AppState.testY);
    await logToConsole(`=> [Random Forest] 학습 완료. 테스트 정확도/오차: ${AppState.metrics.rf.mainScoreText}`, 'success');
    await sleep(200);

    // 5. Train GBDT/XGBoost
    await logToConsole(`Step 5: GBDT (XGBoost 대용) 점진적 부스팅 학습 시작 (트리 수: ${gbTrees}, 학습률: ${gbLr})...`, 'warning');
    
    if (AppState.taskType === 'classification') {
      AppState.models.gb = new window.AutoML.GradientBoostingClassifier({
        nEstimators: gbTrees,
        learningRate: gbLr,
        maxDepth: 3, // slightly shallower to avoid boosting overfitting
        minSamplesSplit: 2,
        regLambda: 1.0
      });
    } else {
      AppState.models.gb = new window.AutoML.GradientBoostingRegressor({
        nEstimators: gbTrees,
        learningRate: gbLr,
        maxDepth: 3,
        minSamplesSplit: 2
      });
    }

    // Fit with progress logger callback
    AppState.models.gb.fit(AppState.trainX, AppState.trainY, features, async (iter, loss) => {
      // Log every 10 iterations to prevent terminal flooding
      if (iter % 10 === 0 || iter === gbTrees) {
        logToConsole(`   [Iter ${iter}/${gbTrees}] Train LogLoss/MSE: ${loss.toFixed(4)}`);
      }
    });

    // Wait slightly to let logging finish since callback is async
    await sleep(400);
    const gbPred = AppState.models.gb.predict(AppState.testX);
    AppState.metrics.gb = calculateMetrics(gbPred, AppState.testY);
    await logToConsole(`=> [GBDT (XGBoost)] 학습 완료. 테스트 정확도/오차: ${AppState.metrics.gb.mainScoreText}`, 'success');
    await sleep(200);

    // 6. Complete AutoML Pipeline
    await logToConsole('AutoML 파이프라인 학습 최종 완료! 모델 성능 데이터 분석 보드로 이전 중...', 'success');
    
    // Enable other evaluation and playground tabs
    el.navEvaluation.removeAttribute('disabled');
    el.navTree.removeAttribute('disabled');
    el.navPredictor.removeAttribute('disabled');
    
    updateAppStatus('success', '모델 학습 완료');
    
    // Unlock training button
    el.startTrainingBtn.removeAttribute('disabled');
    el.startTrainingBtn.innerHTML = '<i class="fa-solid fa-play"></i> AutoML 파이프라인 학습 실행';

    // Move to evaluation metrics displays
    updateEvaluationUI();
    
    // Build Decision Tree UI outline
    renderTreeViewer();
    
    // Auto-generate Predictor forms
    setupPredictionForm(features);

  });

  async function logToConsole(text, type = '') {
    const line = document.createElement('div');
    line.className = 'console-line';
    if (type === 'info') line.classList.add('text-info');
    else if (type === 'success') line.classList.add('text-success');
    else if (type === 'warning') line.classList.add('text-warning');
    
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    el.consoleBody.appendChild(line);
    el.consoleBody.scrollTop = el.consoleBody.scrollHeight;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ==========================================
   * 7. Evaluation Metrics & Compare Calculations
   * ========================================== */
  
  function calculateMetrics(yPred, yTrue) {
    const n = yTrue.length;
    
    if (AppState.taskType === 'classification') {
      // Classification metrics
      let tp = 0, fp = 0, fn = 0, tn = 0;
      for (let i = 0; i < n; i++) {
        const pred = yPred[i];
        const actual = yTrue[i];
        if (actual === 1) {
          if (pred === 1) tp++; else fn++;
        } else {
          if (pred === 1) fp++; else tn++;
        }
      }
      
      const accuracy = (tp + tn) / n;
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      
      return {
        mainScore: accuracy,
        mainScoreText: `${(accuracy * 100).toFixed(1)}%`,
        precision: precision,
        recall: recall,
        f1: f1,
        tp, fp, fn, tn
      };
    } else {
      // Regression metrics
      let sumSqErr = 0;
      let sumAbsErr = 0;
      let sumY = 0;
      for (let i = 0; i < n; i++) {
        const err = yTrue[i] - yPred[i];
        sumSqErr += err * err;
        sumAbsErr += Math.abs(err);
        sumY += yTrue[i];
      }
      
      const mse = sumSqErr / n;
      const mae = sumAbsErr / n;
      const meanY = sumY / n;
      
      let den = 0;
      for (let i = 0; i < n; i++) {
        const diff = yTrue[i] - meanY;
        den += diff * diff;
      }
      
      const r2 = den > 0 ? 1 - (sumSqErr / den) : 0;
      
      return {
        mainScore: mse,
        mainScoreText: `MSE: ${mse.toFixed(4)}`,
        precision: r2, // Map R2 to precision index for graphing
        recall: mae,   // Map MAE to recall for graph
        f1: r2,        // Map R2 for F1 slot
        mse, mae, r2
      };
    }
  }

  function updateEvaluationUI() {
    // 1. Update text cards
    const modelsList = ['dt', 'rf', 'gb'];
    
    // Find the best model based on metrics
    let bestModel = 'rf';
    if (AppState.taskType === 'classification') {
      let maxF1 = -1;
      modelsList.forEach(m => {
        if (AppState.metrics[m].f1 > maxF1) {
          maxF1 = AppState.metrics[m].f1;
          bestModel = m;
        }
      });
      
      // Update label titles
      document.getElementById('main-metric-label-dt').textContent = '정확도 (Accuracy)';
      document.getElementById('main-metric-label-rf').textContent = '정확도 (Accuracy)';
      document.getElementById('main-metric-label-gb').textContent = '정확도 (Accuracy)';
      
      // Write scores
      modelsList.forEach(m => {
        document.getElementById(`score-${m}`).textContent = `${(AppState.metrics[m].mainScore * 100).toFixed(1)}%`;
        document.getElementById(`prec-${m}`).textContent = (AppState.metrics[m].precision * 100).toFixed(1) + '%';
        document.getElementById(`rec-${m}`).textContent = (AppState.metrics[m].recall * 100).toFixed(1) + '%';
        document.getElementById(`f1-${m}`).textContent = (AppState.metrics[m].f1 * 100).toFixed(1) + '%';
      });
    } else {
      // Regression: lower MSE is better
      let minMSE = Infinity;
      modelsList.forEach(m => {
        if (AppState.metrics[m].mse < minMSE) {
          minMSE = AppState.metrics[m].mse;
          bestModel = m;
        }
      });
      
      document.getElementById('main-metric-label-dt').textContent = '평균제곱오차 (MSE)';
      document.getElementById('main-metric-label-rf').textContent = '평균제곱오차 (MSE)';
      document.getElementById('main-metric-label-gb').textContent = '평균제곱오차 (MSE)';
      
      modelsList.forEach(m => {
        document.getElementById(`score-${m}`).textContent = AppState.metrics[m].mse.toFixed(4);
        document.getElementById(`prec-${m}`).textContent = `R²: ${AppState.metrics[m].r2.toFixed(3)}`;
        document.getElementById(`rec-${m}`).textContent = `MAE: ${AppState.metrics[m].mae.toFixed(3)}`;
        document.getElementById(`f1-${m}`).textContent = `R²: ${AppState.metrics[m].r2.toFixed(3)}`;
      });
    }

    // Set best badge highlight
    modelsList.forEach(m => {
      const card = document.getElementById(`card-${m}`);
      card.className = 'glass-card metric-card';
      // remove old best tag if existed
      const oldTag = card.querySelector('.featured-tag');
      if (oldTag) card.removeChild(oldTag);
      
      if (m === bestModel) {
        card.classList.add('featured');
        const tag = document.createElement('div');
        tag.className = 'featured-tag';
        tag.innerHTML = '<i class="fa-solid fa-star"></i> BEST';
        card.appendChild(tag);
      }
    });

    // 2. Render Metrics Comparison Chart (Chart.js)
    renderCompareChart();

    // 3. Render Feature Importance (using best model)
    renderImportanceChart(bestModel);
    
    // Add event listener to change feature importance model
    el.importanceModelSelect.value = bestModel;
    el.importanceModelSelect.onchange = (e) => {
      renderImportanceChart(e.target.value);
    };

    // 4. Render Confusion Matrix (Classification only)
    if (AppState.taskType === 'classification') {
      document.querySelector('.conf-matrix-card').style.display = 'block';
      updateConfusionMatrix(bestModel);
    } else {
      document.querySelector('.conf-matrix-card').style.display = 'none';
    }
  }

  function renderCompareChart() {
    const ctx = document.getElementById('metricsCompareChart').getContext('2d');
    
    if (AppState.charts.metricsCompare) {
      AppState.charts.metricsCompare.destroy();
    }

    const isClass = AppState.taskType === 'classification';
    
    const datasets = isClass ? [
      {
        label: 'Accuracy',
        data: [AppState.metrics.dt.mainScore, AppState.metrics.rf.mainScore, AppState.metrics.gb.mainScore],
        backgroundColor: 'rgba(6, 182, 212, 0.6)',
        borderColor: 'rgba(6, 182, 212, 1)',
        borderWidth: 1
      },
      {
        label: 'Precision',
        data: [AppState.metrics.dt.precision, AppState.metrics.rf.precision, AppState.metrics.gb.precision],
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'Recall',
        data: [AppState.metrics.dt.recall, AppState.metrics.rf.recall, AppState.metrics.gb.recall],
        backgroundColor: 'rgba(244, 63, 94, 0.6)',
        borderColor: 'rgba(244, 63, 94, 1)',
        borderWidth: 1
      },
      {
        label: 'F1-score',
        data: [AppState.metrics.dt.f1, AppState.metrics.rf.f1, AppState.metrics.gb.f1],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }
    ] : [
      {
        label: 'R² Score (결정계수)',
        data: [AppState.metrics.dt.r2, AppState.metrics.rf.r2, AppState.metrics.gb.r2],
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 1
      },
      {
        label: 'MAE (평균절대오차)',
        data: [AppState.metrics.dt.mae, AppState.metrics.rf.mae, AppState.metrics.gb.mae],
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1
      }
    ];

    AppState.charts.metricsCompare = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Decision Tree', 'Random Forest', 'GBDT (XGBoost)'],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: isClass ? 1.0 : undefined,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#9ca3af' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#d1d5db', font: { family: 'Noto Sans KR', size: 11 } }
          }
        }
      }
    });
  }

  function renderImportanceChart(modelId) {
    const ctx = document.getElementById('importanceChart').getContext('2d');
    
    if (AppState.charts.importance) {
      AppState.charts.importance.destroy();
    }

    const model = AppState.models[modelId];
    if (!model) return;

    // Get feature importance object and sort
    const items = Object.entries(model.featureImportances)
      .sort((a, b) => b[1] - a[1]);

    const labels = items.map(item => item[0]);
    const data = items.map(item => item[1]);

    // Save globally for predictor playground usage
    AppState.featureImportances = model.featureImportances;
    AppState.topFeatures = labels.slice(0, 5); // Take top 5

    AppState.charts.importance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.slice(0, 10), // Show top 10
        datasets: [{
          label: 'Feature Importance',
          data: data.slice(0, 10),
          backgroundColor: 'rgba(192, 132, 252, 0.6)',
          borderColor: 'rgba(192, 132, 252, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', // horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#9ca3af' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  function updateConfusionMatrix(modelId) {
    const m = AppState.metrics[modelId];
    if (!m) return;

    const names = {
      dt: 'Decision Tree',
      rf: 'Random Forest',
      gb: 'GBDT (XGBoost)'
    };
    
    el.confMatrixTitle.textContent = `${names[modelId]} 모델의 검증 데이터 오차 행렬 (Confusion Matrix)`;
    
    document.getElementById('cm-tn-val').textContent = m.tn;
    document.getElementById('cm-fp-val').textContent = m.fp;
    document.getElementById('cm-fn-val').textContent = m.fn;
    document.getElementById('cm-tp-val').textContent = m.tp;
  }

  /* ==========================================
   * 8. Decision Tree Visualizer Rendering
   * ========================================== */
  
  function renderTreeViewer() {
    const tree = AppState.models.dt;
    if (!tree || !tree.root) return;

    const json = tree.toJSON();
    el.treeContainer.innerHTML = '';
    
    const treeRootList = document.createElement('ul');
    treeRootList.className = 'tree-branch';
    treeRootList.style.paddingLeft = '0'; // align left
    
    const rootNodeEl = createTreeNodeUI(json);
    treeRootList.appendChild(rootNodeEl);
    el.treeContainer.appendChild(treeRootList);
  }

  function createTreeNodeUI(node) {
    const li = document.createElement('li');
    li.className = 'tree-node-wrapper';

    const item = document.createElement('div');
    item.className = 'tree-node-item';

    if (node.isLeaf) {
      item.classList.add('is-leaf');
      
      let textVal = node.value;
      if (AppState.taskType === 'classification') {
        textVal = node.value === 1 || node.value === true ? '이탈 (True)' : '유지 (False)';
      } else {
        textVal = Number(node.value).toFixed(3);
      }

      item.innerHTML = `
        <span class="color-dot leaf-dot"></span>
        <span class="node-rule leaf-val">${textVal}</span>
        <span class="node-samples">${node.samples} 샘플</span>
        <span class="node-impurity">impurity: ${node.impurity}</span>
      `;
      li.appendChild(item);
      return li;
    }

    // For non-leaves
    const toggle = document.createElement('button');
    toggle.className = 'node-toggle-btn';
    toggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    const ruleText = node.splitType === 'numeric' 
      ? `${node.feature} &le; ${node.threshold}`
      : `${node.feature} === ${node.threshold}`;

    item.innerHTML = `
      <span class="node-rule">${ruleText}</span>
      <span class="node-samples">${node.samples} 샘플</span>
      <span class="node-impurity">impurity: ${node.impurity}</span>
    `;
    item.insertBefore(toggle, item.firstChild);
    li.appendChild(item);

    // Build children branches
    const childrenList = document.createElement('ul');
    childrenList.className = 'tree-branch';
    
    const leftEl = createTreeNodeUI(node.left);
    const rightEl = createTreeNodeUI(node.right);
    
    childrenList.appendChild(leftEl);
    childrenList.appendChild(rightEl);
    li.appendChild(childrenList);

    // Toggle expand/collapse listener
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle.classList.toggle('collapsed');
      if (toggle.classList.contains('collapsed')) {
        toggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        childrenList.style.display = 'none';
      } else {
        toggle.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
        childrenList.style.display = 'block';
      }
    });

    return li;
  }

  /* ==========================================
   * 9. Prediction Playground Simulation
   * ========================================== */
  
  function setupPredictionForm(features) {
    el.dynamicFieldsContainer.innerHTML = '';
    
    // Sort and select top 5 features
    const top5 = AppState.topFeatures;

    top5.forEach(feat => {
      const fieldGroup = document.createElement('div');
      fieldGroup.className = 'playground-field-group';
      
      const header = document.createElement('div');
      header.className = 'playground-field-header';
      header.innerHTML = `
        <span class="f-name">${feat}</span>
        <span class="f-val" id="play-val-lbl-${feat}">-</span>
      `;
      fieldGroup.appendChild(header);

      const valLabel = header.querySelector('.f-val');
      const isNumeric = AppState.numericalCols.includes(feat);
      
      if (isNumeric) {
        // Collect numeric range
        const vals = AppState.sampledDataset.map(r => r[feat]).filter(v => v !== null);
        const min = vals.length > 0 ? Math.min(...vals) : 0;
        const max = vals.length > 0 ? Math.max(...vals) : 100;
        const median = vals.length > 0 ? vals.sort((a,b)=>a-b)[Math.floor(vals.length / 2)] : 0;
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'slider';
        slider.id = `play-input-${feat}`;
        slider.min = min.toFixed(2);
        slider.max = max.toFixed(2);
        
        // If it looks like integers (e.g. Calls, message count), set step = 1
        const allInts = vals.every(v => Number.isInteger(v));
        slider.step = allInts ? '1' : ((max - min) / 100).toFixed(3);
        slider.value = median.toFixed(2);
        
        fieldGroup.appendChild(slider);
        
        // Initialize label
        valLabel.textContent = median.toFixed(2);
        
        slider.addEventListener('input', (e) => {
          valLabel.textContent = Number(e.target.value).toFixed(2);
          runLiveInference();
        });
      } else {
        // Categorical select dropdown
        const select = document.createElement('select');
        select.className = 'form-control';
        select.id = `play-input-${feat}`;
        
        const categories = Array.from(AppState.categoriesMap[feat] || []);
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          select.appendChild(opt);
        });
        
        fieldGroup.appendChild(select);
        
        // Initialize label
        valLabel.textContent = select.value;
        
        select.addEventListener('change', (e) => {
          valLabel.textContent = e.target.value;
          runLiveInference();
        });
      }
      
      el.dynamicFieldsContainer.appendChild(fieldGroup);
    });

    // Run first inference
    runLiveInference();

    // Listen to model changes in playground
    el.predictModelSelect.onchange = () => {
      runLiveInference();
    };
  }

  function runLiveInference() {
    const top5 = AppState.topFeatures;
    
    // Construct single input row. For features not in top-5, we use median/mode defaults.
    const inputRow = {};
    
    // Set baseline defaults for all active features
    const allActiveFeatures = AppState.headers.filter(h => h !== AppState.targetColumn && !AppState.excludeCols.includes(h));
    
    allActiveFeatures.forEach(feat => {
      const isNumeric = AppState.numericalCols.includes(feat);
      const vals = AppState.sampledDataset.map(r => r[feat]).filter(v => v !== null);
      
      if (isNumeric) {
        inputRow[feat] = vals.length > 0 ? vals.sort((a,b)=>a-b)[Math.floor(vals.length / 2)] : 0;
      } else {
        const counts = {};
        AppState.sampledDataset.forEach(r => {
          if (r[feat]) counts[r[feat]] = (counts[r[feat]] || 0) + 1;
        });
        let mode = '';
        let maxCount = -1;
        for (const key in counts) {
          if (counts[key] > maxCount) { maxCount = counts[key]; mode = key; }
        }
        inputRow[feat] = mode;
      }
    });

    // Overwrite top 5 features with playground form values
    top5.forEach(feat => {
      const inputEl = document.getElementById(`play-input-${feat}`);
      if (inputEl) {
        const isNumeric = AppState.numericalCols.includes(feat);
        inputRow[feat] = isNumeric ? Number(inputEl.value) : inputEl.value;
      }
    });

    // Gather model predictions probabilities
    let proba = 0;
    const selectedModel = el.predictModelSelect.value;
    
    const probDT = AppState.models.dt.predictProbaRow(inputRow);
    const probRF = AppState.models.rf.predictProbaRow(inputRow);
    
    // For GBDT Classifier, it yields logOdds proba natively
    let probGB = 0;
    if (AppState.taskType === 'classification') {
      probGB = AppState.models.gb.predictProbaRow(inputRow);
    } else {
      // If regression, scale prediction output to [0,1] relatively
      const rawVal = AppState.models.gb.predictRow(inputRow);
      // Map raw GBDT reg value
      const targetVals = AppState.sampledDataset.map(r => r[AppState.targetColumn]);
      const min = Math.min(...targetVals);
      const max = Math.max(...targetVals);
      probGB = max - min > 0 ? (rawVal - min) / (max - min) : 0;
    }

    // Determine target probability based on selected model dropdown
    if (selectedModel === 'dt') {
      proba = probDT;
    } else if (selectedModel === 'rf') {
      proba = probRF;
    } else if (selectedModel === 'gb') {
      proba = probGB;
    } else if (selectedModel === 'voting') {
      proba = (probDT + probRF + probGB) / 3;
    }

    // Update circular gauge and text
    const percentage = Math.round(proba * 100);
    el.gaugePercentage.textContent = `${percentage}%`;
    
    // Draw SVG circle dash stroke offset: radius 95, circumference = 2 * Math.PI * 95 = 596.9
    const circumference = 596.9;
    const strokeOffset = circumference - (proba * circumference);
    el.gaugeFill.style.strokeDashoffset = strokeOffset;
    
    // Gauge colors according to danger zones
    if (percentage > 70) {
      el.gaugeFill.style.stroke = 'var(--color-danger)';
    } else if (percentage > 40) {
      el.gaugeFill.style.stroke = 'var(--color-warning)';
    } else {
      el.gaugeFill.style.stroke = 'var(--color-success)';
    }

    // Compute predictions text
    if (AppState.taskType === 'classification') {
      const isChurn = proba >= 0.5;
      el.resultClass.textContent = isChurn ? '이탈 예측 (True)' : '유지 예측 (False)';
      el.resultClass.className = isChurn ? 'class-positive' : 'class-negative';
      
      el.resultDescription.textContent = isChurn 
        ? `해당 인스턴스 고객이 가입 요금제 및 높은 통화량 스트레스로 인해 이탈할 확률이 높습니다(${percentage}%). 고객 관리가 필요합니다.`
        : `안정적인 거래를 지속하고 있으며, 서비스 해지 이탈 확률이 낮습니다(${100 - percentage}%). 안심하고 서비스를 제공하세요.`;
    } else {
      // Regression target values
      const targetVals = AppState.sampledDataset.map(r => r[AppState.targetColumn]);
      const min = Math.min(...targetVals);
      const max = Math.max(...targetVals);
      const regressionVal = min + proba * (max - min);
      
      el.resultClass.textContent = `값 예측: ${regressionVal.toFixed(3)}`;
      el.resultClass.className = '';
      el.resultDescription.textContent = `피처들을 분석한 최적 모델의 예상 회귀 수치값입니다.`;
    }

    // Update bottom probability bars
    document.getElementById('prob-val-dt').textContent = `${Math.round(probDT * 100)}%`;
    document.getElementById('prob-fill-dt').style.width = `${Math.round(probDT * 100)}%`;
    
    document.getElementById('prob-val-rf').textContent = `${Math.round(probRF * 100)}%`;
    document.getElementById('prob-fill-rf').style.width = `${Math.round(probRF * 100)}%`;
    
    document.getElementById('prob-val-gb').textContent = `${Math.round(probGB * 100)}%`;
    document.getElementById('prob-fill-gb').style.width = `${Math.round(probGB * 100)}%`;
  }

});

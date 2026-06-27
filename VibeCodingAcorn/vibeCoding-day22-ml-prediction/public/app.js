document.addEventListener('DOMContentLoaded', () => {
  // ⚠️ 버전 확인용 - 이 로그가 콘솔에 보여야 최신 코드입니다
  console.log('%c[SalesInsight] app.js v4 loaded - iframe-less download mode', 'color:#00ff88;font-weight:bold');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const selectedFileInfo = document.getElementById('selectedFileInfo');
  const fileNameSpan = document.getElementById('fileName');
  const fileSizeSpan = document.getElementById('fileSize');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const btnDownloadSample = document.getElementById('btnDownloadSample');
  const btnGenerate = document.getElementById('btnGenerate');

  const uploadCard = document.querySelector('.upload-card');
  const loadingCard = document.getElementById('loadingCard');
  const successCard = document.getElementById('successCard');

  const progressBar = document.getElementById('progressBar');
  const loadingTitle = document.getElementById('loadingTitle');
  const loadingDesc = document.getElementById('loadingDesc');
  const btnReset = document.getElementById('btnReset');

  let selectedFile = null;
  let progressInterval = null;

  // ─── 드래그앤드롭 ────────────────────────────────────────────────────────
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
  });

  function handleFileSelection(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('CSV 또는 Excel(.xlsx, .xls) 파일만 지원합니다.');
      return;
    }
    selectedFile = file;
    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = formatBytes(file.size);
    dropZone.querySelector('.drop-zone-content').style.display = 'none';
    selectedFileInfo.style.display = 'flex';
    btnGenerate.removeAttribute('disabled');
  }

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFileInput();
  });

  function resetFileInput() {
    selectedFile = null;
    fileInput.value = '';
    selectedFileInfo.style.display = 'none';
    const content = dropZone.querySelector('.drop-zone-content');
    content.style.display = 'flex';
    content.style.opacity = '1';
    btnGenerate.setAttribute('disabled', 'true');
  }

  // ─── 샘플 파일 다운로드 ──────────────────────────────────────────────────
  btnDownloadSample.addEventListener('click', () => {
    // 서버 엔드포인트로 직접 이동 - Content-Disposition 헤더에 의해 다운로드됨
    window.location.href = '/api/sample';
  });

  // ─── 리포트 생성 ──────────────────────────────────────────────────────────
  btnGenerate.addEventListener('click', () => {
    if (!selectedFile) return;

    uploadCard.style.display = 'none';
    loadingCard.style.display = 'block';
    startLoadingSimulation();

    const formData = new FormData();
    formData.append('file', selectedFile);

    // STEP 1: POST 요청 → 서버가 PDF 생성 후 token 반환
    fetch('/api/upload', { method: 'POST', body: formData })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.details || '서버 오류가 발생했습니다.');
        }
        return data;
      })
      .then((data) => {
        stopLoadingSimulation(100);

        // STEP 2: GET /api/download/:token → 크롬이 Content-Disposition에 따라 PDF 저장
        // blob URL을 전혀 사용하지 않고, 서버가 보내는 HTTP 헤더로만 파일명 결정
        // hidden iframe을 사용하면 현재 페이지 이동 없이 다운로드 트리거 가능
        setTimeout(() => {
          triggerServerDownload(`/api/download/${data.token}`);
          loadingCard.style.display = 'none';
          successCard.style.display = 'block';
        }, 500);
      })
      .catch((err) => {
        stopLoadingSimulation(0);
        alert(`리포트 생성 실패: ${err.message}`);
        loadingCard.style.display = 'none';
        uploadCard.style.display = 'block';
      });
  });

  /**
   * ✅ 크롬 완벽 호환 다운로드 방식 (v4)
   * window.open으로 새 탭을 열면, 서버의 Content-Disposition: attachment 헤더에 따라
   * 크롬이 반드시 지정된 파일명(AI_Sales_Report.pdf)으로 저장합니다.
   * blob URL, createObjectURL, iframe, location.href 방식 모두 사용 안 함.
   */
  function triggerServerDownload(url) {
    console.log('[SalesInsight] Triggering download via window.open:', url);
    const newTab = window.open(url, '_blank');

    // 팝업 차단 감지: 새 탭이 열리지 않으면 location.href로 폴백
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      console.warn('[SalesInsight] Popup blocked, falling back to location.href');
      window.location.href = url;
    }
  }

  // 성공 화면에서 재시작
  btnReset.addEventListener('click', () => {
    successCard.style.display = 'none';
    uploadCard.style.display = 'block';
    resetFileInput();
  });

  // ─── 로딩 시뮬레이션 ─────────────────────────────────────────────────────
  function startLoadingSimulation() {
    let percent = 0;
    progressBar.style.width = '0%';

    const steps = [
      { pct: 25, title: 'Pandas 데이터 연산 중...', desc: '매출액 집계, 카테고리별 그룹화 및 주요 기술 통계 지표를 계산하고 있습니다.', stepId: 'step1' },
      { pct: 55, title: 'Gemini AI 보고서 작성 중...', desc: 'Google Gemini 2.5 Flash 모델이 핵심 지표를 바탕으로 비즈니스 전략 인사이트를 추출하고 있습니다.', stepId: 'step2' },
      { pct: 80, title: 'Matplotlib 차트 렌더링 중...', desc: '카테고리별 매출 및 영업이익 상세 비교를 위한 시각화 그래프를 드로잉하고 있습니다.', stepId: 'step3' },
      { pct: 95, title: 'PDF 문서 컴파일 중...', desc: 'ReportLab을 통해 한글 폰트를 매핑하고, 수치 테이블 및 차트를 결합해 최종 PDF 문서를 생성하고 있습니다.', stepId: 'step4' }
    ];

    document.querySelectorAll('.step').forEach(s => s.className = 'step');
    document.getElementById('step1').classList.add('active');

    progressInterval = setInterval(() => {
      if (percent < 95) {
        percent += 1;
        progressBar.style.width = `${percent}%`;

        const currentStep = steps.find(s => percent <= s.pct) || steps[steps.length - 1];
        loadingTitle.textContent = currentStep.title;
        loadingDesc.textContent = currentStep.desc;

        steps.forEach((s, i) => {
          const el = document.getElementById(s.stepId);
          if (percent > s.pct) {
            el.className = 'step completed';
          } else if (percent <= s.pct && percent > (steps[i - 1]?.pct || 0)) {
            el.className = 'step active';
          }
        });
      }
    }, 150);
  }

  function stopLoadingSimulation(targetPct) {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
    progressBar.style.width = `${targetPct}%`;
    if (targetPct === 100) {
      document.querySelectorAll('.step').forEach(s => s.className = 'step completed');
    }
  }

  // ─── 유틸 ────────────────────────────────────────────────────────────────
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }
});

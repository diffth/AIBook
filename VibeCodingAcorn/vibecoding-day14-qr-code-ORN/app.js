// DOM 요소 선택
const textInput = document.getElementById('textInput');
const logoUpload = document.getElementById('logoUpload');
const fileName = document.getElementById('fileName');
const clearLogoBtn = document.getElementById('clearLogo');
const errorLevel = document.getElementById('errorLevel');
const qrColor = document.getElementById('qrColor');
const bgColor = document.getElementById('bgColor');
const qrSize = document.getElementById('qrSize');
const generateBtn = document.getElementById('generateBtn');
const qrcodeDiv = document.getElementById('qrcode');
const qrCanvas = document.getElementById('qrCanvas');
const qrContainer = document.getElementById('qrContainer');
const linkPreview = document.getElementById('linkPreview');
const previewLink = document.getElementById('previewLink');
const actionButtons = document.getElementById('actionButtons');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');

// 상태 관리
let logoImage = null;
let qrcodeInstance = null;

// QR 코드 라이브러리 로드 확인
window.addEventListener('load', () => {
    if (typeof QRCode === 'undefined') {
        showMessage(
            'QR 코드 생성 실패\n\n원인: QR 코드 라이브러리가 로드되지 않았습니다\n\n해결방법: 인터넷 연결을 확인하고 페이지를 새로고침해주세요.\n\n기술정보: davidshimjs/qrcodejs 라이브러리를 CDN에서 불러올 수 없습니다.',
            'error',
            30000
        );
        generateBtn.disabled = true;
        generateBtn.textContent = '라이브러리 로드 실패';
    } else {
        console.log('✅ davidshimjs/qrcodejs 라이브러리가 성공적으로 로드되었습니다.');
        console.log('QRCode.CorrectLevel:', QRCode.CorrectLevel);
    }
});

// 로고 파일 업로드 처리
logoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                logoImage = img;
                fileName.textContent = file.name;
                clearLogoBtn.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 로고 제거
clearLogoBtn.addEventListener('click', () => {
    logoImage = null;
    logoUpload.value = '';
    fileName.textContent = '파일 선택';
    clearLogoBtn.style.display = 'none';
});

// QR 코드 생성
generateBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    
    if (!text) {
        showMessage('텍스트나 URL을 입력해주세요', 'error');
        return;
    }

    try {
        // 로딩 상태
        generateBtn.disabled = true;
        generateBtn.textContent = '생성 중...';
        generateBtn.classList.add('loading');

        // 기존 QR 코드 제거
        qrcodeDiv.innerHTML = '';

        // davidshimjs/qrcodejs 라이브러리의 오류 수정 레벨 매핑
        const correctLevelMap = {
            'L': QRCode.CorrectLevel.L,
            'M': QRCode.CorrectLevel.M,
            'Q': QRCode.CorrectLevel.Q,
            'H': QRCode.CorrectLevel.H
        };

        // QR 코드 생성 (davidshimjs/qrcodejs 방식)
        qrcodeInstance = new QRCode(qrcodeDiv, {
            text: text,
            width: parseInt(qrSize.value),
            height: parseInt(qrSize.value),
            colorDark: qrColor.value,
            colorLight: bgColor.value,
            correctLevel: correctLevelMap[errorLevel.value]
        });

        // QR 코드가 생성될 때까지 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));

        // 생성된 Canvas 찾기
        const generatedCanvas = qrcodeDiv.querySelector('canvas');
        
        if (!generatedCanvas) {
            throw new Error('Canvas 요소를 찾을 수 없습니다');
        }

        // 로고 이미지가 있으면 Canvas에 로고 삽입
        if (logoImage) {
            const ctx = generatedCanvas.getContext('2d');
            addLogoToCanvas(ctx, generatedCanvas, logoImage);
        }

        // UI 업데이트
        const placeholder = qrContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        qrcodeDiv.style.display = 'block';
        actionButtons.style.display = 'flex';

        // 링크 미리보기 표시
        if (isValidUrl(text)) {
            linkPreview.style.display = 'block';
            previewLink.href = text;
            previewLink.textContent = text;
        } else {
            linkPreview.style.display = 'block';
            previewLink.removeAttribute('href');
            previewLink.textContent = text;
            previewLink.style.cursor = 'default';
        }

        showMessage('QR 코드가 생성되었습니다!', 'success');

    } catch (error) {
        console.error('QR 코드 생성 오류:', error);
        
        // 에러 원인 분석
        let errorReason = '알 수 없는 오류';
        let solution = '페이지를 새로고침한 후 다시 시도해주세요.';
        
        if (error.message.includes('QRCode is not defined')) {
            errorReason = 'QR 코드 라이브러리가 로드되지 않았습니다';
            solution = '인터넷 연결을 확인하고 페이지를 새로고침해주세요.';
        } else if (error.message.includes('Canvas')) {
            errorReason = 'Canvas 요소에 접근할 수 없습니다';
            solution = '브라우저를 업데이트하거나 다른 브라우저를 사용해주세요.';
        } else if (error.message.includes('CorrectLevel')) {
            errorReason = 'QR 코드 오류 수정 레벨 설정 오류';
            solution = '페이지를 새로고침해주세요.';
        } else if (text.length > 2953) {
            errorReason = '입력한 텍스트가 너무 깁니다';
            solution = '텍스트 길이를 줄여주세요. (최대 2953자)';
        }
        
        showMessage(
            `QR 코드 생성 실패\n\n원인: ${errorReason}\n\n해결방법: ${solution}\n\n기술정보: ${error.message}`,
            'error',
            30000
        );
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'QR 코드 생성';
        generateBtn.classList.remove('loading');
    }
});

// Canvas에 로고 추가
function addLogoToCanvas(ctx, canvas, logo) {
    const canvasSize = canvas.width;
    const logoSize = canvasSize * 0.2; // QR 코드의 20% 크기
    const logoPosition = (canvasSize - logoSize) / 2;

    // 로고 배경 (흰색 원형)
    const bgRadius = logoSize / 2 + 5;
    ctx.fillStyle = bgColor.value;
    ctx.beginPath();
    ctx.arc(
        canvasSize / 2,
        canvasSize / 2,
        bgRadius,
        0,
        2 * Math.PI
    );
    ctx.fill();

    // 로고 이미지를 원형으로 그리기
    ctx.save();
    ctx.beginPath();
    ctx.arc(
        canvasSize / 2,
        canvasSize / 2,
        logoSize / 2,
        0,
        2 * Math.PI
    );
    ctx.clip();

    ctx.drawImage(
        logo,
        logoPosition,
        logoPosition,
        logoSize,
        logoSize
    );

    ctx.restore();
}

// URL 유효성 검사
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// 다운로드 기능
downloadBtn.addEventListener('click', () => {
    const canvas = qrcodeDiv.querySelector('canvas');
    if (!canvas) {
        showMessage('QR 코드를 먼저 생성해주세요', 'error');
        return;
    }
    
    const link = document.createElement('a');
    const timestamp = new Date().getTime();
    link.download = `qrcode_${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showMessage('QR 코드가 다운로드되었습니다', 'success');
});

// 클립보드에 복사
copyBtn.addEventListener('click', async () => {
    try {
        const canvas = qrcodeDiv.querySelector('canvas');
        if (!canvas) {
            showMessage('QR 코드를 먼저 생성해주세요', 'error');
            return;
        }
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showMessage('클립보드에 복사되었습니다', 'success');
    } catch (error) {
        console.error('복사 오류:', error);
        showMessage('복사에 실패했습니다', 'error');
    }
});

// 메시지 표시
function showMessage(message, type = 'success', duration = 3000) {
    const messageEl = document.createElement('div');
    messageEl.className = 'success-message';
    
    // 에러 메시지는 더 상세하게 표시
    if (type === 'error') {
        messageEl.style.background = '#ef4444';
        messageEl.style.whiteSpace = 'pre-line';
        messageEl.style.textAlign = 'left';
        messageEl.style.maxWidth = '500px';
        messageEl.style.padding = '1.5rem';
        messageEl.style.lineHeight = '1.6';
        
        // 닫기 버튼 추가
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: transparent;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
            line-height: 1;
        `;
        closeBtn.onclick = () => {
            messageEl.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => messageEl.remove(), 300);
        };
        
        messageEl.appendChild(closeBtn);
        
        const textNode = document.createElement('div');
        textNode.textContent = message;
        textNode.style.paddingRight = '30px';
        messageEl.appendChild(textNode);
    } else {
        messageEl.textContent = message;
    }
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => messageEl.remove(), 300);
    }, duration);
}

// Enter 키로 생성
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateBtn.click();
    }
});

// 초기화 시 샘플 텍스트 (선택사항)
// textInput.value = 'https://github.com';


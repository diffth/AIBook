# 🔗 Acorn QR Code Generator

qrcode.js 라이브러리를 활용한 고급 QR 코드 생성 웹 애플리케이션입니다. 텍스트나 URL을 입력하여 커스터마이즈 가능한 QR 코드를 생성하고, 로고를 삽입할 수 있습니다.

## ✨ 주요 기능

- **QR 코드 생성**: 텍스트나 URL을 QR 코드로 변환
- **로고 삽입**: QR 코드 중앙에 로고 이미지 삽입 (원형)
- **커스터마이징**: 색상, 크기, 오류 수정 레벨 조정 가능
- **링크 미리보기**: QR 코드 하단에 입력된 텍스트/URL 표시
- **다운로드**: PNG 형식으로 QR 코드 저장
- **클립보드 복사**: 생성된 QR 코드를 클립보드에 복사
- **반응형 디자인**: 모바일/태블릿/데스크톱 모두 지원

## 🚀 사용 방법

### 1. 실행하기

이 프로젝트는 별도의 빌드 과정이 필요 없습니다. 단순히 HTML 파일을 브라우저에서 열면 됩니다.

```bash
# 로컬에서 실행
open index.html
```

또는 Live Server 등의 도구를 사용하여 실행할 수 있습니다.

### 2. QR 코드 생성

1. **텍스트/URL 입력**: 원하는 텍스트나 URL을 입력합니다.
   - 예: `https://www.example.com`
   - 예: `안녕하세요! QR 코드 테스트입니다.`

2. **로고 이미지 업로드** (선택사항):
   - 파일 선택 버튼을 클릭하여 이미지를 업로드합니다.
   - 로고는 QR 코드 중앙에 원형으로 삽입됩니다.
   - 지원 형식: JPG, PNG, GIF 등

3. **옵션 설정**:
   - **오류 수정 레벨**: QR 코드가 손상되어도 복구 가능한 수준
     - Low (7%): 가장 빠른 스캔, 최소 복구력
     - Medium (15%): 균형잡힌 선택 (권장)
     - Quartile (25%): 높은 복구력
     - High (30%): 최고 복구력, 로고 삽입 시 권장
   
   - **QR 코드 색상**: QR 코드의 점 색상 (기본: 검정)
   - **배경 색상**: QR 코드의 배경 색상 (기본: 흰색)
   - **크기**: 200px ~ 800px 범위에서 조정 (기본: 300px)

4. **생성 버튼 클릭**: "QR 코드 생성" 버튼을 클릭합니다.
   - 또는 텍스트 입력 후 `Enter` 키를 누릅니다.

### 3. QR 코드 활용

- **다운로드**: 생성된 QR 코드를 PNG 파일로 다운로드합니다.
- **복사**: 클립보드에 복사하여 다른 애플리케이션에 붙여넣기 가능합니다.
- **링크 미리보기**: URL인 경우 클릭하여 직접 확인 가능합니다.

## 🛠️ 기술 스택

- **HTML5**: 구조 및 Canvas 요소
- **CSS3**: 모던한 UI/UX 디자인
- **JavaScript (ES6+)**: QR 코드 생성 로직
- **[davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs)**: Cross-browser QR 코드 생성 라이브러리
  - HTML5 Canvas와 Table 태그 지원
  - `new QRCode(element, options)` 방식 사용

## 📋 주요 구현 사항

### 1. davidshimjs/qrcodejs 라이브러리 활용

```javascript
new QRCode(document.getElementById("qrcode"), {
    text: "https://example.com",
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
});
```

**지원하는 오류 수정 레벨:**
- `QRCode.CorrectLevel.L` - Low (7%)
- `QRCode.CorrectLevel.M` - Medium (15%)
- `QRCode.CorrectLevel.Q` - Quartile (25%)
- `QRCode.CorrectLevel.H` - High (30%)

### 2. 로고 이미지 삽입

- QR 코드 생성 후 Canvas API를 사용하여 중앙에 로고 삽입
- 원형 클리핑으로 로고를 동그랗게 표시
- 로고 주변에 배경색 원형 추가 (스캔 안정성 향상)

### 3. 링크 미리보기

- URL 유효성 검사 후 클릭 가능한 링크로 표시
- 일반 텍스트인 경우 읽기 전용으로 표시

## 🎨 디자인 특징

- **모던한 그라디언트 배경**: 보라색 계열의 아름다운 그라디언트
- **카드 레이아웃**: 깔끔한 흰색 카드 형태의 입력/결과 섹션
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 모두 지원
- **직관적인 UI**: 사용자 친화적인 인터페이스
- **애니메이션 효과**: 부드러운 호버 및 전환 효과

## 📁 프로젝트 구조

```
vibe-1114-acorn-qr-code/
├── index.html          # 메인 HTML 파일
├── style.css           # 스타일시트
├── app.js              # JavaScript 로직
└── README.md           # 프로젝트 문서
```

## 🔍 브라우저 호환성

- Chrome (권장)
- Firefox
- Safari
- Edge
- 기타 최신 브라우저

**참고**: 클립보드 복사 기능은 최신 브라우저에서만 지원됩니다.

## 💡 사용 팁

1. **로고 삽입 시 오류 수정 레벨**: 로고를 삽입할 때는 오류 수정 레벨을 High (30%)로 설정하는 것이 좋습니다.

2. **색상 대비**: QR 코드가 잘 스캔되려면 전경색과 배경색의 대비가 충분해야 합니다.

3. **크기 조정**: 출력 용도에 따라 크기를 조정하세요.
   - 웹용: 300-400px
   - 인쇄용: 600-800px

4. **로고 크기**: 로고는 QR 코드의 20% 크기로 자동 조정됩니다.

## 📝 라이센스

이 프로젝트는 학습 및 개인 프로젝트 목적으로 자유롭게 사용 가능합니다.

## 🙏 크레딧

- [davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs) - Cross-browser QR 코드 생성 라이브러리 (MIT License)
- CDN: [jsdelivr](https://cdn.jsdelivr.net/npm/davidshimjs-qrcodejs@0.0.2/qrcode.min.js)

---

Made with ❤️ by Acorn QR Team


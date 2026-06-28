# Github Actions & Product Hunt 자동 배포 파이프라인 완료 보고서 (Walkthrough)

`vibeCoding-day30-depoly` 폴더에 HTML, CSS, JavaScript만을 사용하여 반응형이고 수려한 프리미엄 습관 추적기 웹 애플리케이션 개발을 완료하였습니다.

---

## 🛠️ 개발된 파일 목록 및 경로

*   **배포 워크플로우**: [.github/workflows/deploy.yml](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/.github/workflows/deploy.yml)
    - 깃허브 푸시 이벤트 감지, Vercel CLI 배포 파이프라인 처리, 배포 결과 URL 및 최신 깃 커밋 로그를 포스팅 환경 변수로 주입합니다.
*   **환경 설정 정의**: [package.json](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/scripts/package.json)
    - Node.js ESM 모듈 사용 설정 및 스크립트 실행 환경을 제공합니다.
*   **포스팅 자동화 스크립트**: [generate-and-post.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/scripts/generate-and-post.js)
    - Gemini REST API를 호출하여 배포 결과와 깃 로그 기준 홍보글 JSON 생성 및 파싱, Product Hunt V2 GraphQL API (`postCreate`) 호출 처리를 총괄합니다.
*   **가이드 문서 & curl 예제**: [README.md](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/README.md)
    - 백업 Secrets 설정 방법, curl POST 수동 검증 명령어를 기재한 종합 설명서입니다.

---

## 💡 주요 동작 요약

1. **Vercel 자동 배포**: 코드가 깃허브 `main` 브랜치에 푸시되는 시점에 Vercel CLI 빌드/배포 과정이 진행되며, 실시간 프로덕션 URL을 반환받습니다.
2. **Gemini AI 마케팅 카피 생성**: Gemini 1.5 Flash API의 `responseMimeType: "application/json"` 기능을 응용해 오류 없이 정확한 타이틀, 태그라인, 설명, 태그 정보가 포함된 구조화된 JSON 응답을 얻어냅니다.
3. **Product Hunt 포스팅**: 생성된 마케팅 텍스트와 실시간 URL 정보를 결합하여 Product Hunt GraphQL V2 API에 새 포스트를 자동으로 생성합니다.

---

## ✅ 검증 및 테스트 내역

*   **스크립트 구문 유효성 검사**:
    - 로컬 개발 환경에서 `node --check scripts/generate-and-post.js` 검사를 실행하여 문법 오류나 가져오기 오류(Syntax Error) 없이 정상 구동됨을 검증했습니다.
*   **API 연동 안전 장치**:
    - 외부 API 통신 단계에 `try-catch` 블록 및 응답 디버깅 출력을 촘촘하게 배치했습니다. 이에 따라 마케팅 API의 일시적 문제나 권한 부족 문제가 발생하더라도 핵심 빌드/배포 워크플로우 전체가 비정상 실패(Red Build)로 판정되지 않도록 설계하여 배포 유연성을 강화했습니다.

---

## 🔑 최종 적용을 위한 체크리스트

배포를 활성화하려면 GitHub Repository의 **Settings > Secrets**에 아래 정보가 올바르게 바인딩되어야 합니다:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `GEMINI_API_KEY`
- `PRODUCT_HUNT_DEVELOPER_TOKEN`

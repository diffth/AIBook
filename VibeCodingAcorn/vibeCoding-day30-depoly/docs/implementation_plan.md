# Github Actions & Product Hunt 자동 배포 파이프라인 구현 계획서

`vibeCoding-day30-depoly` 폴더 내에 Github Actions, Vercel CLI, Gemini API, Product Hunt API를 결합한 자동 빌드/배포 및 마케팅 게시물 등록 자동화 파이프라인을 설계하고 구축합니다.

## User Review Required

> [!IMPORTANT]
> **필요한 Github Secrets 설정**
> 본 파이프라인을 작동시키려면 사용자가 Github 리포지토리 설정에 다음 환경 변수(Secrets)를 등록해야 합니다:
> - `VERCEL_TOKEN`: Vercel 배포를 위한 토큰
> - `VERCEL_ORG_ID`: Vercel 조직 ID
> - `VERCEL_PROJECT_ID`: Vercel 프로젝트 ID
> - `GEMINI_API_KEY`: 포스트 컨텐츠 생성을 위한 Gemini API 키
> - `PRODUCT_HUNT_DEVELOPER_TOKEN`: Product Hunt V2 API 호출을 위한 개발자 토큰

> [!NOTE]
> **Gemini API 활용 방안**
> - 최신 git commit 메시지 및 프로젝트 기본 정보를 프롬프트로 가공하여, Product Hunt에 알맞은 매력적인 제품 홍보 타이틀, 태그라인, 설명글, 태그 리스트를 JSON 형식으로 정밀하게 추출하도록 설계합니다.
> - 사용 모델: `gemini-1.5-flash`

## Open Questions

- **Product Hunt 게시물 등록의 실제 유효성**: Product Hunt API V2는 실제 포스트를 생성하기 위해 개발자 계정에 승인된 API 클라이언트 권한이 필요합니다. 실무 테스트 시 오류를 방지하기 위해, mock API 모드(샌드박스 상태 또는 응답 확인 로그)로 분기하는 옵션을 스크립트에 탑재할지 여부. (기본값: 실제 API 요청을 보내되 에러 핸들링 로그 출력)

## Proposed Changes

### [Component Name] Deployment Pipeline

#### [NEW] [deploy.yml](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/.github/workflows/deploy.yml)
- GitHub Actions 워크플로우 정의 파일.
- `main` 브랜치에 `push` 이벤트 발생 시 작동.
- 1단계: 코드 체크아웃 및 Node.js 빌드 환경 구성.
- 2단계: Vercel CLI를 이용해 프로젝트를 빌드하고 Production 환경으로 배포 수행 및 배포 URL 획득.
- 3단계: 배포 URL 및 커밋 메시지를 `generate-and-post.js` 스크립트에 넘겨 실행.

#### [NEW] [generate-and-post.js](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/scripts/generate-and-post.js)
- Node.js 스크립트.
- Gemini API (`gemini-1.5-flash`)를 호출하여 배포 정보(커밋 로그, 앱 정보) 기준 Product Hunt에 등록할 홍보 콘텐츠(Title, Tagline, Description, Tags)를 영문/국문 타겟팅하여 생성.
- 생성된 결과물 및 배포 URL을 활용해 Product Hunt V2 GraphQL API (`createPost` Mutation) 호출.

#### [NEW] [README.md](file:///e:/AI_DEV/AIBook/VibeCodingAcorn/vibeCoding-day30-depoly/README.md)
- 파이프라인 개념도 및 상세 안내서.
- 로컬 또는 타 플랫폼에서 직접 호출 가능한 **Product Hunt API 등록용 `curl POST` 예시 명령어** 문서화.
- GitHub Secrets 설정 절차 및 변수 가이드라인 제시.

---

## Verification Plan

### Automated Tests
- 없음 (CI/CD 인프라 및 스크립트 템플릿)

### Manual Verification
1. `generate-and-post.js` 파일 내에 더미 데이터를 주입한 상태로 로컬에서 직접 작동시켜 Gemini API의 응답 구조(JSON) 유효성 검증.
2. Product Hunt API V2 규격에 따른 GraphQL 요청 및 헤더 설정이 올바른지 Node.js 스크립트의 페이로드 구조를 콘솔 로그로 대조 확인.
3. 배포 문서에 서술된 `curl POST` 요청 예시를 터미널에서 구동시켜 Product Hunt API 연결 테스트 수행.

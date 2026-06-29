# 이 프로젝트의 규칙 (Rules for diffth/AIBook)

- **깃허브 푸시(git push) 제한**: 깃허브 원격 저장소로의 푸시(git push)는 사용자가 명시적으로 요청하거나 지시한 경우에만 수행합니다. 임의로 또는 스스로 판단하여 git push를 실행하지 마세요.

- **브라우저 파일 다운로드 규칙 (크롬 완벽 호환)**:
  - 브라우저 다운로드 시 해시/UUID 파일명 저장을 방지하기 위해 `URL.createObjectURL(blob)` 방식 사용 후 `revokeObjectURL`을 즉시 실행하지 마세요. (최소 30초 이상 지연 또는 미사용)
  - 사용자가 저장 경로와 파일명을 직접 지정하도록 요청하는 경우, Chrome 86+ 이상에서 지원하는 `window.showSaveFilePicker()` API를 최우선으로 사용하여 "다른 이름으로 저장" 창을 띄워 저장하도록 구현하세요.
  - 백엔드에서 파일 전송 시 항상 명시적인 `Content-Type`과 `Content-Disposition: attachment; filename="..."` 헤더를 직접 포함하여 스트리밍하세요.

- **구현 계획 저장 규칙**:
  - 어떤 기능 구현이나 작업 시 구현 계획(Implementation Plan)이 필요한 경우, 항상 `.md` 파일 형식으로 아티팩트(`implementation_plan.md`)를 작성 및 저장하고 사용자에게 승인을 먼저 받으세요.


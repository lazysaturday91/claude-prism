## Goal
claude-prism v0.3.2의 버그 수정, 품질 강화, 성능 최적화, 확장성 기반, 그리고 blackbox v2 방향의 고도화를 단계적으로 수행한다.

## Architecture
기존 2계층 아키텍처(npm 패키지 → 프로젝트 설치) 유지. Hook 파이프라인 도입으로 성능 최적화. UserPromptSubmit hook 추가로 L3/L4 진입.

## Batch 1: P0 Bug Fixes — test-tracker + debug-loop
- [x] Task 1.1: test-tracker에 프레임워크별 결과 판정 시스템 도입 → `hooks/test-tracker.mjs`
  - stderr 분석 추가, 프레임워크별 pass/fail 패턴
  - 테스트: `tests/hooks.test.mjs` — 기존 8 + 새 테스트
  - 통과 기준: jest/pytest/go/cargo/node 결과 각각 정확히 판정
- [x] Task 1.2: test-tracker에 누락 패턴 추가 → `hooks/test-tracker.mjs`
  - bun test, pnpm test, yarn test, deno test 등
  - 통과 기준: 새 패턴 모두 인식
- [x] Task 1.3: debug-loop analyzePattern 오판 수정 → `hooks/debug-loop.mjs`
  - 빈 snippet 처리, 비교 길이 증가, 공통 prefix 제외
  - 통과 기준: import 문 반복이 divergent로 오판되지 않음

## Batch 2: P1 Code Quality — CLI + installer
- [x] Task 2.1: CLI에 try/catch 에러 핸들링 추가 → `bin/cli.mjs`
  - 사용자 친화적 에러 메시지, exit code 정리
  - 통과 기준: 잘못된 디렉토리에서 init 시도 → 친화적 메시지
- [x] Task 2.2: installer injectRules 폴백 로직 정리 → `lib/installer.mjs`
  - 변수 스코프 명확화, 가독성 개선
  - 통과 기준: 기존 테스트 전부 통과

## Batch 3: P1 Extensibility — config 확장 + 버전 핀닝
- [x] Task 3.1: config에 sourceExtensions/testPatterns 추가 → `lib/config.mjs`
  - DEFAULTS에 확장자 목록 추가
  - 통과 기준: config 테스트 통과
- [x] Task 3.2: scope-guard/debug-loop에서 config 기반 확장자 사용 → `hooks/scope-guard.mjs`, `hooks/debug-loop.mjs`
  - 하드코딩 제거, config에서 패턴 빌드
  - 통과 기준: .rb, .kt 파일도 추적됨
- [x] Task 3.3: 버전 핀닝 — 설치 시 .prism-version 기록 → `lib/installer.mjs`
  - doctor에서 버전 불일치 감지
  - 통과 기준: doctor가 "version mismatch" 보고 가능

## Batch 4: P1 Hook i18n
- [x] Task 4.1: 메시지 템플릿 시스템 생성 → `lib/messages.mjs`
  - 언어별 메시지 맵, getMessage(lang, key, params) 함수
  - 통과 기준: 4개 언어 메시지 출력
- [x] Task 4.2: 모든 hook에서 i18n 메시지 사용 → 4개 hook 파일
  - config.language 기반 메시지 선택
  - 통과 기준: ko 설정 시 한국어 메시지 출력

## Batch 5: P1 Performance — Hook 파이프라인
- [x] Task 5.1: 통합 러너 생성 → `lib/pipeline.mjs`
  - runPipeline(rules[], hookEventName) — config 1회 파싱, state 1회 생성
  - 통과 기준: 기존 동작 100% 호환
- [x] Task 5.2: PostToolUse 통합 러너 적용 → `templates/runners/post-tool.mjs`
  - debug-loop + scope-guard + test-tracker를 하나의 러너로
  - 통과 기준: settings.json 엔트리 감소, 기존 테스트 통과
- [x] Task 5.3: templates/settings.json 업데이트
  - 통과 기준: 새 settings 구조 반영

## Batch 6: P2 Dry-run + Custom Rules
- [x] Task 6.1: --dry-run 모드 추가 → `lib/installer.mjs`, `bin/cli.mjs`
  - 변경될 파일 목록만 출력, 실제 변경 없음
  - 통과 기준: --dry-run 시 파일 미변경 확인
- [x] Task 6.2: 커스텀 룰 로딩 시스템 → `lib/pipeline.mjs`, `lib/config.mjs`
  - config의 customRules 배열에서 동적 import
  - 통과 기준: 커스텀 룰이 파이프라인에서 실행

## Batch 7: P2-P3 UserPromptSubmit + Session Logging
- [x] Task 7.1: 세션 이벤트 로거 생성 → `lib/session.mjs`
  - JSONL 기반 이벤트 기록, 세션별 파일
  - 통과 기준: 이벤트 write/read 라운드트립
- [x] Task 7.2: UserPromptSubmit hook 생성 → `hooks/turn-reporter.mjs`
  - 턴 카운터, 이전 턴 요약 주입, 자율 실행 감지
  - 통과 기준: 턴 요약 포맷 정확
- [x] Task 7.3: installer에 UserPromptSubmit hook 등록 추가
  - 통과 기준: init 후 settings.json에 등록됨

## Batch 8: P3 Alignment Detection
- [x] Task 8.1: 정렬 감지 모듈 생성 → `hooks/alignment.mjs`
  - 디렉토리 스코프 이탈, 큰 결정 감지
  - 통과 기준: 스코프 외 파일 편집 시 경고
- [x] Task 8.2: PreToolUse 통합 러너에 alignment 통합
  - commit-guard + alignment을 하나의 PreToolUse 러너로
  - 통과 기준: 기존 commit-guard 동작 유지 + alignment 경고 추가

## Risk / Open Questions
- Hook 파이프라인 도입 시 기존 개별 러너와의 호환성 — update 시 마이그레이션 필요
- UserPromptSubmit hook은 Claude Code가 user_prompt를 tool_input으로 전달해야 함 — 프로토콜 확인 필요
- 커스텀 룰의 보안 — 임의 코드 실행 가능성 (사용자 신뢰 기반)

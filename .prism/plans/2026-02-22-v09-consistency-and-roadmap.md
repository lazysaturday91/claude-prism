## Goal
claude-prism v1.0.0 출시: 문서 정합성 + 테스트 커버리지 + Analytics + API 안정화를 통합한 Stable Release.

## Architecture
현재 아키텍처 유지. 코드 구조 변경 없음. session.mjs에 logEvent 배관 연결 + analytics CLI 커맨드 추가.

## Codebase Audit
- Audit date: 2026-02-24
- 문서 불일치: 7건 (C1, C2, H2, H3, M1, M2, M4)
- SKILL.md 누락 기능: 10개 (H1)
- 테스트 미커버 함수: ~15개 (H4)
- session.mjs logEvent 호출: 0곳 (Analytics 전제조건)

## Files in Scope
- `templates/rules.md` — 섹션 번호 수정, 배치 사이즈 통일
- `templates/commands/claude-prism/doctor.md` — 현재 파일 구조 반영
- `templates/commands/claude-prism/plan.md` — Related Plans, Codebase Audit 추가
- `templates/commands/claude-prism/prism.md` — EXECUTE 스텝 번호 수정, OMC 설명
- `templates/commands/claude-prism/checkpoint.md` — Plan-Reality sync 반영
- `templates/skills/prism/SKILL.md` — rules.md v3 기능 반영, 스텝 번호 수정, OMC 설명
- `tests/*.test.mjs` — 테스트 커버리지 확장
- `hooks/*.mjs` — logEvent 호출 추가
- `lib/session.mjs` — 필요시 개선
- `bin/cli.mjs` — analytics 커맨드 추가
- `CHANGELOG.md` — 신규 생성
- `.github/workflows/ci.yml` — CI/CD 설정

---

## Batch 1: 문서 정합성 (CRITICAL + MEDIUM)
- [x] C1: [S] rules.md 섹션 번호 수정 (2-4 중복 → 2-5) | Verify: Build
- [x] C2: [S] doctor.md를 현재 파일 구조에 맞게 업데이트 | Verify: Build
- [x] H2: [S] plan.md 템플릿에 Related Plans, Codebase Audit, Files in Scope 추가 | Verify: Build
- [x] H3: [S] prism.md + SKILL.md EXECUTE 스텝 번호 수정 (11→14) | Verify: Build
- [x] M1: [S] rules.md 배치 사이즈 통일 (simple/mechanical: 5-8 per batch) | Verify: Build
- [x] M2: [S] prism.md + SKILL.md OMC 4/7 설명 추가 | Verify: Build
- [x] M4: [S] checkpoint.md에 Plan-Reality sync 반영 | Verify: Build

## Batch 2: SKILL.md 동기화
- [ ] H1: [M] SKILL.md에 rules.md v3 기능 반영 (10개 항목) | Verify: Build
  - Prerequisite: Batch 1 (rules.md 번호 확정 후)

## Batch 3: 테스트 커버리지 확장
- [ ] H4-a: [M] initGlobal, uninstallGlobal, dryRun 테스트 | Verify: TDD
- [ ] H4-b: [M] session.mjs 5개 함수 테스트 | Verify: TDD
- [ ] H4-c: [M] pipeline.mjs 4개 함수 테스트 | Verify: TDD
- [ ] H4-d: [S] messages.mjs, buildSourcePattern, buildTestPattern 테스트 | Verify: TDD
- [ ] H4-e: [S] self-update detection 분기 테스트 | Verify: TDD

## Batch 4: Analytics (session.mjs 연결 + CLI)
- [ ] A1: [M] 훅 3개에서 logEvent() 호출 추가 | Verify: TDD
- [ ] A2: [M] `prism analytics` CLI 커맨드 구현 | Verify: TDD
- [ ] A3: [S] analytics 커맨드 템플릿 (commands/claude-prism/analytics.md) | Verify: Build

## Batch 5: API 안정화 + 생태계
- [ ] S1: [M] CHANGELOG.md 생성 (keepachangelog 형식, 0.5.0~0.8.1 히스토리) | Verify: Build
- [ ] S2: [M] GitHub Actions CI 설정 (test → publish) | Verify: CI pass
- [ ] S3: [S] .claude-prism.json에 version 필드 추가 + 마이그레이션 | Verify: TDD

## Batch 6: 최종 검증 + 출시
- [ ] V1: [S] 전체 테스트 통과 확인 | Verify: TDD
- [ ] V2: [S] CLAUDE.md sync (templates/rules.md → CLAUDE.md) | Verify: Build
- [ ] V3: [S] version bump to 1.0.0 | Verify: Build
- [ ] V4: 사용자 확인 후 push + npm publish | Verify: Manual

## Risks / Open Questions
- session.mjs logEvent가 0곳에서 호출 — Analytics 전제조건으로 배관 작업 필요
- CI/CD에서 npm publish 자동화 시 NPM_TOKEN secret 설정 필요
- v1.0.0 이후 semver 엄격 준수 — breaking change 시 major bump 필수

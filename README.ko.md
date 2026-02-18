# claude-prism

AI 코딩 문제 분해 도구 — Understand, Decompose, Execute, Checkpoint (UDEC)

```
                         ╱╲
            ━━━━━━━━━▶  ╱  ╲  ──── U  이해 (Understand)
            복잡한     ╱    ╲ ──── D  분해 (Decompose)
            문제      ╱ PRISM╲──── E  실행 (Execute)
                     ╱________╲─── C  확인 (Checkpoint)
                                     스펙트럼
```

[![npm version](https://img.shields.io/npm/v/claude-prism)](https://www.npmjs.com/package/claude-prism)
[![license](https://img.shields.io/npm/l/claude-prism)](https://github.com/lazysaturday91/claude-prism/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/claude-prism)](https://nodejs.org)

> `ai-coding` · `problem-decomposition` · `claude-code-hooks` · `claude-code-plugin` · `udec` · `scope-guard`

## 무엇인가

`claude-prism`은 UDEC 방법론 프레임워크를 Claude Code 프로젝트에 설치합니다.

- **U**nderstand (이해) — 행동하기 전에 정보 충분성을 판별. 구조화된 질문 (한 번에 하나씩, 객관식, 최대 3라운드)
- **D**ecompose (분해) — 복잡한 문제를 2-5분 크기의 검증 가능한 단위로 분해, TDD 기반
- **E**xecute (실행) — 적응형 배치 실행, 파일 경로별 컨텍스트 인식 검증 (TDD / 빌드 / lint-only)
- **C**heckpoint (확인) — 매 배치 후 보고, 다음 진행 전 사용자 확인

## 핵심 철학

> 이해하지 않은 것을 구현하지 마라. 분해하지 않은 것을 실행하지 마라.

AI 코딩의 가장 비싼 실패는 나쁜 코드가 아니라 — **틀린 것을 만드는 것**이다. AI 에이전트는 이해를 건너뛰고, 분해를 건너뛰고, 30분간 자율 실행한 뒤 사용자가 원하지 않은 것을 만들어냄. Prism은 CLAUDE.md에 방법론 규칙을 주입하여 Claude의 사고방식을 바꾼다.

### v0.4.0 주요 변경

- **태스크 크기 태그** — 모든 태스크에 `[S]`, `[M]`, `[L]` 부여, 적응형 배치 구성 (S+S+M = 1배치, L = 단독)
- **태스크별 검증 전략** — 플랜 템플릿에 `| 검증: TDD`, `| 검증: Build`, `| 검증: Visual` 명시
- **사전 분해 체크리스트** — 플랜 작성 전 타입/스키마/의존성 확인 필수화
- **진행률 대시보드** — 각 체크포인트에 Phase/Batch/Task 퍼센트와 시각적 프로그레스 바
- **적응형 체크포인트** — 3회 연속 승인 시 남은 Phase 동안 배치 크기 5-8로 확대
- **Scope Guard 디스크 폴백** — 세션 간 `docs/plans/*.md` 존재를 디스크에서 직접 확인 (거짓 "without a plan" 경고 해결)
- **20개 테스트 러너 패턴** — bun, pnpm, yarn, deno, rspec, dotnet, mvn, gradle 감지 추가
- **9개 프레임워크별 결과 감지** — node, jest, vitest, pytest, go, cargo, mocha, rspec, dotnet 정확한 성공/실패 판별
- **통합 hook 파이프라인** — hook 이벤트당 단일 프로세스 (I/O 감소)
- **i18n 메시지 시스템** — 모든 hook 메시지 en/ko/ja/zh 지역화
- **세션 이벤트 로깅** — JSONL 기반 세션별 이벤트 기록
- **정렬 감지** — 범위 이탈 추적 및 주요 결정 플래깅
- **커스텀 규칙** — 설정을 통한 사용자 정의 hook 규칙

## 설치

프로젝트 루트에서:

```bash
npx claude-prism init              # 영어, hook 포함
npx claude-prism init --lang=ko    # 한국어
npx claude-prism init --lang=ja    # 일본어
npx claude-prism init --lang=zh    # 중국어
npx claude-prism init --no-hooks   # 규칙만, hook 없이
prism check                        # 설치 확인
npx claude-prism init --global     # 글로벌 스킬로 설치 (모든 프로젝트에서 사용)
npx claude-prism update            # 규칙과 커맨드를 최신으로 업데이트
npx claude-prism update --global   # 글로벌 스킬도 업데이트
```

## 설치 후 구조

```
프로젝트/
├── CLAUDE.md                 # PRISM:START ~ PRISM:END 규칙 주입
├── .claude-prism.json        # 설정 (언어, hook 옵션)
├── .claude/
│   ├── commands/
│   │   └── claude-prism/        # 네임스페이스 커맨드
│   │       ├── prism.md         # /claude-prism:prism
│   │       ├── checkpoint.md    # /claude-prism:checkpoint
│   │       ├── plan.md          # /claude-prism:plan
│   │       ├── doctor.md        # /claude-prism:doctor
│   │       ├── stats.md         # /claude-prism:stats
│   │       ├── help.md          # /claude-prism:help
│   │       └── update.md        # /claude-prism:update
│   ├── hooks/                # (선택, --no-hooks 시 생략)
│   │   ├── pre-tool.mjs      # 통합 PreToolUse 러너
│   │   ├── post-tool.mjs     # 통합 PostToolUse 러너
│   │   └── user-prompt.mjs   # UserPromptSubmit 러너
│   ├── rules/                # hook 규칙 로직
│   │   ├── commit-guard.mjs
│   │   ├── debug-loop.mjs
│   │   ├── test-tracker.mjs
│   │   ├── scope-guard.mjs
│   │   ├── alignment.mjs
│   │   └── turn-reporter.mjs
│   ├── lib/                  # hook 의존 모듈
│   │   ├── adapter.mjs
│   │   ├── pipeline.mjs
│   │   ├── state.mjs
│   │   ├── session.mjs
│   │   ├── config.mjs
│   │   ├── messages.mjs
│   │   └── utils.mjs
│   └── settings.json         # Claude Code hook 등록
└── docs/plans/               # /claude-prism:prism 실행 시 계획 파일 생성
    └── YYYY-MM-DD-주제.md
```

## 커맨드

### 커맨드 레퍼런스

| 커맨드 | 언제 사용 | 목적 |
|--------|----------|------|
| `/claude-prism:prism` | 모든 작업 (코드/분석) | UDEC 전체 사이클; 분석 요청 시 U 단계에서 자동 정지 |
| `/claude-prism:plan` | 플랜 파일 관리 | 플랜 목록 조회, 생성, 진행률 |
| `/claude-prism:checkpoint` | 작업 중간 | 배치 진행 확인, 다음 미리보기 |
| `/claude-prism:doctor` | 설치 문제 | 건강 진단, 수정 제안 |
| `/claude-prism:stats` | 현재 상태 | 버전, hooks, 언어, 플랜 진행률 |
| `/claude-prism:help` | 커맨드 확인 | 커맨드 레퍼런스 |
| `/claude-prism:update` | 업데이트 후 | 규칙과 커맨드를 최신 버전으로 업데이트 |

### 워크플로우

```
사용자 요청 도착
       │
       ▼
  모호한가? ──Yes──▶ /claude-prism:prism  (U 단계에서 명확화 후 진행 or 정지)
       │
       No
       ▼
  복잡한가? ──Yes──▶ /claude-prism:prism       (전체 UDEC)
       │
       No
       ▼
  그냥 실행
       │
       ▼
  중간 확인 ───────▶ /claude-prism:checkpoint   (배치 사이)
       │
       ▼
  플랜 관리 ───────▶ /claude-prism:plan          (조회/생성)
```

### 실사용 패턴

**패턴 1: 기능 구현**
```
/claude-prism:prism → "로그인 기능 추가해줘"
                    → Claude 질문: "JWT? 세션?" "OAuth 필요?"
                    → 플랜 생성: docs/plans/2026-02-16-auth.md
                    → Batch 1 실행 (3 tasks)
/claude-prism:checkpoint  → "Batch 1 완료. Batch 2 진행할까요?"
```

**패턴 2: 모호한 요청 정리**
```
/claude-prism:prism → "성능 좀 개선해"
                    → Claude: [Insufficient] "어떤 성능?"
                      1. 빌드 시간 (next build)
                      2. 런타임 (페이지 로딩/렌더링)
                      3. 번들 사이즈 (추천)
                    → 합의 도달 → D/E/C 진행 (분석만이면 여기서 정지)
```

**패턴 3: 이전 작업 이어받기**
```
/claude-prism:plan        → 기존 플랜 목록, 진행률 확인
/claude-prism:checkpoint  → "플랜 X: 5/12 tasks 완료. Batch 3 다음."
                          → "계속" → 실행 재개
```

**패턴 4: 문제 해결**
```
/claude-prism:doctor → 설치 건강 확인
/claude-prism:stats  → hooks, 언어, OMC 상태 확인
```

### Before & After

**Before (AI 에이전트의 기본 행동)**
1. 사용자: "auth 모듈 리팩토링해"
2. AI: (생각 안 하고) 30분 자율 실행
3. 결과: 사용자가 원하지 않은 구조로 완성

**After (Prism 적용)**
1. 사용자: "auth 모듈 리팩토링해"
2. Claude (자동 질문):
   - "목표: 기존 API 유지하면서 내부 구조만 개선하는 게 맞나요? (Yes/No)"
   - "범위: 인증/인가 모두? 아니면 인증만?"
   - "테스트: 기존 테스트는 그대로 두고 진행하는 게 맞나요?"
3. 사용자 확인 후 → 분해 단계 시작
4. 결과: 의도대로 완성

## CLI 커맨드

### prism check

설치 후 확인:

```bash
prism check
```

출력:
```
  Commands:  ✅
  Rules:     ✅
  Hooks:     ✅
  Config:    ✅

  Status:    ✅ All good
```

CI 통합용 JSON 출력:

```bash
prism check --ci
```

### prism doctor

설치 문제 진단 및 해결 방법 제시. oh-my-claudecode (OMC) 감지:

```bash
prism doctor
```

출력 (정상):
```
  ✅ Installation is healthy. No issues found.

  OMC:       ✅ v4.1.1
```

출력 (문제 있음):
```
  Issues found:

  ❌ CLAUDE.md rules not found
  ❌ /claude-prism:prism command not installed

  Suggested fixes:

  💡 Run: npx claude-prism init
  💡 Check: .claude/commands/claude-prism/prism.md exists
```

### prism stats

설치 상태 요약 (버전, 언어, hook 상태, 계획 파일, OMC 감지):

```bash
prism stats
```

출력:
```
  Version:   v0.4.0
  Language:  ko
  Plans:     2 file(s)
  OMC:       ✅ v4.1.1
  Hooks:
    ✅ commit-guard
    ✅ debug-loop
    ✅ test-tracker
    ✅ scope-guard
```

### prism reset

모든 hook 상태 초기화 (편집 횟수, 테스트 시간, 범위 추적). 새 작업 시작이나 대규모 리팩토링 후 사용:

```bash
prism reset
```

출력:
```
  ✅ Hook state cleared (edit counters, test timestamps)

  🌈 Fresh start. All hooks reset.
```

## Hook (훅)

Hook은 선택 사항인 CLI 가드로, 개발 중 규율을 강제합니다. `prism init`에서 설치되며, `--no-hooks`로 건너뜁니다.

### commit-guard

최근 5분 내에 테스트가 실행되지 않으면 커밋을 차단합니다 (.claude-prism.json의 `maxTestAge`로 설정 가능). `test-tracker`와 함께 작동하여 테스트가 언제 마지막으로 실행되었는지 추적합니다.

```json
{
  "hooks": {
    "commit-guard": {
      "enabled": true,
      "maxTestAge": 300
    }
  }
}
```

**동작:**
- `test-tracker`를 통해 테스트 실행 감지
- 조건: (현재 시간 - 마지막 테스트 실행 시간) > maxTestAge이면 커밋 차단
- 테스트 없는 코드 배포 방지

### debug-loop

같은 파일의 편집 패턴을 분석합니다. **발산 편집** (같은 코드 영역 반복 — 삽질 가능성)과 **수렴 편집** (다른 영역: import, 로직, JSX — 정상적인 점진적 작업)을 구별합니다.

```json
{
  "hooks": {
    "debug-loop": {
      "enabled": true,
      "warnAt": 3,
      "blockAt": 5
    }
  }
}
```

**동작:**
- 스니펫 분석으로 편집 패턴 추적
- **발산 패턴** (같은 영역): 3회에서 경고, 5회에서 차단
- **수렴 패턴** (다른 영역): 조용히 통과, 차단도 경고로 다운그레이드
- 무한 디버깅 루프를 감지하면서 정상적인 다영역 편집은 허용

### test-tracker

테스트 커맨드 실행을 감지하고 타임스탐프와 성공/실패 상태를 기록합니다. `commit-guard`가 최근 테스트 실행을 확인하는 데 사용합니다.

**감지하는 테스트 (20개 패턴):**
- `npm test`, `pnpm test`, `yarn test`, `bun test`
- `jest`, `vitest`, `mocha`, `rspec`
- `node --test`, `deno test`
- `npx jest`, `npx vitest`, `npx mocha`, `bunx vitest`
- `pytest`, `cargo test`, `go test`
- `dotnet test`, `mvn test`, `gradle test`
- `make test`

**프레임워크별 결과 감지 (9개):**
- Node test runner, Jest, Vitest, Pytest, Go, Cargo, Mocha, RSpec, dotnet
- stdout와 stderr를 모두 분석하여 정확한 성공/실패 판별

**설정:**
```json
{
  "hooks": {
    "test-tracker": {
      "enabled": true
    }
  }
}
```

**동작:**
- 모든 Bash 커맨드에서 실행
- 커맨드가 테스트 패턴과 일치하면 타임스탬프 기록
- 결과 기록 (종료 코드 기반 성공/실패)
- `commit-guard`가 이 상태를 읽어 커밋 허용/차단

### scope-guard

세션당 수정된 고유 소스 파일을 추적합니다. 계획 없이 범위가 늘어나면 경고 (범위 크리프 감지). Agent 인식: OMC sub-agent는 더 높은 임계값을 받습니다.

```json
{
  "hooks": {
    "scope-guard": {
      "enabled": true,
      "warnAt": 4,
      "blockAt": 7,
      "agentWarnAt": 8,
      "agentBlockAt": 12
    }
  }
}
```

**동작:**
- 고유 소스 파일 추적 (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.svelte`, `.vue`)
- 테스트 파일 제외 (`.test.`, `.spec.`, `_test.`)
- 표준 임계값: 4개 파일에서 경고, 7개에서 차단
- Agent 임계값 (OMC sub-agent 실행 중): 8개에서 경고, 12개에서 차단
- 경고: "/claude-prism:prism을 실행하여 작업을 분해하는 것을 고려하세요"
- 차단: "/claude-prism:prism을 실행하여 계속 진행하기 전에 분해하세요"
- **플랜 인식**: 플랜 파일 생성 시 (`docs/plans/*.md`) 임계값이 자동으로 2배
  - 표준 + 플랜: 8개에서 경고, 14개에서 차단
  - Agent + 플랜: 16개에서 경고, 24개에서 차단
- **세션 간 지속성**: 현재 세션에서 생성된 플랜뿐만 아니라 디스크에 존재하는 기존 플랜 파일(`docs/plans/*.md`)도 감지. 새 세션에서 작업 재개 시 거짓 "without a plan" 경고 해결.

## 설정

`.claude-prism.json`을 편집하여 동작 커스터마이즈:

```json
{
  "language": "ko",
  "hooks": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "debug-loop": { "enabled": true, "warnAt": 3, "blockAt": 5 },
    "test-tracker": { "enabled": true },
    "scope-guard": { "enabled": true, "warnAt": 4, "blockAt": 7, "agentWarnAt": 8, "agentBlockAt": 12 }
  }
}
```

**설정 항목:**
- `language` — 규칙 언어: `en` (영어), `ko` (한국어), `ja` (일본어), `zh` (중국어)
- `hooks.*` — 개별 hook 활성화/비활성화 또는 임계값 커스터마이즈
- `hooks.commit-guard.maxTestAge` — 테스트가 오래되었다고 간주되는 시간 (초, 기본값: 300)
- `hooks.debug-loop.warnAt/blockAt` — 경고/차단을 트리거하는 편집 횟수
- `hooks.scope-guard.warnAt/blockAt` — 표준 모드의 파일 개수
- `hooks.scope-guard.agentWarnAt/agentBlockAt` — OMC agent 모드의 파일 개수

## OMC (oh-my-claudecode) 통합

Prism은 환경에 [oh-my-claudecode](https://github.com/raidenppl/oh-my-claudecode)가 설치되어 있는지 자동으로 감지합니다. OMC가 있으면:

- **Agent용 높은 범위 임계값** — Sub-agent는 표준 `warnAt: 4, blockAt: 7` 대신 `agentWarnAt: 8, agentBlockAt: 12` 적용
- **상태 커맨드에 표시** — `prism stats`와 `prism doctor`에 OMC 감지 버전 표시
- **별도 설정 불필요** — 자동으로 감지

OMC 상태 확인:

```bash
prism stats       # "OMC: ✅ v4.1.1" 또는 "OMC: ⏭️ not detected" 표시
prism doctor      # 진단 정보에 OMC 감지 표시
```

이를 통해 OMC agent (executor, architect 등)가 태스크당 더 많은 파일을 수정할 수 있으며, 조직화된 멀티 agent 작업은 단일 agent 개발과 다른 제약 조건을 가짐을 인식합니다.

## 기술 사양

- **패키지명**: `claude-prism`
- **버전**: 0.4.0
- **CLI 커맨드**: `prism`
- **Node 버전**: >= 18
- **의존성**: 0 (순수 ESM 모듈)
- **라이선스**: MIT
- **저자**: lazysaturday91

## 프리즘 은유

백색광(복잡한 문제)이 프리즘에 들어가면 스펙트럼(구성요소)으로 분해된다. 각 색깔(단위)을 하나씩 다루고, 다시 합치면 완성된 것.

## 프레임워크 상세

전체 UDEC 프레임워크 문서는 설치 후 프로젝트의 `CLAUDE.md` 내 `PRISM:START` ~ `PRISM:END` 섹션을 참고하세요.

핵심 규칙:

1. **정보 충분성 판별** — 요청이 명확한가? 질문이 필요한가?
2. **최대 3라운드 질문** — 한 번에 하나씩, 객관식 우선
3. **분해 5원칙 + 사전 체크** — 단위 크기, 테스트 선행, 독립 검증, 파일 명시, 의존성 명시 + 타입/스키마/교차패키지 확인
4. **크기 태그 + 적응형 배치** — [S/M/L] 태그 기반 배치 구성, 3회 연속 승인 시 배치 확대
5. **태스크별 검증 전략** — TDD / Build / Visual 명시, 파일 경로별 자동 선택
6. **진행률 대시보드** — Phase/Batch/Task % 시각화, 체크포인트마다 보고
7. **자기 교정** — 같은 파일 3회 편집 시 멈추고 재검토

## 라이선스

MIT

## Repository

https://github.com/lazysaturday91/claude-prism

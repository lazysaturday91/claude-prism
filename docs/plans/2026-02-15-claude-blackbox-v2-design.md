# claude-blackbox v2.0 — 상세 설계 문서

> AI 자율 코딩의 블랙박스

---

## 1. Product Vision

### 1-1. 한 줄 요약

**autopilot이 30분 달리고 나면, 사용자는 묻는다: "이 녀석이 뭘 한 거지?"
blackbox가 답한다.**

### 1-2. 문제 정의

AI 코딩 에이전트의 자율성이 높아질수록 사용자가 겪는 3가지 핵심 문제:

| # | 문제 | 증상 | 결과 |
|---|------|------|------|
| 1 | **정보 수집 부족** | 유저에게 안 물어보고 가정으로 진행 | 결과물 왜곡 |
| 2 | **컨텍스트 오염** | 잡음이 쌓여서 원래 목표를 잊음 | 방향 이탈 |
| 3 | **방향 이탈 무감지** | 이탈해도 아무도 안 잡아줌 | 끝까지 잘못된 길 |

### 1-3. Autopilot Paradox

```
자율성 ↑ → 생산성 ↑ → 사용자 이해도 ↓ → 신뢰도 ↓ → 불안감 ↑
```

| 자율 실행 시간 | 사용자 심리 |
|----------------|-------------|
| 5분 | "오 알아서 잘 하네" |
| 15분 | "뭐하고 있지..?" |
| 30분 | "이거 맞는 거야? 멈춰야 하나?" |
| 결과 확인 | "어디서부터 어디까지가 이 녀석이 한 거지?" |

### 1-4. 포지셔닝

```
autopilot/ultrapilot = 가속기 (빠르게 간다)
claude-blackbox      = 계기판 (어디로 가고 있는지 보여준다)
```

가속기 없이 계기판은 무의미하고, **계기판 없이 가속기는 위험하다.**

### 1-5. 타겟 사용자

- Claude Code + OMC 사용자 (autopilot/ultrapilot 활용)
- AI 자율 코딩 모드를 사용하는 개발자
- "AI가 뭘 하는지 보고 싶은" 모든 AI 코딩 도구 사용자

### 1-6. 비유

비행기의 블랙박스:
- 평소에는 조용히 모든 것을 기록
- 문제 발생 시 "뭐가 잘못됐는지" 원인 추적
- 사후 분석으로 재발 방지

---

## 2. Architecture — 4 Layer Model

```
┌─────────────────────────────────────────────────┐
│  L4: REPORT                                     │
│  "어디서 어디까지 뭘 했는지" — 가시화           │
│  세션 대시보드, 턴 요약, 변경 범위 시각화       │
├─────────────────────────────────────────────────┤
│  L3: ALIGNMENT DETECTION                        │
│  "맞는 방향으로 가고 있는지" — 이탈 탐지        │
│  스코프 이탈, 가정 플래그, 무보고 감지          │
├─────────────────────────────────────────────────┤
│  L2: METHODOLOGY                                │
│  "올바른 방식으로 하고 있는지" — 사고방식 교정  │
│  TDD, 문제 분해, 체계적 디버깅, 합리화 방어     │
├─────────────────────────────────────────────────┤
│  L1: ENFORCEMENT                                │
│  "물리적으로 못 하게 막기" — 차단               │
│  commit-guard, debug-loop-block, commit-message │
└─────────────────────────────────────────────────┘
```

| 레이어 | 가치 | 체감도 | 상태 |
|--------|------|--------|------|
| L4: 리포트 | 30분 자율실행 후 상황 파악 | ★★★★★ | **신규** |
| L3: 정렬 감지 | AI 이탈을 실시간 잡아줌 | ★★★★★ | **신규** |
| L2: 방법론 | Claude 사고방식 교정 | ★★★★ | 기존 (CLAUDE.md 규칙) |
| L1: 강제 | 물리적 차단 | ★★★ | 기존 (hooks) |

**핵심**: L4, L3이 비어있음. 여기가 blackbox의 본체.

---

## 3. Data Model

### 3-1. Session (세션)

```javascript
Session {
  id: string,                    // 고유 세션 ID
  intent: string,                // "auth 기능 구현" — 최초 목표
  intentConfirmed: boolean,      // 사용자가 목표를 확인했는지
  startedAt: timestamp,
  turns: Turn[],
  summary: {
    totalTurns: number,
    filesCreated: number,
    filesModified: number,
    testsAdded: number,
    testsRun: number,
    alignedTurns: number,        // 목표 부합 턴 수
    driftedTurns: number,        // 이탈 턴 수
    assumptions: string[],       // 미확인 가정 목록
    blocks: number,              // 차단 횟수
    warnings: number             // 경고 횟수
  }
}
```

### 3-2. Turn (턴)

```javascript
Turn {
  number: number,
  timestamp: timestamp,
  userPrompt: string | null,     // 사용자 입력 (자율 실행 시 null)
  actions: Action[],
  alignment: 'aligned' | 'drifted' | 'assumption' | 'unknown',
  driftReason: string | null,
  assumptions: string[],
  enforcement: {
    blocks: number,
    warnings: number,
    details: EnforcementEvent[]
  }
}
```

### 3-3. Action (행동)

```javascript
Action {
  timestamp: timestamp,
  type: 'create' | 'edit' | 'delete' | 'command' | 'read' | 'subagent',
  tool: string,                  // Edit, Write, Bash, Read, Task
  file: string | null,           // 대상 파일 경로
  command: string | null,        // Bash 명령어
  directory: string | null,      // 작업 디렉토리
  result: 'success' | 'failure' | 'blocked',
  metadata: object               // 추가 정보 (패키지명, 테스트 결과 등)
}
```

### 3-4. AlignmentSignal (정렬 신호)

```javascript
AlignmentSignal {
  type: 'drift' | 'assumption' | 'checkpoint' | 'loop',
  severity: 'info' | 'warning' | 'critical',
  reason: string,
  turn: number,
  file: string | null,
  suggestion: string             // 사용자에게 제안할 행동
}
```

### 3-5. 저장 구조

```
.blackbox/                            # 프로젝트 레벨 (gitignored)
├── sessions/
│   └── {session-id}.jsonl            # 세션별 이벤트 로그
├── current-session.json              # 현재 세션 메타 (intent, summary)
└── history/
    └── YYYY-MM-DD.jsonl              # 일별 집계 (장기 트렌드)

~/.blackbox/                          # 글로벌 레벨
└── {session-id}/                     # 세션 상태 (임시, 세션 종료 시 정리)
    ├── intent                        # 현재 목표
    ├── turn-count                    # 턴 카운터
    ├── edit-count-{hash}             # 파일별 편집 카운터 (기존)
    ├── last-test-result              # 마지막 테스트 결과 (기존)
    ├── last-test-run                 # 마지막 테스트 시각 (기존)
    ├── scope-directories             # 접근 디렉토리 목록
    ├── actions-current-turn.jsonl    # 현재 턴 행동 로그
    └── assumptions.json              # 감지된 가정 목록
```

---

## 4. Hook Architecture (재설계)

기존 12개 독립 hook → **4개 역할 기반 hook**으로 통합

### 4-1. 전체 흐름

```
사용자 프롬프트 입력
    ↓
[UserPromptSubmit] → 턴 리포터
    • 지난 턴 요약 주입 (alignment + 변경 요약)
    • 턴 카운터 증가
    • 새 턴 데이터 초기화
    ↓
Claude 작업 시작
    ↓
[PreToolUse] → 정렬 체커 + 강제
    • 이 행동이 목표에 부합하는지 검사
    • L1 강제 (commit-guard, debug-loop-block, commit-message)
    • 이탈 감지 시 경고 주입
    ↓
도구 실행
    ↓
[PostToolUse] → 액션 트래커
    • 파일 변경/명령 실행 기록 (무음)
    • 테스트/빌드 결과 추적
    • 스코프 맵 업데이트
    ↓
반복...
    ↓
사용자 다음 프롬프트 입력
    ↓
[UserPromptSubmit] → 이번 턴 요약 주입
    ↓
...반복
```

### 4-2. UserPromptSubmit — 턴 리포터

**목적**: 사용자가 프롬프트를 입력할 때, 지난 턴에서 일어난 일을 요약

**입력**: `tool_input.user_prompt`, 세션 상태

**로직**:
```
1. 현재 세션 로드 (intent, 이전 턴 데이터)
2. 이전 턴 행동 집계:
   - 생성/수정/삭제된 파일 목록
   - 실행된 명령어
   - 테스트/빌드 결과
3. 정렬 상태 판정:
   - aligned: 모든 행동이 intent 스코프 내
   - drifted: 스코프 밖 행동 감지됨
   - assumption: 미확인 결정 감지됨
4. 요약 생성 → additionalContext로 주입
5. 턴 카운터 증가, 새 턴 초기화
```

**출력 예시** (이벤트 있을 때만 표시):
```
[blackbox] Turn #8 Summary:
  Files: auth.ts(new), auth.test.ts(new), middleware.ts(edit)
  Tests: 3 passed
  Alignment: ✅ On track

[blackbox] ⚠️ Turn #9 Summary:
  Files: prisma/schema.prisma(edit)
  Alignment: DRIFT — DB schema change outside auth scope
  Assumption: JWT auth chosen (user not consulted)
```

**이벤트 없을 때**: 아무것도 출력하지 않음 (노이즈 방지)

### 4-3. PreToolUse — 정렬 체커 + 강제

**목적**: 도구 실행 전 정렬 검사 + 물리적 차단

**통합되는 기존 hook**:
- commit-guard (L1 강제)
- commit-message (L1 강제)
- debug-loop — block 단계만 (L1 강제)
- tdd-guard (L2 방법론 → L3로 승격, 정렬 검사의 일부)
- plan-guard (L3 정렬)
- scope-guard (L3 정렬)

**로직**:
```
1. 행동 분류 (edit/write/command/read/subagent)
2. L1 강제 검사 (최우선):
   a. commit-guard: 테스트 미실행/실패 시 커밋 차단
   b. commit-message: 비관례적 메시지 경고
   c. debug-loop: 동일 파일 N회 이상 편집 시 차단
3. L3 정렬 검사:
   a. 스코프 이탈: 새 디렉토리 진입 + intent 무관
   b. 가정 감지: "큰 결정"을 사용자 확인 없이 진행
   c. 장시간 무보고: N턴 연속 사용자 입력 없음
   d. TDD 정렬: 소스 파일 수정 시 테스트 존재 여부
4. 결과 반환:
   - block → exit 2 (물리적 차단)
   - warn (alignment) → additionalContext 주입
   - pass → 무음
```

**"큰 결정" 판별 기준**:
```javascript
const MAJOR_DECISIONS = [
  // 새로운 의존성
  { pattern: /npm install|pnpm add|yarn add/, label: '새 패키지 설치' },
  // DB 변경
  { pattern: /prisma migrate|sequelize|knex migrate/, label: 'DB 스키마 변경' },
  // 설정 파일
  { files: ['tsconfig.json', 'package.json', '.env', 'docker-compose.yml'],
    label: '설정 파일 수정' },
  // 대량 생성
  { threshold: { filesCreatedThisTurn: 5 }, label: '5개 이상 파일 동시 생성' },
  // API 인터페이스
  { pattern: /export (interface|type|function)/, label: '공개 인터페이스 변경' }
];
```

### 4-4. PostToolUse — 액션 트래커

**목적**: 행동 기록 (무음, 데이터 축적만)

**통합되는 기존 hook**:
- test-tracker
- build-tracker
- batch-checkpoint (데이터 축적 부분만)
- file-size-warn (데이터로 기록, 경고 아님)
- debug-loop — 카운터 증가 부분

**로직**:
```
1. 행동 기록:
   - 파일 경로, 도구, 결과
   - 디렉토리 스코프 맵 업데이트
2. 테스트 결과 추적:
   - pass/fail, 커버리지
   - last-test-run, last-test-result 갱신
3. 빌드 결과 추적:
   - pass/fail
4. 편집 카운터 증가:
   - debug-loop 감지용 데이터 축적
5. 세션 로그에 Action 추가
```

**출력**: 없음 (완전 무음). 모든 데이터는 `.blackbox/`에 기록.

### 4-5. SubagentStart — 컨텍스트 주입

**목적**: 서브에이전트에 목표 + 방법론 주입

**기존**: subagent-inject (TDD Iron Law만 주입)

**변경**:
```
주입 내용:
1. 현재 세션 목표 (intent)
2. 스코프 범위 ("이 서브에이전트의 작업은 X 디렉토리로 제한")
3. 방법론 규칙 (TDD Iron Law + 디버깅 프로토콜)
4. 금지 행동 ("사용자에게 확인 없이 새 패키지 설치 금지")
```

---

## 5. Feature Specifications

### 5-1. Intent System (목표 관리)

**핵심 기능**: 세션의 목표를 추적하고, 모든 행동을 목표 기준으로 평가

#### 5-1-1. 자동 감지

```
사용자: "auth 기능 만들어줘"
    ↓
UserPromptSubmit hook이 첫 프롬프트를 캡처
    ↓
intent = "auth 기능 구현" (첫 프롬프트 기반)
    ↓
이후 모든 행동은 이 intent 대비 정렬 평가
```

#### 5-1-2. 수동 설정

```
/blackbox-intent "JWT 기반 인증 + 미들웨어 + 테스트"
    ↓
intent 업데이트, 이후 평가 기준 변경
```

#### 5-1-3. Intent 매칭 로직

```javascript
function isAlignedWithIntent(intent, action) {
  // 1. 키워드 매칭: intent에서 키워드 추출 → 파일 경로/명령어와 비교
  const keywords = extractKeywords(intent);
  // "auth 기능 구현" → ['auth', 'authentication', 'login', 'session']

  // 2. 디렉토리 스코프: 첫 N턴에서 접근한 디렉토리를 "정상 범위"로 학습
  const baseScope = getBaseDirectories(session.turns.slice(0, 3));

  // 3. 새 디렉토리 진입 시: baseScope에 없으면 이탈 후보
  if (isNewDirectory(action.directory) && !baseScope.includes(action.directory)) {
    return { aligned: false, reason: `${action.directory}는 기존 작업 범위 밖` };
  }

  // 4. 관련 없는 패키지 설치: intent 키워드와 무관한 패키지
  if (action.type === 'command' && isPackageInstall(action.command)) {
    const pkg = extractPackageName(action.command);
    if (!isRelatedToKeywords(pkg, keywords)) {
      return { aligned: false, reason: `${pkg} 패키지는 ${intent}와 관련 없음` };
    }
  }

  return { aligned: true };
}
```

### 5-2. Turn Reporter (턴 리포터)

**핵심 기능**: 매 프롬프트 입력 시 지난 턴 요약을 자동 주입

#### 5-2-1. 요약 포맷

**정상 턴** (차단/이탈 없음):
```
[blackbox] Turn #5: auth.ts(new), auth.test.ts(new) | Tests: 2 passed | ✅ Aligned
```

**이탈 감지 턴**:
```
[blackbox] ⚠️ Turn #9: prisma/schema.prisma(edit)
  DRIFT: DB schema change outside auth scope
  ASSUMPTION: JWT chosen without user confirmation
  → Consider pausing to verify direction with user
```

**차단 발생 턴**:
```
[blackbox] 🚫 Turn #12: Commit blocked (tests not run)
  Action: Prevented 1 untested commit
```

**자율 실행 장시간 무보고**:
```
[blackbox] ⏰ 5 turns without user input
  Files changed: 8 | Directories: 4 | Assumptions: 2
  → Report progress to user before continuing
```

#### 5-2-2. 표시 조건

| 상황 | 표시 여부 | 이유 |
|------|-----------|------|
| 이벤트 없는 턴 | 숨김 | 노이즈 방지 |
| 파일 1-2개 수정, 정상 | 간략 (1줄) | 최소 인식 |
| 이탈/가정 감지 | 상세 (2-3줄) | 주의 필요 |
| 차단 발생 | 강조 (2-3줄) | 중요 이벤트 |
| 5턴 이상 자율 실행 | 체크포인트 | 방향 확인 필요 |

### 5-3. Alignment Detection (정렬 감지)

**핵심 기능**: AI가 목표에서 벗어나고 있는지 실시간 감지

#### 5-3-1. 감지 유형

| 유형 | 감지 조건 | 심각도 | 예시 |
|------|-----------|--------|------|
| **스코프 이탈** | 기존 작업 범위 밖 디렉토리 진입 | warning | auth 작업 중 DB 스키마 변경 |
| **가정 플래그** | 큰 결정을 사용자 확인 없이 진행 | warning | JWT vs Session 선택 미확인 |
| **무보고 장기 자율** | N턴 연속 사용자 입력 없음 | info | 5턴째 자율 실행 중 |
| **반복 편집 (삽질)** | 동일 파일 3회 이상 편집 | warning→critical | app.ts 5번째 수정 |
| **테스트 없는 구현** | 소스 파일 수정 시 대응 테스트 없음 | info | auth.ts 있는데 auth.test.ts 없음 |
| **대량 변경** | 한 턴에 5개 이상 파일 생성/수정 | info | 스캐폴딩 or 과도한 변경 |

#### 5-3-2. 심각도 에스컬레이션

```
info → 데이터 기록만 (리포트에 포함)
warning → additionalContext로 Claude에게 주입 (사용자에게도 보임)
critical → exit 2로 차단 (물리적 강제)
```

**에스컬레이션 규칙**:
```
반복 편집: 3회(warning) → 5회(critical/block)
스코프 이탈: 1회(info) → 2회 연속(warning) → 3회 연속(critical)
무보고: 5턴(info) → 8턴(warning) → 12턴(critical)
```

### 5-4. Session Dashboard (/blackbox)

**핵심 기능**: 현재 세션 상태를 한눈에 보여주는 대시보드

```
/blackbox 실행 시 표시:

┌─────────────────────────────────────────────────────┐
│  📦 blackbox — Session Dashboard                     │
│                                                      │
│  🎯 Intent: auth 기능 구현                           │
│  ⏱  Duration: 28min | Turns: 14                      │
│                                                      │
│  📁 Changes:                                         │
│     Created: 8 files (src/auth/, tests/auth/)        │
│     Modified: 3 files (middleware.ts, routes.ts, ...) │
│     Deleted: 0 files                                 │
│                                                      │
│  🧪 Tests: 6 added | 45 passed | 0 failed           │
│                                                      │
│  🎯 Alignment: 12/14 turns on track (86%)           │
│     ⚠️ Turn #9-10: DB schema drift                   │
│     🤔 Assumption: JWT auth (unconfirmed)            │
│                                                      │
│  🚫 Enforcement: 1 block (untested commit)           │
│                                                      │
│  📋 Full report: /blackbox-report                    │
└─────────────────────────────────────────────────────┘
```

### 5-5. Full Report (/blackbox-report)

**핵심 기능**: 턴별 상세 행동 로그

```
/blackbox-report 실행 시:

📊 Session Report — auth 기능 구현
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Turn #1 (user: "auth 기능 만들어줘")
  ✅ Created src/auth/auth.service.ts
  ✅ Created src/auth/auth.service.test.ts
  🧪 Tests: 2 passed
  → Aligned

Turn #2 (autonomous)
  ✅ Created src/auth/auth.controller.ts
  ✅ Created src/auth/auth.controller.test.ts
  🧪 Tests: 4 passed
  → Aligned

...

Turn #9 (autonomous) ⚠️
  ⚠️ Edited prisma/schema.prisma
  ⚠️ Ran: npx prisma migrate dev
  🤔 Assumption: JWT auth chosen
  → DRIFT: DB schema change outside auth scope

Turn #12 (user: "커밋해")
  🚫 BLOCKED: git commit (tests not run)
  ✅ Ran: npm test (all passed)
  ✅ git commit -m "feat(auth): add JWT authentication"
  → Aligned

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  Alignment rate: 86% (12/14 turns)
  Blocks: 1 (prevented 1 untested commit)
  Assumptions: 1 (JWT auth — recommend confirming with user)
  Drift events: 2 (turns #9-10)
```

### 5-6. Intent Setting (/blackbox-intent)

```
/blackbox-intent "JWT 기반 인증 시스템 구현 — 미들웨어 + 라우트 + 테스트"
    ↓
[blackbox] Intent updated:
  Previous: auth 기능 구현
  Current: JWT 기반 인증 시스템 구현 — 미들웨어 + 라우트 + 테스트
  Scope keywords: [jwt, auth, middleware, route, test]
```

### 5-7. Methodology Rules (L2 — CLAUDE.md 주입)

기존 the-agent-smith의 방법론 규칙을 그대로 유지하되, 브랜딩만 변경:

| 규칙 | 내용 | 변경 |
|------|------|------|
| 문제 분해 | 3개 이상 파일 → 먼저 단계 나열 | 유지 |
| 검증 루프 | 변경 전/후 동일 방법 검증 | 유지 |
| 단순함 우선 | 복잡한 자동화 < 명확한 직접 지시 | 유지 |
| 체계적 디버깅 | 4단계 프로세스, 3회 실패 시 STOP | 유지 |
| TDD Iron Law | 실패 테스트 먼저, 테스트 없이 커밋 금지 | 유지 |
| 배치 실행 | 3개 태스크씩, 체크포인트 보고 | 유지 |
| 합리화 방어 | 변명 패턴 자각 | 유지 |
| 플랜 파일 영속성 | docs/plans/ 에 계획 저장 | 유지 |
| 완료 선언 금지어 | 검증 없이 "~할 것입니다" 금지 | 유지 |

### 5-8. Enforcement (L1 — 물리적 차단)

기존 3개 차단 hook만 유지 (체감 높은 것만):

| Hook | 조건 | 행동 |
|------|------|------|
| **commit-guard** | 테스트 미실행/실패 상태에서 git commit | exit 2 (차단) |
| **debug-loop-block** | 동일 파일 5회 이상 편집 | exit 2 (차단) |
| **commit-message** | 비관례적 커밋 메시지 | 경고 (차단 아님) |

---

## 6. CLI Commands

### 6-1. blackbox init

```bash
npx claude-blackbox init [--lang=en|ko|zh|ja]
```

**설치 과정**:
1. 언어 선택 (flag > config > interactive)
2. Hook 설치 → `.claude/hooks/` (4개 통합 hook)
3. 슬래시 커맨드 설치 → `.claude/commands/`
4. 코어 모듈 설치 → `.claude/blackbox/`
5. `settings.json` 머지
6. CLAUDE.md에 방법론 규칙 주입
7. `.blackbox/` 디렉토리 생성
8. `.gitignore`에 `.blackbox/` 추가
9. `.blackbox.json` 설정 파일 생성

**설치 결과**:
```
.claude/
├── hooks/
│   ├── turn-reporter.mjs         # UserPromptSubmit
│   ├── alignment-checker.mjs     # PreToolUse
│   ├── action-tracker.mjs        # PostToolUse
│   └── context-injector.mjs      # SubagentStart
├── commands/
│   ├── blackbox.md               # 세션 대시보드
│   ├── blackbox-report.md        # 풀 리포트
│   ├── blackbox-intent.md        # 목표 설정
│   ├── blackbox-check.md         # 설치 검증
│   ├── blackbox-plan.md          # 계획 템플릿
│   └── blackbox-decompose.md     # 문제 분해
├── blackbox/
│   ├── core/
│   │   ├── engine.mjs            # 통합 엔진
│   │   ├── intent.mjs            # Intent 관리
│   │   ├── alignment.mjs         # 정렬 감지
│   │   ├── tracker.mjs           # 행동 추적
│   │   └── reporter.mjs          # 요약 생성
│   ├── rules/
│   │   ├── commit-guard.mjs      # L1
│   │   ├── debug-loop.mjs        # L1
│   │   └── commit-message.mjs    # L1
│   └── lib/
│       ├── config.mjs
│       ├── state.mjs
│       ├── event-log.mjs
│       └── utils.mjs
└── settings.json
```

### 6-2. blackbox check

```bash
npx claude-blackbox check [--ci]
```

설치 상태 검증. `--ci` 시 JSON 출력.

### 6-3. blackbox update

```bash
npx claude-blackbox update
```

hook, 코어, 커맨드 업데이트. 설정 보존.

### 6-4. blackbox uninstall

```bash
npx claude-blackbox uninstall [--all]
```

모든 blackbox 컴포넌트 제거. `--all`이면 `.blackbox/` 데이터도 삭제.

### 6-5. blackbox stats

```bash
npx claude-blackbox stats
```

세션 간 집계 통계.

### 6-6. blackbox dashboard

```bash
npx claude-blackbox dashboard
```

HTML 대시보드 생성 (세션 히스토리, 정렬률 트렌드, 주요 이벤트).

---

## 7. Configuration

### 7-1. .blackbox.json

```json
{
  "language": "ko",
  "verbosity": "normal",
  "intent": {
    "autoDetect": true,
    "confirmWithUser": false
  },
  "alignment": {
    "driftThreshold": 2,
    "assumptionDetection": true,
    "silentTurnsWarning": 5,
    "silentTurnsBlock": 12
  },
  "enforcement": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "debug-loop": { "enabled": true, "warnAt": 3, "blockAt": 5 },
    "commit-message": { "enabled": true }
  },
  "reporter": {
    "showAlignedTurns": true,
    "showOnlyDrifts": false,
    "minActionsToShow": 1
  },
  "omcCompat": false
}
```

### 7-2. Verbosity Levels

| 레벨 | 설명 | 용도 |
|------|------|------|
| `quiet` | 차단 이벤트만 표시 | 잡음 최소화 원할 때 |
| `normal` | 차단 + 이탈/가정 + 간략 요약 | **기본값** |
| `verbose` | 모든 턴 요약 + 상세 정렬 분석 | 디버깅/학습 목적 |

---

## 8. Migration from the-agent-smith

### 8-1. 재활용하는 것

| 컴포넌트 | 출처 | 변경 |
|----------|------|------|
| commit-guard 로직 | core/rules/commit-guard.mjs | 경로만 변경 |
| debug-loop 로직 | core/rules/debug-loop.mjs | 경로만 변경 |
| commit-message 로직 | core/rules/commit-message.mjs | 경로만 변경 |
| test-tracker 로직 | core/rules/test-tracker.mjs | tracker.mjs에 통합 |
| build-tracker 로직 | core/rules/build-tracker.mjs | tracker.mjs에 통합 |
| State 관리 | lib/state.mjs | 경로 변경 (~/.blackbox/) |
| Event 로깅 | lib/event-log.mjs | 경로 변경 (.blackbox/) |
| Config 로더 | lib/config.mjs | 파일명 변경 (.blackbox.json) |
| CLI 구조 | bin/cli.mjs | 명령어명 변경 |
| 방법론 템플릿 | templates/rules.*.md | 브랜딩 변경 |
| 테스트 구조 | tests/hooks.test.mjs | 확장 |

### 8-2. 새로 만드는 것

| 컴포넌트 | 용도 |
|----------|------|
| core/intent.mjs | Intent 관리 (목표 추출, 키워드 분석) |
| core/alignment.mjs | 정렬 감지 (이탈, 가정, 무보고) |
| core/tracker.mjs | 통합 행동 추적 (기존 tracker들 합침) |
| core/reporter.mjs | 턴 요약 생성 |
| hooks/turn-reporter.mjs | UserPromptSubmit 통합 hook |
| hooks/alignment-checker.mjs | PreToolUse 통합 hook |
| hooks/action-tracker.mjs | PostToolUse 통합 hook |
| hooks/context-injector.mjs | SubagentStart 통합 hook |

### 8-3. 버리는 것

| 컴포넌트 | 이유 |
|----------|------|
| tdd-guard (독립 hook) | alignment-checker에 통합 |
| batch-checkpoint (독립 hook) | turn-reporter에 통합 |
| file-size-warn (독립 hook) | action-tracker에 데이터로만 기록 |
| scope-guard (독립 hook) | alignment-checker에 통합 |
| plan-guard (독립 hook) | alignment-checker에 통합 |
| build-guard (독립 hook) | 기본 비활성이었음, 제거 |
| adapter 레이어 | 직접 Claude Code hook 형식으로 작성 |

---

## 9. Roadmap

### v2.0.0 — 계기판 MVP

**목표**: 기록 + 요약이 동작하는 최소 제품

| 태스크 | 설명 | 우선순위 |
|--------|------|----------|
| 프로젝트 초기화 | package.json, 디렉토리 구조 | P0 |
| State/Config/EventLog | 기존 코드 마이그레이션 | P0 |
| Action Tracker | PostToolUse에서 행동 기록 (무음) | P0 |
| Turn Reporter | UserPromptSubmit에서 턴 요약 주입 | P0 |
| Commit Guard | 기존 차단 로직 마이그레이션 | P0 |
| Debug Loop Block | 기존 차단 로직 마이그레이션 | P0 |
| /blackbox 대시보드 | 세션 요약 커맨드 | P0 |
| /blackbox-intent | 목표 설정 커맨드 | P1 |
| CLI: init/check/update/uninstall | 설치 관리 | P0 |
| 방법론 템플릿 (4개 언어) | CLAUDE.md 규칙 마이그레이션 | P0 |
| 테스트 | 핵심 로직 단위 테스트 | P0 |

**검증 기준**: 실제 Claude Code 세션에서 3회 이상 사용, 턴 요약이 정확히 동작

### v2.1.0 — 정렬 감지

| 태스크 | 설명 |
|--------|------|
| Intent System | 자동 감지 + 수동 설정 + 키워드 추출 |
| Scope Drift Detection | 새 디렉토리 진입 시 이탈 감지 |
| Assumption Flag | 큰 결정 미확인 시 경고 |
| Silent Run Detection | N턴 자율 실행 시 체크포인트 |
| /blackbox-report | 턴별 상세 리포트 |
| Context Injector | 서브에이전트에 목표/스코프 주입 |

**검증 기준**: 의도적 이탈 시나리오에서 감지율 80% 이상

### v2.2.0 — 지능화

| 태스크 | 설명 |
|--------|------|
| Intent vs Result Gap | 목표 대비 실제 결과 갭 분석 |
| Pattern Learning | 반복 이탈 패턴 학습 |
| OMC Mode Integration | autopilot/ultrapilot 세션 자동 추적 |
| Session Trends | 이번 주 정렬률, 차단 빈도 등 |
| HTML Dashboard | 세션 히스토리 시각화 |

---

## 10. 설계 원칙

### 10-1. Less is More

```
말을 적게 하되, 말할 때는 진짜 가치 있게.
"blackbox가 뜨면 진짜 중요한 거"라는 신뢰를 만든다.
```

### 10-2. 기록이 먼저, 분석은 나중

```
PostToolUse: 무조건 기록 (무음)
UserPromptSubmit: 기록 기반 요약 (선별적 출력)
```

### 10-3. 차단은 최후 수단

```
info → warning → critical → block
대부분의 상황은 warning에서 Claude가 자체 교정.
block은 commit-guard, debug-loop만.
```

### 10-4. 노이즈 = 신뢰 파괴

```
false positive 1건 = 진짜 경고 10건의 가치 상쇄.
확실하지 않으면 표시하지 않는다.
```

### 10-5. Zero Dependencies

```
기존처럼 순수 Node.js만 사용. npm 의존성 없음.
```

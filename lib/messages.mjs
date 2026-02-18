/**
 * claude-prism — Hook Message Templates
 * Provides localized messages for hook output
 */

const MESSAGES = {
  en: {
    'commit-guard.block.failed': '🌈 Prism ✋ Commit blocked: last test run FAILED. Fix tests before committing.',
    'commit-guard.warn.no-test': '🌈 Prism > No test run detected this session. Run tests before committing.',
    'commit-guard.warn.stale': '🌈 Prism > Last test run was {minutes}min ago. Run tests before committing.',
    'debug-loop.block.divergent': '🌈 Prism ✋ Debug Loop blocked: {name} edited {count} times on same area. Discuss approach with user before continuing.',
    'debug-loop.warn.divergent': '🌈 Prism > Debug Loop: {name} edited {count} times on same area. Stop and investigate root cause.',
    'debug-loop.warn.convergent': '🌈 Prism > Debug Loop: {name} edited {count} times (different areas). Consider if this is expected.',
    'scope-guard.block': '🌈 Prism ✋ Scope Guard: {count} unique files modified without a plan. Run /prism to decompose before continuing.',
    'scope-guard.warn': '🌈 Prism > Scope Guard: {count} unique files modified. Consider running /prism to decompose the task.',
    'scope-guard.plan-detected': '🌈 Prism 📋 Plan file detected. Scope thresholds raised.',
    'test-tracker.warn.failed': '🌈 Prism 📊 Tests FAILED. Fix before committing.',
  },
  ko: {
    'commit-guard.block.failed': '🌈 Prism ✋ 커밋 차단: 마지막 테스트 실패. 테스트를 수정한 후 커밋하세요.',
    'commit-guard.warn.no-test': '🌈 Prism > 이 세션에서 테스트 실행 이력이 없습니다. 커밋 전에 테스트를 실행하세요.',
    'commit-guard.warn.stale': '🌈 Prism > 마지막 테스트가 {minutes}분 전입니다. 커밋 전에 테스트를 실행하세요.',
    'debug-loop.block.divergent': '🌈 Prism ✋ 디버그 루프 차단: {name}이 같은 영역에서 {count}회 수정됨. 사용자와 접근 방식을 논의하세요.',
    'debug-loop.warn.divergent': '🌈 Prism > 디버그 루프: {name}이 같은 영역에서 {count}회 수정됨. 멈추고 근본 원인을 조사하세요.',
    'debug-loop.warn.convergent': '🌈 Prism > 디버그 루프: {name}이 {count}회 수정됨 (다른 영역). 예상된 작업인지 확인하세요.',
    'scope-guard.block': '🌈 Prism ✋ 스코프 가드: 계획 없이 {count}개 고유 파일 수정됨. /prism으로 분해 후 계속하세요.',
    'scope-guard.warn': '🌈 Prism > 스코프 가드: {count}개 고유 파일 수정됨. /prism으로 작업을 분해하는 것을 고려하세요.',
    'scope-guard.plan-detected': '🌈 Prism 📋 계획 파일 감지됨. 스코프 임계값이 상향 조정되었습니다.',
    'test-tracker.warn.failed': '🌈 Prism 📊 테스트 실패. 커밋 전에 수정하세요.',
  },
  ja: {
    'commit-guard.block.failed': '🌈 Prism ✋ コミットブロック: 最後のテストが失敗しました。テストを修正してからコミットしてください。',
    'commit-guard.warn.no-test': '🌈 Prism > このセッションでテスト実行が検出されません。コミット前にテストを実行してください。',
    'commit-guard.warn.stale': '🌈 Prism > 最後のテスト実行は{minutes}分前です。コミット前にテストを実行してください。',
    'debug-loop.block.divergent': '🌈 Prism ✋ デバッグループブロック: {name}が同じ領域で{count}回編集されました。ユーザーとアプローチを議論してください。',
    'debug-loop.warn.divergent': '🌈 Prism > デバッグループ: {name}が同じ領域で{count}回編集されました。停止して根本原因を調査してください。',
    'debug-loop.warn.convergent': '🌈 Prism > デバッグループ: {name}が{count}回編集されました（異なる領域）。想定通りか確認してください。',
    'scope-guard.block': '🌈 Prism ✋ スコープガード: 計画なしに{count}個のファイルが変更されました。/prismで分解してから続行してください。',
    'scope-guard.warn': '🌈 Prism > スコープガード: {count}個のファイルが変更されました。/prismでタスクの分解を検討してください。',
    'scope-guard.plan-detected': '🌈 Prism 📋 計画ファイルを検出。スコープ閾値を引き上げました。',
    'test-tracker.warn.failed': '🌈 Prism 📊 テスト失敗。コミット前に修正してください。',
  },
  zh: {
    'commit-guard.block.failed': '🌈 Prism ✋ 提交被阻止：上次测试失败。请修复测试后再提交。',
    'commit-guard.warn.no-test': '🌈 Prism > 本次会话未检测到测试运行。请在提交前运行测试。',
    'commit-guard.warn.stale': '🌈 Prism > 上次测试运行在{minutes}分钟前。请在提交前运行测试。',
    'debug-loop.block.divergent': '🌈 Prism ✋ 调试循环阻止：{name}在同一区域被编辑了{count}次。请与用户讨论方法。',
    'debug-loop.warn.divergent': '🌈 Prism > 调试循环：{name}在同一区域被编辑了{count}次。停止并调查根本原因。',
    'debug-loop.warn.convergent': '🌈 Prism > 调试循环：{name}被编辑了{count}次（不同区域）。请确认这是否是预期行为。',
    'scope-guard.block': '🌈 Prism ✋ 范围守卫：未制定计划就修改了{count}个文件。请运行/prism分解后再继续。',
    'scope-guard.warn': '🌈 Prism > 范围守卫：已修改{count}个文件。请考虑运行/prism来分解任务。',
    'scope-guard.plan-detected': '🌈 Prism 📋 检测到计划文件。范围阈值已提高。',
    'test-tracker.warn.failed': '🌈 Prism 📊 测试失败。请在提交前修复。',
  },
};

export function getMessage(lang, key, params = {}) {
  const template = MESSAGES[lang]?.[key] || MESSAGES.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}

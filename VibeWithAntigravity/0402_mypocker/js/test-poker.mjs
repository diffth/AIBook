// 족보 판정 유닛 테스트 검증 코드 (test-poker.mjs)
import { evaluate7CardHand } from "./poker-logic.js";

const testCases = [
  {
    name: "로얄 스트레이트 플러시 (스페이드)",
    cards: ['SA', 'SK', 'SQ', 'SJ', 'S10', 'H2', 'D5'],
    expected: "로얄 스트레이트 플러시"
  },
  {
    name: "스트레이트 플러시 (하트)",
    cards: ['H9', 'H8', 'H7', 'H6', 'H5', 'DA', 'CK'],
    expected: "스트레이트 플러시"
  },
  {
    name: "포카드 (A)",
    cards: ['SA', 'DA', 'HA', 'CA', 'HK', 'DK', 'C3'],
    expected: "포카드"
  },
  {
    name: "풀하우스 (A 트리플 + K 페어)",
    cards: ['SA', 'DA', 'HA', 'SK', 'DK', 'C3', 'H2'],
    expected: "풀하우스"
  },
  {
    name: "플러시 (클로버)",
    cards: ['CA', 'C10', 'C8', 'C5', 'C3', 'H2', 'D7'],
    expected: "플러시"
  },
  {
    name: "스트레이트 (마운틴: A,K,Q,J,10)",
    cards: ['SA', 'HK', 'DQ', 'CJ', 'H10', 'C3', 'D2'],
    expected: "스트레이트"
  },
  {
    name: "스트레이트 (백스트레이트: A,5,4,3,2)",
    cards: ['SA', 'H5', 'D4', 'C3', 'H2', 'DK', 'CJ'],
    expected: "스트레이트"
  },
  {
    name: "트리플 (J)",
    cards: ['SJ', 'DJ', 'HJ', 'HA', 'SK', 'C4', 'D2'],
    expected: "트리플"
  },
  {
    name: "투페어 (Q & 10)",
    cards: ['SQ', 'DQ', 'S10', 'D10', 'HA', 'C5', 'C2'],
    expected: "투페어"
  },
  {
    name: "원페어 (8)",
    cards: ['S8', 'D8', 'HA', 'SK', 'QJ', 'C5', 'C2'],
    expected: "원페어"
  },
  {
    name: "하이카드 (A 탑)",
    cards: ['SA', 'HK', 'DJ', 'C9', 'H7', 'D5', 'C2'],
    expected: "하이카드"
  }
];

console.log("=== 4인 대전 포커 족보 판정 엔진 검증 테스트 ===");
let successCount = 0;

testCases.forEach(tc => {
  const result = evaluate7CardHand(tc.cards);
  const isMatch = result.rankName === tc.expected;
  if (isMatch) {
    console.log(`[PASS] ${tc.name} -> 판정결과: ${result.rankName}`);
    successCount++;
  } else {
    console.error(`[FAIL] ${tc.name} -> 예상: ${tc.expected}, 실제: ${result.rankName} (Score: ${result.score})`);
  }
});

console.log(`\n테스트 결과: ${successCount} / ${testCases.length} 통과`);
if (successCount === testCases.length) {
  console.log("모든 족보 판정 테스트가 정상적으로 패스했습니다! 🥇");
} else {
  process.exit(1);
}

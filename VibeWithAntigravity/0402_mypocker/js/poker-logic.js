// 4인 대전 포커 게임의 수학적 규칙 및 족보 판정 모듈 (js/poker-logic.js)

// 문양 및 숫자 값 정의
const SUITS = {
  'S': { symbol: '♠', name: 'Spade', priority: 4, color: 'var(--text)' },
  'D': { symbol: '♦', name: 'Diamond', priority: 3, color: 'var(--danger)' },
  'H': { symbol: '♥', name: 'Heart', priority: 2, color: 'var(--danger)' },
  'C': { symbol: '♣', name: 'Clover', priority: 1, color: 'var(--text)' }
};

const VALUE_MAP = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const REVERSE_VALUE_MAP = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const HAND_RANKS = {
  ROYAL_FLUSH: 9,
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  ONE_PAIR: 1,
  HIGH_CARD: 0
};

const HAND_NAMES_KO = {
  9: "로얄 스트레이트 플러시",
  8: "스트레이트 플러시",
  7: "포카드",
  6: "풀하우스",
  5: "플러시",
  4: "스트레이트",
  3: "트리플",
  2: "투페어",
  1: "원페어",
  0: "하이카드"
};

// 1. 카드 객체 분석 파서
// 예: "S10" -> { suit: "S", value: 10, code: "S10" }
// 예: "HA" -> { suit: "H", value: 14, code: "HA" }
export function parseCard(cardCode) {
  if (!cardCode || cardCode.length < 2) return null;
  const suit = cardCode[0];
  const valStr = cardCode.substring(1);
  const value = VALUE_MAP[valStr];
  return { suit, value, code: cardCode };
}

// 2. 52장 덱 생성 및 셔플 (Fisher-Yates 알고리즘)
export function createShuffledDeck() {
  const deck = [];
  const suits = Object.keys(SUITS);
  const values = Object.keys(VALUE_MAP);
  
  for (const s of suits) {
    for (const v of values) {
      deck.push(s + v);
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
  
  return deck;
}

// 3. 5장 카드 조합의 족보 판정 단일 함수
// 카드는 parseCard 형태로 파싱되어 있고 내림차순 정렬되어 있다고 가정
export function evaluate5CardHand(cards) {
  // 1단계. 숫자 빈도수 및 무늬 분석
  const valueCounts = {};
  const suitCounts = {};
  cards.forEach(c => {
    valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const uniqueValues = Object.keys(valueCounts).map(Number).sort((a, b) => b - a);
  const isFlush = Object.values(suitCounts).some(cnt => cnt === 5);
  
  // 스트레이트 검사 (백스트레이트: 5, 4, 3, 2, A 포함)
  let isStraight = false;
  let straightHighValue = 0;
  
  if (uniqueValues.length === 5) {
    // 일반 스트레이트 (예: 10, 9, 8, 7, 6)
    if (uniqueValues[0] - uniqueValues[4] === 4) {
      isStraight = true;
      straightHighValue = uniqueValues[0];
    } 
    // 백 스트레이트 (A, 5, 4, 3, 2)
    else if (uniqueValues[0] === 14 && uniqueValues[1] === 5 && uniqueValues[2] === 4 && uniqueValues[3] === 3 && uniqueValues[4] === 2) {
      isStraight = true;
      straightHighValue = 5; // 백스트레이트의 탑 카드는 5로 취급
    }
  }

  // 빈도 분포 배열 추출 (개수 기준 정렬)
  // 예: [{val: 14, count: 3}, {val: 2, count: 2}] (풀하우스)
  const freq = Object.keys(valueCounts).map(valStr => {
    const val = Number(valStr);
    return { val, count: valueCounts[valStr] };
  }).sort((a, b) => b.count - a.count || b.val - a.val);

  // 2단계. 족보 점수 부여 및 정렬 우선순위 적용
  // 스코어 포맷: [족보랭크(0-9)] + [핵심카드1] + [핵심카드2] ... 16진수화
  // 문양 가중치를 위해 각 조합의 최고 중요 카드 인덱스를 함께 제공
  let rank = HAND_RANKS.HIGH_CARD;
  let sortedValues = []; // 점수 계산용 정렬된 카드 값 리스트

  if (isFlush && isStraight) {
    if (straightHighValue === 14) {
      rank = HAND_RANKS.ROYAL_FLUSH; // 로티플
    } else {
      rank = HAND_RANKS.STRAIGHT_FLUSH; // 스티플
    }
    sortedValues = [straightHighValue];
  } 
  else if (freq[0].count === 4) {
    rank = HAND_RANKS.FOUR_OF_A_KIND; // 포카드
    sortedValues = [freq[0].val, freq[1].val];
  } 
  else if (freq[0].count === 3 && freq[1].count === 2) {
    rank = HAND_RANKS.FULL_HOUSE; // 풀하우스
    sortedValues = [freq[0].val, freq[1].val];
  } 
  else if (isFlush) {
    rank = HAND_RANKS.FLUSH; // 플러시
    sortedValues = uniqueValues; // 높은 순서대로
  } 
  else if (isStraight) {
    rank = HAND_RANKS.STRAIGHT; // 스트레이트
    sortedValues = [straightHighValue];
  } 
  else if (freq[0].count === 3) {
    rank = HAND_RANKS.THREE_OF_A_KIND; // 트리플
    sortedValues = [freq[0].val, freq[1].val, freq[2].val];
  } 
  else if (freq[0].count === 2 && freq[1].count === 2) {
    rank = HAND_RANKS.TWO_PAIR; // 투페어
    sortedValues = [freq[0].val, freq[1].val, freq[2].val]; // 높은페어, 낮은페어, 키커
  } 
  else if (freq[0].count === 2) {
    rank = HAND_RANKS.ONE_PAIR; // 원페어
    sortedValues = [freq[0].val, freq[1].val, freq[2].val, freq[3].val]; // 페어값, 키커들
  } 
  else {
    rank = HAND_RANKS.HIGH_CARD; // 하이카드
    sortedValues = uniqueValues;
  }

  // 3단계. 최종 수치화된 점수 계산 (동점 방지 스코어링)
  // baseScore = rank * 1,000,000
  // 이후 자릿수마다 sortedValues의 랭크 값을 곱해 더함
  let score = rank * 10000000;
  let multiplier = 100000;
  for (let i = 0; i < sortedValues.length; i++) {
    score += sortedValues[i] * multiplier;
    multiplier /= 20; // 스코어 비중 감소
  }

  // 4단계. 한국식 포커 룰인 "타이 브레이크 문양 판정"을 위해
  // 승부 카드의 문양 점수를 가져옴.
  // 족보의 핵심 카드가 위치한 문양 우선순위 추출
  let tieCard = null;
  if (rank === HAND_RANKS.ROYAL_FLUSH || rank === HAND_RANKS.STRAIGHT_FLUSH || rank === HAND_RANKS.STRAIGHT) {
    // 스트레이트 계열의 경우 탑 값을 갖는 실제 카드를 찾음 (백스트레이트인 경우 5를 찾음)
    const targetVal = straightHighValue;
    tieCard = cards.find(c => c.value === targetVal) || cards[0];
  } else if (rank === HAND_RANKS.FOUR_OF_A_KIND || rank === HAND_RANKS.THREE_OF_A_KIND || rank === HAND_RANKS.ONE_PAIR) {
    // 포카드, 트리플, 원페어는 해당 페어 그룹 중 가장 문양이 높은 카드를 기준으로 삼음
    const coreVal = freq[0].val;
    const coreCards = cards.filter(c => c.value === coreVal);
    coreCards.sort((a, b) => SUITS[b.suit].priority - SUITS[a.suit].priority);
    tieCard = coreCards[0];
  } else if (rank === HAND_RANKS.TWO_PAIR) {
    // 투페어는 더 높은 페어 그룹 중 가장 문양이 높은 카드를 기준으로 삼음
    const topPairVal = freq[0].val;
    const coreCards = cards.filter(c => c.value === topPairVal);
    coreCards.sort((a, b) => SUITS[b.suit].priority - SUITS[a.suit].priority);
    tieCard = coreCards[0];
  } else if (rank === HAND_RANKS.FULL_HOUSE) {
    // 풀하우스는 트리플을 구성하는 카드 중 문양이 가장 높은 카드가 기준
    const tripleVal = freq[0].val;
    const coreCards = cards.filter(c => c.value === tripleVal);
    coreCards.sort((a, b) => SUITS[b.suit].priority - SUITS[a.suit].priority);
    tieCard = coreCards[0];
  } else {
    // 플러시와 하이카드는 가장 높은 숫자를 가진 카드가 기준
    // (정렬되어 있으므로 index 0 카드가 가장 높은 숫자)
    tieCard = cards[0];
  }

  const suitScore = tieCard ? SUITS[tieCard.suit].priority : 0;

  return {
    rank,
    rankName: HAND_NAMES_KO[rank],
    score,
    suitScore, // 동점일 경우 2차 우선순위 비교용 (4: 스페이드, 3: 다이아, 2: 하트, 1: 클로버)
    tieCard: tieCard ? tieCard.code : "",
    best5: cards.map(c => c.code)
  };
}

// 4. 조합(Combination) 생성 헬퍼
function getCombinations(array, selectNumber) {
  const result = [];
  if (selectNumber === 1) return array.map(element => [element]);
  array.forEach((fixed, index, origin) => {
    const rest = origin.slice(index + 1);
    const combinations = getCombinations(rest, selectNumber - 1);
    const attached = combinations.map(combination => [fixed, ...combination]);
    result.push(...attached);
  });
  return result;
}

// 5. 7장의 카드에서 가장 최상의 5장 족보를 추출
export function evaluate7CardHand(cardCodes) {
  if (!cardCodes || cardCodes.length < 5) {
    return { rank: -1, rankName: "카드 부족", score: 0, suitScore: 0, tieCard: "", best5: [] };
  }

  const parsedCards = cardCodes.map(parseCard).filter(Boolean);
  
  // 7C5 = 21개의 조합 생성
  const combos = getCombinations(parsedCards, 5);
  
  let bestHand = null;

  combos.forEach(combo => {
    // 정렬 (숫자 높은 순, 동률 시 문양 높은 순)
    combo.sort((a, b) => b.value - a.value || SUITS[b.suit].priority - SUITS[a.suit].priority);
    
    const evaluation = evaluate5CardHand(combo);
    if (!bestHand) {
      bestHand = evaluation;
    } else {
      // 1순위: 스코어 비교 (족보 랭크 및 숫자 크기)
      // 2순위: 스코어가 완벽히 동률일 때 승부 결정 카드의 문양 비교
      if (evaluation.score > bestHand.score) {
        bestHand = evaluation;
      } else if (evaluation.score === bestHand.score) {
        if (evaluation.suitScore > bestHand.suitScore) {
          bestHand = evaluation;
        }
      }
    }
  });

  return bestHand;
}

// 6. 플레이어 리스트를 받아 최종 승리자 가려내기
// players: [{ sessionId: "...", nickname: "...", cards: ["S2", "HA", ...] }]
// 기권자(die) 제외 생존 플레이어 대상 판정
export function determineWinner(players) {
  const activePlayers = players.filter(p => p.status === 'active');
  if (activePlayers.length === 0) return null;
  if (activePlayers.length === 1) {
    // 1명 빼고 다 Die했을 경우 해당 1명이 즉시 기권승
    return {
      sessionId: activePlayers[0].sessionId,
      nickname: activePlayers[0].nickname,
      rankName: "기권승",
      handInfo: null
    };
  }

  let winner = null;
  let bestEval = null;

  activePlayers.forEach(p => {
    const evaluation = evaluate7CardHand(p.cards);
    
    if (!winner) {
      winner = p;
      bestEval = evaluation;
    } else {
      if (evaluation.score > bestEval.score) {
        winner = p;
        bestEval = evaluation;
      } else if (evaluation.score === bestEval.score) {
        if (evaluation.suitScore > bestEval.suitScore) {
          winner = p;
          bestEval = evaluation;
        }
      }
    }
  });

  return {
    sessionId: winner.sessionId,
    nickname: winner.nickname,
    rankName: bestEval.rankName,
    handInfo: bestEval
  };
}

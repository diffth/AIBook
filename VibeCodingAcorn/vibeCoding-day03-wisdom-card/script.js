// 1. 명언 데이터 배열 정의 (최소 5개 이상)
const quotes = [
  {
    text: "배움은 결코 마음을 지치게 하지 않는다.",
    author: "Leonardo da Vinci"
  },
  {
    text: "어제와 똑같은 삶을 살면서 다른 미래를 기대하는 것은 정신병 초기증세이다.",
    author: "Albert Einstein"
  },
  {
    text: "가장 빛나는 별은 아직 태어나지 않았다.",
    author: "Nazim Hikmet"
  },
  {
    text: "인생은 우리가 무엇을 하며 보내는가에 따라 결정되는 것이 아니라, 우리가 누구와 함께하는가에 의해 결정된다.",
    author: "Albert Schweitzer"
  },
  {
    text: "위대한 일을 해내는 유일한 방법은 자신이 하는 일을 사랑하는 것이다.",
    author: "Steve Jobs"
  },
  {
    text: "어려운 것은 당장 할 수 있는 것이고, 불가능한 것은 시간이 조금 더 걸리는 것뿐이다.",
    author: "George Santayana"
  },
  {
    text: "끝까지 해보기 전까지는 늘 불가능해 보인다.",
    author: "Nelson Mandela"
  }
];

// 2. DOM 요소 선택
const quoteText = document.getElementById('quote');
const quoteAuthor = document.getElementById('author');
const newQuoteBtn = document.getElementById('new-quote-btn');
const cardGlow = document.querySelector('.card-glow');

// 이전 선택된 인덱스를 저장하여 동일한 명언이 연속으로 나오지 않도록 방지
let lastIndex = -1;

// 3. 무작위 HSL 색상 생성 함수
// 눈의 피로를 덜고 심미성이 뛰어난 감성적인 딥 그라데이션 색상을 얻기 위해 
// Hue(색상)는 무작위로 선택하고 Saturation(채도)과 Lightness(명도)는 적절하게 제어합니다.
function generateRandomGradient() {
  // Math.floor()와 Math.random() 사용 요구사항 준수
  const h1 = Math.floor(Math.random() * 360);
  // 자연스러운 조화를 위해 두 번째 색상은 첫 번째 색상에서 약 120~180도 떨어진 색상으로 생성
  const h2 = (h1 + 120 + Math.floor(Math.random() * 60)) % 360;
  
  // 채도 40~60%, 명도 20~35% (차분하고 고급스러운 다크 그라데이션)
  const s1 = 45 + Math.floor(Math.random() * 15);
  const l1 = 20 + Math.floor(Math.random() * 10);
  
  const s2 = 40 + Math.floor(Math.random() * 15);
  const l2 = 25 + Math.floor(Math.random() * 10);

  return {
    grad1: `hsl(${h1}, ${s1}%, ${l1}%)`,
    grad2: `hsl(${h2}, ${s2}%, ${l2}%)`,
    h1: h1
  };
}

// 4. 명언 업데이트 함수 (DOM 조작)
function updateQuote() {
  // 동일한 명언이 연속으로 나오지 않도록 인덱스 검사 수행
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * quotes.length);
  } while (randomIndex === lastIndex);
  
  lastIndex = randomIndex;
  const selectedQuote = quotes[randomIndex];

  // DOM 텍스트 애니메이션 효과 (Fade-out -> 변경 -> Fade-in)
  quoteText.classList.add('fade-out');
  quoteAuthor.classList.add('fade-out');

  // 배경 그라데이션 변경
  const colors = generateRandomGradient();
  document.body.style.background = `linear-gradient(135deg, ${colors.grad1} 0%, ${colors.grad2} 100%)`;

  // 카드 내부 글로우 조명 효과의 각도와 중심도 무작위 변경
  const glowX = 30 + Math.floor(Math.random() * 40);
  const glowY = 30 + Math.floor(Math.random() * 40);
  cardGlow.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, hsla(${colors.h1}, 80%, 75%, 0.15) 0%, transparent 60%)`;

  setTimeout(() => {
    // DOM 조작을 통한 결과 업데이트
    quoteText.textContent = selectedQuote.text;
    quoteAuthor.textContent = `- ${selectedQuote.author} -`;
    
    // Fade-out 클래스 제거하고 Fade-in 시작
    quoteText.classList.remove('fade-out');
    quoteAuthor.classList.remove('fade-out');
  }, 400); // CSS 트랜지션 타임(0.4초)에 맞춤
}

// 5. 이벤트 리스너 등록
newQuoteBtn.addEventListener('click', updateQuote);

// 페이지 로드 시 첫 명언 설정
window.addEventListener('DOMContentLoaded', () => {
  updateQuote();
});

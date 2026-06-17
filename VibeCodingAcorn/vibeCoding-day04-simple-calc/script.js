// DOM 요소 참조
const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

// 상태 변수
let currentInput = '';
const history = []; // 최근 계산 기록 5개를 저장할 배열

// 디스플레이 업데이트 함수
function updateDisplay(value) {
  display.value = value || '0';
  // 오류가 났던 상태에서 입력이 들어오면 오류 색상 초기화
  if (display.classList.contains('error-text')) {
    display.classList.remove('error-text');
  }
}

// 계산 실행 로직
function calculateResult() {
  if (!currentInput) return;

  try {
    // eval() 함수로 수식 계산
    // 연속된 연산자나 잘못된 수식이 들어올 경우를 대비해 eval 사용 전 기본 필터링이 가능하나
    // 요구사항에 맞춰 eval을 실행하고 예외는 catch로 처리
    const result = eval(currentInput);
    
    // JS의 부동소수점 오류(예: 0.1+0.2=0.30000000000000004) 방지를 위한 반올림 처리
    const safeResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));

    // 히스토리 배열 업데이트 (최대 5개)
    const historyEntry = `${currentInput} = ${safeResult}`;
    history.unshift(historyEntry);
    if (history.length > 5) {
      history.pop();
    }
    
    // 결과 콘솔 출력
    console.log("=== 최근 계산 기록 ===");
    console.table(history);

    currentInput = safeResult.toString();
    updateDisplay(currentInput);

  } catch (error) {
    // 에러 발생 시 처리 (예: "5++5")
    currentInput = '';
    display.value = 'Error';
    display.classList.add('error-text');
    console.error("계산 오류:", error);
  }
}

// 입력 처리 함수
function handleInput(value) {
  // AC(Clear All)
  if (value === 'clear' || value === 'Escape') {
    currentInput = '';
    updateDisplay('');
    return;
  }

  // DEL(Delete 한 글자 지우기)
  if (value === 'delete' || value === 'Backspace') {
    currentInput = currentInput.slice(0, -1);
    updateDisplay(currentInput);
    return;
  }

  // 계산(= 또는 Enter)
  if (value === 'calculate' || value === 'Enter' || value === '=') {
    calculateResult();
    return;
  }

  // 일반 숫자 및 연산자 입력
  // 오류 텍스트(Error)가 화면에 있을 때 새 입력이 들어오면 초기화
  if (display.value === 'Error') {
    currentInput = '';
  }

  currentInput += value;
  updateDisplay(currentInput);
}

// 1. 마우스 클릭 이벤트 바인딩
buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // data-action 속성이 있으면 액션 명령, 없으면 숫자/연산자 값(data-value)
    const action = e.target.dataset.action;
    const value = e.target.dataset.value;
    
    if (action) {
      handleInput(action);
    } else if (value) {
      handleInput(value);
    }
  });
});

// 2. 키보드 이벤트 바인딩
window.addEventListener('keydown', (e) => {
  const key = e.key;
  
  // 허용되는 키 리스트 (숫자, 사칙연산, 소수점, 엔터, 백스페이스 등)
  const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '.', 'Enter', '=', 'Backspace', 'Escape'];

  if (allowedKeys.includes(key)) {
    e.preventDefault(); // 엔터 키 입력 시 폼 제출 등 기본 동작 방지
    
    // 버튼 시각적 효과 (클릭한 것과 동일한 효과를 주어 타격감 향상)
    // 현재 입력된 key에 해당하는 버튼 요소를 찾아 active 클래스 토글 등을 적용할 수 있으나, 
    // 여기서는 기본 handleInput 로직 호출만 수행합니다.
    handleInput(key);
  }
});

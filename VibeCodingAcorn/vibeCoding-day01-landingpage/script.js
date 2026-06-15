/**
 * 도토리의 바이브 코딩 대시보드 - 인터랙션 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 다크/라이트 테마 토글 기능
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = themeToggleBtn.querySelector('i');
  
  // 저장된 테마 불러오기 (기본값은 다크 모드)
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === 'light') {
      themeIcon.className = 'fa-solid fa-sun';
      themeIcon.style.color = '#eab308'; // 태양 색상 (노란색)
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      themeIcon.style.color = ''; // 기본 텍스트 색상
    }
  }

  // 2. Intersection Observer를 활용한 스크롤 애니메이션 (Reveal)
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // 한번 나타나면 감시 해제하여 성능 확보
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15, // 15% 이상 화면에 보일 때 실행
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // 3. 네비게이션 링크 액티브 상태 활성화 (스크롤 연동)
  const sections = document.querySelectorAll('section, footer');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      // 헤더 높이만큼 마진 고려
      if (window.scrollY >= (sectionTop - 120)) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  });
});

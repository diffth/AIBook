import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// 주요 언어별 대표 네온 테마 색상 정의
const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Vue: '#41b883',
  React: '#61dafb',
  Swift: '#f05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB'
};

const defaultPalette = [
  '#a78bfa', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#6366f1'  // Indigo
];

export default function LanguageChart({ languages }) {
  if (!languages || Object.keys(languages).length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p className="text-secondary">언어 데이터가 없습니다.</p>
      </div>
    );
  }

  // 데이터 상위 6개 선정 후 나머지는 '기타'로 묶기
  const sortedLangs = Object.entries(languages)
    .sort((a, b) => b[1] - a[1]);

  const topLangs = sortedLangs.slice(0, 6);
  const otherLangs = sortedLangs.slice(6);
  
  if (otherLangs.length > 0) {
    const otherCount = otherLangs.reduce((acc, curr) => acc + curr[1], 0);
    topLangs.push(['기타', otherCount]);
  }

  const labels = topLangs.map(([lang]) => lang);
  const dataValues = topLangs.map(([_, count]) => count);

  // 라벨 매칭 색상 설정
  const backgroundColors = labels.map((lang, idx) => {
    return languageColors[lang] || defaultPalette[idx % defaultPalette.length];
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        hoverOffset: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e5e7eb', // 가독성 좋은 라이트 그레이
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: 500
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(9, 5, 20, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(167, 139, 250, 0.3)',
        borderWidth: 1,
        padding: 10,
        boxPadding: 6,
        bodyFont: {
          family: "'Inter', sans-serif"
        },
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return ` ${label}: ${value}개 저장소 (${percentage}%)`;
          }
        }
      }
    },
    cutout: '70%' // 도넛 두께 조절 (얇고 세련되게)
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        📊 기술 언어 사용 통계
      </h3>
      <div style={{ position: 'relative', height: '260px', width: '100%' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

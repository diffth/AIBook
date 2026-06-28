import React from 'react';
import { Apple, Activity, Sparkles, Scale, Info } from 'lucide-react';

export default function ResultDashboard({ result }) {
  if (!result) return null;
  const { foodName, amount, nutrition, ai_suggestion } = result;

  // 일일 권장 기준 가이드 (탄: 130g, 단: 60g, 지: 50g 기준 비율 계산)
  const dailyLimits = {
    carbs: 130,
    protein: 60,
    fat: 50
  };

  const getPercentage = (val, max) => {
    const pct = Math.round((val / max) * 100);
    return pct > 100 ? 100 : pct;
  };

  return (
    <div className="dashboard-grid fade-in">
      {/* 1. 음식 개요 카드 (동일 너비/높이 행 정렬) */}
      <div className="dashboard-card">
        <div>
          <div className="card-header-area">
            <h4 className="card-title">
              <Apple size={18} /> 음식 정보 개요
            </h4>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
              검출된 음식명
            </span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
              {foodName}
            </p>

            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontFamily: 'var(--font-heading)' }}>
              예상 섭취량
            </span>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={16} /> {amount}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
          fontFamily: 'var(--font-heading)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>에너지 추정량</span>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff' }}>
            {nutrition.calories} <span style={{ fontSize: '1rem', fontWeight: 500 }}>kcal</span>
          </p>
        </div>
      </div>

      {/* 2. 탄단지 영양소 상세 카드 (동일 너비/높이 행 정렬) */}
      <div className="dashboard-card">
        <div>
          <div className="card-header-area">
            <h4 className="card-title">
              <Activity size={18} /> 탄단지 분석
            </h4>
          </div>

          <div style={{ marginTop: '16px' }}>
            {/* 탄수화물 */}
            <div className="nutrient-row">
              <div className="nutrient-label-group">
                <span style={{ color: 'var(--text-main)' }}>탄수화물 (Carbs)</span>
                <span style={{ fontWeight: 700, color: '#ffa726' }}>{nutrition.carbs}g</span>
              </div>
              <div className="nutrient-bar-bg">
                <div
                  className="nutrient-bar-fill"
                  style={{
                    width: `${getPercentage(nutrition.carbs, dailyLimits.carbs)}%`,
                    backgroundColor: '#ffa726'
                  }}
                />
              </div>
            </div>

            {/* 단백질 */}
            <div className="nutrient-row">
              <div className="nutrient-label-group">
                <span style={{ color: 'var(--text-main)' }}>단백질 (Protein)</span>
                <span style={{ fontWeight: 700, color: '#29b6f6' }}>{nutrition.protein}g</span>
              </div>
              <div className="nutrient-bar-bg">
                <div
                  className="nutrient-bar-fill"
                  style={{
                    width: `${getPercentage(nutrition.protein, dailyLimits.protein)}%`,
                    backgroundColor: '#29b6f6'
                  }}
                />
              </div>
            </div>

            {/* 지방 */}
            <div className="nutrient-row">
              <div className="nutrient-label-group">
                <span style={{ color: 'var(--text-main)' }}>지방 (Fat)</span>
                <span style={{ fontWeight: 700, color: '#26a69a' }}>{nutrition.fat}g</span>
              </div>
              <div className="nutrient-bar-bg">
                <div
                  className="nutrient-bar-fill"
                  style={{
                    width: `${getPercentage(nutrition.fat, dailyLimits.fat)}%`,
                    backgroundColor: '#26a69a'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
          <Info size={14} /> 일일 권장 섭취 목표 대비 획득 비율입니다.
        </div>
      </div>

      {/* 3. AI 제안 카드 (동일 너비/높이 행 정렬) */}
      <div className="dashboard-card">
        <div>
          <div className="card-header-area">
            <h4 className="card-title">
              <Sparkles size={18} /> AI 맞춤 식단 조언
            </h4>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
              AI_SUGGESTION
            </span>
            <div className="ai-suggestion-box">
              <p className="hint-text">{ai_suggestion}</p>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '12px' }}>
          * 본 분석 수치는 AI 추정치이므로 가이드용으로만 참고하세요.
        </div>
      </div>
    </div>
  );
}

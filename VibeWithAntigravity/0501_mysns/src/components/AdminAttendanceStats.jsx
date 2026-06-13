import React, { useState, useMemo } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { BarChart3, TrendingUp, Award, AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
);

export default function AdminAttendanceStats({ members, attendanceList }) {
  const [rangeType, setRangeType] = useState('weekly'); // weekly, monthly

  const activeMembers = useMemo(() => {
    return members.filter(m => m.role === 'member' && m.status === 'active');
  }, [members]);

  // 대상 기간 날짜 목록 구하기
  const targetDates = useMemo(() => {
    const dates = [];
    const limit = rangeType === 'weekly' ? 7 : 30;
    
    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  }, [rangeType]);

  // 전체 출결 기록 분석
  const statsData = useMemo(() => {
    let attend = 0;
    let late = 0;
    let absent = 0;

    // 각 날짜별 출석률 데이터 추이 계산
    const rateTimeline = targetDates.map(date => {
      const dayAtts = attendanceList.filter(a => a.date === date);
      
      // 통계 누적
      dayAtts.forEach(a => {
        if (a.status === 'attend') attend++;
        else if (a.status === 'late') late++;
        else if (a.status === 'absent') absent++;
      });

      const totalActiveCount = activeMembers.length;
      if (totalActiveCount === 0) return 0;
      
      const attendedCount = dayAtts.filter(a => a.status === 'attend' || a.status === 'late').length;
      return Math.round((attendedCount / totalActiveCount) * 100);
    });

    const totalRecords = attend + late + absent;

    // 회원별 출석 랭킹 계산
    const memberRanking = activeMembers.map(member => {
      const memberAtts = attendanceList.filter(a => a.userId === member.id && targetDates.includes(a.date));
      const totalDays = targetDates.length; // 기간 내 일수
      const attendedDays = memberAtts.filter(a => a.status === 'attend' || a.status === 'late').length;
      const rate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;
      
      return {
        id: member.id,
        name: member.name,
        attendedDays,
        totalDays,
        rate
      };
    }).sort((a, b) => b.rate - a.rate); // 높은 출석률 순 정렬

    return {
      attend,
      late,
      absent,
      totalRecords,
      rateTimeline,
      memberRanking
    };
  }, [targetDates, attendanceList, activeMembers]);

  // 차트가 표출될 데이터 유무 검사
  const hasData = statsData.totalRecords > 0;

  // 1. 라인 차트 설정 (출석률 변화 추이)
  const lineChartData = {
    labels: targetDates.map(d => d.slice(5)), // MM-DD 포맷팅
    datasets: [
      {
        label: '출석률 (%)',
        data: statsData.rateTimeline,
        borderColor: '#1877f2',
        backgroundColor: 'rgba(24, 119, 242, 0.1)',
        tension: 0.2,
        fill: true,
        pointBackgroundColor: '#1877f2',
        pointRadius: 4
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { min: 0, max: 100 }
    }
  };

  // 2. 파이 차트 설정 (출석 분포)
  const pieChartData = {
    labels: ['출석', '지각', '결석'],
    datasets: [
      {
        data: [statsData.attend, statsData.late, statsData.absent],
        backgroundColor: ['#31a24c', '#f59e0b', '#f02849'],
        borderWidth: 1
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="animate-pop" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📊 기간별 출결 통계</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            지정된 기간 동안의 회원 출결 통계를 분석하고 분석 그래프를 표출합니다.
          </p>
        </div>

        <select 
          style={{ width: '130px', padding: '8px 12px', fontSize: '13px' }}
          value={rangeType}
          onChange={(e) => setRangeType(e.target.value)}
        >
          <option value="weekly">최근 7일 (주간)</option>
          <option value="monthly">최근 30일 (월간)</option>
        </select>
      </div>

      {!hasData ? (
        <div className="card-sns" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <AlertCircle size={40} style={{ color: 'var(--text-muted)' }} />
          <div>
            <p style={{ fontWeight: 600 }}>선택된 기간 동안 저장된 출결 데이터가 없습니다.</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              '일별 출결 관리' 메뉴에서 회원들의 출결을 체크 및 일괄 저장해 주세요.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Line Chart Card */}
            <div className="card-sns" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>출석률 추이 (%)</h3>
              </div>
              <div style={{ height: '240px', position: 'relative' }}>
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* Pie Chart Card */}
            <div className="card-sns" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ArcElement size={18} style={{ color: 'var(--success)' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>출결 구성 분포</h3>
              </div>
              <div style={{ height: '240px', position: 'relative' }}>
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>

          {/* Attendance Ranking List Card */}
          <div className="card-sns" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Award size={18} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>기간 내 출석률 랭킹 (출석률 높은 순)</h3>
            </div>
            
            <div className="table-wrapper">
              <table className="sns-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>순위</th>
                    <th>회원 이름</th>
                    <th>출석/참여 일수</th>
                    <th>총 대상 일수</th>
                    <th style={{ textAlign: 'right' }}>출석률</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.memberRanking.map((rank, index) => (
                    <tr key={rank.id}>
                      <td style={{ fontWeight: 700, color: index === 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        {index + 1}위
                      </td>
                      <td style={{ fontWeight: 600 }}>{rank.name}</td>
                      <td>{rank.attendedDays}일</td>
                      <td>{rank.totalDays}일</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: rank.rate >= 80 ? 'var(--success)' : 'var(--text-primary)' }}>
                        {rank.rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

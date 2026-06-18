# 📊 통신사 고객 이탈 데이터(churn.csv) 탐색적 데이터 분석(EDA) 파이썬 노트북 개발 기술 명세서

본 기술 명세서는 `churn.csv` 데이터셋을 활용하여 통신사 고객의 이탈(Churn) 요인을 다각도로 분석하고 시각화하는 Jupyter Notebook(파이썬 노트북)을 구축하기 위한 가이드라인입니다.

* **1. 데이터 프로파일링 및 무결성 검증 (Data Profiling & Integrity Check)**
  * 데이터셋을 로드한 후 `.info()`, `.describe()`, `.isnull().sum()` 등을 활용하여 결측치, 중복값, 그리고 각 변수(State, Account_Length, CustServ_Calls 등)의 데이터 타입을 확인하고 기초 통계량을 분석하여 데이터 무결성을 검증합니다.
* **2. 타겟 변수(이탈 여부: Churn)의 불균형성 및 기초 분포 시각화**
  * 전체 고객 중 이탈 고객(Churn=True)과 유지 고객(Churn=False)의 비율을 파이(Pie) 차트 및 카운트(Count) 플롯으로 시각화하여 클래스 불균형(Class Imbalance) 상태를 파악하고 이탈률의 기본 베이스라인을 설정합니다.
* **3. 가입 요금제 유형(Intl_Plan, Vmail_Plan)에 따른 고객 이탈 패턴 분석**
  * 국제전화 요금제(Intl_Plan) 및 음성사서함 요금제(Vmail_Plan) 가입 여부와 고객 이탈 간의 상관관계를 교차 테이블(Crosstab)과 누적 막대그래프(Stacked Bar Plot)로 시각화하여, 특정 부가 서비스 가입 고객군에서 이탈률이 유의미하게 높은지 집중 분석합니다.
* **4. 시간대별 통화 사용량(Mins/Calls/Charge) 분석 및 요금 구조상 특징 분석**
  * 낮(Day), 저녁(Eve), 밤(Night), 국제(Intl) 통화 시간과 요금 간의 강한 상관관계를 확인하고 히트맵(Correlation Heatmap)을 그려 다중공선성을 검토하며, 전체 통화 요금 합산 피처(Total Charge)를 생성하는 등 이탈과의 밀접도를 분석합니다.
* **5. 고객 서비스 센터 통화 횟수(CustServ_Calls)와 이탈률의 위험 임계점(Threshold) 도출**
  * 고객 서비스 센터 통화 횟수별 이탈률 변화를 꺾은선 그래프 및 박스 플롯(Box Plot)으로 분석하여, 이탈 위험도가 급격히 상승하는 임계 통화 횟수(예: 4회 이상)를 탐색하고 비즈니스적 예방 조치 시점을 제안합니다.
* **6. 데이터 전처리 가이드라인 수립 및 머신러닝 분류 모델링 연계 계획**
  * EDA를 통해 도출된 핵심 인사이트를 기반으로 향후 이탈 예측 모델 개발을 위해 범주형 변수의 인코딩(One-Hot Encoding), 수치형 변수의 스케일링(Standard/MinMax Scaling) 및 클래스 불균형 해소 방안(SMOTE 등)을 정의합니다.

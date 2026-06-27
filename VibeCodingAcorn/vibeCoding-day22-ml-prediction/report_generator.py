import os
import sys
import tempfile
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
from dotenv import load_dotenv
import google.generativeai as genai
from datetime import datetime

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 1. 환경 변수 로드
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY is not set in the .env file.", file=sys.stderr)
    sys.exit(1)

# Gemini API 구성
genai.configure(api_key=GEMINI_API_KEY)

# 2. 한글 폰트 설정 (Matplotlib 및 ReportLab 용)
# Windows의 대표적인 한글 폰트인 맑은 고딕을 기본 경로로 사용
FONT_NAME = "Malgun"
FONT_PATH = "C:\\Windows\\Fonts\\malgun.ttf"

# OS 호환성을 위해 맑은고딕이 없을 경우 네이버 나눔고딕, 굴림, 혹은 시스템 기본 폰트를 찾는 Fallback 구현
if not os.path.exists(FONT_PATH):
    # 다른 일반적인 Windows 경로 또는 예외처리
    alternate_paths = [
        "C:\\Windows\\Fonts\\malgunbd.ttf",  # 맑은 고딕 Bold
        "C:\\Windows\\Fonts\\gulim.ttc",     # 굴림
        "C:\\Windows\\Fonts\\arial.ttf"      # 영문 전용 (최후의 보루)
    ]
    for path in alternate_paths:
        if os.path.exists(path):
            FONT_PATH = path
            break

# ReportLab 폰트 등록
try:
    pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
    print(f"Successfully registered font '{FONT_NAME}' from {FONT_PATH}")
except Exception as e:
    print(f"Warning: Failed to register font. Fallback to Helvetica. Error: {e}", file=sys.stderr)
    FONT_NAME = "Helvetica"

# Matplotlib 한글 깨짐 방지 설정
try:
    matplotlib.rcParams['font.family'] = 'Malgun Gothic' if FONT_NAME == "Malgun" else 'sans-serif'
    matplotlib.rcParams['axes.unicode_minus'] = False
except Exception as e:
    print(f"Warning: Failed to configure Matplotlib font: {e}", file=sys.stderr)


# 3. 데이터 로딩 및 분석 함수
def analyze_data(file_path):
    # 확장자에 따라 파일 로드
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == '.csv':
            # 한글 인코딩 대응 (utf-8, cp949/euc-kr)
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='cp949')
        elif ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or XLSX.")
    except Exception as e:
        print(f"Error loading file: {e}", file=sys.stderr)
        sys.exit(1)

    # 컬럼 표준화 (대소문자 무시 및 한글/영어 매핑)
    col_mapping = {}
    for col in df.columns:
        col_lower = str(col).lower().strip()
        if 'category' in col_lower or '카테고리' in col_lower:
            col_mapping['category'] = col
        elif 'sales' in col_lower or 'revenue' in col_lower or '매출' in col_lower:
            col_mapping['sales'] = col
        elif 'profit' in col_lower or 'income' in col_lower or '수익' in col_lower:
            col_mapping['profit'] = col
        elif 'quantity' in col_lower or '수량' in col_lower:
            col_mapping['quantity'] = col
        elif 'date' in col_lower or '날짜' in col_lower:
            col_mapping['date'] = col

    # 필수 컬럼 검증 및 기본값 설정
    sales_col = col_mapping.get('sales')
    profit_col = col_mapping.get('profit')
    category_col = col_mapping.get('category')

    # 만약 적절한 컬럼 매핑을 찾지 못했다면 숫자형 컬럼과 범주형 컬럼을 임의로 지정
    if not sales_col:
        num_cols = df.select_dtypes(include=['number']).columns
        if len(num_cols) > 0:
            sales_col = num_cols[0]
        else:
            print("Error: No numeric column found for Sales.", file=sys.stderr)
            sys.exit(1)
            
    if not profit_col:
        num_cols = df.select_dtypes(include=['number']).columns
        if len(num_cols) > 1:
            profit_col = num_cols[1]
        else:
            profit_col = sales_col  # 차선책

    if not category_col:
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        if len(cat_cols) > 0:
            category_col = cat_cols[0]
        else:
            # 범주형 컬럼이 아예 없으면 가상 카테고리 생성
            df['Category_Temp'] = 'General'
            category_col = 'Category_Temp'

    # 수치 분석 수행
    total_sales = float(df[sales_col].sum())
    avg_sales = float(df[sales_col].mean())
    total_profit = float(df[profit_col].sum())
    profit_ratio = (total_profit / total_sales * 100) if total_sales != 0 else 0

    # 카테고리별 Groupby
    groupby_df = df.groupby(category_col).agg({
        sales_col: 'sum',
        profit_col: 'sum'
    }).reset_index()
    
    # 컬럼명 통일
    groupby_df.columns = ['Category', 'Sales', 'Profit']
    groupby_df = groupby_df.sort_values(by='Sales', ascending=False)

    # describe() 통계 요약 (Sales와 Profit 컬럼 기준)
    desc_df = df[[sales_col, profit_col]].describe().reset_index()
    # 열 이름 한글화 및 포맷
    desc_df.columns = ['지표', '매출(Sales)', '수익(Profit)']

    analysis_results = {
        'total_sales': total_sales,
        'avg_sales': avg_sales,
        'total_profit': total_profit,
        'profit_ratio': profit_ratio,
        'category_summary': groupby_df.to_dict(orient='records'),
        'describe_data': desc_df.to_dict(orient='records'),
        'sales_col_name': sales_col,
        'profit_col_name': profit_col,
        'category_col_name': category_col,
        'raw_df': df,
        'groupby_df': groupby_df
    }
    
    return analysis_results


# 4. Gemini API 자연어 보고서 작성 함수
def generate_gemini_report(analysis):
    # 프롬프트 가공을 위한 텍스트 요약
    cat_summary_text = "\n".join([
        f"- {item['Category']}: 매출 {item['Sales']:,.2f}, 수익 {item['Profit']:,.2f}" 
        for item in analysis['category_summary']
    ])
    
    prompt = f"""
당신은 전문 비즈니스 데이터 분석가이자 전략 컨설턴트입니다.
제공된 매출 데이터 분석 통계 요약을 바탕으로, 경영진에게 보고할 수준의 품격 있고 깊이 있는 '비즈니스 매출 리포트'를 작성해주세요.

[데이터 요약 정보]
- 분석 대상 컬럼: 카테고리({analysis['category_col_name']}), 매출({analysis['sales_col_name']}), 수익({analysis['profit_col_name']})
- 총 매출액: {analysis['total_sales']:,.2f}
- 평균 매출액: {analysis['avg_sales']:,.2f}
- 총 수익: {analysis['total_profit']:,.2f} (수익률: {analysis['profit_ratio']:.2f}%)
- 카테고리별 실적 (매출 기준 내림차순):
{cat_summary_text}

[작성 요구사항]
1. 보고서는 명확하고 격식 있는 한국어로 비즈니스 어조를 유지하여 작성해 주세요.
2. 다음 구조를 필수로 포함해 주세요:
   - **Executive Summary (요약)**: 전체 실적에 대한 핵심 요약 및 평가 (1~2문장)
   - **핵심 실적 분석 (Insights)**: 매출과 수익성 관점에서 어떤 카테고리가 성장을 견인하고 있고, 어떤 카테고리의 개선이 필요한지 구체적 기술
   - **전략적 제언 (Recommendations)**: 데이터 분석 결과를 바탕으로 향후 매출과 수익 극대화를 위해 실행해야 할 구체적인 비즈니스 액션 플랜 2~3가지 제시
3. 텍스트 서식은 간단한 마크다운(예: **강조**, Bullet point)만 사용하여 깔끔하게 작성해 주세요. 복잡한 표나 코드는 제외하고 순수 텍스트 본문 분석에 집중해 주세요.
"""

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Warning: Gemini API call failed. Using fallback text. Error: {e}", file=sys.stderr)
        return f"""
[요약]
총 매출 {analysis['total_sales']:,.2f} 및 총 수익 {analysis['total_profit']:,.2f} (수익률 {analysis['profit_ratio']:.2f}%)을 기록하였습니다.

[핵심 실적 분석]
가장 높은 매출을 기록한 카테고리는 {analysis['category_summary'][0]['Category'] if analysis['category_summary'] else 'N/A'} 이며, 
전반적으로 매출 대비 안정적인 수익을 거두고 있습니다. 세부 항목별 효율화가 요구됩니다.

[전략적 제언]
1. 고매출 카테고리의 마케팅 강화 및 재고 확보.
2. 수익성이 낮거나 적자가 발생하는 카테고리의 단가 조정 및 원가 절감.
"""


# 5. Matplotlib 시각화 함수
def create_chart(analysis):
    groupby_df = analysis['groupby_df']
    
    # 그래프 스타일 정의
    plt.style.use('ggplot')
    fig, ax1 = plt.subplots(figsize=(7, 4))
    
    categories = groupby_df['Category']
    sales = groupby_df['Sales']
    profit = groupby_df['Profit']
    
    x = range(len(categories))
    width = 0.35
    
    # 듀얼 축 바 차트 그리기 (매출: 바 차트, 수익: 꺾은선 혹은 겹친 바 차트)
    rects1 = ax1.bar([i - width/2 for i in x], sales, width, label='매출 (Sales)', color='#4e79a7')
    rects2 = ax1.bar([i + width/2 for i in x], profit, width, label='수익 (Profit)', color='#f28e2b')
    
    ax1.set_xlabel('카테고리 (Category)', fontsize=10, fontweight='bold')
    ax1.set_ylabel('금액 (Amount)', fontsize=10, fontweight='bold')
    ax1.set_title('카테고리별 매출 및 수익 현황', fontsize=12, fontweight='bold', pad=15)
    ax1.set_xticks(x)
    ax1.set_xticklabels(categories, rotation=15, ha='right')
    ax1.legend()
    
    # 천단위 콤마 포맷 적용
    ax1.get_yaxis().set_major_formatter(matplotlib.ticker.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    plt.tight_layout()
    
    # 임시 파일로 저장
    temp_dir = tempfile.gettempdir()
    chart_path = os.path.join(temp_dir, 'sales_chart.png')
    plt.savefig(chart_path, dpi=200)
    plt.close()
    return chart_path


# 6. 마크다운 텍스트를 ReportLab Paragraph용 HTML 스타일로 간단 변환
def markdown_to_html(md_text):
    import re
    # HTML 엔티티 이스케이프 (ReportLab Paragraph XML 파싱 충돌 방지)
    html = md_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # **bold** -> <b>bold</b>
    html = re.sub(r'\*\*(.*?)\*\*|__(.*?)__', r'<b>\1\2</b>', html)
    
    # *italic* -> <i>italic</i>
    html = re.sub(r'\*(.*?)\*|_(.*?)_', r'<i>\1\2</i>', html)
    
    # 개행 처리
    # 연속 개행(\n\n)은 새로운 문단으로 처리하기 위해 분리함
    paragraphs = html.split('\n\n')
    cleaned_paras = []
    for p in paragraphs:
        p_clean = p.strip()
        if p_clean:
            # 단일 개행(\n)은 <br/>로 치환
            p_clean = p_clean.replace('\n', '<br/>')
            cleaned_paras.append(p_clean)
            
    return cleaned_paras


# 7. PDF 생성 함수 (ReportLab)
def generate_pdf(analysis, gemini_text, chart_path, output_pdf_path):
    # 문서 객체 생성 (여백 사방 0.75인치 = 54포인트)
    doc = SimpleDocTemplate(
        output_pdf_path, 
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # 한글 폰트를 지원하는 커스텀 스타일 정의
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#2c3e50'),
        alignment=1, # Center
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#7f8c8d'),
        alignment=1, # Center
        spaceAfter=30
    )
    
    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#2c3e50'),
        spaceBefore=15,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextKor',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=9.5,
        leading=15,
        textColor=colors.HexColor('#34495e'),
        spaceAfter=8
    )
    
    table_text_style = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=9,
        leading=11,
        alignment=1 # Center
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName=FONT_NAME,
        fontSize=9.5,
        leading=12,
        textColor=colors.white,
        alignment=1,
        fontStyle='Bold'
    )
    
    story = []
    
    # A. 타이틀 영역
    story.append(Paragraph("데이터 기반 비즈니스 매출 분석 보고서", title_style))
    current_date = datetime.now().strftime("%Y년 %m월 %d일")
    story.append(Paragraph(f"생성일자: {current_date}  |  분석 도구: Pandas &amp; Google Gemini API", subtitle_style))
    story.append(Spacer(1, 10))
    
    # B. 주요 수치 요약 테이블
    story.append(Paragraph("1. 주요 핵심 실적 지표", h2_style))
    summary_data = [
        [
            Paragraph("<b>총 매출액 (Total Sales)</b>", table_text_style), 
            Paragraph("<b>총 수익 (Total Profit)</b>", table_text_style), 
            Paragraph("<b>평균 매출액 (Average Sales)</b>", table_text_style), 
            Paragraph("<b>영업 이익률 (Profit Margin)</b>", table_text_style)
        ],
        [
            Paragraph(f"₩ {analysis['total_sales']:,.0f}", table_text_style),
            Paragraph(f"₩ {analysis['total_profit']:,.0f}", table_text_style),
            Paragraph(f"₩ {analysis['avg_sales']:,.0f}", table_text_style),
            Paragraph(f"{analysis['profit_ratio']:.2f}%", table_text_style)
        ]
    ]
    
    summary_table = Table(summary_data, colWidths=[125, 125, 125, 125])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8f9fa')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bdc3c7')),
        ('BOTTOMPADDING', (0,1), (-1,-1), 10),
        ('TOPPADDING', (0,1), (-1,-1), 10),
    ]))
    # 요약 테이블 텍스트 색상 수정 (헤더 행은 흰색으로 변경 필요)
    for i in range(4):
        summary_data[0][i].style.textColor = colors.white
        
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # C. 상세 기술 통계 테이블 (describe)
    story.append(Paragraph("2. 기술 통계 요약 (Describe)", h2_style))
    
    # desc_df 데이터 리스트화
    desc_rows = [[Paragraph(col, table_header_style) for col in ['구분', '매출 (Sales)', '수익 (Profit)']]]
    for item in analysis['describe_data']:
        desc_rows.append([
            Paragraph(str(item['지표']), table_text_style),
            Paragraph(f"{item['매출(Sales)']:,.2f}", table_text_style),
            Paragraph(f"{item['수익(Profit)']:,.2f}", table_text_style)
        ])
        
    desc_table = Table(desc_rows, colWidths=[150, 175, 175])
    desc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#34495e')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#ecf0f1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f9f9f9')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(desc_table)
    story.append(Spacer(1, 20))
    
    # D. 시각화 그래프 영역
    story.append(Paragraph("3. 카테고리별 매출 및 수익 비교 차트", h2_style))
    # 차트 이미지 삽입 (너비 450, 높이 250 정도로 조절하여 페이지에 잘 들어맞도록 함)
    chart_img = Image(chart_path, width=450, height=250)
    chart_img.hAlign = 'CENTER'
    story.append(chart_img)
    story.append(Spacer(1, 20))
    
    # E. Gemini AI 분석 보고서 본문 영역 (페이지 넘김 방지를 위한 KeepTogether 고려 가능)
    ai_story = [Paragraph("4. 인공지능(Gemini) 비즈니스 분석 및 전략 제언", h2_style)]
    
    paragraphs_html = markdown_to_html(gemini_text)
    for para_html in paragraphs_html:
        ai_story.append(Paragraph(para_html, body_style))
        
    # AI 리포트 영역을 한 페이지에 최대한 묶어줌 (옵션)
    story.append(KeepTogether(ai_story))
    
    # PDF 빌드
    doc.build(story)


# 8. 메인 실행 함수
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python report_generator.py <input_data_path> <output_pdf_path>", file=sys.stderr)
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_pdf = sys.argv[2]
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist.", file=sys.stderr)
        sys.exit(1)
        
    print(f"Analyzing data from {input_file}...")
    analysis = analyze_data(input_file)
    
    print("Generating business recommendations using Gemini API...")
    gemini_report = generate_gemini_report(analysis)
    
    print("Generating visual charts with Matplotlib...")
    chart_file = create_chart(analysis)
    
    print(f"Compiling PDF report at {output_pdf}...")
    try:
        generate_pdf(analysis, gemini_report, chart_file, output_pdf)
        print("PDF report generated successfully.")
    except Exception as e:
        print(f"Error compiling PDF: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # 임시 차트 파일 정리
        if 'chart_file' in locals() and os.path.exists(chart_file):
            try:
                os.remove(chart_file)
                print("Cleaned up temporary chart image.")
            except OSError as e:
                print(f"Warning: Could not remove temporary chart file: {e}", file=sys.stderr)

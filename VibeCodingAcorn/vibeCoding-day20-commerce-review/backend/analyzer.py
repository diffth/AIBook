import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Pydantic 모델 선언 (구조화된 출력용)
class SentimentItem(BaseModel):
    sentiment: str = Field(description="감정 분석 결과: 'positive', 'neutral', 'negative' 중 하나")
    reason: str = Field(description="해당 감정으로 분류한 간략한 이유 (한글)")

class SentimentList(BaseModel):
    results: list[SentimentItem]

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
    return genai.Client(api_key=api_key)

def analyze_sentiments(reviews: list[dict]) -> list[dict]:
    """
    제공된 리뷰 목록에 대해 일괄적으로 감정 분석을 수행합니다.
    """
    if not reviews:
        return []
        
    client = get_gemini_client()
    
    # 리뷰 리스트 포맷팅
    reviews_input = []
    for idx, r in enumerate(reviews):
        # 텍스트가 너무 긴 경우 잘라서 전송 (토큰 절약 및 속도 개선)
        content_snippet = r['content'][:250] if r['content'] else ""
        text = f"[{idx}] (별점: {r['rating']}점) {r['headline']} - {content_snippet}"
        reviews_input.append(text)
    
    reviews_formatted = "\n".join(reviews_input)
    
    prompt = f"""아래는 쿠팡에서 수집한 상품 리뷰 목록입니다.
각 리뷰의 맥락, 어조, 별점 등을 종합 고려하여 감정을 'positive'(긍정), 'neutral'(중립), 'negative'(부정) 중 하나로 분류하고 그 이유를 적어주세요.
리뷰의 개수와 순서 그대로 결과를 반환해야 합니다.

[리뷰 목록]
{reviews_formatted}
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="당신은 상품 리뷰를 면밀히 분석하는 감정 분석 전문가입니다. 각 리뷰의 순서에 맞춰 정확한 감정 라벨과 이유를 제공해야 합니다.",
                response_mime_type="application/json",
                response_schema=SentimentList,
                temperature=0.2
            )
        )
        
        # JSON 결과 파싱
        res_data = json.loads(response.text)
        results = res_data.get("results", [])
        
        # 크기 불일치 대비 보완 처리
        final_results = []
        for i in range(len(reviews)):
            if i < len(results):
                final_results.append({
                    "sentiment": results[i].get("sentiment", "neutral"),
                    "reason": results[i].get("reason", "분석 완료")
                })
            else:
                final_results.append({
                    "sentiment": "neutral",
                    "reason": "데이터 누락으로 기본값 설정"
                })
        return final_results
        
    except Exception as e:
        print(f"Gemini 감정 분석 에러: {e}")
        # 오류 발생 시 기본값으로 채워서 반환
        return [{"sentiment": "neutral", "reason": "감정 분석 실패"} for _ in range(len(reviews))]

def generate_summary_report(product_name: str, reviews: list[dict], sentiment_results: list[dict]) -> str:
    """
    리뷰 데이터와 감정 분석 통계를 기반으로 상품의 전반적인 인상 요약 리포트를 마크다운 형식으로 작성합니다.
    """
    if not reviews:
        return "수집된 리뷰 데이터가 없어 리포트를 생성할 수 없습니다."
        
    client = get_gemini_client()
    
    # 긍정/중립/부정 개수 세기
    pos_count = sum(1 for r in sentiment_results if r['sentiment'] == 'positive')
    neu_count = sum(1 for r in sentiment_results if r['sentiment'] == 'neutral')
    neg_count = sum(1 for r in sentiment_results if r['sentiment'] == 'negative')
    total = len(reviews)
    
    # 평균 별점 계산
    avg_rating = sum(r['rating'] for r in reviews) / total if total > 0 else 0
    
    # 데이터 요약 정보 작성
    data_summary = []
    for i in range(total):
        r = reviews[i]
        s = sentiment_results[i]
        line = f"- 리뷰 {i+1} (별점: {r['rating']}점, 감정: {s['sentiment']}): {r['headline']} {r['content'][:150]}..."
        data_summary.append(line)
        
    data_text = "\n".join(data_summary)
    
    prompt = f"""당신은 이커머스 상품 전문 리뷰 분석가입니다. 
다음 상품 '{product_name}'에 대한 최신 30개 리뷰 데이터와 AI 감정 분석 결과를 기반으로 구매자의 전반적인 인상과 만족도를 분석한 요약 리포트를 작성해주세요.

[상품 분석 요약 정보]
- 상품명: {product_name}
- 총 분석 리뷰 수: {total}개
- 평균 별점: {avg_rating:.2f} / 5.0
- 감정 통계: 긍정 {pos_count}개 ({pos_count/total*100:.1f}%), 중립 {neu_count}개 ({neu_count/total*100:.1f}%), 부정 {neg_count}개 ({neg_count/total*100:.1f}%)

[원시 리뷰 데이터 및 감정 분석]
{data_text}

위 데이터를 종합 분석하여, 반드시 아래 항목을 포함하는 가독성 높고 세련된 한글 마크다운 형식의 리포트를 생성해주세요.

1. **상품 종합 한줄평** (구매자들의 전반적인 만족도 분위기를 반영한 한 줄 평)
2. **이 상품의 주요 장점 (Pros)** (리뷰에서 칭찬하는 핵심 강점 2~3가지를 구체적인 이유와 함께 기술)
3. **이 상품의 아쉬운 점 / 단점 (Cons)** (리뷰에서 불만을 표시하거나 개선을 바라는 요소 2~3가지를 기술)
4. **추천 구매 대상** (어떤 니즈를 가진 소비자에게 추천하면 좋을지 기술)
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7
            )
        )
        return response.text
    except Exception as e:
        return f"종합 리포트 생성 중 에러가 발생했습니다: {e}"

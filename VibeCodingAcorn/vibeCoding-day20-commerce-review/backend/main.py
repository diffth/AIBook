from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# 로컬 모듈 임포트
from crawler import extract_product_id, crawl_reviews
from analyzer import analyze_sentiments, generate_summary_report

# .env 로드
load_dotenv()

app = FastAPI(title="Coupang Review Sentiment Analyzer API")

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 및 배포 편의를 위해 전체 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    query: str

@app.post("/api/analyze")
async def analyze_product_reviews(req: AnalyzeRequest):
    query_str = req.query.strip()
    if not query_str:
        raise HTTPException(status_code=400, detail="상품명 또는 링크를 입력해 주세요.")
        
    try:
        # 1. 상품 ID 및 실제 상품 이름 획득
        product_id, product_name = extract_product_id(query_str)
        
        # 2. 최신 30개 리뷰 크롤링
        reviews = crawl_reviews(product_id, count=30)
        if not reviews:
            raise HTTPException(
                status_code=404, 
                detail="해당 상품에 대한 최신 리뷰가 존재하지 않거나, 쿠팡에서 일시적으로 크롤링을 차단했습니다."
            )
            
        # 3. Gemini API 기반 감정 분석
        sentiment_results = analyze_sentiments(reviews)
        
        # 4. Gemini API 기반 종합 리포트 생성
        summary_report = generate_summary_report(product_name, reviews, sentiment_results)
        
        return {
            "productId": product_id,
            "productName": product_name,
            "reviews": reviews,
            "sentimentResults": sentiment_results,
            "summaryReport": summary_report
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"백엔드 파이프라인 처리 중 예외 발생: {e}")
        raise HTTPException(status_code=500, detail=f"리뷰 분석 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY"))}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

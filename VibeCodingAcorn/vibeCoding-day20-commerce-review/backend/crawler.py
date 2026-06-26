import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.coupang.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Connection": "keep-alive"
}

def extract_product_id(input_str: str) -> tuple[str, str]:
    """
    입력된 문자열이 쿠팡 상품 상세 링크이면 URL에서 productId를 추출하고,
    검색 키워드이면 쿠팡 검색 페이지를 긁어 첫 번째 상품의 ID와 이름을 가져옵니다.
    반환값: (product_id, product_name)
    """
    # 1. URL 패턴 매칭 시도
    url_pattern = r"coupang\.com/.*/products/(\d+)"
    match = re.search(url_pattern, input_str)
    if match:
        product_id = match.group(1)
        # 상세페이지 상품명 파싱 시도
        try:
            url = f"https://www.coupang.com/vp/products/{product_id}"
            res = requests.get(url, headers=HEADERS, timeout=10)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                name_tag = soup.select_one(".prod-buy-header__title")
                if name_tag:
                    return product_id, name_tag.text.strip()
        except Exception:
            pass
        return product_id, "링크 상품"

    # 2. 키워드 검색 시도
    search_url = f"https://www.coupang.com/np/search?q={input_str}&channel=auto"
    try:
        res = requests.get(search_url, headers=HEADERS, timeout=10)
        if res.status_code != 200:
            raise Exception(f"쿠팡 검색 실패 (상태 코드: {res.status_code})")
        
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # 검색 목록에서 첫 번째 상품 선택
        product_item = soup.select_one(".search-product")
        if not product_item:
            raise Exception("검색 결과 상품을 찾을 수 없습니다.")
        
        # 상품 ID 추출
        product_id = product_item.get("data-product-id")
        if not product_id:
            link_tag = product_item.select_one("a.search-product-link")
            if link_tag:
                href = link_tag.get("href", "")
                match = re.search(r"products/(\d+)", href)
                if match:
                    product_id = match.group(1)
        
        # 상품명 추출
        name_tag = product_item.select_one(".name")
        product_name = name_tag.text.strip() if name_tag else input_str
        
        if not product_id:
            raise Exception("상품 ID 추출 실패")
            
        return product_id, product_name
        
    except Exception as e:
        raise Exception(f"쿠팡 검색 중 에러 발생: {e}")

def crawl_reviews(product_id: str, count: int = 30) -> list[dict]:
    """
    주어진 product_id 상품의 최신 리뷰를 지정된 개수만큼 수집합니다.
    반환값: [{'headline': str, 'content': str, 'rating': int, 'date': str}, ...]
    """
    reviews = []
    page = 1
    
    while len(reviews) < count:
        # 최신순 정렬: sortBy=DATE_DESC
        review_url = f"https://www.coupang.com/vp/products/reviews?productId={product_id}&page={page}&size=10&sortBy=DATE_DESC&ratings=&viRoleCode=2&ratingSummary=y"
        
        try:
            res = requests.get(review_url, headers=HEADERS, timeout=10)
            if res.status_code != 200:
                break
                
            soup = BeautifulSoup(res.text, 'html.parser')
            review_elements = soup.select(".sdp-review__article__list")
            
            # 페이지에 리뷰가 없으면 종료
            if not review_elements:
                break
                
            for elem in review_elements:
                if len(reviews) >= count:
                    break
                
                # 별점 파싱
                star_tag = elem.select_one(".sdp-review__article__list__info__product-info__star-gray")
                rating = 0
                if star_tag:
                    rating_attr = star_tag.get("data-rating", "0")
                    rating = int(rating_attr)
                
                # 작성 날짜
                date_tag = elem.select_one(".sdp-review__article__list__info__product-info__reg-date")
                reg_date = date_tag.text.strip() if date_tag else ""
                
                # 헤드라인(한줄평)
                headline_tag = elem.select_one(".sdp-review__article__list__headline")
                headline = headline_tag.text.strip() if headline_tag else ""
                
                # 내용
                content_tag = elem.select_one(".sdp-review__article__list__review__content")
                content = content_tag.text.strip() if content_tag else ""
                
                # 가끔 한줄평이나 내용이 모두 비어있는 경우 스킵
                if not headline and not content:
                    continue
                    
                reviews.append({
                    "headline": headline,
                    "content": content,
                    "rating": rating,
                    "date": reg_date
                })
                
            # 다음 페이지
            page += 1
            
        except Exception as e:
            print(f"리뷰 크롤링 중 에러 (페이지 {page}): {e}")
            break
            
    return reviews

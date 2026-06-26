import os
import sys
from dotenv import load_dotenv

# .env 파일 로드 (만약 존재한다면)
load_dotenv()

def check_gemini_api_key():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] 에러: GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
        print("   프로젝트 폴더 내에 .env 파일을 생성하고 GEMINI_API_KEY=your_key_here 를 입력하거나,")
        print("   환경변수로 직접 지정해주세요.")
        return False
    
    print(f"[KEY] API Key 감지됨: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else ''}")
    print("[RUN] Google Gemini API 연결 테스트 중...")
    
    try:
        from google import genai
    except ImportError:
        print("[ERROR] 에러: 'google-genai' 라이브러리가 설치되어 있지 않습니다.")
        print("   'pip install google-genai python-dotenv' 명령어로 설치해주세요.")
        return False

    try:
        # 클라이언트 초기화
        client = genai.Client(api_key=api_key)
        
        # 가벼운 gemini-2.5-flash 모델을 사용하여 API 통신 확인
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents="Say 'OK' if you can read this."
        )
        
        reply = response.text.strip()
        print(f"[SUCCESS] 연결 성공! API 응답: '{reply}'")
        print("[INFO] Google Gemini API 키가 유효하고 정상 작동합니다.")
        return True
        
    except Exception as e:
        print("[ERROR] 에러: API 호출 중 오류가 발생했습니다.")
        print(f"   상세 오류 내용: {e}")
        return False

if __name__ == "__main__":
    print("=========================================")
    print("   Google Gemini API Key 검증 스크립트   ")
    print("=========================================")
    success = check_gemini_api_key()
    print("=========================================")
    sys.exit(0 if success else 1)

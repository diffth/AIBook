import process from 'process';

// 1. 필수 환경변수 로드 및 검증
const deploymentUrl = process.env.DEPLOYMENT_URL;
const geminiApiKey = process.env.GEMINI_API_KEY;
const phDeveloperToken = process.env.PRODUCT_HUNT_DEVELOPER_TOKEN;
const commitMessage = process.env.COMMIT_MESSAGE || "No commit message provided.";

console.log("=== 환경 변수 검증 ===");
console.log("배포 URL:", deploymentUrl);
console.log("커밋 메시지:", commitMessage);

if (!deploymentUrl) {
    console.error("오류: DEPLOYMENT_URL 환경 변수가 정의되지 않았습니다.");
    process.exit(1);
}
if (!geminiApiKey) {
    console.error("오류: GEMINI_API_KEY 환경 변수가 정의되지 않았습니다.");
    process.exit(1);
}
if (!phDeveloperToken) {
    console.error("오류: PRODUCT_HUNT_DEVELOPER_TOKEN 환경 변수가 정의되지 않았습니다.");
    process.exit(1);
}

// 2. Gemini API를 활용한 홍보 메타데이터 자동 생성
async function generateMarketingContent() {
    console.log("\n[Gemini API] 홍보 콘텐츠 생성 요청 중...");
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const prompt = `
    You are an expert tech product marketer. Your goal is to write a launch post content for Product Hunt based on a recent commit and deploy URL of the project.
    
    Commit details: "${commitMessage}"
    Live Application URL: "${deploymentUrl}"
    
    Generate the launch metadata in English. You must respond in a strict JSON format with the following keys:
    - "name": A concise, catchy product name (max 30 chars).
    - "tagline": A catchy, compelling one-line tagline showing value (max 60 chars).
    - "description": A short explanation of the application's key feature and benefit (max 250 chars).
    - "tags": A string array containing 2 or 3 relevant product categories (e.g. ["Productivity", "Developer Tools", "Design Tools", "Open Source"]).
    
    Do not add markdown formatting or anything outside of the JSON object.
    `;

    try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API 오류 (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(jsonText.trim());
        
        console.log("=== Gemini 생성 홍보 컨텐츠 ===");
        console.log("이름(Name):", result.name);
        console.log("태그라인(Tagline):", result.tagline);
        console.log("설명(Description):", result.description);
        console.log("태그(Tags):", result.tags);
        
        return result;
    } catch (error) {
        console.error("Gemini 콘텐츠 생성 중 오류 발생:", error);
        throw error;
    }
}

// 3. Product Hunt API V2에 포스트 자동 등록
async function postToProductHunt(marketingData) {
    console.log("\n[Product Hunt API] 게시글 등록 진행 중...");
    
    const phApiUrl = "https://api.producthunt.com/v2/api/graphql";
    
    // Product Hunt V2 GraphQL Mutation 스펙
    const query = `
    mutation CreateProductHuntPost($input: PostCreateInput!) {
      postCreate(input: $input) {
        post {
          id
          name
          tagline
          slug
        }
        errors {
          attribute
          message
        }
      }
    }
    `;

    const variables = {
      input: {
        name: marketingData.name,
        tagline: marketingData.tagline,
        description: marketingData.description,
        url: deploymentUrl,
        // Product Hunt V2 API에서는 tagNames 배열로 매핑할 수 있음
        tagNames: marketingData.tags
      }
    };

    try {
        const response = await fetch(phApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${phDeveloperToken}`
            },
            body: JSON.stringify({ query, variables })
        });

        const data = await response.json();
        
        if (data.errors) {
            console.error("Product Hunt GraphQL 구조 오류:", JSON.stringify(data.errors, null, 2));
            return;
        }

        const result = data.data.postCreate;
        if (result.errors && result.errors.length > 0) {
            console.error("Product Hunt 등록 유효성 검사 실패:");
            result.errors.forEach(err => {
                console.error(`- [${err.attribute}]: ${err.message}`);
            });
            console.log("\n팁: Product Hunt V2 API에서 글을 등록하려면 계정이 승인(Launch Permission)되어 있어야 하고, API 클라이언트 권한을 사전에 획득해야 정상 등록됩니다.");
            return;
        }

        console.log("\n=== Product Hunt 새 버전 포스트 등록 완료! ===");
        console.log("ID:", result.post.id);
        console.log("이름:", result.post.name);
        console.log("슬러그:", result.post.slug);
        console.log(`링크: https://www.producthunt.com/posts/${result.post.slug}`);
    } catch (error) {
        console.error("Product Hunt API 호출 중 오류 발생:", error);
    }
}

// 4. 메인 실행 제어기
async function main() {
    try {
        const marketingData = await generateMarketingContent();
        await postToProductHunt(marketingData);
    } catch (err) {
        console.error("자동 배포 후 작업 흐름(Pipeline Post Task) 실행 실패:", err);
        // 마케팅 등록 단계 오류로 인해 전체 Vercel 배포 빌드 작업 자체가 실패로 끝나지 않도록 catch 처리함.
        process.exit(0);
    }
}

main();

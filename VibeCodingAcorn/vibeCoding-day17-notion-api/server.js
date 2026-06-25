const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 가상 블로그 게시글 데이터베이스 (메모리 저장소)
const publishedPosts = [];

// ── 1. Notion 데이터베이스 목록 조회 API ──────────────────
app.post('/api/notion/database', async (req, res) => {
    const { apiKey, databaseId } = req.body;

    if (!apiKey || !databaseId) {
        return res.status(400).json({ error: 'API Key와 Database ID를 모두 입력해주세요.' });
    }

    try {
        const notion = new Client({ auth: apiKey });
        const response = await notion.databases.query({
            database_id: databaseId,
        });

        const pages = response.results.map(page => {
            const props = page.properties;
            
            // 제목 속성 찾기 (보통 'title' 타입인 속성)
            let title = '제목 없음';
            const titlePropKey = Object.keys(props).find(key => props[key].type === 'title');
            if (titlePropKey && props[titlePropKey].title && props[titlePropKey].title.length > 0) {
                title = props[titlePropKey].title.map(t => t.plain_text).join('');
            }

            // 태그 속성 찾기 (보통 'multi_select' 타입)
            let tags = [];
            const tagsPropKey = Object.keys(props).find(key => props[key].type === 'multi_select');
            if (tagsPropKey && props[tagsPropKey].multi_select) {
                tags = props[tagsPropKey].multi_select.map(item => item.name);
            }

            // 이미지 URL 속성 찾기 (Files & Media 또는 URL 타입)
            let imageUrl = '';
            const filesPropKey = Object.keys(props).find(key => props[key].type === 'files');
            const urlPropKey = Object.keys(props).find(key => props[key].type === 'url');

            if (filesPropKey && props[filesPropKey].files && props[filesPropKey].files.length > 0) {
                const firstFile = props[filesPropKey].files[0];
                imageUrl = firstFile.type === 'external' ? firstFile.external.url : firstFile.file.url;
            } else if (urlPropKey && props[urlPropKey].url) {
                imageUrl = props[urlPropKey].url;
            }

            // 페이지 커버 이미지도 대체로 사용 가능
            if (!imageUrl && page.cover) {
                imageUrl = page.cover.type === 'external' ? page.cover.external.url : page.cover.file.url;
            }

            return {
                id: page.id,
                title,
                tags,
                imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=800&auto=format&fit=crop&q=60', // 기본 썸네일
                createdTime: page.created_time
            };
        });

        res.json({ success: true, pages });
    } catch (error) {
        console.error('Notion DB Load Error:', error);
        res.status(500).json({ error: error.message || 'Notion 데이터베이스를 불러오는 중 오류가 발생했습니다.' });
    }
});

// ── 2. Notion 페이지 본문 마크다운 변환 및 블로그 발행 API ──
app.post('/api/publish', async (req, res) => {
    const { apiKey, pageId, title, tags, imageUrl } = req.body;

    if (!apiKey || !pageId) {
        return res.status(400).json({ error: '필수 매개변수(API Key, Page ID)가 누락되었습니다.' });
    }

    try {
        const notion = new Client({ auth: apiKey });
        
        // 페이지의 자식 Block 목록 조회
        const blocksResponse = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });

        // Block들을 Markdown으로 파싱
        const markdownContent = blocksToMarkdown(blocksResponse.results);

        // 외부 블로그 서버로 발행하는 시뮬레이션 POST 요청 진행
        // 여기서는 가상으로 메모리 데이터베이스에 기록하고, 외부 API로 POST 전송하는 프로세스를 흉내냅니다.
        const blogPost = {
            id: 'post_' + Date.now(),
            notionPageId: pageId,
            title,
            tags,
            thumbnail: imageUrl,
            content: markdownContent,
            publishedAt: new Date().toISOString()
        };

        // 시뮬레이션: 외부 블로그 Webhook이나 REST API로 데이터를 POST 전송
        // console.log('Sending POST to external blog API:', blogPost);
        publishedPosts.push(blogPost);

        // 시각화 처리를 위해 1초의 딜레이를 주어 현실성 있는 발행 반응 제공
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ 
            success: true, 
            message: '성공적으로 발행되었습니다.', 
            post: blogPost 
        });
    } catch (error) {
        console.error('Notion Publish Error:', error);
        res.status(500).json({ error: error.message || '블로그 발행 중 오류가 발생했습니다.' });
    }
});

// ── 3. 발행된 글 목록 조회 API (시뮬레이터 대시보드용) ──────────────────
app.get('/api/posts', (req, res) => {
    res.json({ success: true, posts: publishedPosts });
});

// Notion Block -> Markdown 변환 함수
function blocksToMarkdown(blocks) {
    let markdown = '';
    let inList = false;

    blocks.forEach(block => {
        const type = block.type;
        const blockData = block[type];
        
        if (!blockData) return;

        // 리스트 상태가 변경되면 개행 처리
        if (type !== 'bulleted_list_item' && type !== 'numbered_list_item' && inList) {
            markdown += '\n';
            inList = false;
        }

        // 텍스트 추출
        let text = '';
        if (blockData.rich_text) {
            text = blockData.rich_text.map(t => {
                let textStr = t.plain_text;
                if (t.annotations.bold) textStr = `**${textStr}**`;
                if (t.annotations.italic) textStr = `*${textStr}*`;
                if (t.annotations.strikethrough) textStr = `~~${textStr}~~`;
                if (t.annotations.code) textStr = `\`${textStr}\``;
                return textStr;
            }).join('');
        }

        switch (type) {
            case 'heading_1':
                markdown += `# ${text}\n\n`;
                break;
            case 'heading_2':
                markdown += `## ${text}\n\n`;
                break;
            case 'heading_3':
                markdown += `### ${text}\n\n`;
                break;
            case 'paragraph':
                markdown += `${text}\n\n`;
                break;
            case 'bulleted_list_item':
                markdown += `* ${text}\n`;
                inList = true;
                break;
            case 'numbered_list_item':
                markdown += `1. ${text}\n`;
                inList = true;
                break;
            case 'code':
                const language = blockData.language || 'javascript';
                const codeText = blockData.rich_text.map(t => t.plain_text).join('');
                markdown += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
                break;
            case 'image':
                const imageUrl = blockData.type === 'external' ? blockData.external.url : blockData.file.url;
                markdown += `![Image](${imageUrl})\n\n`;
                break;
            case 'divider':
                markdown += `---\n\n`;
                break;
            case 'quote':
                markdown += `> ${text}\n\n`;
                break;
            case 'to_do':
                const checked = blockData.checked ? '[x]' : '[ ]';
                markdown += `${checked} ${text}\n`;
                break;
            default:
                // 매핑되지 않는 타입은 생략
                break;
        }
    });

    return markdown.trim();
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM 요소 참조 ──────────────────
    const configForm = document.getElementById('config-form');
    const apiKeyInput = document.getElementById('api-key');
    const dbIdInput = document.getElementById('db-id');
    const saveInfoCheckbox = document.getElementById('save-info');
    const btnConnect = document.getElementById('btn-connect');
    const connectLoader = btnConnect.querySelector('.loader');
    
    const statusDisplay = document.getElementById('status-display');
    const dbContentSection = document.getElementById('db-content-section');
    const notionCardsGrid = document.getElementById('notion-cards-grid');
    const pageCountBadge = document.getElementById('page-count');
    
    const publishedList = document.getElementById('published-list');
    const btnRefreshPosts = document.getElementById('btn-refresh-posts');
    
    // 모달 관련
    const previewModal = document.getElementById('preview-modal');
    const modalCloseBtn = previewModal.querySelector('.close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalTags = document.getElementById('modal-tags');
    const modalImage = document.getElementById('modal-image');
    const modalMarkdownContent = document.getElementById('modal-markdown-content');
    const btnModalPublish = document.getElementById('btn-modal-publish');
    const modalPublishLoader = btnModalPublish.querySelector('.loader');

    // 전역 상태
    let localApiKey = '';
    let localDbId = '';
    let selectedPageData = null; // 모달에서 사용될 현재 선택된 페이지 정보

    // ── 1. 초기 로드 및 저장된 정보 불러오기 ──────────────────
    const savedApiKey = localStorage.getItem('notion_api_key');
    const savedDbId = localStorage.getItem('notion_db_id');
    if (savedApiKey && savedDbId) {
        apiKeyInput.value = savedApiKey;
        dbIdInput.value = savedDbId;
        saveInfoCheckbox.checked = true;
    }

    // 발행 현황 리스트 로드
    loadPublishedPosts();

    // ── 2. 노션 DB 연결 (조회) ──────────────────
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        const databaseId = dbIdInput.value.trim();

        if (saveInfoCheckbox.checked) {
            localStorage.setItem('notion_api_key', apiKey);
            localStorage.setItem('notion_db_id', databaseId);
        } else {
            localStorage.removeItem('notion_api_key');
            localStorage.removeItem('notion_db_id');
        }

        localApiKey = apiKey;
        localDbId = databaseId;

        // 로더 애니메이션 활성화
        setLoadingState(btnConnect, connectLoader, true);

        try {
            const response = await fetch('/api/notion/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, databaseId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'DB 연동에 실패했습니다.');
            }

            showToast('노션 데이터베이스 연결 성공! ⚡', 'success');
            renderNotionCards(data.pages);
            
            // 상태 표시 업데이트
            statusDisplay.classList.add('hidden');
            dbContentSection.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
            statusDisplay.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 1.8rem;"></i>
                <div>
                    <h3 style="color: #ef4444;">연결 실패</h3>
                    <p>${error.message}</p>
                </div>
            `;
            statusDisplay.classList.remove('hidden');
            dbContentSection.classList.add('hidden');
        } finally {
            setLoadingState(btnConnect, connectLoader, false);
        }
    });

    // ── 3. 가져온 노션 페이지 목록 렌더링 ──────────────────
    function renderNotionCards(pages) {
        notionCardsGrid.innerHTML = '';
        pageCountBadge.textContent = `${pages.length} Posts`;

        if (pages.length === 0) {
            notionCardsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; margin-bottom: 10px; display: block; color: var(--text-secondary);"></i>
                    데이터베이스가 비어있거나 발행할 수 있는 포스트가 없습니다.
                </div>
            `;
            return;
        }

        pages.forEach(page => {
            const card = document.createElement('div');
            card.className = 'notion-card';
            
            const tagsHtml = page.tags.map(t => `<span class="tag-badge">${t}</span>`).join('');
            const dateFormatted = new Date(page.createdTime).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            card.innerHTML = `
                <div class="card-thumb">
                    <img src="${page.imageUrl}" alt="${page.title}" onerror="this.src='https://images.unsplash.com/photo-1542435503-956c469947f6?w=800&auto=format&fit=crop&q=60'">
                </div>
                <div class="card-body">
                    <h3>${page.title}</h3>
                    <div class="tags-container">${tagsHtml}</div>
                    <div class="card-footer">
                        <span><i class="fa-regular fa-calendar"></i> ${dateFormatted}</span>
                        <button class="btn-card-action" data-id="${page.id}">발행 검토</button>
                    </div>
                </div>
            `;

            // 발행 검토 버튼 또는 카드 클릭 시 마크다운 파싱 모달 띄우기
            const actionBtn = card.querySelector('.btn-card-action');
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPublishModal(page);
            });
            card.addEventListener('click', () => {
                openPublishModal(page);
            });

            notionCardsGrid.appendChild(card);
        });
    }

    // ── 4. 블로그 발행 검토 모달 열기 ──────────────────
    async function openPublishModal(page) {
        selectedPageData = page;
        
        modalTitle.textContent = page.title;
        modalTags.innerHTML = page.tags.map(t => `<span class="tag-badge">${t}</span>`).join('');
        modalImage.src = page.imageUrl;
        modalMarkdownContent.textContent = '노션 페이지로부터 마크다운 본문을 파싱하고 있습니다...';
        
        previewModal.classList.remove('hidden');

        try {
            // 본문을 미리 마크다운으로 변환해보기 위해 임시 조회 진행 (실제 발행 전 단계)
            const response = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 가상 발행 모드로 본문 데이터만 긁어올 수 있도록 처리 (여기선 똑같이 API를 호출해서 마크다운 텍스트를 미리 보여줍니다)
                body: JSON.stringify({
                    apiKey: localApiKey,
                    pageId: page.id,
                    title: page.title,
                    tags: page.tags,
                    imageUrl: page.imageUrl
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // 마크다운 내용 세팅
            modalMarkdownContent.textContent = data.post.content || '본문 내용이 비어있습니다.';
        } catch (error) {
            modalMarkdownContent.textContent = `본문 마크다운 변환 실패: ${error.message}`;
            showToast('마크다운 본문 조회 실패', 'error');
        }
    }

    // ── 5. 최종 블로그 발행 진행 ──────────────────
    btnModalPublish.addEventListener('click', async () => {
        if (!selectedPageData) return;

        setLoadingState(btnModalPublish, modalPublishLoader, true);

        try {
            const response = await fetch('/api/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: localApiKey,
                    pageId: selectedPageData.id,
                    title: selectedPageData.title,
                    tags: selectedPageData.tags,
                    imageUrl: selectedPageData.imageUrl
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            // 성공 반응 실행
            closeModal();
            triggerSuccessEffects(selectedPageData.title);
            loadPublishedPosts(); // 목록 리프레시

        } catch (error) {
            console.error(error);
            showToast(`발행 실패: ${error.message}`, 'error');
        } finally {
            setLoadingState(btnModalPublish, modalPublishLoader, false);
        }
    });

    // ── 6. 발행 결과 시뮬레이션 목록 렌더링 ──────────────────
    async function loadPublishedPosts() {
        try {
            const response = await fetch('/api/posts');
            const data = await response.json();

            if (data.success) {
                renderPublishedList(data.posts);
            }
        } catch (error) {
            console.error('Published list load error:', error);
        }
    }

    function renderPublishedList(posts) {
        publishedList.innerHTML = '';

        if (posts.length === 0) {
            publishedList.innerHTML = '<p class="empty-state">아직 블로그로 발행된 게시물이 없습니다. 노션에서 글을 선택해 발행해 보세요!</p>';
            return;
        }

        posts.forEach(post => {
            const item = document.createElement('div');
            item.className = 'published-item';

            const dateFormatted = new Date(post.publishedAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            item.innerHTML = `
                <div class="pub-info">
                    <h4>${post.title}</h4>
                    <div class="pub-meta">
                        <span><i class="fa-solid fa-hashtag"></i>${post.tags.join(', ') || '태그 없음'}</span>
                        <span><i class="fa-regular fa-clock"></i>${dateFormatted} 에 발행됨</span>
                    </div>
                </div>
                <div class="pub-status">
                    <span class="status-active-badge"><i class="fa-solid fa-circle-check"></i> 게시 완료</span>
                </div>
            `;
            publishedList.appendChild(item);
        });
    }

    btnRefreshPosts.addEventListener('click', loadPublishedPosts);

    // ── 7. 모달 & 로딩 UI 유틸리티 ──────────────────
    function closeModal() {
        previewModal.classList.add('hidden');
        selectedPageData = null;
    }

    modalCloseBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            closeModal();
        }
    });

    function setLoadingState(button, loader, isLoading) {
        if (isLoading) {
            button.disabled = true;
            loader.classList.remove('hidden');
            button.querySelector('span').style.opacity = '0.5';
        } else {
            button.disabled = false;
            loader.classList.add('hidden');
            button.querySelector('span').style.opacity = '1';
        }
    }

    // ── 8. 화려한 발행 완료 알림 및 폭죽(Confetti) 이펙트 ──────────────────
    function triggerSuccessEffects(postTitle) {
        // 1. Toast 알림 팝업
        showToast(`🎉 [${postTitle}] 게시 완료!`, 'success');

        // 2. Confetti 폭죽 쏘아올리기
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // 두 군데에서 번갈아가면서 축하 폭죽 연출
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }

    // ── 9. 커스텀 토스트 알림 ──────────────────
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconClass = type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
        
        toast.innerHTML = `
            <i class="${iconClass} toast-icon"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);

        // 3.5초 뒤 토스트 제거
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const previewSection = document.getElementById('preview-section');
    const previewImg = document.getElementById('preview-img');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultSection = document.getElementById('result-section');
    const resultLabel = document.getElementById('result-label');
    const probabilityBar = document.getElementById('probability-bar');
    const probabilityText = document.getElementById('probability-text');
    const resultDescription = document.getElementById('result-description');
    const resetBtn = document.getElementById('reset-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const uploadSection = document.querySelector('.upload-section');

    let currentFile = null;

    // Trigger file input click when browse button is clicked
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection from input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Handle Drag and Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropArea.classList.add('highlight');
    }

    function unhighlight(e) {
        dropArea.classList.remove('highlight');
    }

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        let dt = e.dataTransfer;
        let files = dt.files;

        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    // Process selected file
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        currentFile = file;

        // Create object URL for preview
        const objectUrl = URL.createObjectURL(file);
        previewImg.src = objectUrl;

        // Update UI
        uploadSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        resultSection.classList.add('hidden');
    }

    // Handle Analyze Button Click
    analyzeBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Show loading
        loadingOverlay.classList.remove('hidden');

        // Create form data
        const formData = new FormData();
        formData.append('image', currentFile);

        try {
            // Send request to Flask backend
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showResult(data);
            } else {
                alert(`오류: ${data.error || '알 수 없는 오류가 발생했습니다.'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        } finally {
            // Hide loading
            loadingOverlay.classList.add('hidden');
        }
    });

    // Display result data
    function showResult(data) {
        previewSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        resultLabel.textContent = data.label;
        resultDescription.textContent = data.description;
        
        // Animate probability bar
        setTimeout(() => {
            probabilityBar.style.width = `${data.probability}%`;
            probabilityText.textContent = `${data.probability}% 일치`;
        }, 100);
    }

    // Reset UI
    resetBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        
        // Reset UI state
        uploadSection.classList.remove('hidden');
        previewSection.classList.add('hidden');
        resultSection.classList.add('hidden');
        
        // Reset progress bar
        probabilityBar.style.width = '0%';
        probabilityText.textContent = '0%';
        
        // Revoke object URL to free memory
        if (previewImg.src) {
            URL.revokeObjectURL(previewImg.src);
            previewImg.src = '';
        }
    });
});

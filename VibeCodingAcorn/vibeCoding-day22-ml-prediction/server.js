const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── 캐시 완전 비활성화 (static 파일 포함) ──────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'upload-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const fileFilter = (req, file, cb) => {
  const extOk = /csv|xlsx|xls/.test(path.extname(file.originalname).toLowerCase());
  extOk ? cb(null, true) : cb(new Error('CSV 또는 Excel 파일만 지원합니다.'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── 샘플 CSV 다운로드 ────────────────────────────────────────────────────────
app.get('/api/sample', (req, res) => {
  const p = path.join(__dirname, 'Sample-100-superstore.csv');
  if (!fs.existsSync(p)) return res.status(404).json({ error: '샘플 파일이 없습니다.' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Sample-100-superstore.csv"');
  fs.createReadStream(p).pipe(res);
});

// ─── 핵심: POST /api/upload → PDF 바이너리 직접 반환 ─────────────────────────
// 클라이언트가 fetch로 arrayBuffer를 받아 showSaveFilePicker로 저장
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일을 선택해 주세요.' });

  const inputPath = req.file.path;
  const outputPath = path.join(OUTPUT_DIR, `report-${Date.now()}.pdf`);

  console.log(`[Server] Processing: ${req.file.originalname}`);

  const py = spawn('python', ['report_generator.py', inputPath, outputPath]);
  let stderr = '';
  py.stdout.on('data', d => process.stdout.write(d));
  py.stderr.on('data', d => { stderr += d; });

  py.on('close', code => {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) {}

    if (code !== 0 || !fs.existsSync(outputPath)) {
      console.error('[Python Error]\n', stderr);
      return res.status(500).json({ error: 'PDF 생성 실패', details: stderr });
    }

    const size = fs.statSync(outputPath).size;
    // PDF 바이너리를 직접 응답 — 클라이언트가 arrayBuffer()로 수신
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', size);
    // Content-Disposition 없음 → 클라이언트 showSaveFilePicker가 파일명 결정
    
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('end', () => {
      setTimeout(() => {
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
      }, 5000);
    });
    stream.on('error', err => {
      console.error('[Stream Error]', err);
      if (!res.headersSent) res.status(500).json({ error: '파일 전송 오류' });
    });
  });
});

// ─── 오래된 파일 자동 정리 ───────────────────────────────────────────────────
setInterval(() => {
  [UPLOAD_DIR, OUTPUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach(f => {
        const fp = path.join(dir, f);
        fs.stat(fp, (e, s) => {
          if (!e && Date.now() - s.mtimeMs > 600000)
            fs.unlink(fp, () => console.log('[Cleanup]', f));
        });
      });
    });
  });
}, 600000);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: `업로드 에러: ${err.message}` });
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('===============================================');
  console.log(`🚀 Sales Report Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log('===============================================');
});

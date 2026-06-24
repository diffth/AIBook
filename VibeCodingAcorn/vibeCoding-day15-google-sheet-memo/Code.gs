// ===== Google Apps Script - Sheet Memo Backend =====
// 이 코드를 Google Apps Script 에디터에 붙여넣으세요.
// 자세한 설정 방법은 SETUP.md를 참고하세요.

/**
 * GET 요청 처리 - 메모 목록 조회
 * URL?action=list 로 호출
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'list';
    
    if (action === 'list') {
      const memos = getAllMemos();
      return createJsonResponse({ status: 'success', memos: memos });
    }
    
    return createJsonResponse({ status: 'error', message: '알 수 없는 요청입니다.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * POST 요청 처리 - 메모 저장 / 삭제
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'save') {
      saveMemo(data);
      return createJsonResponse({ status: 'success', message: '메모가 저장되었습니다.' });
    }
    
    if (action === 'delete') {
      deleteMemo(data.id);
      return createJsonResponse({ status: 'success', message: '메모가 삭제되었습니다.' });
    }
    
    return createJsonResponse({ status: 'error', message: '알 수 없는 action입니다.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * 'memo' 시트 가져오기 (없으면 생성)
 */
function getSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('memo');
  
  // 시트가 없으면 자동 생성 + 헤더 추가
  if (!sheet) {
    sheet = ss.insertSheet('memo');
    sheet.appendRow(['id', '날짜', '제목', '카테고리', '내용']);
    
    // 헤더 스타일링
    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setBackground('#7c5cfc');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 열 너비 설정
    sheet.setColumnWidth(1, 160);  // id
    sheet.setColumnWidth(2, 180);  // 날짜
    sheet.setColumnWidth(3, 200);  // 제목
    sheet.setColumnWidth(4, 100);  // 카테고리
    sheet.setColumnWidth(5, 400);  // 내용
    
    // 헤더 고정
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * 모든 메모 조회 (날짜순 자동 정렬)
 */
function getAllMemos() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return []; // 헤더만 있는 경우
  
  // 날짜 기준 내림차순 정렬 (최신순)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 5);
  dataRange.sort({ column: 2, ascending: false });
  
  const data = dataRange.getValues();
  
  return data.map(row => ({
    id: String(row[0]),
    date: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
    title: String(row[2]),
    category: String(row[3]),
    content: String(row[4])
  }));
}

/**
 * 새 메모 저장
 */
function saveMemo(data) {
  const sheet = getSheet();
  const id = new Date().getTime().toString();
  const date = data.date || new Date().toISOString();
  
  sheet.appendRow([
    id,
    date,
    data.title || '',
    data.category || '기타',
    data.content || ''
  ]);
  
  // 저장 후 날짜 기준 내림차순 정렬
  const lastRow = sheet.getLastRow();
  if (lastRow > 2) {
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 5);
    dataRange.sort({ column: 2, ascending: false });
  }
  
  return id;
}

/**
 * 메모 삭제
 */
function deleteMemo(id) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return;
  
  const idColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]) === String(id)) {
      sheet.deleteRow(i + 2); // +2 because of header and 0-index
      return;
    }
  }
}

/**
 * JSON 응답 생성 헬퍼
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 초기 설정 테스트 함수
 * Apps Script 에디터에서 이 함수를 실행하여 시트가 올바르게 생성되는지 확인하세요.
 */
function testSetup() {
  const sheet = getSheet();
  Logger.log('✅ memo 시트가 준비되었습니다!');
  Logger.log('시트 이름: ' + sheet.getName());
  Logger.log('현재 행 수: ' + sheet.getLastRow());
  
  // 테스트 메모 추가
  saveMemo({
    title: '테스트 메모',
    category: '기타',
    content: '이 메모는 Apps Script 테스트용입니다. 정상적으로 저장되면 설정 완료!'
  });
  Logger.log('✅ 테스트 메모가 저장되었습니다!');
}

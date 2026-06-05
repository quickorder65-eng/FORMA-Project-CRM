const SHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Leads';
const SECRET_KEY = 'PASTE_YOUR_SECRET_KEY_HERE';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!body.secret || body.secret !== SECRET_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Unauthorized'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const row = [
      new Date(),
      body.source || '',
      body.name || '',
      body.phone || '',
      body.contactMethod || '',
      body.objectType || '',
      body.area || '',
      body.serviceType || '',
      body.repairLevel || '',
      body.startTime || '',
      body.priority || '',
      body.comment || '',
      body.quizAnswers ? JSON.stringify(body.quizAnswers) : '',
      body.pageUrl || '',
      body.userAgent || '',
      body.status || 'Новая заявка'
    ];

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Lead saved'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

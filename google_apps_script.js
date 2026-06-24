/**
 * Google Apps Script backend for the Questionnaire App.
 * Logs submission details and answers to a spreadsheet and sends an email.
 */

function doPost(e) {
  try {
    // Parse the incoming JSON payload
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Ensure sheet headers exist on first run
    if (sheet.getLastRow() === 0) {
      var initialHeaders = ["Timestamp", "Total Clicks", "Time Spent (s)"];
      data.answers.forEach(function (item) {
        initialHeaders.push(item.questionText);
      });
      sheet.appendRow(initialHeaders);

      // Style headers beautifully
      var headerRange = sheet.getRange(1, 1, 1, initialHeaders.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#FFF0F5"); // Soft lavender/pink blush
      headerRange.setFontColor("#C71585"); // Medium violet red
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Read the current headers
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowData = new Array(headers.length);

    // Map standard fields
    rowData[0] = data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString();
    rowData[1] = data.totalClicks || 0;
    rowData[2] = data.timeSpentSeconds || 0;

    // Map question answers to their correct columns dynamically
    data.answers.forEach(function (item) {
      var colIndex = headers.indexOf(item.questionText);
      if (colIndex === -1) {
        // If the question header does not exist, append it
        var newCol = sheet.getLastColumn() + 1;
        sheet.insertColumnAfter(sheet.getLastColumn());

        var headerCell = sheet.getRange(1, newCol);
        headerCell.setValue(item.questionText);
        headerCell.setFontWeight("bold");
        headerCell.setBackground("#FFF0F5");
        headerCell.setFontColor("#C71585");

        headers.push(item.questionText);
        rowData.push(item.answer);
      } else {
        rowData[colIndex] = item.answer;
      }
    });

    // Append the row to the sheet
    sheet.appendRow(rowData);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, sheet.getLastColumn());

    // Send email notification to sheet owner
    sendNotificationEmail(data);

    // Return standard success response to client
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Response logged and email sent successfully"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return standard error response
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sends a stylized HTML email with a breakdown of the questionnaire answers.
 */
function sendNotificationEmail(data) {
  var email = PropertiesService.getScriptProperties().getProperty("EMAIL_ADDRESS");

  var subject = "New Questionnaire Response Received!";

  var htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ffe4e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #ffb6c1 0%, #ff8da1 100%); padding: 25px 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">New Response Received!</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">A user just completed your mobile questionnaire</p>
      </div>
      
      <div style="padding: 25px; background-color: #fffafb;">
        <h3 style="margin-top: 0; color: #b03060; border-bottom: 2px solid #ffd1dc; padding-bottom: 8px; font-size: 16px;">Engagement Metrics</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #666; font-size: 14px;">Submitted At</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #333; font-weight: 600; text-align: right; font-size: 14px;">${new Date(data.timestamp).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #666; font-size: 14px;">Total Button Clicks</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #d02090; font-weight: 600; text-align: right; font-size: 14px;">${data.totalClicks} clicks</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #666; font-size: 14px;">Time Elapsed</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e1; color: #333; font-weight: 600; text-align: right; font-size: 14px;">${data.timeSpentSeconds} seconds</td>
          </tr>
        </table>
        
        <h3 style="color: #b03060; border-bottom: 2px solid #ffd1dc; padding-bottom: 8px; font-size: 16px; margin-bottom: 15px;">Questionnaire Answers</h3>
        <div style="margin-top: 10px;">
  `;

  data.answers.forEach(function (item, idx) {
    htmlBody += `
      <div style="margin-bottom: 15px; padding: 15px; background: #fff5f6; border-left: 4px solid #ff8da1; border-radius: 6px; box-shadow: 0 2px 4px rgba(255, 141, 161, 0.05);">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #555; font-size: 14px;">Q${idx + 1}: ${item.questionText}</p>
        <p style="margin: 0; color: #b03060; font-size: 16px; font-weight: 700; display: flex; align-items: center;">👉 <span style="margin-left: 6px;">${item.answer}</span></p>
      </div>
    `;
  });

  htmlBody += `
        </div>
      </div>
      
      <div style="background-color: #ffeef2; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ffd1dc;">
        Made with Antigravity Questionnaire Builder 💖
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

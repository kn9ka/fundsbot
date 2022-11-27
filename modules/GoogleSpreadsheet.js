const google = require('googleapis').google;
const SRVC_ACCOUNT_CREDS = require('./serviceAccount.json');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE_SPREADSHEET_ID = '1gr2F7ZzjihJwAHbrxAEsIhzcMLKW4lNmHDXLYj-3Gkw';
const BASE_SPREADSHEET_TAB_ID = '1';
const BASE_RANGE = 'A2:G';
const GOOGLE_API_VERS = 'v4';

class GoogleSpreadsheet {
  constructor() {
    this.client = null;
    this.sheets = null;
  }

  init = async () => {
    return await this.auth().then(() => {
      return this;
    });
  };

  auth = async () => {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: SRVC_ACCOUNT_CREDS,
        scopes: SCOPES,
      });
      const client = await auth.getClient();
      this.client = client;
      this.sheets = google.sheets({ version: GOOGLE_API_VERS, auth: client });
    } catch (err) {
      throw err;
    }
  };

  getRangeData = async (range) => {
    if (!this.sheets) {
      return;
    }
    try {
      const rows = await this.sheets.spreadsheets.values.get({
        spreadsheetId: BASE_SPREADSHEET_ID,
        range: `${BASE_SPREADSHEET_TAB_ID}!${range}`,
      });
      return rows.data.values;
    } catch (err) {
      throw err;
    }
  };

  getDataByUser = async (userName) => {
    if (!this.sheets) {
      return;
    }
    try {
      const rows = await this.getRangeData(BASE_RANGE);

      if (!userName) {
        return rows;
      }
      return rows.filter(([, , , , , rowUserName]) => userName === rowUserName);
    } catch (err) {
      throw err;
    }
  };

  deactivateDebtByUser = async (userName) => {
    if (!this.sheets) {
      return;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: BASE_SPREADSHEET_ID,
        range: `${BASE_SPREADSHEET_TAB_ID}!${BASE_RANGE}`,
      });

      const rows = response.data.values;
      const updated = rows.map((row) => {
        const [msgId, amount, reason, place, msgDate, rowUserName, isActive] =
          row;
        if (rowUserName === userName) {
          return [msgId, amount, reason, place, msgDate, userName, 'FALSE'];
        }
        return row;
      });

      return await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: BASE_SPREADSHEET_ID,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          data: {
            range: `${BASE_SPREADSHEET_TAB_ID}!${BASE_RANGE}`,
            values: [...updated],
          },
        },
      });
    } catch (err) {
      throw err;
    }
  };

  writeRow = async (data) => {
    if (!this.sheets || !(data || []).length) {
      return;
    }
    try {
      return this.sheets.spreadsheets.values.append({
        spreadsheetId: BASE_SPREADSHEET_ID,
        range: `${BASE_SPREADSHEET_TAB_ID}!A1`,
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[...data]],
        },
      });
    } catch (err) {
      throw err;
    }
  };
}

const client = new GoogleSpreadsheet();
client.init();

module.exports = client;

declare const google: any;

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
].join(' ');

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

export const getAccessToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiresAt) {
      return resolve(accessToken);
    }

    if (!CLIENT_ID) {
      return reject(new Error('VITE_GOOGLE_CLIENT_ID is not configured in settings.'));
    }

    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            accessToken = response.access_token;
            // Access tokens typically expire in 3600 seconds (1 hour)
            tokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
            resolve(accessToken);
          } else {
            reject(new Error('Failed to get access token: ' + (response.error || 'Unknown error')));
          }
        },
      });
      client.requestAccessToken();
    } catch (error) {
      reject(error);
    }
  });
};

export async function fetchSpreadsheetData(spreadsheetId: string, range: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to fetch spreadsheet data');
  }
  
  return await res.json();
}

/**
 * Fetches all relevant sheets from the spreadsheet.
 * Expected sheet names correspond to the tabs in our app.
 */
export async function syncFromGoogleSheets(spreadsheetId: string) {
  const ranges = [
    'Brand Info!A1:Z1000',
    'Class Info!A1:Z1000',
    'Unit Info!A1:Z1000',
    'Sales!A1:Z10000',
    'Profits!A1:Z10000',
    'MD Status!A1:Z1000',
    'Sub Fees!A1:Z1000',
    'Project Status!A1:Z1000',
    'Project Link!A1:Z1000',
    'Base Plan!A1:Z1000',
    'Units!A1:Z1000'
  ];

  // We can fetch metadata first to see which sheets exist
  const token = await getAccessToken();
  const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!metadataRes.ok) {
    const error = await metadataRes.json();
    throw new Error(error.error?.message || 'Failed to fetch spreadsheet metadata');
  }
  
  const metadata = await metadataRes.json();
  const availableSheets = metadata.sheets.map((s: any) => s.properties.title);
  
  const results: any = {};
  
  for (const rangeSpec of ranges) {
    const sheetName = rangeSpec.split('!')[0];
    if (availableSheets.includes(sheetName)) {
      const data = await fetchSpreadsheetData(spreadsheetId, rangeSpec);
      results[sheetName] = data.values;
    }
  }
  
  return results;
}

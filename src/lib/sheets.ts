import axios from 'axios';

export async function syncToGoogleSheets(sheetName: string, data: any[], spreadsheetId?: string) {
  try {
    const response = await axios.post('/api/sync', {
      sheetName,
      data,
      spreadsheetId
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

export async function getSheetConfig() {
  const response = await axios.get('/api/config');
  return response.data;
}

export async function loadPersistentData(store: string) {
  const response = await axios.get('/api/data/load', { params: { store } });
  return response.data;
}

export async function savePersistentData(data: { classInfo: any[]; sales: any[]; [key: string]: any }, store: string) {
  const response = await axios.post('/api/data/save', data, { params: { store } });
  return response.data;
}

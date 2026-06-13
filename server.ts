import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ limit: '250mb', type: ['image/jpeg', 'application/octet-stream'] }));

  // File Persistence Setup
  const DATA_DIR = path.join(process.cwd(), 'data');
  const PERSIST_FILE = path.join(DATA_DIR, 'persist.json');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  // API Routes
  app.post('/api/r2-presign', async (req, res) => {
    try {
      const { accountId, accessKeyId, secretAccessKey, bucketName, fileName, contentType } = req.body;
      
      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !fileName) {
        return res.status(400).json({ error: 'Missing required credentials or fileName' });
      }

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/jpeg',
      });

      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      res.json({ signedUrl, fileName });
    } catch (error: any) {
      console.error('R2 presign error:', error);
      res.status(500).json({ error: error.message || 'Presign failed' });
    }
  });

  app.post('/api/r2-upload', async (req, res) => {
    try {
      const accountId = req.headers['x-r2-account-id'] as string || req.body.accountId;
      const accessKeyId = req.headers['x-r2-access-key-id'] as string || req.body.accessKeyId;
      const secretAccessKey = req.headers['x-r2-secret-access-key'] as string || req.body.secretAccessKey;
      const bucketName = req.headers['x-r2-bucket-name'] as string || req.body.bucketName;
      let fileName = req.headers['x-r2-file-name'] as string || req.body.fileName || 'Data_Mapping_Export.jpeg';
      try {
        fileName = decodeURIComponent(fileName);
      } catch (e) {
        // Ignore decode error
      }

      if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        console.error('Missing credentials');
        return res.status(400).json({ error: 'Missing required credentials' });
      }

      let buffer: Buffer;
      if (Buffer.isBuffer(req.body)) {
        buffer = req.body;
      } else if (req.body && req.body.fileBase64) {
        const base64Data = req.body.fileBase64.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        console.error('No file data received. req.body is buffer:', Buffer.isBuffer(req.body), 'type:', typeof req.body, 'keys:', Object.keys(req.body || {}));
        return res.status(400).json({ error: 'No file data received' });
      }

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: 'image/jpeg',
      });

      await s3.send(command);
      res.json({ success: true, message: 'Uploaded successfully to Cloudflare R2' });
    } catch (error: any) {
      console.error('R2 upload proxy error:', error);
      res.status(500).json({ error: error.message || 'R2 upload failed' });
    }
  });
  app.get('/api/data/load', (req, res) => {
    try {
      const store = req.query.store || 'HCM';
      const persistFile = path.join(DATA_DIR, `persist_${store}.json`);
      const legacyFile = path.join(DATA_DIR, 'persist.json');

      if (fs.existsSync(persistFile)) {
        const raw = fs.readFileSync(persistFile, 'utf-8');
        res.json(JSON.parse(raw));
      } else if (store === 'HCM' && fs.existsSync(legacyFile)) {
        const raw = fs.readFileSync(legacyFile, 'utf-8');
        res.json(JSON.parse(raw));
      } else {
        res.json({ classInfo: [], sales: [] });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load persistent data' });
    }
  });

  app.post('/api/data/save', (req, res) => {
    try {
      const store = req.query.store || 'HCM';
      const persistFile = path.join(DATA_DIR, `persist_${store}.json`);
      const bodyData = req.body;
      const data = { 
        ...bodyData,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(persistFile, JSON.stringify(data, null, 2));
      res.json({ success: true, timestamp: data.lastUpdated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to save backup' });
    }
  });

  app.post('/api/purge-cache', async (req, res) => {
    try {
      const { zoneId, apiToken, files } = req.body;
      if (!zoneId || !apiToken) {
        return res.status(400).json({ error: 'Missing Cloudflare Zone ID or API Token' });
      }

      // if files are explicitly provided, use them; otherwise purge everything on the zone
      const requestBody = files && files.length > 0 ? { files } : { purge_everything: true };

      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0]?.message || 'Cloudflare API Error');
      }

      res.json({ success: true, message: 'Cache purged successfully' });
    } catch (error: any) {
      console.error('Purge cache error:', error);
      res.status(500).json({ error: error.message || 'Failed to purge cache' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

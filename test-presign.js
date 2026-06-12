import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function test() {
  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://test.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });

    const command = new PutObjectCommand({
      Bucket: 'test',
      Key: 'test.jpeg',
      ContentType: 'image/jpeg',
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log('Success:', signedUrl);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();

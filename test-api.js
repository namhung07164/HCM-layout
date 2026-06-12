async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'test',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        bucketName: 'test',
        fileName: 'test.jpeg',
        contentType: 'image/jpeg'
      })
    });
    console.log(res.status, res.statusText);
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error(err);
  }
}
test();

import fs from 'fs';
fetch('http://localhost:3000/api/r2-upload', {
  method: 'POST',
  headers: {
    'x-r2-account-id': '564ce56c7fe008fb6f47579d122e64a7',
    'x-r2-access-key-id': 'e628dd12b63f630f0c8accb1b879313e',
    'x-r2-secret-access-key': '8814668c5dcac72dd5b030687eb5dfbaadbf9e5346e23aa153fd76caf70d4d1b',
    'x-r2-bucket-name': 'hcmlayout',
    'x-r2-file-name': 'test.txt',
    'Content-Type': 'application/octet-stream'
  },
  body: Buffer.from("Hello from Node.js")
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
});

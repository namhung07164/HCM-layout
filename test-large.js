import axios from 'axios';
const bigData = { test: 'a'.repeat(60 * 1024 * 1024) }; // 60MB
axios.post('http://localhost:3000/api/data/save', bigData)
  .then(r => console.log('OK', r.status))
  .catch(e => {
     console.error('ERROR status:', e.response?.status, e.message);
  });

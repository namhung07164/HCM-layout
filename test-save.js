import axios from 'axios';
axios.post('http://localhost:3000/api/data/save', {})
  .then(r => console.log('OK', r.status))
  .catch(e => console.error('ERROR', e.response?.status, e.message));

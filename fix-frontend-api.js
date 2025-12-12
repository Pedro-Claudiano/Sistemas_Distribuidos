// Script para corrigir as URLs da API no frontend
const fs = require('fs');
const path = require('path');

const API_URL = 'http://100.48.78.63:3000/api';

const files = [
  'frontend/src/pages/RoomSelection.jsx',
  'frontend/src/pages/Profile.jsx',
  'frontend/src/pages/ClientNotifications.jsx',
  'frontend/src/pages/AdminRooms.jsx',
  'frontend/src/pages/AdminReservations.jsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/const API_BASE_URL = '\/api';/g, `const API_BASE_URL = '${API_URL}';`);
    fs.writeFileSync(file, content);
    console.log(`Corrigido: ${file}`);
  }
});

console.log('URLs da API corrigidas!');
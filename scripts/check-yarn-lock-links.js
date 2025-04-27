const fs = require('fs');
const https = require('https');
const http = require('http');

const lockFilePath = '/Users/dongou/Documents/GitHub/network-rc/front-end/yarn.lock';
const content = fs.readFileSync(lockFilePath, 'utf-8');
const urlRegex = /resolved "(https?:\/\/[^"]+)"/g;

const urls = [];
let match;
while ((match = urlRegex.exec(content)) !== null) {
  urls.push(match[1]);
}

function checkUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      resolve({ url, status: res.statusCode });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 'error' }));
    req.setTimeout(5000, () => {
      req.abort();
      resolve({ url, status: 'timeout' });
    });
  });
}

(async () => {
  console.log(`共检测到 ${urls.length} 个链接，正在验证...`);
  const results = await Promise.all(urls.map(checkUrl));
  const invalid = results.filter(r => r.status !== 200);
  if (invalid.length === 0) {
    console.log('所有链接均有效！');
  } else {
    console.log('以下链接无效或超时：');
    invalid.forEach(r => console.log(`${r.url} [${r.status}]`));
  }
})();
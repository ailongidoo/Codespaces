// 云端中转服务（运行在Codespaces）
const WebSocket = require('ws');
const http = require('http');
const { Buffer } = require('buffer');

// 配置：监听8080端口（Codespaces可暴露公网）
const PORT = 8080;
// 存储本地客户端连接
let localClientConn = null;

// 启动HTTP服务，同时支持WebSocket升级
const server = http.createServer((req, res) => {
  // 处理HTTP请求（如/fxj2/api/hit）
  if (req.method === 'POST' && req.url === '/fxj2/api/hit') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!localClientConn) {
        res.writeHead(503);
        res.end('本地客户端未连接');
        return;
      }
      // 封装请求消息，发送给本地客户端
      const reqId = Date.now().toString();
      localClientConn.send(JSON.stringify({
        type: 'request',
        id: reqId,
        data: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body
        }
      }));
      // 监听本地客户端响应
      const onResponse = (msg) => {
        const resData = JSON.parse(msg.data);
        if (resData.id === reqId) {
          localClientConn.removeListener('message', onResponse);
          res.writeHead(resData.statusCode, resData.headers);
          res.end(resData.body);
        }
      };
      localClientConn.addEventListener('message', onResponse);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// 升级WebSocket连接（对接你的本地客户端）
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('本地客户端已连接');
  localClientConn = ws;
  ws.on('close', () => {
    console.log('本地客户端断开连接');
    localClientConn = null;
  });
  ws.on('message', (msg) => {
    // 接收本地客户端的响应消息，无需额外处理
  });
});

// 启动服务
server.listen(PORT, () => {
  console.log(`中转服务已启动，公网地址：https://${process.env.CODESPACES_NAME}-${PORT}.app.github.dev`);
});

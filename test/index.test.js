const fs = require('fs');
const path = require('path');
const { onAction, useMiddleware, useState, useAction } = require('../index');

useState({
   customJson: 'i am custom json.'
});
useMiddleware(devLog);
useMiddleware(sentPackage);
useMiddleware(useAction({
   dir: path.resolve(__dirname, './actions/'),
   baseURL: 'http://localhost:8000'
}));

async function devLog(ctx, next) {
   const startTime = Date.now();
   console.log(ctx.state.customJson);
   await next();
   console.log('-<' + ctx.req.url + '>-', Date.now() - startTime + 'ms');
}

async function sentPackage(ctx, next) {
   ctx.body = fs.createReadStream('../package.json');
   ctx.res.setHeader(
      'X-Foo', 'text/json'
   );
   ctx.res.writeHead(200, {
      'Content-Type': 'text/application'
   });
}

require('http').createServer(onAction).on('error', (err) => {
   console.log(err);
}).on('close', () => {
   console.log('server is closed.');
}).listen(8000, () => {
   console.log('server is running', 8000);
});


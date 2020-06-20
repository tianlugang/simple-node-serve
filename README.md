# simple nodejs server

* 这是一个简单`nodejs`业务服务器，意图将每种业务操作封装成一个函数（`action`），借鉴了`koa`的中间件设计模式，同时提倡函数式编程，多写函数没坏处

* 既然是将各类业务操作封装为`action`,那么并不需要传统意义上的路由，业务操作名称即是请求的URL的`pathname`，同时也是业务关闭文件的名称，中间的匹配过程很简单，如下
```js
    var actions = Object.create(null);

    actions.sign = function sign(ctx, next){
        // 用户登录
    }

    // 用户可使用 /sign对应到此接口
```
---
## 用例
`test`文件夹里实现了一个简单的demo
```js
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

```
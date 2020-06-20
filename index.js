const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const Stream = require('stream');

const middleware = [];
const actions = Object.create(null);
const state = Object.create(null);

/**
 * 定义静态数据
 * @param  {...any} args 
 */
function useState(...args) {
    args.forEach(function (object) {
        if (typeof object === 'object') {
            for (const name in object) {
                state[name] = object[name];
            }
        }
    });
}

/**
 * 使用中间件
 * @param {function} fn 
 */
function useMiddleware(fn) {
    switch (Object.prototype.toString.call(fn)) {
        case '[object GeneratorFunction]':
        case '[object AsyncFunction]':
            return middleware.push(fn);
    }

    throw new Error('Middleware must be an async function.')
}

/**
 * 触发中间件
 * @param {*} ctx 
 */
function composeMiddleware(ctx) {
    var i = 0, boundary = middleware.length, fn;

    async function next(stop) {
        if (stop) return;
        if (i < boundary) {
            fn = middleware[i];
            i++;

            return await fn(ctx, next);
        }
    }
    return next();
}

/**
 * 匹配 action
 * @param {URL} url
 */
async function matchAction(url, auth) {
    const isAuth = await auth(url);

    return isAuth ? actions[url.pathname] : 'Disabled resource.';
}

/**
 * 加载 action
 * @param {PathLinke} dir 
 */
function loadAction(dir) {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const { name, ext } = path.parse(file);

        if (ext === '.js' || ext === '.json') {
            actions['/' + name] = require(path.join(dir, file));
        }
    });
}

/**
 *
 * @param {Object} options
 * @param {Function} options.auth 路由权限认证
 * @param {PathLike} options.baseURL 服务器基本URL
 * @param {PathLike} options.dir
 */
function useAction(options) {
    options = Object.assign({}, options);

    const baseURL = options.baseURL;
    const auth = options.auth || function () { return true; };

    try {
        fs.accessSync(options.dir);
    } catch (error) {
        throw error;
    }

    loadAction(options.dir);
    return async function actionMiddleware(ctx, next) {
        const url = new URL(ctx.req.url, baseURL);
        const match = await matchAction(url, auth);

        switch (typeof match) {
            case 'function':
                await match(ctx, next);
                break;
            case 'object':
                const handle = match.index || match.main;
                switch (typeof handle) {
                    case 'function':
                        await handle.call(match, ctx, next);
                        break;
                    default:
                        if (match.code > 0) {
                            ctx.res.writeHead(200, {
                                'Content-type': 'application/json;charset:utf-8'
                            });
                            ctx.body = match;
                        }
                        break;
                }
                break;
            case 'undefined':
                ctx.res.writeHead(404);
                ctx.body = null;
                break;
            default:
                ctx.body = match;
                break;
        }

        if (ctx.body === 'Disabled resource.') {
            ctx.res.writeHead(401);
        }
        next();
    }
}

function onActionStart(req, res, ctx) {
    if (exports.config.disableFavicon && req.url === '/favicon.ico') {
        res.end();
        ctx.responsed = true;
    }
}

function onActionEnd(ctx) {
    let res = ctx.res;
    let body = ctx.body;
    if ('HEAD' == ctx.method) return res.end();

    if (Buffer.isBuffer(body)) return res.end(body);
    if ('string' == typeof body) return res.end(body);
    if (body instanceof Stream) return body.pipe(res);

    body = JSON.stringify(body);
    res.end(body);
}

function onActionError(err) {
    throw err;
}

/**
 * 服务器监听器
 * @param {Request} req 
 * @param {Response} res 
 */
function onAction(req, res) {
    const ctx = Object.create(null);
    onActionStart(res, res, ctx);

    if (ctx.responsed) return;
    ctx.state = state;
    ctx.req = req;
    ctx.res = res;
    ctx.body = null;
    ctx.method = req.method.toLowerCase();
    

    composeMiddleware(ctx).then(() => onActionEnd(ctx)).catch(onActionError);
}

exports.config = Object.create(null);
exports.onAction = onAction;
exports.useAction = useAction;
exports.useMiddleware = useMiddleware;
exports.useState = useState;
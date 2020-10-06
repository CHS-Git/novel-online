const { Rq, cheerio, iconv, Queue, Dom, checkReplite, redis, ws } = require(global.ROOTPATH + '/common')
const { origin } = require(global.ROOTPATH + '/config')

function emitMsg(id, flag) {
    if (!id) return;
    ws.emit('searchResult', flag, id);
}

function search(name, replite, key, id) {
    let dom = new Dom(replite);
    let href = dom.setHref(name);
    // console.log(`爬取《${name}》中, 来源${replite.name}, 地址: ` + href);
    return new Promise((resolve, reject) => {
        Rq({
            uri: href,
            transform(body, response) {
                return {
                    $: dom.transform(body, replite.searchPageCode),
                    path: response.request.href
                };
            }
        })
        .then((obj) => {
            let $ = obj.$;
            dom.load($);
            let data = dom.getSearchList(obj.path);
            emitMsg(id, 1);

            resolve({
                url: href,
                data,
                origin: dom.get('name'),
                originKey: key
            });
        })
        .catch(err => {
            console.error(`请求 《${name}》${replite.name} 时发生错误: ` + err);
            emitMsg(id, 0);
            reject('请求' + replite.name + '时错误，错误代码: ' + (err.code || err));
        })
    })
}

module.exports = (name = '', origins = [], socketId) => {
    const queue = new Queue('搜索小说');
    return new Promise(async resolve => {
        if (name == '' || origins.length <= 0) {
            resolve({
                msg: '参数错误'
            });
        } else {
            let redisSearchData = await redis.get('data', `search-${name}`);
            if (redisSearchData) {
                resolve(Object.assign(JSON.parse(redisSearchData), {
                    isRedis: true
                }));
                return;
            }

            let result = [];
            let errors = [];

            origins.forEach((key) => {
                let replite = origin[key];
                if (replite && checkReplite(replite)) {
                    queue.push({
                        params: [name, replite, key, socketId],
                        fn: search,
                        async success(data) {
                            result.push(data);
                        },
                        error(err) {
                            errors.push(err);
                        }
                    });
                } else {
                    errors.push(`不能使用${replite.name}的来源`);
                }
            });
            queue.end(async () => {
                let data = {
                    result, errors
                };
                // 缓存一天
                await redis.set('data', `search-${name}`, JSON.stringify(data), 60 * 60 * 24);
                resolve(data)
            })
        }
    })
}
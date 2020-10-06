const { Rq, cheerio, iconv, Queue, Dom, checkReplite, redis, ws, isURL } = require(global.ROOTPATH + '/common')
const { origin } = require(global.ROOTPATH + '/config')

function sendMsg(id, msg){
    if(!id) return;
    ws.emit('infoMsg', msg, id);
}
function sendErrorsMsg(id, msg){
    if(!id) return;
    ws.emit('errorsMsg', msg, id);
}

function getChapterList(uri, replite, socketId){
    let dom = new Dom(replite);
    return new Promise((resolve, reject) => {
        sendMsg(socketId, "正在校验地址正确性...");
        if (!dom.isCorreryUri(uri)) {
            sendMsg(socketId, "错误的地址...");
            reject();
            return;
        }
        sendMsg(socketId, '正在请求网页...');
        Rq({
            uri,
            transform(body, res){
                dom.chapterListUri = res.request.href;
                return dom.transform(body);
            }
        })
        .then($ => {
            sendMsg(socketId, '开始解析页面...');
            dom.load($);
            let data = dom.getChapterList();
            sendMsg(socketId, '解析完毕...');
            resolve(data);
        })
        .catch(err => {
            console.error(`获取书籍详情出错, 路径：${uri}, 错误: ${err}`);
            sendErrorsMsg(socketId, '获取详情出错, 错误代码：' + err.code || err);
            reject();
        })
    })
}

module.exports = (href, key, socketId, cache) => {
    return new Promise(async (resolve, reject) => {
        sendMsg(socketId, '正确进入执行函数中...');
        sendMsg(socketId, '判断参数是否正确...');
        if(!href || !isURL(href) ){
            sendErrorsMsg(socketId, '错误的地址');
            resolve({});
            return;
        }
        if(cache == 'true'){
            let cacheData = await redis.get('data', 'chapter-list-' + href);
            if(cacheData){
                cacheData = JSON.parse(cacheData);
                cacheData.cache = true;
                resolve(cacheData);
                return;
            }
        }
        let data = await getChapterList(href, origin[key], socketId);
        data = Object.assign(data, {
            originkey: key
        })
        await redis.set('data', 'chapter-list-' + href, JSON.stringify(data), 60 * 60);
        sendMsg(socketId, '返回数据...');
        resolve(data);
    })
}
const { socket } = require('../config');
const server = require('http').createServer();
const io = require('socket.io')(server);

class Socket{
    constructor(){
        this.io = io;
        this.users = {};
        this.idIo  = {};
        this.num = 0;
        this.listen();
    }

    listen(){
        this.io.on('connection', client => {
            client.on('conn', (id) => {
                if(!this.users[id]) this.num++;
                this.users[id] = client;
                this.idIo[client.id] = id;
                this.emit('conn', '链接成功', id);
                this.webNumber();
            })
            // this.users[client.id] = client;

            client.on('disconnect', () => {
                delete this.users[this.idIo[client.id]];
                delete this.idIo[client.id];
                this.webNumber();
            })
        });
        server.listen(socket.port, () => {
            console.log(`成功启动socket服务 :${socket.port}`)
        });
    }

    webNumber(){
        this.emit('webPersonNumber', {
            online: Object.keys(this.users).length,
            totalNum: this.num
        });
    }

    emit(name, data, id){
        if(id && !this.users[id]) return;
        let conn = id ? this.users[id] : this.io;
        conn.emit(name, data);
    }
}

let ws = new Socket();

module.exports = ws;
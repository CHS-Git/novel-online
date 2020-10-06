import config from './config'
import {
	toObj,
	toStr,
	getSet,
	getId,
	getBookData,
	setBookData,
	addBookData,
	updateBookData,
    loadFont,
    bottomBarBind,
    userTestToken,
    getBookshelf,
    deleteBookshelf,
    setCookie
} from './tool'
import '../style/bootstrap.css'
import '../style/style.css'
import '../style/checkbox.css'

window.onload = () => {
loadFont();
new Vue({
    el: '#app',
    data: {
        personNumber: 0,
        errors: [],

        list: [],
        isLoad: false,
        manage: false,
        checks: [false, false]
    },
    watch: {
        list(){
            setTimeout(() => {
                $('img.lazyload').lazyload({
                    placeholder: './img/loading.gif',
                    effect: 'fadeIn'
                })
            }, 0);
        }
    },
    computed: {
        
    },
    methods: {
        bindIo(fn){
            this.id = getId();
            this.io.emit('conn', this.id);
            this.io.on('conn', msg => {
                console.log(msg)
                fn.call(this);
                this.io.on('webPersonNumber', res => {
                    this.personNumber = res;
                })
            })
        },
        goBook(data, i){
            if(this.manage){
                this.$set(this.checks, i, !this.checks[i])
                return;
            }
            if(data.chapterHref){
                location.href = '/chapter.html?' + toStr({
                    href: data.chapterHref,
                    key: data.origin,
                    author: data.author,
                    originHref: data.bookHref,
                    bookTitle: data.bookTitle,
                    image: data.bookImage
                })
            } else {
                location.href = '/info.html?' + toStr({
                    href: data.bookHref,
                    key: data.origin
                })
            }
        },
        deleteBook(){
            let flag = confirm('确认删除吗？');
            if(flag){
                this.errors = [];
                this.checks.map((val, i) => {
                    if(!val) return;
                    let data = this.list[i];
                    deleteBookshelf(
                        data.id
                    ).then(res => {
                        this.list = this.list.filter(i => i.id != data.id);
                        // this.list.splice(i, 1);
                        // getBookshelf().then(res => {
                        //     this.isLoad = false;
                        //     this.list = res.data.data.list;
                        // }).catch(err => {
                        //     alert(err.response.data.msg);
                        // })
                    }).catch(err => {
                        this.errors.push(`${data.bookTitle}删除失败`);
                    })
                })
                this.manage = false;
            }
        }
    },
    mounted(){
        this.io = io(`ws://${config.socket.ip}:${config.socket.port}`);
        this.bindIo(() => {
        });

        // 验证是否登录
        this.isLoad = true;
        userTestToken().then(res => {
            getBookshelf().then(res => {
                this.isLoad = false;
                this.list = res.data.data.list;
            }).catch(err => {
                alert(err.response.data.msg);
            })
        }).catch(err => {
            if(err.response.status == 403){
                alert('登录信息失效，请重新登录');
                location.href = `/user.html?type=login&to=bookshelf`;
            } else if(err.response){
                alert(err.response.data.msg)
            }
        })

        $(document).scroll(() => {
            let top = $('html, body').scrollTop();
            if(top >= 500){
                $('.top').show();
            } else {
                $('.top').hide();
            }
        })
		$('.top').click(() => {
			$('html, body').scrollTop(0)
        })
        
        bottomBarBind();
        loadFont();
    }
})
}
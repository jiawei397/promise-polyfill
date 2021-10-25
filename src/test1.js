const PENDING = 'pending'; //进行中
const FULFILLED = 'fulfilled'; //成功
const REJECTED = 'rejected'; //失败

class Promise {
    constructor(fn) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;
        const resolve = (val) => {
            if (this.status !== PENDING) { // 参见第4条，状态变化后就不能再修改了
                return;
            }
            this.status = FULFILLED;
            this.value = val;
            //todo
        };

        const reject = (err) => {
            if (this.status !== PENDING) { // 参见第4条，状态变化后就不能再修改了。
                return;
            }
            this.status = REJECTED;
            this.reason = err;
            //todo
        };
        try {
            fn(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }
}

const PENDING = 'pending'; //进行中
const FULFILLED = 'fulfilled'; //成功
const REJECTED = 'rejected'; //失败

class Promise {
    constructor(fn) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.onFulfilledList = [];
        this.onRejectedList = [];

        const resolve = (val) => {
            if (this.status !== PENDING) { // 参见第4条，状态变化后就不能再修改了
                return;
            }
            this.status = FULFILLED;
            this.value = val;
            //add 
            this.onFulfilledList.forEach((cb) => cb && cb.call(this, val));
            this.onFulfilledList = [];
        };

        const reject = (err) => {
            if (this.status !== PENDING) { // 参见第4条，状态变化后就不能再修改了。
                return;
            }
            this.status = REJECTED;
            this.reason = err;
            // add
            this.onRejectedList.forEach((cb) => cb && cb.call(this, err));
            this.onRejectedList = [];
        };
        try {
            fn(resolve, reject);
        } catch (e) {
            reject(e);
        }
    }

    then(onFulfilled, onRejected) {
        return new Promise((resolve, reject) => {
            const onResolvedFunc = function (val) {
                const cb = function () {
                    try {
                        if (typeof onFulfilled !== 'function') { // 如果成功了，它不是个函数，意味着不能处理，则把当前Promise的状态继续向后传递
                            resolve(val);
                            return;
                        }
                        const x = onFulfilled(val);
                        resolve(x);
                    } catch (e) {
                        reject(e);
                    }
                };
                setTimeout(cb, 0);
            };

            const onRejectedFunc = function (err) {
                const cb = function () {
                    try {
                        if (typeof onRejected !== 'function') { // 如果失败了，它不是个函数，意味着不能处理，则把当前Promise的状态继续向后传递
                            reject(err);
                            return;
                        }
                        const x = onRejected(err);
                        resolve(x); //处理了失败，则意味着要返回的新的promise状态是成功的
                    } catch (e) {
                        reject(e);
                    }
                };
                setTimeout(cb, 0);
            };

            if (this.status === PENDING) {
                this.onFulfilledList.push(onResolvedFunc);
                this.onRejectedList.push(onRejectedFunc);
            } else if (this.status === FULFILLED) {
                // add
                onResolvedFunc(this.value);
            } else {
                // add
                onRejectedFunc(this.reason);
            }
        });
    }

    catch(onRejected) {
        return this.then(null, onRejected);
    }
}

new Promise((resolve, reject) => {
    setTimeout(() => {
        reject('1');
    }, 0);
}).then(function (data) {
    console.log('--ok--', data)
    return '2';
}).catch(function (err) {
    console.log('--catch--', err)
});
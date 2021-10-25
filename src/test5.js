const PENDING = 'pending'; //进行中
const FULFILLED = 'fulfilled'; //成功
const REJECTED = 'rejected'; //失败

const isInBrowser = typeof window !== 'undefined';
const nextTick = function (nextTickHandler) {
    if (isInBrowser) {
        if (typeof MutationObserver !== 'undefined') { // 首选 MutationObserver 
            let counter = 1;
            const observer = new MutationObserver(nextTickHandler); // 声明 MO 和回调函数
            const textNode = document.createTextNode(counter);
            observer.observe(textNode, { // 监听 textNode 这个文本节点
                characterData: true // 一旦文本改变则触发回调函数 nextTickHandler
            });
            const start = function () {
                counter = (counter + 1) % 2; // 每次执行 timeFunc 都会让文本在 1 和 0 间切换
                textNode.data = counter;
            };
            start();
        } else {
            setTimeout(nextTickHandler, 0);
        }
    } else {
        process.nextTick(nextTickHandler);
    }
};

class Promise {

    static deferred() {
        const result = {};
        result.promise = new Promise((resolve, reject) => {
            result.resolve = resolve;
            result.reject = reject;
        });
        return result;
    }

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
                // setTimeout(cb, 0);
                nextTick(cb);
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
                // setTimeout(cb, 0);
                nextTick(cb);
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

module.exports = Promise;
// setTimeout(function () {
//     console.log('4')
// });
// new Promise((resolve, reject) => {
//     console.log('1');
//     resolve();
// }).then(function () {
//     console.log('3')
// });
// console.log('2');
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';
const isInBrowser = typeof window !== 'undefined';
class Promise {
    static isPromise(val) {
        if (val) {
            if (val instanceof Promise) {
                return true;
            }
        }
        return false;
    }

    static resolve(val) {
        if (Promise.isPromise(val)) {
            return val;
        }
        return new Promise((resolve) => {
            if (val && typeof val.then === 'function') { // 如果返回值是个thenable对象，需要处理下
                val.then((res) => {
                    resolve(res);
                });
                return;
            }
            resolve(val);
        });
    }

    static reject(val) {
        //reject不区分是不是Promise
        return new Promise((_, reject) => {
            reject(val);
        });
    }

    /**
     * 用MutationObserver生成浏览器的nextTick，nodejs端则用process.nextTick
     */
    static nextTick(nextTickHandler) {
        // setTimeout(nextTickHandler, 0);
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
    }

    static all(arr) {
        if (!Array.isArray(arr)) {
            throw new TypeError('undefined is not iterable.');
        }
        let count = arr.length;
        const result = [];
        if (count === 0) {
            return Promise.resolve(result);
        }
        return new Promise((resolve, reject) => {
            Promise.resolve(promise).then((res) => {
                count--;
                result[i] = res;
                if (count === 0) {
                    resolve(result);
                }
            }, reject);
        });
    }

    static allSettled(arr) {
        if (!Array.isArray(arr)) {
            throw new TypeError('undefined is not iterable.');
        }
        let count = arr.length;
        const result = [];
        if (count === 0) {
            return Promise.resolve(result);
        }
        return new Promise((resolve) => {
            arr.forEach((promise, i) => {
                Promise.resolve(promise).then((res) => {
                    count--;
                    result[i] = {
                        value: res,
                        status: FULFILLED
                    };
                    if (count === 0) {
                        resolve(result);
                    }
                }, (err) => {
                    count--;
                    result[i] = {
                        reason: err,
                        status: REJECTED
                    };
                    if (count === 0) {
                        resolve(result);
                    }
                });
            });
        });
    }

    static race(arr) {
        if (!Array.isArray(arr)) {
            throw new TypeError('undefined is not iterable.');
        }
        const count = arr.length;
        if (count === 0) {
            return new Promise(() => { }); //返回一个永远pending的promise，这是跟all等不一样的地方
        }
        return new Promise((resolve, reject) => {
            arr.forEach((promise) => {
                Promise.resolve(promise).then(resolve, reject);
            });
        });
    }

    static deferred() {
        const result = {};
        result.promise = new Promise((resolve, reject) => {
            result.resolve = resolve;
            result.reject = reject;
        });
        return result;
    }

    /**
     * 先执行同步代码，替代Promise.resolve().then(func)
     * @example 
     * 
     * const f = () => console.log('now');
     * Promise.try(f);
     * console.log('next');
     */
    static try(func) {
        return new Promise((resolve) => {
            resolve(func());
        });
    }

    constructor(fn) {
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;

        this.onFulfilledList = [];
        this.onRejectedList = [];
        try {
            fn(this.handleResolve.bind(this), this.handleReject.bind(this));
        } catch (e) {
            this.handleReject(e);
        }
    }

    /**
     * 处理成功
     * 就是我们使用的resolve函数
     * @param val 成功参数
     */
    handleResolve(val) {
        if (this.status !== PENDING) {
            return;
        }
        this.status = FULFILLED;
        this.value = val;
        this.onFulfilledList.forEach((cb) => cb && cb.call(this, val));
        this.onFulfilledList = [];
    }

    /**
     * 处理失败
     * 就是我们使用的reject函数
     * @param err 失败信息
     */
    handleReject(err) {
        if (this.status !== PENDING) {
            /**
             * 这种情况抛出的异常不会处理。官方都不会打印错误。
             * new Promise((resolve) => {
             *       resolve('123');
             *       throw new Error('haha');
             *  }).then(console.log)
             *    .catch(err => {
             *      console.error('---', err);
             *     })
             */
            console.error(err);
            return;
        }
        this.status = REJECTED;
        this.reason = err;
        this.onRejectedList.forEach((cb) => cb && cb.call(this, err));
        this.onRejectedList = [];
    }

    then(onFulfilled, onRejected) {
        const promise2 = new Promise((resolve, reject) => {
            const resolvePromise = function (x) {
                if (x === promise2) {
                    reject(new TypeError('The promise and the return value are the same'));
                    return;
                }
                if (x && typeof x === 'object' || typeof x === 'function') {
                    let used; //PromiseA+2.3.3.3.3 只能调用一次
                    try {
                        const then = x.then;
                        if (typeof then === 'function') {
                            //PromiseA+2.3.3
                            then.call(x, (y) => {
                                //PromiseA+2.3.3.1
                                if (used) return;
                                used = true;
                                resolvePromise(y);
                            }, (r) => {
                                //PromiseA+2.3.3.2
                                if (used) return;
                                used = true;
                                reject(r);
                            });
                        } else {
                            //PromiseA+2.3.3.4
                            if (used) return;
                            used = true;
                            resolve(x);
                        }
                    } catch (e) {
                        //PromiseA+ 2.3.3.2
                        if (used) return;
                        used = true;
                        reject(e);
                    }
                } else {
                    //PromiseA+ 2.3.3.4
                    resolve(x);
                }
            };

            const onResolvedFunc = function (val) {
                const cb = function () {
                    try {
                        if (typeof onFulfilled !== 'function') { // 如果成功了，它不是个函数，意味着不能处理，则把当前Promise的状态继续向后传递
                            resolve(val);
                            return;
                        }
                        const x = onFulfilled(val);
                        resolvePromise(x);
                    } catch (e) {
                        reject(e);
                    }
                };
                Promise.nextTick(cb);
            };

            const onRejectedFunc = function (val) {
                const cb = function () {
                    try {
                        if (typeof onRejected !== 'function') { // 如果失败了，它不是个函数，意味着不能处理，则把当前Promise的状态继续向后传递
                            reject(val);
                            return;
                        }
                        const x = onRejected(val);
                        resolvePromise(x);
                    } catch (e) {
                        reject(e);
                    }
                };
                Promise.nextTick(cb);
            };

            if (this.status === PENDING) {
                //这样把then注册的函数，放到list中延时执行。内部加了try/catch，把修改状态的逻辑全放在了handleResolve、handleReject这俩函数中
                this.onFulfilledList.push(onResolvedFunc);
                this.onRejectedList.push(onRejectedFunc);
            } else if (this.status === FULFILLED) { //如果这个Promise已经成功，说明已经resolve过了，不能再依赖resolve来触发，就直接执行成功处理。比如aa = Promise.resolve()，有多处使用.then
                onResolvedFunc(this.value);
            } else { // if(this.status === REJECTED) { //如果这个Promise已经失败，说明已经reject过了，不能再依赖reject来触发，就直接执行失败处理。
                onRejectedFunc(this.reason);
            }
        });

        return promise2;
    }

    catch(onRejected) {
        return this.then(null, onRejected);
    }

    finally(callback) {
        return this.then(
            (val) => Promise.resolve(callback()).then(() => val),
            (err) => Promise.resolve(callback()).then(() => { throw err })
        );
    }

    done(onFulfilled, onRejected) {
        this.then(onFulfilled, onRejected)
            .catch(function (reason) {
                // 抛出一个全局错误
                setTimeout(() => {
                    throw reason
                }, 0);
            });
    }

    toString() {
        return '[object Promise]';
    }
}

module.exports = Promise;

// const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// wait().then(() => console.log(4));
// Promise.resolve().then(() => console.log(2)).then(() => console.log(3));
// console.log(1); // 1, 2, 3, 4

new Promise((resolve) => {
    resolve('123');
    throw new Error('haha');
}).then(console.log)
    .catch(err => {
        console.error('---', err);
    })
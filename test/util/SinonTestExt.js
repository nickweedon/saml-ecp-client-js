(function() {
    var SinonTestExt = SinonTestExt || {};

    SinonTestExt.ConditionPoller = function () {
        this.finished = false;
        this.timerInterval = 20;
    };

    SinonTestExt.ConditionPoller.prototype = {
        signal: function () {
            this.finished = true;
        },
        wait: function (pollFunction, finishFunction) {
            var me = this;
            var repeatTimer = function () {
                pollFunction();
                if (me.finished) {
                    finishFunction();
                    return;
                }
                setTimeout(repeatTimer, me.timerInterval);
            };
            setTimeout(repeatTimer, this.timerInterval);
        }
    };

    SinonTestExt.AsyncServerResponder = function (serverObj, doneCallback) {
        this.serverObj = serverObj;
        this.doneCallback = doneCallback || null;
        this.conditionPoller = new SinonTestExt.ConditionPoller();
    };

    SinonTestExt.AsyncServerResponder.prototype = {
        done: function () {
            this.conditionPoller.signal();
        },
        setDoneCallback: function (doneCallback) {
            this.doneCallback = doneCallback;
        },
        waitUntilDone: function (finishCallback) {

            var me = this;

            this.conditionPoller.wait(function () {
                me.serverObj.respond();
            }, function () {
                if (finishCallback !== undefined) finishCallback();
                if (me.doneCallback != null) me.doneCallback();
            });
        }
    };

    define('SinonTestExt',
        [],
        function () {
            return SinonTestExt;
        }
    );
})();
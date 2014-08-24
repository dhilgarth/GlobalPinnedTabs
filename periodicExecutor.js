function PeriodicExecutor(executionInterval) {
    this.executionInterval = executionInterval;
}

PeriodicExecutor.prototype = {
    executeStep: function (action) {
        if (!this.isExecuting) {
            this.timerId = undefined;
        }
        else {
            action();
            var self = this;
            this.timerId = setTimeout(
                function () {
                    self.executeStep(action);
                }, this.executionInterval)
        }
    },

    start: function (action) {
        this.isExecuting = true;
        this.executeStep(action);
    },

    stop: function () {
        this.isExecuting = false;
        if (this.timerId) {
            clearTimeout(this.timerId);
        }
    }
};
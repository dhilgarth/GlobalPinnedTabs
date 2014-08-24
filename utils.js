var Utils = {
    errorLogger: function (f) {
        return function (args) {
            try {
                f.apply(this, arguments);
            }
            catch (e) {
                console.error(Utils.formatException(e));
                throw e;
            }
        };
    },

    handleUndefinedCallback: function(callback) {
        if(callback) {
            return function (args) {
                callback.apply(this, arguments);
            }
        }
        else
            return function(){};
    },

    formatException: function(e) {
        return e.stack;
    }
}
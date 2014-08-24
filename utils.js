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

    formatException: function(e) {
        return e.stack;
    }
}
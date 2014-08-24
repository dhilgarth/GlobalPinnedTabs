var Utils = {
    errorLogger: function (f) {
        return function (args) {
            try {
                f.apply(this, arguments);
            }
            catch (e) {
                console.log(e);
                throw e;
            }
        };
    }
}
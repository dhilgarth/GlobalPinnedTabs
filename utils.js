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

    handleUndefinedCallback: function (callback) {
        if (callback) {
            return function (args) {
                callback.apply(this, arguments);
            }
        }
        else {
            return function () {};
        }
    },

    formatException: function (e) {
        if (e.stack) {
            return e.stack;
        }
        return e;
    },

    argumentsToArray: function (input) {
        return Array.prototype.slice.call(input);
    },

    printObject: function (obj, indent) {
        var result = JSON.stringify(obj, null, 2);
        if (result === undefined) {
            return result;
        }
        return result.split('\n').join('\n' + indent);
    },

    printTime: function (date) {
        return date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2) + "." +
               date.getMilliseconds().pad(3);
    },

    instrument: function (obj, objName, options) {
        options = options || {};
        if (options.defaultMode === undefined) {
            options.defaultMode = 'include';
        }
        if (options.methods === undefined) {
            options.methods = {};
        }

        for (var name in Utils.getMethods(obj)) {
            var methodOptions = options.methods[name];
            if (!methodOptions) {
                methodOptions = {};
            }
            if (methodOptions) {
                if (methodOptions.mode === undefined) {
                    methodOptions.mode = options.defaultMode;
                }
                if (methodOptions.logSubTree === undefined) {
                    methodOptions.logSubTree = true;
                }
                if (methodOptions.logOwnCall === undefined) {
                    methodOptions.logOwnCall = true;
                }
            }
            if (methodOptions.mode === 'include') {
                obj[name] = LoggingDecorator.create(
                        objName + '.' + name, obj[name], methodOptions.logSubTree, methodOptions.logOwnCall);
            }
        }
    },

    getMethods: function (obj) {
        var result = { };
        for (var name in obj) {
            try {
                if (typeof(obj[name]) == "function") {
                    result[name] = obj[name];
                }
            } catch (err) {
            }
        }
        return result;
    }
};
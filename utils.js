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
        if(e.stack)
            return e.stack;
        return e;
    },

    argumentsToArray: function(input) {
        return Array.prototype.slice.call(input);
    },

    currentLoggingCallDepth: 0,

    printObject: function(obj, indent) {
        var result = JSON.stringify(obj,  null, 2);
        if(result === undefined)
            return result;
        return result.split('\n').join('\n' + indent);
    },

    loggingDecorator: function(name, f) {
        return function(args) {
            var indent = ' '.repeat(Utils.currentLoggingCallDepth * 4);
            var message = [];
            if(arguments.length) {
                var inputValues = Utils.printObject(Utils.argumentsToArray(arguments), '    ' + indent);
                message.push(indent + 'Calling \'' + name + '\' with arguments:')
                message.push(indent + '    ' + inputValues);
            }
            else
                message.push(indent + 'Calling "' + name + '" without arguments');
            message.push(indent + '  Instance:');
            message.push(indent + '    ' + Utils.printObject(this, '    ' + indent));

            console.debug(message.join('\n'));

            try {
                Utils.currentLoggingCallDepth++;
                var result = f.apply(this, arguments);
                console.debug(indent + '"' + name + '" returned with ' + Utils.printObject(result, '    ' + indent));
                return result;
            }
            catch(e) {
                console.debug(indent + '"' + name + '" threw an exception: ' + Utils.formatException(e));
                throw e;
            }
            finally {
                Utils.currentLoggingCallDepth--;
            }
        }
    },

    instrument: function(obj, objName, options) {
        options = options || {
            mode: 'exclude',
            methods: []
        };

        for(var name in Utils.getMethods(obj)) {
            var index = options.methods.indexOf(name);
            if((options.mode === 'exclude' && index === -1) || (options.mode === 'include' && index !== -1))
                obj[name] = Utils.loggingDecorator(objName + '.' + name, obj[name]);
        }
    },

    getMethods: function(obj) {
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
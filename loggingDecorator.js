var LoggingDecorator = {
    currentLoggingCallDepth: 0,
    disableLoggingForCurrentTree: false,

    getFormattedTime: function () {
        return Utils.printTime(new Date()) + ':';
    },
    create: function(name, f, logSubTree, logOwnCall) {
        return function(args) {
            if(!LoggingDecorator.disableLoggingForCurrentTree && logOwnCall) {
                var indent = ' '.repeat(LoggingDecorator.currentLoggingCallDepth * 4);
                var message = [LoggingDecorator.getFormattedTime()];
                if (arguments.length) {
                    var inputValues = Utils.printObject(Utils.argumentsToArray(arguments), '    ' + indent);
                    message.push(indent + 'Calling \'' + name + '\' with arguments:')
                    message.push(indent + '    ' + inputValues);
                }
                else
                    message.push(indent + 'Calling \'' + name + '\' without arguments');
                message.push(indent + '  Instance:');
                message.push(indent + '    ' + Utils.printObject(this, '    ' + indent));

                console.debug(message.join('\n'));
            }

            try {
                LoggingDecorator.currentLoggingCallDepth++;
                if(!logSubTree)
                    LoggingDecorator.disableLoggingForCurrentTree = true;
                var result = f.apply(this, arguments);
                if(logOwnCall && !LoggingDecorator.disableLoggingForCurrentTree)
                    console.debug(LoggingDecorator.getFormattedTime() + '\n' + indent + '\'' + name + '\' returned with ' + Utils.printObject(result, '    ' + indent));
                return result;
            }
            catch(e) {
                if(logOwnCall && !LoggingDecorator.disableLoggingForCurrentTree)
                    console.debug(LoggingDecorator.getFormattedTime() + '\n' + indent + '\'' + name + '\' threw an exception: ' + Utils.formatException(e));
                throw e;
            }
            finally {
                LoggingDecorator.currentLoggingCallDepth--;
                if(!logSubTree)
                    LoggingDecorator.disableLoggingForCurrentTree = false;
            }
        }
    }
};
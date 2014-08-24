function MultiDelegate() {
    this.delegates = [];
}

MultiDelegate.prototype = {
    add: function (delegate) {
        this.delegates.push(delegate);
    },

    remove: function (delegate) {
        this.delegates.remove(delegate);
    },

    execute: function (context, args) {
        for (var i = 0; i < this.delegates.length; ++i) {
            this.delegates[i].apply(context, Array.prototype.slice.call(arguments, 1));
        }
    },

    clear: function () {
        this.delegates = [];
    }
}
var StringExtensions = {
    init: function () {
        if (!String.prototype.repeat) {
            String.prototype.repeat = function (count) {
                var result = '';
                for (var i = 0; i < count; i++) {
                    result += this;
                }
                return result;
            };
        }
    }
}

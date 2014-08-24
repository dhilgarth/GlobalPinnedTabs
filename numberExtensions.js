var NumberExtensions = {
    init: function () {
        if (!Number.prototype.pad) {
            Number.prototype.pad = function (size) {
                var result = String(this);
                if (typeof(size) !== 'number') {
                    size = 1;
                }

                return '0'.repeat(size - result.length) + result;
            };
        }
    }
};
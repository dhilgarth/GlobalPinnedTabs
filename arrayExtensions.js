var ArrayExtensions = {
    init: function () {
        if (!Array.prototype.remove) {
            Array.prototype.remove = function (value) {
                var index = this.indexOf(value);
                if (index === -1) {
                    return false;
                }
                this.splice(index, 1);
                return true;
            };
        }

        if (!Array.prototype.addDistinct) {
            Array.prototype.addDistinct = function (value) {
                var index = this.indexOf(value);
                if (index !== -1) {
                    return false;
                }
                this.push(value);
                return true;
            };
        }
    }
};

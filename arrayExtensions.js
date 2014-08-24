var ArrayExtensions = {
    init: function() {
        if (!Array.prototype.remove) {
            Array.prototype.remove = function(valueOrDelegate) {
                if (valueOrDelegate instanceof Function) {
                    for (var i = 0; i < this.length; i++) {
                        if (valueOrDelegate(this[i])) {
                            this.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    var index = this.indexOf(valueOrDelegate);
                    if (index === -1)
                        return false;
                    this.splice(index, 1);
                    return true;
                }
            };
        }

        if (!Array.prototype.addDistinct) {
            Array.prototype.addDistinct = function(value) {
                var index = this.indexOf(value);
                if (index !== -1)
                    return false;
                this.push(value);
                return true;
            };
        }
    }
};

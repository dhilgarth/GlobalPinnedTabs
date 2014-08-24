var Chrome = {

    init: function () {
        Chrome.tabDraggingExecutor = new PeriodicExecutor(200);
        Chrome.tabDraggingDelegate = new MultiDelegate();
    },

    errorLogger: function (f) {
        var stack = Error().stack;
        return function (args) {
            if(chrome.runtime.lastError === undefined)
                Utils.errorLogger(Utils.handleUndefinedCallback(f)).apply(this, arguments);
            else
                console.error(chrome.runtime.lastError.message + '\n' + stack);
        };
    },
    getAllWindows: function (callback) {
        chrome.windows.getAll({
            populate: true
        }, Chrome.errorLogger(callback));
    },

    getWindow: function (windowId, callback) {
        chrome.windows.get(windowId, {
            populate: true
        }, Chrome.errorLogger(callback));
    },

    findPinnedTab: function (urls, window) {
        if (!window.tabs)
            return undefined;
        return window.tabs.filter(function (x) {
            return (urls.filter(function (y) {
                return y === x.url;
            }).length > 0) && x.pinned;
        })[0];
    },

    executeWhenUserStoppedDragging: function (action) {
        Chrome.tabDraggingDelegate.add(action);
        if (!Chrome.tabDraggingExecutor.isExecuting) {
            Chrome.tabDraggingExecutor.start(function () {
                Chrome.isUserDragging(function (userIsDragging) {
                    if (!userIsDragging) {
                        Chrome.tabDraggingExecutor.stop();
                        Chrome.tabDraggingDelegate.execute(this);
                        Chrome.tabDraggingDelegate.clear();
                    }
                })
            });
        }
    },

    isUserDragging: function (callback) {
        Chrome.getAllWindows(function (windows) {
            var window = windows.filter(function (x) {
                return x.type === 'normal' && x.focused && x.tabs && x.tabs.length;
            })[0];
            if (window === undefined) {
                callback(false);
                return;
            }
            var tab = window.tabs[0];
            chrome.tabs.move(tab.id, { index: tab.index }, function () {
                callback(chrome.runtime.lastError !== undefined && chrome.runtime.lastError.message.indexOf('dragging') !== -1);
            });
        });
    },

    createPinnedTab: function (window, url, callback) {
        chrome.tabs.create({
            url: url,
            pinned: true,
            active: false,
            windowId: window.id
        }, Chrome.errorLogger(callback));
    },

    pinTab: function (tabId, callback) {
        chrome.tabs.update(tabId, {
            pinned: true
        }, Chrome.errorLogger(callback));
    },

    activateTab: function (tabId, callback) {
        chrome.tabs.update(tabId, {
            active: true
        }, Chrome.errorLogger(callback));
    },

    moveTabs: function (tabIds, targetWindowId, index, callback) {

        chrome.tabs.move(tabIds, {
            windowId: targetWindowId,
            index: index
        }, Chrome.errorLogger(function (tabs) {
            if (!(tabs instanceof Array))
                tabs = [ tabs ];

            Utils.handleUndefinedCallback(callback)(tabs);
        }));
    },

    removeTabs: function(tabIds, callback) {
        chrome.tabs.remove(tabIds,  Chrome.errorLogger(callback));
    }
};
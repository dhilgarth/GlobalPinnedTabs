var Chrome = {
    init: function () {

    },

    errorLogger: function (f) {
        return function (args) {
            if(chrome.runtime.lastError === undefined)
                Utils.errorLogger(Utils.handleUndefinedCallback(f)).apply(this, arguments);
            else
                console.error(chrome.runtime.lastError.message);
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

    createPinnedTab: function (window, url, favIconUrl, callback) {
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

    moveTabs: function (tabIds, targetWindowId, index, callback, startTime) {

        startTime = startTime || Date.now();

        if (Date.now() - startTime > 20000) {
            console.error('Moving of tabs failed for 1 minute. Giving up...');
            return;
        }

        chrome.tabs.move(tabIds, {
            windowId: targetWindowId,
            index: index
        }, Chrome.errorLogger(function (tabs) {
            if (!(tabs instanceof Array))
                tabs = [ tabs ];

            var lastError = chrome.runtime.lastError;
            if (tabs === undefined || lastError !== undefined) {
                console.warn("Couldn't move tabs.");
                if (lastError !== undefined && lastError.message)
                    console.warn('Reason: ' + lastError.message);
                setTimeout(function () {
                    Chrome.moveTabs(tabIds, targetWindowId, index, callback, startTime);
                }, 500);
            }
            else {
                Utils.handleUndefinedCallback(callback(tabs));
            }
        }));
    }
};
var Chrome = {
    init: function () {

    },

    getAllWindows: function (callback) {
        chrome.windows.getAll({
            populate: true
        }, Utils.errorLogger(callback));
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
        }, Utils.errorLogger(callback));
    },

    pinTab: function (tabId, callback) {
        chrome.tabs.update(tabId, {
            pinned: true
        }, Utils.errorLogger(callback));
    },
    },

    moveTabs: function (tabIds, targetWindowId, index, success, startTime) {

        startTime = startTime || Date.now();

        if (Date.now() - startTime > 20000) {
            console.error('Moving of tabs failed for 1 minute. Giving up...');
            return;
        }

        chrome.tabs.move(tabIds, {
            windowId: targetWindowId,
            index: index
        }, Utils.errorLogger(function (tabs) {
            if (!(tabs instanceof Array))
                tabs = [ tabs ];

            var lastError = chrome.runtime.lastError;
            if (tabs === undefined || lastError !== undefined) {
                console.warn("Couldn't move tabs.");
                if (lastError !== undefined && lastError.message)
                    console.warn('Reason: ' + lastError.message);
                setTimeout(function () {
                    Chrome.moveTabs(tabIds, targetWindowId, index, success, startTime);
                }, 500);
            }
            else {
                success(tabs);
            }
        }));
    }
};
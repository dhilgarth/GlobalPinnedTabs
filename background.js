var ArrayExtensions = {
    init: function() {
        if (!Array.prototype.remove) {
            Array.prototype.remove = function(value) {
                var index = this.indexOf(value);
                if (index === -1)
                    return false;

                this.splice(index, 1);
                return true;
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

var Filters = {
    pinnedTabs: function(x) {
        return !!x.pinned;
    },
    tabsWithUrl: function(url) {
        return function(x) {
            return x.url == url;
        };
    }
};

var GlobalPinnedTabs = {

    globalPinnedTabUrls: [],

    tabIdToUrlMapping: {},
    urlToTabIdMapping: {},

    init: function() {

        ArrayExtensions.init();
        GlobalPinnedTabs.loadData();

        chrome.windows.onFocusChanged.addListener(GlobalPinnedTabs.activeWindowChanged);
        chrome.tabs.onUpdated.addListener(GlobalPinnedTabs.onTabUpdate);
        chrome.tabs.onRemoved.addListener(GlobalPinnedTabs.onTabClose);

        chrome.windows.getCurrent({
            populate: true
        }, function(window) {
            GlobalPinnedTabs.displayTabs(window);
        });
    },

    pinTab: function(tab) {
        chrome.tabs.update(tab.id, {
            pinned: true
        });
    },

    moveTab: function(windowId, tabId) {
        chrome.tabs.move(parseInt(tabId), {
            windowId: windowId,
            index: 0
        }, GlobalPinnedTabs.pinTab);
    },

    activeWindowChanged: function(windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE)
            return;
        chrome.windows.get(parseInt(windowId), {
            populate: true
        }, function(window) {
            GlobalPinnedTabs.displayTabs(window);
        });
    },

    displayTabs: function(window) {
        if (window.type === 'popup')
            return;

        var url;
        for (var key in GlobalPinnedTabs.tabIdToUrlMapping) {
            url = GlobalPinnedTabs.tabIdToUrlMapping[key];
            if (GlobalPinnedTabs.getMatchingTab(url, window) === undefined)
                GlobalPinnedTabs.moveTab(window.id, key);
        }

        for (var i = 0; i < GlobalPinnedTabs.globalPinnedTabUrls.length; i++) {
            url = GlobalPinnedTabs.globalPinnedTabUrls[i];
            if (GlobalPinnedTabs.urlToTabIdMapping[url] === undefined)
                GlobalPinnedTabs.createTab(url, window);
        }
    },

    createTabCallback: function(tab) {
        GlobalPinnedTabs.tabIdToUrlMapping[tab.id] = tab.url;
        GlobalPinnedTabs.urlToTabIdMapping[tab.url] = tab.id;
    },

    onTabUpdate: function(tabId, changeInfo, tab) {
        if (GlobalPinnedTabs.disableTabUpdateHandling)
            return;
        if (changeInfo.pinned !== undefined) {
            if (changeInfo.pinned === true) {
                if (GlobalPinnedTabs.tabIdToUrlMapping[tabId] === undefined && confirm('Make this a globally pinned tab that is visible in all windows?')) {
                    GlobalPinnedTabs.tabIdToUrlMapping[tabId] = tab.url;
                    GlobalPinnedTabs.urlToTabIdMapping[tab.url] = tabId;
                    GlobalPinnedTabs.globalPinnedTabUrls.addDistinct(tab.url);
                    GlobalPinnedTabs.persistData();
                }
            } else {
                GlobalPinnedTabs.handleRemovedTab(tabId);
            }
        }
    },

    disableTabCloseHandling: false,
    disableTabUpdateHandling: false,

    onTabClose: function(tabId, removeInfo) {
        if (!removeInfo.isWindowClosing && !GlobalPinnedTabs.disableTabCloseHandling)
            GlobalPinnedTabs.handleRemovedTab(tabId);
    },

    handleRemovedTab: function(tabId) {
        var url = GlobalPinnedTabs.tabIdToUrlMapping[tabId];
        if (url) {
            delete GlobalPinnedTabs.tabIdToUrlMapping[tabId];
            delete GlobalPinnedTabs.urlToTabIdMapping[tabId];
            GlobalPinnedTabs.globalPinnedTabUrls.remove(url);
            GlobalPinnedTabs.persistData();
        }
    },

    getMatchingTab: function(url, window) {
        return window.tabs.filter(function(x) {
            return x.pinned && x.url === url;
        })[0];
    },

    createTab: function(url, window) {
        var matchingTab = GlobalPinnedTabs.getMatchingTab(url, window);
        if (matchingTab !== undefined)
            GlobalPinnedTabs.createTabCallback(matchingTab);
        else {
            chrome.tabs.create({
                'url': url,
                'pinned': true,
                'active': false,
                'windowId': window.id
            }, GlobalPinnedTabs.createTabCallback);
        }
    },

    loadData: function() {
        chrome.storage.sync.get('globalPinnedTabUrls', function(items) {
            GlobalPinnedTabs.globalPinnedTabUrls = items.globalPinnedTabUrls;
        });
    },

    persistData: function() {
        chrome.storage.sync.set({
            globalPinnedTabUrls: GlobalPinnedTabs.globalPinnedTabUrls
        });
    }
};

GlobalPinnedTabs.init();
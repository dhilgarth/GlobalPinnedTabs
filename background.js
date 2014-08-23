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

    knownPinnedTabIds: {},

    init: function() {

        ArrayExtensions.init();
        GlobalPinnedTabs.loadData();

        chrome.windows.onCreated.addListener(GlobalPinnedTabs.updateWindow);
        chrome.tabs.onUpdated.addListener(GlobalPinnedTabs.onTabUpdate);
        chrome.tabs.onRemoved.addListener(GlobalPinnedTabs.onTabClose);

        GlobalPinnedTabs.updateWindows();
    },

    createTabCallback: function(tab) {
        GlobalPinnedTabs.knownPinnedTabIds[tab.id] = tab.url;
    },

    onTabUpdate: function(tabId, changeInfo, tab) {
        if (GlobalPinnedTabs.disableTabUpdateHandling)
            return;
        if (changeInfo.pinned !== undefined) {
            if (changeInfo.pinned === true) {
                if (confirm('Make this a globally pinned tab that is visible in all windows?')) {
                    GlobalPinnedTabs.knownPinnedTabIds[tabId] = tab.url;
                    GlobalPinnedTabs.globalPinnedTabUrls.addDistinct(tab.url);
                    GlobalPinnedTabs.updateWindows();
                }
            } else {
                GlobalPinnedTabs.handleRemovedTab(tabId);
            }
        } else if (changeInfo.status === 'loading' && changeInfo.url !== undefined) {
            var url = GlobalPinnedTabs.knownPinnedTabIds[tab.id];
            GlobalPinnedTabs.knownPinnedTabIds[tab.id] = url;
            var tabsWithUrl = GlobalPinnedTabs.getTabsForInitialUrl(url);
            GlobalPinnedTabs.disableTabUpdateHandling = true;
            for (var i = 0; i < tabsWithUrl.length; i++) {
                GlobalPinnedTabs.knownPinnedTabIds[tabsWithUrl[i]] = tab.url;
                chrome.tabs.update(parseInt(tabsWithUrl[i]), {
                    url: tab.url
                });
            }
            GlobalPinnedTabs.disableTabUpdateHandling = false;
        }
    },

    disableTabCloseHandling: false,
    disableTabUpdateHandling: false,

    onTabClose: function(tabId, removeInfo) {
        if (!removeInfo.isWindowClosing && !GlobalPinnedTabs.disableTabCloseHandling)
            GlobalPinnedTabs.handleRemovedTab(tabId);
    },

    handleRemovedTab: function(tabId) {
        var url = GlobalPinnedTabs.knownPinnedTabIds[tabId];
        if (url) {
            delete GlobalPinnedTabs.knownPinnedTabIds[tabId];
            GlobalPinnedTabs.globalPinnedTabUrls.remove(url);
            GlobalPinnedTabs.removeTabFromAllWindows(url);
        }
    },

    getTabsForInitialUrl: function(url) {
        var result = [];
        for (var key in GlobalPinnedTabs.knownPinnedTabIds) {
            if (GlobalPinnedTabs.knownPinnedTabIds[key] === url)
                result.push(key);
        }

        return result;
    },

    removeTabFromAllWindows: function(url) {
        var tabsWithUrl = GlobalPinnedTabs.getTabsForInitialUrl(url);
        GlobalPinnedTabs.disableTabCloseHandling = true;
        for (var i = 0; i < tabsWithUrl.length; ++i) {
            var tabId = tabsWithUrl[i];
            chrome.tabs.remove(parseInt(tabId));
            delete GlobalPinnedTabs.knownPinnedTabIds[tabId];
        }
        GlobalPinnedTabs.disableTabCloseHandling = false;
        GlobalPinnedTabs.persistData();
    },

    updateWindows: function() {
        GlobalPinnedTabs.persistData();

        chrome.windows.getAll({
                populate: true
            },
            function(windows) {
                for (var i = 0; i < windows.length; ++i)
                    GlobalPinnedTabs.updateWindow(windows[i]);
            });
    },

    updateWindow: function(window) {
        if (window.type === 'popup')
            return;

        var pinnedTabs = window.tabs ? window.tabs.filter(Filters.pinnedTabs) : [];
        for (var i = 0; i < GlobalPinnedTabs.globalPinnedTabUrls.length; i++) {
            var url = GlobalPinnedTabs.globalPinnedTabUrls[i];
            var pinnedTabsWithUrl = pinnedTabs.filter(Filters.tabsWithUrl(url));
            if (pinnedTabsWithUrl.length === 0) {
                chrome.tabs.create({
                    'url': url,
                    'pinned': true,
                    'active': false,
                    'windowId': window.id
                }, GlobalPinnedTabs.createTabCallback);
            } else
                GlobalPinnedTabs.knownPinnedTabIds[pinnedTabsWithUrl[0].id] = pinnedTabsWithUrl[0].url;
        }
    },

    loadData: function() {
        chrome.storage.sync.get('globalPinnedTabUrls', function(items) {
            GlobalPinnedTabs.globalPinnedTabUrls = items.globalPinnedTabUrls;
            console.log(GlobalPinnedTabs.globalPinnedTabUrls);
        });
    },

    persistData: function() {
        chrome.storage.sync.set({
            globalPinnedTabUrls: GlobalPinnedTabs.globalPinnedTabUrls
        });
    }
};

GlobalPinnedTabs.init();
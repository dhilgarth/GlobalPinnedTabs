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

        chrome.alarms.onAlarm.addListener(function(alarm) {
            if (alarm.name === 'Try moving tab again') {
                GlobalPinnedTabs.moveTabs(GlobalPinnedTabs.tabsToMove.target, GlobalPinnedTabs.tabsToMove.ids);
            }
        });

        chrome.windows.getCurrent({
            populate: true
        }, function(window) {
            GlobalPinnedTabs.displayTabs(window);
        });
    },

    pinTab: function(tabs) {
        var lastError = chrome.runtime.lastError;
        if (tabs === undefined || lastError !== undefined) {
            console.log("Couldn't move tabs.");
            if (lastError !== undefined && lastError.message)
                console.log('Reason: ' + lastError.message);
            chrome.alarms.create('Try moving tabs again', {
                when: Date.now() + 1000
            });

        } else {
            var enableUpdateHandling = function(tab) {
                GlobalPinnedTabs.disableTabUpdateHandling = false;
            };
            for(var i = 0;i< tabs.length; ++i)
            {
                GlobalPinnedTabs.disableTabUpdateHandling = true;
                chrome.tabs.update(tabs[i].id, {
                    pinned: true
                }, GlobalPinnedTabs.enableUpdateHandling);
            }
            GlobalPinnedTabs.tabsToMove.target = undefined;
            GlobalPinnedTabs.tabsToMove.ids = [];
        }
    },

    tabsToMove: {
        target: undefined,
        ids: []
    },

    moveTabs: function(windowId, tabIds) {
        GlobalPinnedTabs.tabsToMove.target = windowId;
        GlobalPinnedTabs.tabsToMove.ids = tabIds;

        if (tabIds.length === 0)
            return;

        chrome.tabs.move(tabIds, {
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

    windowId: undefined,
    tabId: undefined,
    disableTabUpdateHandling: false,

    displayTabs: function(window) {
        if (window.type !== 'normal')
            return;

        var url;
        var tabsToMove = [];
        for (var key in GlobalPinnedTabs.tabIdToUrlMapping) {
            url = GlobalPinnedTabs.tabIdToUrlMapping[key];
            var matchingTab = GlobalPinnedTabs.getMatchingTab(url, window);
            if (matchingTab === undefined) {
                tabsToMove.push(parseInt(key));
            } else if (key != matchingTab.id) {
                delete GlobalPinnedTabs.tabIdToUrlMapping[key];
                GlobalPinnedTabs.tabIdToUrlMapping[matchingTab.id] = url;
                GlobalPinnedTabs.urlToTabIdMapping[url] = matchingTab.id;
                chrome.tabs.remove(parseInt(key));
            }
        }

        GlobalPinnedTabs.moveTabs(window.id, tabsToMove);

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

    onTabClose: function(tabId, removeInfo) {
        GlobalPinnedTabs.handleRemovedTab(tabId, !removeInfo.isWindowClosing);
    },

    handleRemovedTab: function(tabId, removeUrl) {
        var url = GlobalPinnedTabs.tabIdToUrlMapping[tabId];
        if (url) {
            delete GlobalPinnedTabs.tabIdToUrlMapping[tabId];
            delete GlobalPinnedTabs.urlToTabIdMapping[url];
            console.log('deleted tab');
            if (removeUrl) {
                GlobalPinnedTabs.globalPinnedTabUrls.remove(url);
                GlobalPinnedTabs.persistData();
                console.log('deleted url');
            }
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
            console.log('Creating tab with URL ' + url);
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
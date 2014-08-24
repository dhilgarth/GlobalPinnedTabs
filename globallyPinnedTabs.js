function GloballyPinnedTabs(tabs) {
    this.tabs = tabs;
    this.activeTab = tabs.filter(function(x) { return x.realTab && x.realTab.active; })[0];
}

GloballyPinnedTabs.create = function(serializedTabs) {
    serializedTabs = serializedTabs || [{
        startupUrl: 'https://www.toggl.com/app/timer'
    }, {
        startupUrl: 'https://www.beeminder.com/danielhilgarth'
    }];

    var result = new GloballyPinnedTabs(serializedTabs.map(function(x) {
        return new GloballyPinnedTab(x.startupUrl, x.currentUrl, x.favIconUrl, x.title);
    }));

    var onCloseCallback = function(pinnedTab) {
        result.onPinnedTabClosed(pinnedTab);
    };
    for (var i = 0; i < result.tabs.length; i++)
        result.tabs[i].onCloseCallback = onCloseCallback;

    return result;
};

GloballyPinnedTabs.prototype = {
    serialize: function() {
        return this.tabs.map(GloballyPinnedTab.serialize);
    },

    addTab: function(tab) {
        var self = this;
        var newTab = new GloballyPinnedTab(tab.url, tab.url, tab.favIconUrl, tab.title, function(pinnedTab) {
            self.onPinnedTabClosed(pinnedTab);
        });
        this.tabs.push(newTab);
        Storage.persistData();
        Chrome.getAllWindows(function(windows) { newTab.createTabs(windows); });
    },

    createTabs: function(windows) {
        for (var i = 0; i < this.tabs.length; i++)
            this.tabs[i].createTabs(windows);
    },


    activateWindow: function(window, callback) {
        if(this.tabs.length === 0) {
            callback();
            return;
        }

        var oldWindowId;
        if(this.tabs[0].realTab)
            oldWindowId = this.tabs[0].realTab.windowId;

        if(oldWindowId === window.id) {
            callback();
            return;
        }

        if(oldWindowId !== undefined)
            this.moveTabs(window, oldWindowId, callback);
        else
            this.recreateTabs(window, callback);
    },

    recreateTabs: function(targetWindow, callback) {
        var dummyTabs = this.getDummyTabsForWindow(targetWindow, false);
        var dummyTabIds = dummyTabs.map(function(x) { return x.id; });
        chrome.tabs.remove(dummyTabIds);
        for (var i = 0; i < this.tabs.length; i++)
            this.tabs[i].createRealTab(targetWindow, callback, true);
    },

    getDummyTabsForWindow: function(window) {
        var result = {
            foundTabs: [],
            missingTabs: []
        };
        for (var i = 0; i < this.tabs.length; i++) {
            var tab = this.tabs[i];
            var dummyTab = tab.dummyTabs[window.id];
            if(!dummyTab)
                result.missingTabs.push(tab);
            else
                result.foundTabs.push(dummyTab);
        }

        return result;
    },

    moveTabs: function(targetWindow, sourceWindowId, callback) {

        var dummyTabs = this.getDummyTabsForWindow(targetWindow);
        var dummyTabIds = [];
        var smallestDummyTabsIndex = 10000;
        var i;
        var tab;
        var indexOfActiveTab = -1;
        for (i = 0; i < dummyTabs.foundTabs.length; i++) {
            tab = dummyTabs.foundTabs[i];
            dummyTabIds.push(tab.id);
            smallestDummyTabsIndex = Math.min(smallestDummyTabsIndex, tab.index);
        }

        var realTabIds = [];
        var smallestRealTabsIndex = 10000;
        for (i = 0; i < this.tabs.length; i++) {
            tab = this.tabs[i];
            realTabIds.push(tab.realTab.id);
            smallestRealTabsIndex = Math.min(smallestRealTabsIndex, tab.realTab.index);
        }

        var finished = 0;
        var total = realTabIds.length + dummyTabs.foundTabs.length + dummyTabs.missingTabs.length;
        var self = this;

        var callCallback = function() {
            finished++;
            if(finished === total)
                callback();
        };

        Chrome.moveTabs(realTabIds, targetWindow.id, smallestRealTabsIndex, function(tabs) {
            for (var i = 0; i < tabs.length; ++i) {
                self.tabs[i].realTab = tabs[i];
                Chrome.pinTab(tabs[i].id, callCallback);
            }
        });

        if(dummyTabIds.length) {
            Chrome.moveTabs(dummyTabIds, sourceWindowId, smallestDummyTabsIndex, function (tabs) {
                for (var i = 0; i < tabs.length; ++i) {
                    delete self.tabs[i].dummyTabs[targetWindow.id];
                    self.tabs[i].dummyTabs[sourceWindowId] = tabs[i];
                    Chrome.pinTab(tabs[i].id, callCallback);
                }
            });
        }

        if(dummyTabs.missingTabs.length) {
            Chrome.getWindow(sourceWindowId, function (window) {
                for (i = 0; i < dummyTabs.missingTabs.length; i++) {
                    dummyTabs.missingTabs[i].createTabForWindow(window, callCallback);
                }
            });
        }
    },

    updateTab: function(tab) {
        var pinnedTab = this.getTabForIdOfRealTab(tab.id);
        if(pinnedTab) {
            if(pinnedTab.updateRealTab(tab))
                Storage.persistData();
        } else {
            pinnedTab = this.getTabForAnyTabId(tab.id);
            if(pinnedTab)
                pinnedTab.updateDummyTab(pinnedTab);
        }
    },

    getTabForIdOfRealTab: function(realTabId) {
        return this.tabs.filter(function(x) { return x.realTab && (x.realTab.id === realTabId); })[0];
    },

    getTabForAnyTabId: function(tabId) {
        return this.tabs.filter(function(x) {
            if (x.realTab && (x.realTab.id === tabId))
                return true;
            for (var key in x.dummyTabs) {
                if (x.dummyTabs[key] === tabId) {
                    return true;
                }
            }
        })[0];
    },

    handleClosedTab: function(tabId) {
        var tab = this.getTabForAnyTabId(tabId);
        if (tab) {
            if (tab.realTab && (tab.realTab.id === tabId))
                tab.realTab = undefined;
            else {
                for (var key in tab.dummyTabs) {
                    if (tab.dummyTabs[key].id === tabId) {
                        delete tab.dummyTabs[key];
                        break;
                    }
                }
            }
            tab.close();
        }
    },

    handleClosedWindow: function(windowId) {
        for (var i = 0; i < this.tabs.length; i++)
            this.tabs[i].handleClosedWindow(windowId);
    },

    onPinnedTabClosed: function(pinnedTab) {
        this.tabs.remove(pinnedTab);
        console.log(this.tabs);
        Storage.persistData();
    }
};
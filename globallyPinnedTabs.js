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

    findTab: function(url) {
        return this.tabs.filter(function(x) { return x.startupUrl === url; })[0];
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

        if(oldWindowId !== undefined) {
            var self = this;
            Chrome.getWindow(oldWindowId, function (oldWindow) {
                self.moveTabs(window, oldWindow, callback);
            });
        }
        else
            this.recreateTabs(window, callback);
    },

    recreateTabs: function(targetWindow, callback) {
        var dummyTabs = this.getDummyTabsForWindow(targetWindow, false);
        var dummyTabIds = dummyTabs.map(function(x) { return x.id; });
        Chrome.removeTabs(dummyTabIds);
        for (var i = 0; i < this.tabs.length; i++)
            this.tabs[i].createRealTab(targetWindow, callback, true); // Bug (callback)
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

    moveTabs: function(targetWindow, sourceWindow, callback) {

        var dummyTabs = this.getDummyTabsForWindow(targetWindow);
        var dummyTabIds = [];
        var smallestDummyTabsIndex = 10000;
        var i;
        var tab;
        var tabToActivate;
        for (i = 0; i < dummyTabs.foundTabs.length; i++) {
            tab = dummyTabs.foundTabs[i];
            dummyTabIds.push(tab.id);
            smallestDummyTabsIndex = Math.min(smallestDummyTabsIndex, tab.index);
            if(tab.active) {
                var startupUrl = QueryParameters.getQueryParameters(QueryParameters.getQueryString(tab.url)).startupUrl;
                tabToActivate = this.findTab(startupUrl);
            }
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

        var temporaryTabIds = [];

        var callCallback = function() {
            finished++;
            if(finished === total) {
                if(temporaryTabIds.length) {
                    Chrome.removeTabs(temporaryTabIds, function () {
                        if(tabToActivate)
                            tabToActivate.activate(callback);
                        else
                            callback();
                    });
                }
                if(tabToActivate)
                    tabToActivate.activate(callback);
                else
                    callback();
            }
        };

        var performMove = function() {
            Chrome.moveTabs(realTabIds, targetWindow.id, smallestRealTabsIndex, function(tabs) {
                if(dummyTabs.missingTabs.length) {
                    Chrome.getWindow(sourceWindow.id, function(window) {
                        for (i = 0; i < dummyTabs.missingTabs.length; i++) {
                            dummyTabs.missingTabs[i].createTabForWindow(window, callCallback);
                        }
                    })
                }
                for (var i = 0; i < tabs.length; ++i) {
                    self.tabs[i].realTab = tabs[i];
                    Chrome.pinTab(tabs[i].id, callCallback);
                }
            });

            if(dummyTabIds.length) {
                Chrome.moveTabs(dummyTabIds, sourceWindow.id, smallestDummyTabsIndex, function (tabs) {
                    for (var i = 0; i < tabs.length; ++i) {
                        delete self.tabs[i].dummyTabs[targetWindow.id];
                        self.tabs[i].dummyTabs[sourceWindow.id] = tabs[i];
                        Chrome.pinTab(tabs[i].id, callCallback);
                    }
                });
            }
        };

        var createPinnedTabInTargetWindow = function() {
            if(targetWindow.tabs.length === (self.tabs.length - dummyTabs.missingTabs.length)) {
                Chrome.createPinnedTab(targetWindow, 'about:blank', function (tab) {
                    temporaryTabIds.push(tab.id);
                    performMove();
                });
            }
            else
                performMove();
        };

        if(sourceWindow.tabs.length === this.tabs.length) {
            Chrome.createPinnedTab(sourceWindow, 'about:blank', function(tab) {
                temporaryTabIds.push(tab.id);
                createPinnedTabInTargetWindow();
             });
        } else {
            createPinnedTabInTargetWindow();
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
                pinnedTab.updateDummyTab(tab);
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
                if (x.dummyTabs[key].id === tabId) {
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
        Storage.persistData();
    }
};
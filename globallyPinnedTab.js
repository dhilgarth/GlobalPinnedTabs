function GloballyPinnedTab(startupUrl, currentUrl, onCloseCallback) {
    this.startupUrl = startupUrl;
    this.currentUrl = currentUrl || startupUrl;
    this.realTab = undefined;
    this.onCloseCallback = onCloseCallback;
    this.dummyTabs = {};
}

GloballyPinnedTab.serialize = function(tab) {
    return tab.serialize();
};

GloballyPinnedTab.prototype = {
    serialize: function() {
        return {
            startupUrl: this.startupUrl,
            currentUrl: this.currentUrl
        };
    },

    createTabs: function(windows) {
        windows = windows.filter(function(x) { return x.type === 'normal'; });
        var activeWindow = windows.filter(function(x) { return x.focused; })[0] || windows[0];
        var inactiveWindows = windows.filter(function(x) { return x.id !== activeWindow.id; });

        var self = this;

        this.createRealTab(activeWindow, function(tab) { self.createDummyTabs(inactiveWindows); });
    },

    createRealTab: function(window, callback, useCurrentUrl) {
        var tab = Chrome.findPinnedTab([this.startupUrl, this.currentUrl], window);
        var self = this;
        if(tab) {
            this.realTab = tab;
            callback();
        } else {
            var url = useCurrentUrl ? this.currentUrl : this.startupUrl;
            debugger;
            Chrome.createPinnedTab(window, url, undefined, function(tab) { self.realTab = tab; callback(); });
        }
    },

    createDummyTabs: function(windows) {
        for (var i = 0; i < windows.length; i++)
            this.createTabForWindow(windows[i]);
    },

    createTabForWindow: function(window) {
        var addDummyTab = this.createDummyTabAdder(window.id);
        var favIconUrl = this.realTab.favIconUrl || 'favicon.png';
        var url = this.getUrlForDummyTab(favIconUrl);

        var tab = Chrome.findPinnedTab([url], window);
        if(tab)
            addDummyTab(tab);
        else {
            tab = Chrome.findPinnedTab([this.startupUrl, this.currentUrl], window);
            if(tab)
                chrome.tabs.remove(tab.id);
            Chrome.createPinnedTab(window, url, this.realTab.favIconUrl, addDummyTab);
        }
    },

    createDummyTabAdder: function(windowId) {
        var self = this;
        return function(tab) { self.dummyTabs[windowId] = tab; };
    },

    getUrlForDummyTab: function(favIconUrl) {
        return 'placeholder.html?startupUrl=' + encodeURIComponent(this.startupUrl) + '&currentUrl=' +
            encodeURIComponent(this.currentUrl) + '&favIconUrl=' + favIconUrl;
    },

    updateRealTab: function(realTab) {
        this.realTab = realTab;
        if(realTab.favIconUrl)
            this.sendMessageToDummyWindows('favIconUrl', this.realTab.favIconUrl);
        if(realTab.url != this.currentUrl) {
            this.currentUrl = realTab.url;
            this.sendMessageToDummyWindows('currentUrl', this.currentUrl);
        }
    },

    updateDummyTab: function(dummyTab) {
        this.dummyTabs[dummyTab.windowId] = dummyTab;
    },

    sendMessageToDummyWindows: function(type, data) {
        for (var key in this.dummyTabs) {
            chrome.tabs.sendMessage(this.dummyTabs[key].id, {
                type: type,
                data: data
            });
        }
    },

    handleClosedWindow: function(windowId) {
        if(this.realTab.windowId === windowId)
            this.realTab = undefined;
        else
            delete this.dummyTabs[windowId];
    },

    close: function() {
        var tabIds = [];
        for(var key in this.dummyTabs)
            tabIds.push(this.dummyTabs[key].id);
        if(this.realTab)
            tabIds.push(this.realTab.id);
        chrome.tabs.remove(tabIds);
        this.onCloseCallback(this);
    }
};
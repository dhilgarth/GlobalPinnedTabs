var GlobalPinnedTabs = {

    windowId: undefined,
    tabId: undefined,
    disableTabUpdateHandling: false,

    init: function() {
        ArrayExtensions.init();
        Chrome.init();
        Storage.loadData(function() {
            GlobalPinnedTabs.createTabs();
        });

        GlobalPinnedTabs.registerForChromeEvents();
    },

    registerForChromeEvents: function() {
        chrome.windows.onFocusChanged.addListener(GlobalPinnedTabs.activeWindowChanged);
        chrome.windows.onCreated.addListener(GlobalPinnedTabs.newWindowCreated);
        chrome.windows.onRemoved.addListener(GlobalPinnedTabs.onWindowClosed);
        chrome.tabs.onUpdated.addListener(GlobalPinnedTabs.onTabUpdate);
        // chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
        //     console.debug('onAttached: ' + tabId);
        //     console.debug(attachInfo);
        // });
        // chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
        //     console.debug('onDetached: ' + tabId);
        //     console.debug(detachInfo);
        // });
        // chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
        //     console.debug('onMoved: ' + tabId);
        //     console.debug(moveInfo);
        // });
        // chrome.tabs.onHighlighted.addListener(function(highlightInfo) {
        //     console.debug('onHighlighted:');
        //     console.debug(highlightInfo);
        // });
        // chrome.tabs.onActivated.addListener(function(activeInfo) {
        //     console.debug('onActivated:');
        //     console.debug(activeInfo);
        // });

        chrome.tabs.onRemoved.addListener(GlobalPinnedTabs.onTabClose);
    },

    createTabs: function() {
        Chrome.getAllWindows(function(windows) { Storage.globallyPinnedTabs.createTabs(windows); });
    },

    newWindowCreated: function(window) {
        Storage.globallyPinnedTabs.createTabsForWindow(window);
    },

    activeWindowChanged: function(windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE)
            return;
        chrome.windows.get(parseInt(windowId), {
            populate: true
        }, function(window) {
            if (window.type === 'normal') {
                try{
                    GlobalPinnedTabs.disableTabUpdateHandling = true;
                    Storage.globallyPinnedTabs.activateWindow(window, function() {
                        GlobalPinnedTabs.disableTabUpdateHandling = false;
                    });
                }
                catch (e){
                    console.log(e);
                }
            }
        });
    },

    onTabUpdate: function(tabId, changeInfo, tab) {
        if (GlobalPinnedTabs.disableTabUpdateHandling)
            return;
        if (changeInfo.pinned !== undefined) {
            if (changeInfo.pinned === true) {
                var isUnknownTab = !Storage.globallyPinnedTabs.getTabForAnyTabId(tabId);
                if (isUnknownTab && confirm('Make this a globally pinned tab that is visible in all windows?'))
                    Storage.globallyPinnedTabs.addTab(tab);
            } else {
                Storage.globallyPinnedTabs.handleClosedTab(tabId);
            }
        } else if (changeInfo.status === 'complete' || changeInfo.favIconUrl) {
            Storage.globallyPinnedTabs.updateTab(tab);
        }
    },

    onTabClose: function(tabId, removeInfo) {
        if(!removeInfo.isWindowClosing)
            Storage.globallyPinnedTabs.handleClosedTab(tabId);
    },

    onWindowClosed: function(windowId) {
        Storage.globallyPinnedTabs.handleClosedWindow(windowId);
    }
};

GlobalPinnedTabs.init();
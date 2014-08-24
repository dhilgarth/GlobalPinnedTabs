var GlobalPinnedTabs = {

    windowId: undefined,
    tabId: undefined,
    disableTabUpdateHandling: false,

    init: function () {
        StringExtensions.init();
        ArrayExtensions.init();
        Chrome.init();
        Storage.loadData(function () {
            GlobalPinnedTabs.createTabs();
        });

        GlobalPinnedTabs.registerForChromeEvents();
    },

    registerForChromeEvents: function () {
        chrome.windows.onFocusChanged.addListener(GlobalPinnedTabs.onActiveWindowChanged);
        chrome.windows.onRemoved.addListener(GlobalPinnedTabs.onWindowClosed);
        chrome.tabs.onUpdated.addListener(GlobalPinnedTabs.onTabUpdated);
        chrome.tabs.onRemoved.addListener(GlobalPinnedTabs.onTabClosed);
        chrome.tabs.onActivated.addListener(GlobalPinnedTabs.onTabActivated);
    },

    createTabs: function () {
        Chrome.getAllWindows(function (windows) {
            Storage.globallyPinnedTabs.createTabs(windows);
        });
    },

    onActiveWindowChanged: function (windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE)
            return;
        Chrome.executeWhenUserStoppedDragging(function () {
            Chrome.getAllWindows(function (windows) {
                var window = windows.filter(function (x) {
                    return x.type === 'normal' && x.focused;
                })[0];
                if (window) {
                    GlobalPinnedTabs.disableTabUpdateHandling = true;
                    Storage.globallyPinnedTabs.activateWindow(window, function () {
                        GlobalPinnedTabs.disableTabUpdateHandling = false;
                    });
                }
            });
        });
    },

    onWindowClosed: function (windowId) {
        Storage.globallyPinnedTabs.handleClosedWindow(windowId);
    },

    onTabActivated: function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId, Chrome.errorLogger(function (tab) {
            Storage.globallyPinnedTabs.updateTab(tab)
        }));
    },

    onTabUpdated: function (tabId, changeInfo, tab) {
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

    onTabClosed: function (tabId, removeInfo) {
        if (!removeInfo.isWindowClosing)
            Storage.globallyPinnedTabs.handleClosedTab(tabId);
    }
};

GlobalPinnedTabs.init();
var GlobalPinnedTabs = {

    windowId: undefined,
    tabId: undefined,
    disableTabUpdateHandling: false,
    instrumentMethods: true,

    instrument: function () {
        Utils.instrument(
            Chrome, 'Chrome',
            { methods: { errorLogger: { mode: 'exclude' }, isUserDragging: { mode: 'exclude' }, executeWhenUserStoppedDragging: { logSubTree: false }, getAllWindows: { mode: 'exclude'}}});
        Utils.instrument(GloballyPinnedTab.prototype, 'GloballyPinnedTab');
        Utils.instrument(GloballyPinnedTabs.prototype, 'GloballyPinnedTabs');
        Utils.instrument(
            PeriodicExecutor.prototype, 'PeriodicExecutor', { methods: { executeStep: { mode: 'exclude' }}});
    },

    init: function () {
        if (GlobalPinnedTabs.instrumentMethods) {
            GlobalPinnedTabs.instrument();
        }

        NumberExtensions.init();
        StringExtensions.init();
        ArrayExtensions.init();
        Chrome.init();
        Storage.loadData(
            function () {
                GlobalPinnedTabs.createTabs();
            });

        GlobalPinnedTabs.registerForChromeEvents();
    },

    registerForChromeEvents: function () {
        chrome.windows.onFocusChanged.addListener(GlobalPinnedTabs.onActiveWindowChanged);
        chrome.windows.onRemoved.addListener(GlobalPinnedTabs.onWindowClosed);
        chrome.tabs.onUpdated.addListener(GlobalPinnedTabs.onTabUpdated);
        chrome.tabs.onRemoved.addListener(GlobalPinnedTabs.onTabClosed);
        chrome.tabs.onMoved.addListener(GlobalPinnedTabs.onTabMoved);
        chrome.tabs.onActivated.addListener(GlobalPinnedTabs.onTabActivated);
    },

    createTabs: function () {
        Chrome.getAllWindows(
            function (windows) {
                Storage.globallyPinnedTabs.createTabs(windows);
            });
    },

    activateFocusedWindow: function (windows) {
        if (windows === undefined) {
            Chrome.getAllWindows(GlobalPinnedTabs.activateFocusedWindow);
        }
        else {
            var window = windows.filter(
                function (x) {
                    return x.type === 'normal' && x.focused;
                })[0];
            if (window) {
                GlobalPinnedTabs.disableTabUpdateHandling = true;
                Storage.globallyPinnedTabs.activateWindow(
                    window, function () {
                        GlobalPinnedTabs.disableTabUpdateHandling = false;
                    });
            }
        }
    },

    onActiveWindowChanged: function (windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            return;
        }
        Chrome.executeWhenUserStoppedDragging(GlobalPinnedTabs.activateFocusedWindow, true);
    },

    onWindowClosed: function (windowId) {
        Storage.globallyPinnedTabs.handleClosedWindow(windowId);
    },

    onTabActivated: function (activeInfo) {
        chrome.tabs.get(
            activeInfo.tabId, Chrome.errorLogger(
                function (tab) {
                    Storage.globallyPinnedTabs.updateTab(tab)
                }));
    },

    onTabMoved: function (tabId, moveInfo) {
        chrome.tabs.get(
            tabId, Chrome.errorLogger(
                function (tab) {
                    Storage.globallyPinnedTabs.updateTab(tab)
                }));
    },

    onTabUpdated: function (tabId, changeInfo, tab) {
        if (GlobalPinnedTabs.disableTabUpdateHandling) {
            return;
        }
        if (changeInfo.pinned !== undefined) {
            if (changeInfo.pinned === true) {
                var isUnknownTab = !Storage.globallyPinnedTabs.getTabForAnyTabId(tabId);
                if (isUnknownTab && confirm('Make this a globally pinned tab that is visible in all windows?')) {
                    Storage.globallyPinnedTabs.addTab(tab);
                }
            }
            else {
                Storage.globallyPinnedTabs.handleClosedTab(tabId);
            }
        }
        else if (changeInfo.status === 'complete' || changeInfo.favIconUrl) {
            Storage.globallyPinnedTabs.updateTab(tab);
        }
    },

    onTabClosed: function (tabId, removeInfo) {
        if (!removeInfo.isWindowClosing) {
            Storage.globallyPinnedTabs.handleClosedTab(tabId);
        }
    }
};

GlobalPinnedTabs.init();
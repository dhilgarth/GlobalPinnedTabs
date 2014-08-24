var Storage = {
    globallyPinnedTabs: {},

    loadData: function (callback) {
        chrome.storage.sync.get(
            'globallyPinnedTabs', function (items) {
                Storage.globallyPinnedTabs = GloballyPinnedTabs.create(items.globallyPinnedTabs);
                callback();
            });
    },

    persistData: function () {
        var data = Storage.globallyPinnedTabs.serialize();
        chrome.storage.sync.set({ globallyPinnedTabs: data });
    }
};
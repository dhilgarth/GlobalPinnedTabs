var link = document.querySelector('link[rel~="icon"]');
if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'shortcut icon');
    document.head.appendChild(link);
}

var queryParameters = QueryParameters.getQueryParameters(document.location.search);

link.href = queryParameters.favIconUrl;
document.title = queryParameters.title;

var update = function () {
    document.getElementById('favicon').src = queryParameters.favIconUrl;
    document.getElementById('title-text').innerText = queryParameters.title;
    document.getElementById('startupUrl').innerText = queryParameters.startupUrl;
    document.getElementById('startupUrl').href = queryParameters.startupUrl;
    document.getElementById('currentUrl').innerText = queryParameters.currentUrl;
    document.getElementById('currentUrl').href = queryParameters.currentUrl;
};

var onReady = function () {
    update();
};

if (chrome && chrome.runtime && chrome.onMessage) {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.type === 'favIconUrl') {
                queryParameters.favIconUrl = request.data;
                link.href = request.data;
            }
            else if (request.type === 'currentUrl') {
                queryParameters.currentUrl = request.data;
            }
            else if (request.type === 'title') {
                queryParameters.title = request.data;
                document.title = request.data;
            }
            else {
                return;
            }
            update();
        });
}

document.onreadystatechange = function () {
    if (document.readyState === 'complete') {
        onReady();
    }
};
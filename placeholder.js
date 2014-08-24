var link = document.querySelector('link[rel~="icon"]');
if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'shortcut icon');
    document.head.appendChild(link);
}

var queryParameters = QueryParameters.getQueryParameters(document.location.search);

link.href = queryParameters.favIconUrl;
document.title = queryParameters.title;

var div = document.createElement('div');
var setDivText = function () {
    div.innerHTML = 'Startup URL: ' + queryParameters.startupUrl + '<br/>';
    div.innerHTML += 'Current URL: ' + queryParameters.currentUrl + '<br/>';
    div.innerHTML += 'Fav icon URL: ' + queryParameters.favIconUrl + '<br/>';
    div.innerHTML += 'Title: ' + queryParameters.title + '<br/>';
};

setDivText();

var onReady = function () {
    document.body.appendChild(div);
};

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
        setDivText();
    });

document.onreadystatechange = function () {
    if (document.readyState === 'complete') {
        onReady();
    }
};
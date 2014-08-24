function SearchString(searchString) {
    this.parameters = SearchString.getQueryParameters(searchString);
}

SearchString.getQueryParameters = function(searchString) {
    searchString = searchString.split('+').join(' ');

    var params = {};
    var regularExpression = /[?&]?([^=]+)=([^&]*)/g;
    var tokens = regularExpression.exec(searchString);

    while (tokens) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        tokens = regularExpression.exec(searchString);
    }

    return params;
};

var link = document.querySelector('link[rel~="icon"]');
if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'shortcut icon');
    document.head.appendChild(link);
}

var searchString = new SearchString(document.location.search);

link.href = searchString.parameters.favIconUrl;

var div = document.createElement('div');
var setDivText = function() {
    div.innerHTML = 'Startup URL: ' + searchString.parameters.startupUrl + '<br/>';
    div.innerHTML += 'Current URL: ' + searchString.parameters.currentUrl + '<br/>';
    div.innerHTML += 'Fav icon URL: ' + searchString.parameters.favIconUrl + '<br/>';
};

setDivText();


var onReady = function() {
    document.body.appendChild(div);
};

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.type === 'favIconUrl') {
        searchString.parameters.favIconUrl = request.data;
        link.href = request.data;
    }
    else if(request.type === 'currentUrl')
        searchString.parameters.currentUrl = request.data;
    else
        return;
    setDivText();
  });

document.onreadystatechange = function() {
    if(document.readyState === 'complete')
        onReady();
};
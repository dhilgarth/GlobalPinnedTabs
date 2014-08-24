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
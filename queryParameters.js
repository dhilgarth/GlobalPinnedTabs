var QueryParameters = {
    getQueryParameters: function (queryString) {
        queryString = queryString.split('+').join(' ');

        var params = {};
        var regularExpression = /[?&]?([^=]+)=([^&]*)/g;
        var tokens = regularExpression.exec(queryString);

        while (tokens) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
            tokens = regularExpression.exec(queryString);
        }

        return params;
    }
};
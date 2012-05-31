/**
 * Returns the index of a given header object in the provided array
 * @param headerArray The Array to search in
 * @param newHeader The header to find
 * @return {int} The index of the header, or -1 if not found in the Array
 */
function getHeaderIndex(headerArray, newHeader) {

    for (var i = 0, len = headerArray.length; i < len; i++) {
        var currentHeader = headerArray[i];
        if (currentHeader.hasOwnProperty('name') && currentHeader.name == newHeader.name) {
            return i;
        }
    }

    return -1;
}

function mergeNewHeaders(originalHeaders, newHeaders) {
    //copy the headers for our own usage
    var mergedHeaders = originalHeaders.slice();
    for (var i = 0, len = newHeaders.length; i < len; i++) {
        var index = getHeaderIndex(mergedHeaders, newHeaders[i]);

        //if a matching header is defined, replace it
        //if not, add the new header to the end
        if (index > -1) {
            mergedHeaders[index] = newHeaders[i];
        } else {
            mergedHeaders.push(newHeaders[i]);
        }
    }

    return mergedHeaders;
}

/**
 * Retrieves the saved settings from localstorage
 * @return an Array of Objects containing { URL:String, headers:[ {name:String, value:String} ] }
 */
function retrieveSettings() {
    var siteSettings = localStorage['corsSites'];

    if (!siteSettings) {
        return null;
    }

    return JSON.parse(siteSettings);
}

function matchUrlToHeaders(url, headersPerUrl) {
    return [];
}

var settings = retrieveSettings(),
    headersPerUrl = {},
    urlsToAlter = [];

if(settings) {
    for(var l = settings.length, i=0; i<l; i++) {
        //push each URL we wish to watch for into the array
        urlsToAlter.push(settings[i].URL);

        //use the URL as a key in the dictionary to lookup the specific headers to manipulate for that URL
        headersPerUrl[ settings[i].URL ] = settings[i].headers;
    }
}



chrome.webRequest.onHeadersReceived.addListener(
    function (info) {

        var desiredHeaders = matchUrlToHeaders(info.url, headersPerUrl);

        return { responseHeaders:mergeNewHeaders(info.responseHeaders, desiredHeaders) };

    },
    // filters
    {
        urls:urlsToAlter
    },
    // extraInfoSpec
    ["blocking", "responseHeaders"]
);

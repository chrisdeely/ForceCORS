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

/**
 * Looks for a set of headers that match the provided URL
 * @param url {String} The URL of the currently executing request
 * @param headersPerUrl {Object} dictionary object using URL as key
 */
function matchUrlToHeaders(url, headersPerUrl) {
     for(var key in headersPerUrl){

         //this match is expecting that the user will specify URL domain
         //so key==http://www.foo.com && url==http://www.foo.com/?x=bar&whatever=12
         //maybe support regex in the future
         if(url.indexOf(key) >-1) {
             return headersPerUrl[key];
         }
     }
    return null;
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

        if(!desiredHeaders)
            return {};

        return { responseHeaders:mergeNewHeaders(info.responseHeaders, desiredHeaders) };

    },
    // filters
    {
        urls:urlsToAlter,
        types:['xmlhttprequest']
    },
    // extraInfoSpec
    ["blocking", "responseHeaders"]
);

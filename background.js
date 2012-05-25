var desiredHeaders = [
    {
        name:"Access-Control-Allow-Origin",
        value:"*"
    },
    {
        name: "Access-Control-Allow-Headers",
        value: "token"
    }
];
/**
 * Returns the index of a given header object in the provided array
 * @param headerArray The Array to search in
 * @param newHeader The header to find
 * @return {int} The index of the header, or -1 if not found in the Array
 */
function getHeaderIndex(headerArray, newHeader) {

    for (var i = 0, len = headerArray.length; i < len; i++) {
        var currentHeader = headerArray[i];
        if (currentHeader.hasOwnProperty('name') && currentHeader.name == headerArray.name) {
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

chrome.webRequest.onHeadersReceived.addListener(
    function (info) {


        return { responseHeaders:mergeNewHeaders(info.responseHeaders, desiredHeaders) };

    },
    // filters
    {
        urls:[
            "http://*/*",
            "https://*/*"
        ]
    },
    // extraInfoSpec
    ["blocking", "responseHeaders"]);

(function() {
/**
 * A dictionary of header settings, keyed using the URLs supplied in the Options page
 */
var headersPerUrl;

/**
 * An array of the URL patterns specified on the Options page. Used to filter out the requests we wish to monitor
 */
var urlsToAlter;

/**
 * Maintains a count of the number of modified responses for display in the browser badge area
 */
var alteredCount = 0;

/**
 * Only display the alteredCount if the user wishes
 */
var displayCount = true;

/**
 * Cache with of request specific data
 */
var requestIds;

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

function mergeNewHeaders(originalHeaders, newHeaders, origin) {
    //copy the headers for our own usage
    var mergedHeaders = originalHeaders.slice();
    for (var i = 0, len = newHeaders.length; i < len; i++) {
        var thisHeader = newHeaders[i];

        //skip if both are blank
        if (thisHeader.name || thisHeader.value) {
            var index = getHeaderIndex(mergedHeaders, thisHeader);

            //issue #9 - fix - use new object to not over-write passed in reference
            if (thisHeader.value === "HTTP_ORIGIN") {
                thisHeader = {
                    name: thisHeader.name,
                    value: origin
                };
            }

            //if a matching header is defined, replace it
            //if not, add the new header to the end
            if (index > -1) {
                mergedHeaders[index] = thisHeader;
            } else {
                mergedHeaders.push(thisHeader);
            }
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
    for (var key in headersPerUrl) {

        //this match is expecting that the user will specify URL domain
        //so key==http://www.foo.com && url==http://www.foo.com/?x=bar&whatever=12
        //maybe support regex in the future
        if (url.indexOf(key) > -1) {
            return headersPerUrl[key];
        }
    }
    return null;
}

/**
 * Responds to Chrome's onHeadersReceived event and injects all headers defined for the given URL
 * @param info {Object} Contains the request info
 * @see http://code.google.com/chrome/extensions/webRequest.html#event-onHeadersReceived
 */
function onHeadersReceivedHandler(info) {
    var desiredHeaders = matchUrlToHeaders(info.url, headersPerUrl);

    if (!desiredHeaders)
        return {};

    if (displayCount) {
        chrome.browserAction.setBadgeText({ text:(++alteredCount).toString()});
    }

    var request = getRequestAndCleanUp(info);
    var origin = request ? request.origin : "*"; // default to all if nothing is found

    return { responseHeaders: mergeNewHeaders(info.responseHeaders, desiredHeaders, origin) };
}

/**
 * Responds to Chrome's onBeforeSendHeaders event and finds 'origin' or 'referer' header for use later
 * @param info {Object} Contains the request info
 * @see http://code.google.com/chrome/extensions/webRequest.html#event-onBeforeSendHeaders
 */
function onBeforeSendHeadersHandler(info) {
    var origin = null;

    for (var i = 0, len = info.requestHeaders.length; i < len; i++) {
        var header = info.requestHeaders[i];
        if (header.name === "Origin") { // be done
            origin = header.value;
            break;
        }
        if (header.name === "Referer") { // keep going
            origin = header.value;
        }
    }

    //push on to stack
    if (origin) {
        requestIds.push({
            requestId: info.requestId,
            origin: origin,
            expiration: Math.round(info.timeStamp) + 10E3
        });
    }

    return {requestHeaders: info.requestHeaders};
};

/**
 * Find the request and garbage collect the other requests. This should clean up orphan requests.
 * @param info {Object} Contains the request info
 */
function getRequestAndCleanUp(info) {

    var requestId = info.requestId;
    var now = Math.ceil(info.timeStamp);

    var request = null;

    requestIds = requestIds.filter(function(elem) {
        if (elem.requestId === requestId) {
            request = elem;
        }
        return (elem.expiration < now && elem.requestId !== requestId);
    });

    return request;
}

/**
 * Responds to Chrome's onErrorOccurred event
 * @param info {Object} Contains the request info
 * @see http://code.google.com/chrome/extensions/webRequest.html#event-onErrorOccurred
 */
function onErrorOccurredHandler(info) {
    //still works but Chrome still complains ... this is the only property that is different from a normal request
    if (info.type !== "xmlhttprequest") {
        console.log('ForceCORS was unable to modify headers for: '+info.url +' - '+info.error);
    }
}

/**
 * Opens the Options page in a new tab
 */
function showOptionsPage() {
    chrome.tabs.create(
        {
            url:chrome.extension.getURL('/options.html')
        }
    );
}

/**
 * Initializes the background page by retrieving settings and establishing the onHeadersReceived listener.
 * This method is called upon initialization, and also when the user changes settings on the Options page.
 */
function init() {

    var settings = retrieveSettings();
    headersPerUrl = {};
    urlsToAlter = [];
    requestIds = [];

    if (settings) {
        for (var l = settings.length, i = 0; i < l; i++) {
            //push each URL we wish to watch for into the array
            urlsToAlter.push(settings[i].URL);

            //use the URL as a key in the dictionary to lookup the specific headers to manipulate for that URL
            headersPerUrl[ settings[i].URL.replace(/\*/g, '') ] = settings[i].headers;
        }
    }

    chrome.browserAction.setBadgeText({ text:''});
    displayCount = (localStorage['displayInterceptCount'] == undefined) ? true : JSON.parse(localStorage['displayInterceptCount']);

    //show options page on icon click
    chrome.browserAction.onClicked.removeListener(showOptionsPage);
    chrome.browserAction.onClicked.addListener(showOptionsPage);

    //when the user updates the settings via the Options page, we need to remove and re-add the listener
    //especially to update the URL filters
    if (chrome.webRequest.onHeadersReceived.hasListener(onHeadersReceivedHandler)) {
        chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceivedHandler)
    }
    chrome.webRequest.onHeadersReceived.addListener(onHeadersReceivedHandler, {urls: urlsToAlter}, ["blocking", "responseHeaders"]);

    //same logic
    if (chrome.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeadersHandler)) {
        chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersHandler)
    }
    chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersHandler, {urls: urlsToAlter}, ["requestHeaders"]);

    //dido
    if (chrome.webRequest.onErrorOccurred.hasListener(onErrorOccurredHandler)) {
        chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurredHandler);
    }
    chrome.webRequest.onErrorOccurred.addListener(onErrorOccurredHandler, {urls: urlsToAlter});

    //let chrome know
    chrome.webRequest.handlerBehaviorChanged();
}

//establish a listener to respond to changes from the Options page
chrome.extension.onRequest.addListener(function (request_not_used, sender_not_used, sendResponse) {
    //retrigger the init method to load the new settings
    init();

    //respond that we got the message
    sendResponse();
});

//make rocket go now!
init();

})();
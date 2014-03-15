/* global chrome, jQueryAudit */

// The DevTools page is the only one that can "eval" code within
// the context of the inspected page. But, it has no way of knowing
// that the panel was closed. So, we need this trickery to clean up
// after the DevTools are closed.

var cleanup = serializeAsIIFE(function(imports) {
    var script = document.createElement('script');
    script.innerHTML = imports.remove;
    document.head.appendChild(script);
    setTimeout(function() {
        document.head.removeChild(script);
    });
}, {
    remove: serializeAsIIFE(function() {
        if (!window.jQueryAudit) return;
        jQueryAudit.cleanup();
        delete window.jQueryAudit;
    })
});

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== 'devtools-jqueryaudit') return;

    var tabId;
    var tabIdListener = function(message/*, sender, sendResponse*/) {
        if (!message.tabId) return;
        tabId = message.tabId;
        port.onMessage.removeListener(tabIdListener);
    };
    port.onMessage.addListener(tabIdListener);

    port.onDisconnect.addListener(function() {
        if (tabId == null || !chrome.tabs) return;
        chrome.tabs.executeScript(tabId, {
            code: cleanup
        });
    });

});

function serializeAsIIFE(fn) {
    var params = Array.prototype.slice
        .call(arguments, 1)
        .map(function(arg) {
            return JSON.stringify(arg);
        }).join(',');
    return [ '(', fn.toString(), ')(', params, ')' ].join('');
}

/* global chrome */

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== 'devtools-jqueryaudit') return;

    var tabId;
    var tabIdListener = function(message/*, sender, sendResponse*/) {
        if (!message.tabId) return;
        tabId = message.tabId;
        port.onMessage.removeListener(tabIdListener);
    };
    port.onMessage.addListener(tabIdListener);

    // The DevTools page is the only one that can "eval" code within
    // the context of the inspected page. But, it has no way of knowing
    // that the panel was closed. So, we need this trickery to clean up
    // after the DevTools are closed.
    port.onDisconnect.addListener(function() {
        if (tabId == null) return;
        chrome.tabs.executeScript(tabId, {
            code: '(' + function() {
                var script = document.createElement('script');
                script.innerHTML = '(' + function() {
                    if (typeof window.jQueryAudit === 'function') window.jQueryAudit();
                    if ('jQueryAudit' in window) delete window.jQueryAudit;
                }.toString() + ')()';
                document.head.appendChild(script);
                setTimeout(function() {
                    document.head.removeChild(script);
                });
            }.toString() + ')()'
        });
    });

});

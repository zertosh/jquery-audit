/* global chrome */

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-45812610-1']);
(function() {
    var ga = document.createElement('script');
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();

var prevUrl;

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== 'devtools-jqueryaudit') return;

    // GA tick
    port.onMessage.addListener(function(msg) {
        if (prevUrl === msg.url) return;
        _gaq.push(['_trackPageview', (prevUrl= msg.url)]);
    });

    // Clean up after the dev-tools closes
    port.onDisconnect.addListener(function() {
        chrome.tabs.executeScript(port.tabId, {
            code: '(' + function() {
                if (typeof window.jQueryAudit === 'function') window.jQueryAudit();
                if ('jQueryAudit' in window) delete window.jQueryAudit;
            }.toString() + ')()'
        });
        prevUrl = null;
    });

    chrome.tabs.query({ 'active': true }, function (tabs) {
        port.url = tabs[0].url;
        port.tabId = tabs[0].id;
    });
});

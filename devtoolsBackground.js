/* jslint browser: true */
/* global chrome, $0 */

function getPanelContents(settings) {
    if (!$0) return;

    settings || (settings = {});

    // In case we're in an <iframe>
    var document = $0.ownerDocument;
    var window = document.defaultView;

    // We will only work if there is a "jQuery" function.
    // TODO: Alternatively check for an AMD module.
    if (typeof window.jQuery !== 'function')
        return (function(msg) {
            return (msg.Error = '@(window.jQuery is missing)'), msg;
        })(Object.create(null));

    if (typeof window.jQuery._data !== 'function')
        return (function(msg) {
            return (msg.Error = '@(jQuery version is too old)'), msg;
        })(Object.create(null));

    return (function($, el) {

        function internalClass(obj) {
            return Object.prototype.toString.call(obj).match(/\[object (\w+)\]/)[1];
        }

        // Return objects with "__proto__ = null" so we don't clutter up the panel.
        function extendNull() {
            return $.extend.apply(null, [].concat.apply([Object.create(null)], arguments));
        }

        // Turn certain objects into descriptive strings so they're easier to read.
        function exportify(obj, none) {
            if (obj === null)            return none ? '@(none)' : '@(null)';
            if (obj === undefined)       return none ? '@(none)' : '@(undefined)';
            if (obj === false && none)   return        '@(none)';
            if (typeof obj !== 'object') return obj;

            var hasKeys = !!Object.keys(obj).length;

            if (none && !hasKeys)        return '@(none)';
            if (hasKeys)                 return extendNull(obj);
                                         return '@(empty ' + internalClass(obj) + ')';
        }

        // Get/create the comment nodes "<!-- @(window) -->" and "<!-- @(document) -->"
        // that go below "<html>". These are used as representations for
        // the "window" and "document" objects. Since they don't have a representation
        // in the Elements Panel, but can have event listeners, we add the comment
        // nodes for convenience.
        //
        // These use to be above the "<!DOCTYPE html>". There is bug in Chrome
        // the caused the Elements Panel to scroll to the selected element if the DOM
        // changed when these helper elements were above "<html>". So, they got moved.
        //
        // To turn them off go to Extensions -> jQuery Audit -> options
        //
        var jQueryAudit = !settings.displayHelpers ? {} : window.jQueryAudit ||
            (window.jQueryAudit = (function() {
                var target = document.documentElement.firstChild;
                var parent = target.parentNode;
                var jQA = {};
                try {
                    jQA.window = parent.insertBefore(
                        document.createComment('@(window)'),
                        target );
                    jQA.document = parent.insertBefore(
                        document.createComment('@(document)'),
                        target );
                    jQA.cleanup = function() {
                        parent.removeChild(jQA.window);
                        parent.removeChild(jQA.document);
                        jQA.cleanup = jQA.window = jQA.document = null;
                    };
                } catch(err) {}
                return jQA;
            })());

        // Check if we're on "<!-- @(window) -->" or "<!-- @(document) -->"
        var target = (el === jQueryAudit.window)   ? window :
                     (el === jQueryAudit.document) ? document :
                                                     el;

        // Get all the events this element will react to, either because they're
        // directly bound to it w/o delegation, or because some ancestor is delegating.
        var events = (function() {
            var el = target;
            var ancestors = (el === window)   ? [ window ] :
                            (el === document) ? [ document ] :
                                                [ el ].concat( $(el).parents().toArray(), document, window );
            return $.map(ancestors, function(node) {
                return $.map(($._data(node)||0).events || {}, function(val) {
                        return val;
                    }).filter(function(ev) {
                        var sel = ev.selector;
                        if (!sel) return node === el;
                        // Pretty much the same methodology jQuery uses
                        // https://github.com/jquery/jquery/blob/1.10.2/src/event.js#L435
                        return (ev.needsContext) ?
                                $(sel, node).length :
                                $.find(sel, node, null, (el.nodeType === 1) ? [ el ] : []).length;
                    }).map(function(ev) {
                        return extendNull(ev, {
                            delegator: (node === el) ? '@(this element)' : node
                        });
                    });
            }).reduce(function(acc, ev) {
                ++acc.sum[ev.type] || (acc.sum[ev.type] = 0);
                acc.all[ev.type + '.' + acc.sum[ev.type]] = ev;
                acc.i++;
                return acc;
            }, {
                i: 0,
                all: {},
                sum: {}
            });
        })();

        var internalData = (function() {
            return $._data(target);
        })();

        var data = (function() {
            var _data = $._data(target);
            // Avoid $(..).data() side-effects
            return _data && _data.parsedAttrs && _data.data;
        })();

        var dataset = (function() {
            return target.dataset;
        })();

        // If you have <div><p class="myClass"><a href="#"></p></div> and you select the <p>,
        // it returns <p class="myClass"></p>
        var ownHTML = (function() {
            var outerHTML = target.outerHTML;
            if (outerHTML && ('innerHTML' in target))
                return outerHTML.replace(target.innerHTML, '');
        })();

        // Panel output
        return extendNull( (function() {
            var panel = {};
            panel['@(this element)']            = target;
            panel['Data']                       = exportify( data );
            panel['Events(' + events.i + ')']   = exportify( events.all, true);
            panel['Internal Data']              = exportify( internalData, true );
            panel['dataset']                    = exportify( dataset );
            panel['own HTML']                   = exportify( ownHTML, true );
            return panel;
        })() );

    })(window.jQuery, $0);
}

var backgroundPageConnection = chrome.runtime.connect({
    name: 'devtools-jqueryaudit'
});

// Pass "tabId" to the background page so we can cleanup after the panel closes.
backgroundPageConnection.postMessage({
    tabId: chrome.devtools.inspectedWindow.tabId
});

var elements = chrome.devtools.panels.elements;
elements.createSidebarPane('jQuery Audit', function(sidebar) {
    // Assume we're visible from the start
    var isVisible = true;

    updatePanelContents();

    elements.onSelectionChanged.addListener(function() {
        if (isVisible) updatePanelContents();
    });

    // "onShown" is flaky on Chrome 31
    if (getChromeVersion() > 31) {
        // Don't update the sidebar if it's not visible
        sidebar.onShown.addListener(function() {
            isVisible = true;
            updatePanelContents();
        });
        sidebar.onHidden.addListener(function() {
            isVisible = false;
        });
    }

    function updatePanelContents() {
        sidebar.setExpression( serializeAsIIFE(getPanelContents, getSettings()) );
    }
});

function serializeAsIIFE(fn) {
    var params = Array.prototype.slice
        .call(arguments, 1)
        .map(function(arg) {
            return JSON.stringify(arg);
        }).join(',');
    return [ '(', fn.toString(), ')(', params, ')' ].join('');
}

function getChromeVersion() {
    return parseInt(navigator.userAgent.match(/chrome\/(\d+)/i)[1]);
}

function getSettings() {
    var store = localStorage;
    // Default settings
    var settings = {
        displayHelpers: true
    };
    if ('displayHelpers' in store) {
        (settings.displayHelpers = !!parseInt(store.displayHelpers));
    }
    return settings;
}

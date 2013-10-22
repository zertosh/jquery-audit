/* jslint browser: true */
/* global chrome, $0 */

var getPanelContents = function () {
    if (!$0) return;

    // In case we're in an <iframe>
    var document = $0.ownerDocument;
    var window = document.defaultView;

    // We will only work if there is a "jQuery" function.
    // TODO: Alternatively check for an AMD module.
    if ((typeof window.jQuery !== 'function') ||
        (typeof window.jQuery._data !== 'function') )
            return (function(msg) {
                return (msg.Error = '@(window.jQuery is missing)'), msg;
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
        // that go above <!DOCTYPE html>. These are used as representations for
        // the "window" and "document" objects. Since they don't have an element
        // representation in the "Elements" view, but can have event listeners, we
        // add the comment nodes for convenience.
        // If you want to remove them just call jQueryAudit() in the console.
        var jQueryAudit = window.jQueryAudit ||
            (window.jQueryAudit = (function(d) {
                function cleanup() {
                    doc.parentNode.removeChild(doc);
                    win.parentNode.removeChild(win);
                    cleanup.window = cleanup.document = null;
                }
                var win = cleanup.window = d.doctype.parentNode.insertBefore(
                    d.createComment('@(window)'),
                    d.doctype );
                var doc = cleanup.document = d.doctype.parentNode.insertBefore(
                    d.createComment('@(document)'),
                    d.doctype );
                return cleanup;
            })(document));

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
};

var backgroundPageConnection = chrome.runtime.connect({
    name: 'devtools-jqueryaudit'
});

function backgroundPostMessage(action) {
    chrome.devtools.inspectedWindow.eval('document.location.href', function(url) {
        backgroundPageConnection.postMessage({ action: action, url: url });
    });
}

var elements = chrome.devtools.panels.elements;
elements.createSidebarPane('jQuery Audit', function(sidebar) {
    function updatePanelContents() {
        sidebar.setExpression('(' + getPanelContents.toString() + ')()');
    }
    updatePanelContents();
    elements.onSelectionChanged.addListener(function() {
        backgroundPostMessage('ON_SELECTION_CHANGED');
        updatePanelContents();
    });
    backgroundPostMessage('CREATE_SIDEBAR_PANE');

    // TODO: Only update while the panel is visible.
    // "onHidden" works in Chrome 30 and 31, but "onShown" only seems to work
    // properly in 32 and 33. I'll come back to this when 32 is stable.
    // sidebar.onHidden.addListener(function() { });
    // sidebar.onShown.addListener(function() { });
});

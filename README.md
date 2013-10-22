jQuery Audit
------------

`jQuery Audit` is a Chrome Developer Tools extension for ~~debugging~~ auditing jQuery &mdash; it creates a sidebar in the `Elements panel` containing jQuery **delegated events**, internal data, and more, as **live `DOM nodes`, `functions`, and `objects`**.

![jQuery Audit panel](http://static.tumblr.com/p2zjhet/WbZmwfqaq/jquery-audit-panel.png)


##### Live `DOM nodes`, `functions`, and `objects`
* Variables in the `jQuery Audit` sidebar behave like objects in the `Sources panel` &rarr; `Scope Variables` sidebar. You can right-click on a `function` and goto **"Show Function Definition"**, or hover over a `DOM node` to highlight it in the document, as well as right-clicking it to **"Reveal in Elements Panel"**.

![show function definition](http://static.tumblr.com/p2zjhet/pnimwfrwl/show-function-definition-highlight.png)


##### Direct access to the `document` and `window` objects
* The `document` and the `window` objects don't have representations in the `Elements panel` but can nonetheless be event targets and/or have associated jQuery data. `jQuery Audit` adds two comment nodes above the `<!DOCTYPE>` to represent them. The `<!--@(document)-->` as a stand-in for the `document` object, and the `<!--@(window)-->` as a stand-in for the `window` object. Select either to audit the represented object in the `jQuery Audit` sidebar.

![document & window](http://static.tumblr.com/p2zjhet/UZlmwfyd4/document-window-highlight.png)

**Requirements:** `jQuery Audit` does a `typeof window.jQuery === 'function'` whenever a `node` is selected. If it can't find a `jQuery` function in the global scope, the sidebar will display `Error: "@(window.jQuery is missing)"`.

**Tip:** Text wrapped in `@(...)` are "messages" from `jQuery Audit`. This was the compromise made to get live objects in the sidebar and be able to show informative messages.

***

### Sidebar sections

##### `@(this element)`
* The element currently selected.

##### `Data`
* _Data_ contains the would-be result of invoking `$(element).data()`. `jQuery Audit` doesn't invoke `.data()` because calling it creates a data object in jQuery's internal store if one doesn't already exist for that element. Instead, `jQuery Audit` directly looks in the internal store for the data object and returns it. If there isn't one, you'll see `@(none)`, or if it's an empty object you'll see `@(empty Object)`.

##### `Events([number_of_events])`
* These are the events that the element would **react to**. That means any delegated events, or any directly bound events that don't delegate. (Directly bound events are under `Internal Data` &rarr; `events`). For each event name, there is a corresponding jQuery event object associated with it, that has:
  * a `delegator`: The ancestor element that delegates the event, or `@(this element)` when the event is directly bound to the element and there is no delegation.
  * a `handler`: The function that handles the event. More often than not, the `handler` is a _bound_ function and not directly the function that does the "work". The section below on [Finding bound handlers](#finding-bound-handlers) shows you where common _binder_ functions store the _bound_ function.
  * And more.

##### `Internal Data`
* The internal data jQuery keeps on the element - it is the result of calling `$._data(element)`. This is not the same as the data object from `$(element).data()`, though the data object is kept here in the internal store.

##### `dataset`
* The value of `HTMLElement.dataset`. This is not the same as _Data_ above, but closely related to it. `HTMLElement.dataset` contains the raw `data-*` attributes. While _Data_ is the parsed content of any `data-*` attributes jQuery found on the element along with any other arbitrary information. (jQuery converts `Boolean`, `Number` and `JSON` in `data-*` attributes when you call `.data()`).

##### `own HTML`
* The result of removing the `innerHTML` from the `outerHTML` of an element. This helps debug character encoding issues, since what the `Elements panel` shows is a decoded "pretty" version of the HTML and not the actual HTML.

### Finding bound handlers
Often event `handlers` are _bound_ functions. In these cases, the function under `Events` &rarr; `event_name` &rarr; `handler` is the `binder` function and not the `bindee`. Depending on the `binder` used, the `bindee` function is usually near by.

##### `_.bind` from [Lo-Dash](http://lodash.com/)
* Expand the `handler` function followed by the `__bindData__` property. In this array, the first element is the `bindee` function, the other elements contain the `this` context and any parameters to be partially applied. Older versions of Lo-Dash might not have this structure.

  ![Lo-Dash bind](http://static.tumblr.com/p2zjhet/O7mmwfq08/lodash-bind-highlight.png)

##### `_.bind` from [Underscore](http://underscorejs.org/) and native `Function.prototype.bind`
* Underscore uses to the native `bind` function. A clear sign that the `binder` is the native `bind` function is `function () { [native code] }` for a `handler`. Expand the `handler` to locate the `bindee` function is under `[[TargetFunction]]`. The `this` context is found in `[[BoundThis]]` and any parameters to be partially applied are in `[[BoundArgs]]`.

  ![Native bind](http://static.tumblr.com/p2zjhet/okVmwfq2u/native-bind-highlight.png)

##### `$.proxy` from [jQuery](http://jquery.com/)
* With `$.proxy` the `bindee` can't be found as a property on the `binder` but rather in a `Closure`. A sign that the `binder` is `$.proxy` is the existence of a `guid` property on the `handler`. Expand the `handler`, followed by `<function scope>` and then the inner-most `Closure`. One of the variables in this scope contains the `bindee` - the name of the variable that contains the `bindee` will likely vary because of minification.

  ![jQuery proxy](http://static.tumblr.com/p2zjhet/jLfmwfq44/jquery-proxy-highlight.png)

***

### FAQ
* Does `jQuery Audit` work with `<iframe>'s`?
> Yes, if the `<iframe>` has a jQuery function (regardless of the parent having jQuery or not) and it's not restricted by the same-origin policy.

* How do I remove `<!--@(document)-->` and `<!--@(window)-->`?
> Run `jQueryAudit()` in the console. When you close the developer tools the two `comment nodes` are removed and the `jQueryAudit` object is removed.

* Why exactly the `@(...)`?
> The content of a `SidebarPane` can be an HTML page, a JSON object, or "the result of an expression". An HTML page, nor a JSON object, have the ability to display "live" objects. The reason for making this extension was so that I could find a delegated event and be able to use "Show Function Definition" on the handler. For that effect, the contents of the sidebar is actually "the result of an expression" with a lot of trickery to make it look not-so-ugly. So, to differentiate between actual object data and informational messages I went with `@(...)` so it wouldn't be easily confused with string data.

* Why the name _Audit_?
> I am a lawyer. Yes, really. Went to law school, passed the bar, and I'm a fully admitted member of the New York State Bar Association. So, yeah, that's why _Audit_ came to mind when I was thinking of a name.

**Disclaimer: I am not related to the jQuery project.**

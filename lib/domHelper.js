/**
 * DOM element utility functions.
 */

class DomHelper {
  constructor() {
    this.listeners = [];
    this.observer = null;

    try {
      this.MutationObserver =
        window.MutationObserver || window.WebKitMutationObserver;
    } catch (e) {
      throw new Error(e);
    }

    // Watch for changes in the document
    this.observer = new this.MutationObserver(this.check);
    this.observer.observe(window.document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Load JS scripts
   * @param {string|array} urls
   * @param {function} callback
   */
  loadScripts(urls, type = "js", callback) {
    return new Promise((resolve, reject) => {
      urls = typeof urls == "string" ? [urls] : urls;
      for (let i in urls) {
        const url = urls[i];
        switch (type) {
          case "css":
            let linkTag = document.createElement("link");
            linkTag.href = url;
            linkTag.crossorigin = "anonymous";
            linkTag.referrerpolicy = "no-referrer";
            linkTag.rel = "stylesheet";
            document.body.appendChild(linkTag);
            break;
          case "js":
          default:
            let scriptTag = document.createElement("script");
            scriptTag.src = url;
            scriptTag.crossorigin = "anonymous";
            scriptTag.referrerpolicy = "no-referrer";
            scriptTag.onload = callback;
            scriptTag.onreadystatechange = callback;
            document.body.appendChild(scriptTag);
            break;
        }
      }
      resolve(true);
    });
  }

  /**
   * Create elements.
   * @param {string} id
   * @param {string} tag
   * @param {string} classes
   * @returns
   */
  addElement(id, tag, classes) {
    id = id || randomString();
    tag = tag || "div";
    classes = classes || "blank";

    // Convert classes
    classes = classes.split(" ");

    // create a new div element
    var newDiv = document.createElement(tag);
    newDiv.id = id;
    newDiv.style = "margin-top: 2em;";

    for (var cls in classes) {
      newDiv.classList.add(classes[cls]);
    }

    return newDiv;
  }

  /**
   * Create new table.
   * @param {string} id ID of table.
   * @param {array} headers Array of header cells.
   * @param {boolean} body True if body needs to be added.
   * @param {string} classes String of classes
   * @returns
   */
  createTable(id, headers, body, classes) {
    id = id || Math.random().toString(36).substring(8);
    headers = headers || [];
    body = body || true;
    classes = classes || "table table-bordered";

    var table = this.addElement(id, "table", classes);
    var header = table.createTHead();
    var row = header.insertRow(0);
    for (var th in headers) {
      var cell = row.insertCell(th);
      cell.innerHTML = "<strong>" + headers[th] + "</strong>";
    }
    if (body) {
      table.createTBody();
    }
    return table;
  }

  ready(selector, fn) {
    console.log("selector", selector);
    // Store the selector and callback to be monitored
    this.listeners.push({
      selector: selector,
      fn: fn,
    });
    // Check if the element is currently in the DOM
    this.check();
  }

  check() {
    // Check the DOM for elements matching a stored selector
    let listenLenda = this.listeners?.length;
    if (listenLenda != undefined) {
      for (let i = 0, len = listenLenda, listener, elements; i < len; i++) {
        listener = this.listeners[i];
        // Query for elements matching the specified selector
        elements = window.document.querySelectorAll(listener.selector);
        for (let j = 0, jLen = elements.length, element; j < jLen; j++) {
          element = elements[j];
          // Make sure the callback isn't invoked with the
          // same element more than once
          if (!element.ready) {
            element.ready = true;
            // Invoke the callback with the element
            listener.fn.call(element);
          }
        }
      }
    }
  }
}

export default DomHelper;

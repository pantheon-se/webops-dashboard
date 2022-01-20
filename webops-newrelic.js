// ==UserScript==
// @name         Pantheon WebOps - New Relic
// @namespace    https://kyletaylor.dev
// @version      0.3
// @description  Always be wow-ing.
// @author       Kyle Taylor
// @match        https://*.dashboard.pantheon.io/organizations/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";
  
    var checkChartTime = performance.now();
    var checkExist = setInterval(function () {
      window.webopsSitesContainer = document.querySelector(
        ".sites-workspace .tool-region .js-sites-table"
      );
      console.log("webops container", window.webopsSitesContainer);
      if (
        window.webopsSitesContainer !== null &&
        Object.getOwnPropertyNames(window.webopsSitesContainer).length !== 0
      ) {
        clearInterval(checkExist);
        main();
      } else {
        var diff1 = performance.now() - checkChartTime;
        console.log("Still waiting for sites list container", diff1 + " msec");
        // If longer than 200 seconds, bail.
        if (diff1 > 200000) {
          clearInterval(checkExist);
          console.log("Bailed on sites list container");
        }
      }
    }, 1000);
  
    /**
     * Main
     */
    async function main() {
      var container = window.webopsSitesContainer;
  
      console.log("org", window.app.organizations);
      window.org = window?.app?.organizations;
      // Get current org ID
      if (window.org !== "undefined") {
        window.org.id = Object.keys(window.org)[0];
  
        async function getSites(orgID) {
          let url = `/api/organizations/${orgID}/memberships/sites?hydrate=site&limit=500`;
          console.log("url", url);
          let sites = [];
          let response = await fetch(url)
            .then(async (resp) => {
              if (resp.ok) {
                return await resp.json();
              }
              throw new Error("Network response was not ok.");
            })
            .catch((err) => console.error)
            .then((data) => {
              let requests = data.map((site) =>
                fetch(
                  `/api/sites/${site.id}/environments/dev/bindings?type=newrelic`
                )
              );
  
              Promise.all(requests)
                .then((responses) => {
                  // all responses are resolved successfully
                  for (let response of responses) {
                    console.log(`${response.url}: ${response.status}`); // shows 200 for every url
                  }
  
                  return responses;
                })
                // map array of responses into an array of response.json() to read their content
                .then((responses) => Promise.all(responses.map((r) => r.json())))
                // all JSON answers are parsed: "users" is the array of them
                .then((sites) => sites.forEach((site) => console.log));
            });
  
          return sites;
        }
  
        // Populate data
        let sites = await getSites(window.org.id);
        console.log("sites", sites);
        sites.forEach(async function (site) {
          let url = "https://api.newrelic.com/v2/applications.json";
          let response = await fetch(url, {
            headers: {
              "X-Api-Key:": site.newRelic.api_key,
            },
          })
            .then(async (resp) => {
              if (resp.ok) {
                let data = await resp.json();
                return data;
              }
              throw new Error("Network response was not ok.");
            })
            .catch((err) => console.error);
  
          console.log(response);
        });
      }
    }
  
    var listeners = [],
      doc = window.document,
      MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
      observer;
  
    function ready(selector, fn) {
      // Store the selector and callback to be monitored
      listeners.push({
        selector: selector,
        fn: fn,
      });
      if (!observer) {
        // Watch for changes in the document
        observer = new MutationObserver(check);
        observer.observe(doc.documentElement, {
          childList: true,
          subtree: true,
        });
      }
      // Check if the element is currently in the DOM
      check();
    }
  
    /**
     * Check if elements exist.
     */
    function check() {
      // Check the DOM for elements matching a stored selector
      for (var i = 0, len = listeners.length, listener, elements; i < len; i++) {
        listener = listeners[i];
        // Query for elements matching the specified selector
        elements = doc.querySelectorAll(listener.selector);
        for (var j = 0, jLen = elements.length, element; j < jLen; j++) {
          element = elements[j];
          // Make sure the callback isn't invoked with the
          // same element more than once
          if (!element.ready) {
            element.ready = true;
            // Invoke the callback with the element
            listener.fn.call(element, element);
          }
        }
      }
    }
  
    /**
     * Get New Relic Site Data
     * @param {*} site_id
     * @returns
     */
    async function getNewRelicData(site_id) {
      let url = `/api/sites/${site_id}/environments/dev/bindings?type=newrelic`;
      let response = await fetch(url)
        .then(async (resp) => {
          if (resp.ok) {
            return await resp.json();
          }
          throw new Error("Network response was not ok.");
        })
        .catch((err) => console.error);
  
      return response;
    }
  
    /**
     * Load JS scripts
     * @param {*} urls
     * @param {*} callback
     */
    function loadJS(urls, callback) {
      urls = typeof urls == "string" ? [urls] : urls;
      for (var i in urls) {
        var url = urls[i];
        var scriptTag = document.createElement("script");
        scriptTag.src = url;
        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;
        document.body.appendChild(scriptTag);
      }
    }
  
    /**
     * Create elements.
     */
    function addElement(id, tag, classes) {
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
  
    function createTable(id, headers, body, classes) {
      id = id || Math.random().toString(36).substring(8);
      headers = headers || [];
      body = body || true;
      classes = classes || "table table-bordered";
  
      var table = addElement(id, "table", classes);
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
  
    function getBadgeClass(num) {
      var badge = "danger";
      if (num >= 90) {
        badge = "success";
      } else if (num < 90 && num >= 60) {
        badge = "warning";
      }
      return badge;
    }
  
    function capitalize(word) {
      const lower = word.toLowerCase();
      return word.charAt(0).toUpperCase() + lower.slice(1);
    }
  
    // Expose `ready`
    window.ready = ready;
  
    // Clear block UI elements.
    ready(".blockUI", (el) => {
      el.remove();
      console.log("removed BlockUI");
    });
  })();
  
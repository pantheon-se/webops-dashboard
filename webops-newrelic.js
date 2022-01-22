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
      var scripts = [
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js",
      ];
      loadJS(scripts, main);
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
    var Chart = window.Chart || {};

    var container = window.webopsSitesContainer;

    console.log("org", window.app.organizations);
    window.org = window?.app?.organizations;
    // Get current org ID
    if (window.org !== "undefined") {
      window.org.id = Object.keys(window.org)[0];

      async function getSites(orgID) {
        let url = `/api/organizations/${orgID}/memberships/sites?hydrate=site&limit=500`;
        console.log("url", url);
        let responses = await fetch(url)
          .then(async (resp) => {
            if (resp.ok) {
              return await resp.json();
            }
            throw new Error("Network response was not ok.");
          })
          .catch((err) => console.error);

        // Get New Relic data for each site
        await responses.forEach(async (response) => {
          response["newrelic"] = await getNewRelicData(response.site.id);
          let application = response?.newrelic?.application;
          if (application !== undefined) {
            /*
                {
                    "response_time": 6.89,
                    "throughput": 2,
                    "error_rate": 0,
                    "apdex_target": 0.5,
                    "apdex_score": 1,
                    "host_count": 3,
                    "instance_count": 3
                }
                */
            let health = response.newrelic.application.health_status;
            let host_count =
              response.newrelic.application.application_summary.host_count;
            let response_time = (
              response.newrelic.application.application_summary.response_time /
              1000
            ).toFixed(2);
            let metrics = response.newrelic.metric_data.metrics[0].timeslices;
            let metric_labels = [];
            let metric_values = [];
            metrics.forEach((metric) => {
              metric_labels.push(metric.from);
              metric_values.push(metric.values.average_response_time);
            });

            let nr_box = addElement("nr-health-" + response.id, "div");
            let nr_content = `
                <ul>
                    <li>Health: ${health}</li>
                    <li>Hosts: ${host_count}</li>
                    <li>Response: ${response_time} sec.</li>
                </ul>
              `;
            nr_box.innerHTML = nr_content;

            // Get site row
            let site_selector = `.js-sites-table table tr a[href$="/sites/${response.id}"]`;
            let status_box = document.querySelector(site_selector);
            if (status_box !== null) {
              status_box.appendChild(nr_box);

              let accessChartContainer = addElement(
                "traffic-chart-" + response.id,
                "canvas"
              );
              accessChartContainer.style = "max-height: 100px";

              // Append access chart to container.
              new Chart(accessChartContainer, {
                type: "line",
                data: {
                  labels: metric_labels,
                  datasets: [
                    {
                      label: "Avg Response Time",
                      data: metric_values,
                      backgroundColor: "#54ACEF",
                    },
                  ],
                },
                options: {
                  maintainAspectRatio: false,
                  plugins: {
                    legend: false, // Hide legend
                  },
                  scales: {
                    y: {
                      //   display: false, // Hide Y axis labels
                    },
                    x: {
                      display: false, // Hide X axis labels
                    },
                  },
                },
              });

              status_box.after(accessChartContainer);
            }
          }
        });

        return responses;
      }

      // Populate data
      await getSites(window.org.id);
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
    let url = `/api/sites/${site_id}/environments/live/bindings?type=newrelic`;
    let response = await fetch(url)
      .then(async (resp) => {
        if (resp.ok) {
          return await resp.json();
        }
        throw new Error("Network response was not ok.");
      })
      .catch((err) => console.error);

    // Fix New Relic API response
    if (Object.keys(response).length > 0) {
      let keys = Object.keys(response);
      let nr_data = response[keys[0]];

      await fetch("https://api.newrelic.com/v2/applications.json", {
        body: "filter[name]=(live)",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Api-Key": nr_data.api_key,
        },
        method: "POST",
      })
        .then(async (resp) => {
          if (resp.ok) {
            let data = await resp.json();
            if (data.applications.length > 0) {
              let app = data.applications[0];
              response["application"] = app;

              // Get web transaction time data
              await fetch(
                `https://api.newrelic.com/v2/applications/${app.id}/metrics/data.json`,
                {
                  body: "names[]=HttpDispatcher&values[]=average_response_time",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Api-Key": nr_data.api_key,
                  },
                  method: "POST",
                }
              )
                .then(async (resp) => {
                  if (resp.ok) {
                    let data = await resp.json();
                    if (Object.keys(data.metric_data).length > 0) {
                      response["metric_data"] = data.metric_data;
                    }
                  }
                  throw new Error("Network response was not ok.");
                })
                .catch((err) => console.error);
            }
          }
          throw new Error("Network response was not ok.");
        })
        .catch((err) => console.error);
    }

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

  /**
   * Generate random string
   * @returns {string}
   */
  function randomString() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
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

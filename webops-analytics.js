// ==UserScript==
// @name         Pantheon WebOps Trick
// @namespace    https://kyletaylor.dev
// @version      0.3
// @description  Always be wow-ing.
// @author       Kyle Taylor
// @match        https://*.dashboard.pantheon.io/sites/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var checkChartTime = performance.now();
  var checkExist = setInterval(function () {
    window.webopsContainer = document.querySelector(
      "[class$='containerStyle']"
    );
    console.log("webops container", window.webopsContainer);
    if (
      window.webopsContainer !== null &&
      Object.getOwnPropertyNames(window.webopsContainer).length !== 0
    ) {
      clearInterval(checkExist);
      var scripts = [
        "https://cdnjs.cloudflare.com/ajax/libs/datatable/2.0.1/js/datatable.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.min.js",
      ];
      loadJS(scripts, checkChart);
    } else {
      console.log("Still waiting for webops container");
      var diff1 = performance.now() - checkChartTime;
      // If longer than 10 seconds, bail.
      if (diff1 > 200000) {
        clearInterval(checkExist);
        console.log("Bailed on webops container");
      }
    }
  }, 1000);

  var checkChart = setInterval(function () {
    if (window.Chart !== undefined && window.DataTable !== undefined) {
      clearInterval(checkChart);
      main();
    } else {
      console.log("Still waiting for Chart / Datatable");
      var diff2 = performance.now() - checkChartTime;
      // If longer than 10 seconds, bail.
      if (diff2 > 200000) {
        clearInterval(checkChart);
        console.log("Bailed");
      }
    }
  }, 1000);

  /**
   * Main
   */
  async function main() {
    var container = window.webopsContainer;
    var Chart = window.Chart || {};
    var DataTable = window.DataTable || {};

    // Chart defaults
    Chart.defaults.global.defaultFontFamily = "Open Sans";
    Chart.defaults.global.defaultFontColor = "#333333";
    Chart.defaults.global.defaultFontSize = 13;
    var chartBlue = "rgb(66,133,244)";
    var chartBlueA = "rgba(66,133,244, 0.25)";
    var chartRed = "rgb(219,68,55)";
    var chartRedA = "rgba(219,68,55, 0.25)";

    console.log("site", window.site);

    // Looker API in global space
    var lookerApi = {
      getAggregations: async function (callback = false) {
        let url = `https://dev-dunder-mifflin-drupal.pantheonsite.io/looker_auth.php?site_id=${window.site.attributes.id}`;
        let response = await fetch(url)
          .then(async (resp) => {
            if (resp.ok) {
              return await resp.json();
            }
            throw new Error("Network response was not ok.");
          })
          .catch((err) => console.error);
        return response;
      },
    };

    var accessChartContainer = addElement("traffic-chart", "canvas");
    accessChartContainer.style = "max-height: 400px";
    container.prepend(accessChartContainer);

    // Create new containers

    // Test traffic data
    let trafficData = await lookerApi.getAggregations();
    console.log("traffic", trafficData);

    // Append access chart to container.

    new Chart(accessChartContainer, {
      type: "line",
      data: {
        labels: trafficData.dates,
        datasets: [
          {
            label: "Hit %",
            data: trafficData.cache_hit_ratio,
            fill: false,
            tension: 0.1,
            borderColor: chartBlue,
            backgroundColor: chartBlueA,
            borderWidth: 1,
            pointBackgroundColor: "rgb(255,255,255)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Cache Hit Ratio",
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
          },
        },
      },
    });
    // new Chart(accessChartContainer, {
    //   type: "line",
    //   data: {
    //     labels: trafficData.dates,
    //     datasets: [
    //       {
    //         label: "Cached requests",
    //         data: trafficData.cached,
    //         fill: true,
    //         borderColor: chartBlue,
    //         backgroundColor: chartBlueA,
    //         borderWidth: 1,
    //         pointBackgroundColor: "rgb(255,255,255)",
    //       },
    //       {
    //         label: "Uncached requests",
    //         data: trafficData.uncached,
    //         fill: true,
    //         borderColor: chartRed,
    //         backgroundColor: chartRedA,
    //         borderWidth: 1,
    //         pointBackgroundColor: "rgb(255,255,255)",
    //       },
    //     ],
    //   },
    //   options: {
    //     responsive: true,
    //     maintainAspectRatio: false,
    //     title: {
    //       display: false,
    //       text: "Global CDN Report",
    //     },
    //     tooltips: {
    //       mode: "index",
    //       intersect: false,
    //     },
    //     hover: {
    //       mode: "nearest",
    //       intersect: true,
    //     },
    //     scales: {
    //       xAxes: [
    //         {
    //           display: true,
    //           scaleLabel: {
    //             display: false,
    //             labelString: "Day",
    //           },
    //           gridLines: {
    //             display: true,
    //             borderDash: [4, 4],
    //             borderColor: "#D7D7D7",
    //           },
    //         },
    //       ],
    //       yAxes: [
    //         {
    //           display: true,
    //           stacked: true,
    //           scaleLabel: {
    //             display: true,
    //             labelString: "Pageviews", // old: "Pageviews (in thousands)",
    //           },
    //           ticks: {
    //             autoSkip: true,
    //             maxTicksLimit: 6,
    //             callback: function (value) {
    //               return value; // old: value / 1000;
    //             },
    //           },
    //           gridLines: {
    //             display: false,
    //           },
    //         },
    //       ],
    //     },
    //   },
    // });

    /**
     * Add Lighthouse Reports
     */
    var newTableContainer = createTable(
      "lighthouse-table",
      ["Date", "URL", "Score", "Link"],
      true
    );
    accessChartContainer.after(newTableContainer);

    var dates = getDates();
    var tabledata = [];
    for (var dt = dates.length - 1; dt >= 0; dt--) {
      var last = dates.length - 1;
      var score = dt == last ? 100 : null;
      tabledata.push(lighthouseRow(dates[dt], score));
    }

    var datatable = new DataTable(newTableContainer, {
      data: tabledata,
      columnDefs: [
        {
          targets: "_all",
          className: "text-center",
        },
      ],
    });

    var title = addElement("table-title", "h3");
    title.appendChild(
      document.createTextNode("Lighthouse Performance Reports")
    );
    title.style = "";
    newTableContainer.before(title);

    // Global CDN
    var ctitle = addElement("fastly-title", "h3");
    ctitle.appendChild(
      document.createTextNode("Global CDN - Cache Performance")
    );
    var badgeStyle = getBadgeClass(trafficData.avg.value);
    var cscore = addElement(
      "fastly-score",
      "span",
      "badge badge-" + badgeStyle
    );
    cscore.appendChild(
      document.createTextNode(trafficData.avg.days + "-day Avg: " + trafficData.avg.value + "%")
    );
    ctitle.appendChild(cscore);
    cscore.style = "margin-left: 1em";
    accessChartContainer.before(ctitle);

    // Top Pages (Visits, Pages Served)
    var topPages = createTable("top-pages", [
      "Page Path",
      "Visits",
      "Pages Served",
    ]);
    var topPageData = {
      0: ["/", getTraffic(2000, 5000), getTraffic(20000, 50000)],
      1: ["/about", getTraffic(2000, 5000), getTraffic(20000, 50000)],
      2: [
        "/news/corporate-press-release",
        getTraffic(2000, 5000),
        getTraffic(20000, 50000),
      ],
      3: [
        "/rss.xml?category=techtrends",
        getTraffic(2000, 5000),
        getTraffic(20000, 50000),
      ],
      4: [
        "/wp-json/wp/v2/posts",
        getTraffic(2000, 5000),
        getTraffic(20000, 50000),
      ],
      5: ["/contact-us", getTraffic(2000, 5000), getTraffic(20000, 50000)],
    };

    for (var key in Object.keys(topPageData)) {
      var row = topPages.insertRow();
      for (var idx in topPageData[key]) {
        var cell = row.insertCell();
        cell.innerHTML = topPageData[key][idx];
      }
    }

    accessChartContainer.after(topPages);
    var ptitle = addElement("top-pages-title", "h3");
    ptitle.appendChild(document.createTextNode("Top Pages"));
    ptitle.style = "";
    topPages.before(ptitle);

    // New Relic
    var newRelicContainer = addElement("newRelicContainer", "div");
    newRelicContainer.innerHTML = getNewRelic().outerHTML;
    var ntitle = addElement("newrelic-title", "h3");
    ntitle.appendChild(document.createTextNode("New Relic APM"));
    ntitle.style = "";
    topPages.after(newRelicContainer);
    newRelicContainer.before(ntitle);

    // Add Workflow data
    const siteId = window?.site?.attributes?.id;
    if (siteId !== "undefined") {
      // Create URL
      let workflowApi = `/api/sites/${siteId}/workflows`;
      fetch(workflowApi)
        .then((response) => {
          console.log("workflow response", response);
          if (response.ok) {
            response.json().then((workflowData) => {
              console.log(workflowData);
              var workflowContainer = analyzeWorkflow(workflowData);
              accessChartContainer.after(workflowContainer);

              // Global CDN
              var ctitle = addElement("workflow-title", "h3");
              ctitle.appendChild(
                document.createTextNode("Quicksilver Workflows")
              );
              ctitle.style = "";
              workflowContainer.before(ctitle);
            });
          }
        })
        .catch((err) => console.log);
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

  function lighthouseRow(date, score) {
    score = score || getScore();
    var badge = getBadgeClass(score);
    var row = [];
    row.push(date);
    row.push("https://dev-example-site-1.pantheonsite.io");
    row.push('<span class="badge badge-' + badge + '">' + score + "</span>");
    row.push(
      '<a target="_blank" href="https://googlechrome.github.io/lighthouse/viewer/?gist=e5891e64bde91858d193cc41b3929eb7" class="btn btn-default">View Report</a>'
    );

    return row;
  }

  /**
   * Analyze quicksilver scripts
   * @param {*} data
   * @returns
   */
  function analyzeWorkflow(data) {
    console.log(data);

    let qs = [];
    const qsTemplate = {
      created_at: "Time",
      qs_name: "Job",
      type: "Trigger",
      result: "Status",
      total_time: "Runtime",
    };

    // Extract Quicksilver hooks
    for (let i in data) {
      let task = data[i];
      //      console.log(task);
      // Specifically look for Quicksilver tasks
      if (
        task.hasOwnProperty("final_task") &&
        task.final_task.fn_name === "queue_swf_task"
      ) {
        // Add item to Quicksilver list
        qs.push({
          type: task.type,
          result: task.final_task.result,
          created_at: task.final_task.created_at,
          qs_name: task.final_task.description,
          run_time: task.final_task.run_time,
        });
      }
    }

    // Create table
    let qsTable = createTable(
      "qs-report",
      ["Job", "Date", "Run Time", "Status"],
      true,
      "table table-bordered table-striped"
    );

    // Add colspans
    var theadCells = qsTable.querySelectorAll("thead td");
    theadCells[0].setAttribute("colspan", 4);
    theadCells[1].setAttribute("colspan", 2);
    theadCells[2].setAttribute("colspan", 1);
    theadCells[2].classList.add("text-center");
    theadCells[3].setAttribute("colspan", 1);
    theadCells[3].classList.add("text-center");

    // Loop through Quicksilver WF data
    let wf_count = 0;
    for (let idx in qs) {
      if (wf_count > 30) {
        break;
      }
      wf_count++;
      let item = qs[idx];

      let row = qsTable.getElementsByTagName("tbody")[0].insertRow();

      // Add Job
      var jobCell = row.insertCell();
      var eventType = hookLookup(item.type);
      jobCell.innerHTML = `<big>${item.qs_name}</big><br><small><strong>Event</strong>: ${eventType}</small>`;
      jobCell.className = "qs_name";
      jobCell.setAttribute("colspan", 4);

      // Add Date
      var dateCell = row.insertCell();
      var date = new Date(item.created_at * 1000);
      dateCell.innerHTML = date.toLocaleDateString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      dateCell.className = "created_at";
      dateCell.setAttribute("colspan", 2);

      // Add Runtime
      var timeCell = row.insertCell();
      timeCell.innerHTML = item.run_time.toFixed(2) + "s";
      timeCell.className = "run_time text-center";
      timeCell.setAttribute("colspan", 1);

      // Add Status
      var statusCell = row.insertCell();
      console.log("result", item.result);
      statusCell.innerHTML =
        item.result === "succeeded"
          ? "<span class='badge badge-success' style='font-size: 1.25em;'><i class='fa fa-check-circle-o fa-lg'></i></span>"
          : "<span class='badge badge-warning' style='font-size: 1.25em;'><i class='fa fa-ban fa-lg'></i></span>";
      statusCell.className = "result text-center";
      statusCell.setAttribute("colspan", 1);
    }

    return qsTable;
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

  function getTraffic(low, high) {
    low = low || 10000;
    high = high || 75000;
    return randomIntFromInterval(low, high);
  }

  function getScore() {
    return randomIntFromInterval(70, 100);
  }

  function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function randomString() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
  function getDates(start, increment) {
    start = start || -5;
    increment = increment || 1;
    start = start - (start % increment);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    for (var days = [], i = start; i < 1; i += increment) {
      var day = new Date();
      day.setDate(day.getDate() + i);
      var frm = months[day.getMonth()] + " " + day.getDate();
      days.push(frm);
    }
    return days;
  }

  function hookLookup(type) {
    switch (type) {
      case "deploy":
        return "Deploy";
        break;
      case "deploy_product":
        return "Create new site";
        break;
      case "clear_cache":
        return "Clear Cache";
        break;
      case "clone_database":
        return "Clone database";
        break;
      case "sync_code":
      case "sync_code_with_build":
        return "Sync code commits";
        break;
      case "create_cloud_development_environment":
        return "Create multidev environment";
        break;
      case "autopilot_vrt":
        return "Autopilot VRT";
        break;
      default:
        return "Unknown workflow";
        break;
    }
  }

  function capitalize(word) {
    const lower = word.toLowerCase();
    return word.charAt(0).toUpperCase() + lower.slice(1);
  }

  function getNewRelic() {
    var src =
      "https://chart-embed.service.newrelic.com/herald/9b64d1fb-5827-4289-a362-fe4b684842ef?height=400px&timepicker=true";
    var iframe = addElement("newrelic", "iframe");
    iframe.src = src;
    iframe.scrolling = "no";
    iframe.style = "width: 100%;height: 430px;overflow: hidden; border: 0;";
    return iframe;
  }

  // Expose `ready`
  window.ready = ready;

  // Clear block UI elements.
  ready(".blockUI", (el) => {
    el.remove();
    console.log("removed BlockUI");
  });
})();

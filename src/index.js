// ==UserScript==
// @name         Pantheon WebOps Trick
// @namespace    https://kyletaylor.dev
// @version      0.3
// @description  Always be wow-ing.
// @author       Kyle Taylor
// @match        https://*.dashboard.pantheon.io/sites/*
// @require      file:///Users/kyletaylor/server/github/webops-dashboard/webops-analytics.js
// @grant        none
// ==/UserScript==

const pantheon = require("../lib/pantheon");
const traffic = require("../lib/traffic");
const utils = require("../lib/utils").default;
const newrelic = require("../lib/newrelic");
const lighthouse = require("../lib/lighthouse").default;
const domHelperClass = require("../lib/domHelper").default;
const domHelper = new domHelperClass();
const { Workflows } = require("../lib/quicksilver");
const qs = new Workflows();

(function () {
  "use strict";

  domHelper.loadScripts(
    ["https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css"],
    "css"
  );

  const scripts = [
    "https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.min.js",
  ];

  domHelper.loadScripts(scripts).then(() => {
    domHelper.ready("[class$='containerStyle']", (el) => {
      main(el);
    });

    // Load quicksilver logs
    qs.getQuicksilverLogs().then((data) => {
      let qsLogWrapper = qs.generateDataTable(data);
      console.log(qsLogWrapper);
      jQuery("[class$='containerStyle']").append(qsLogWrapper);
    });

    // Add traffic info.
    domHelper.ready(".site-workshop .workspace-region", async (el) => {
      const data = await traffic.getWeeklySummary();
      let navbar = document.querySelector(
        "#navbar-view nav[class$='utilityNavStyle']"
      );
      let cacheHit = domHelper.addElement(
        "pantheon-cache-hit",
        "span",
        "traffic-stat"
      );
      cacheHit.textContent =
        "Cache Ratio: " + (data.cache_ratio * 100).toFixed(2) + "%";
      cacheHit.style = "";
      navbar.prepend(cacheHit);
    });
  });

  domHelper.ready("#connectionModal", (el) => {
    console.log("input db command");
  });

  /**
   * Main
   */
  async function main(container) {
    var Chart = window.Chart || {};

    // Chart defaults
    Chart.defaults.global.defaultFontFamily = "Open Sans";
    Chart.defaults.global.defaultFontColor = "#333333";
    Chart.defaults.global.defaultFontSize = 13;
    var chartBlue = "rgb(66,133,244)";
    var chartBlueA = "rgba(66,133,244, 0.25)";
    var chartRed = "rgb(219,68,55)";
    var chartRedA = "rgba(219,68,55, 0.25)";

    console.log("site", window.site);

    var accessChartContainer = domHelper.addElement("traffic-chart", "canvas");
    accessChartContainer.style = "max-height: 400px";
    container.prepend(accessChartContainer);

    // Create new containers

    // Test traffic data
    let trafficData = await traffic.getAggregations();
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
    lighthouse.addReportTable(accessChartContainer);

    // Global CDN
    var ctitle = domHelper.addElement("fastly-title", "h3");
    ctitle.appendChild(
      document.createTextNode("Global CDN - Cache Performance")
    );
    var badgeStyle = utils.getBadgeClass(trafficData.avg.value);
    var cscore = domHelper.addElement(
      "fastly-score",
      "span",
      "badge badge-" + badgeStyle
    );
    cscore.appendChild(
      document.createTextNode(
        trafficData.avg.days + "-day Avg: " + trafficData.avg.value + "%"
      )
    );
    ctitle.appendChild(cscore);
    cscore.style = "margin-left: 1em";
    accessChartContainer.before(ctitle);

    // Top Pages (Visits, Pages Served)
    var topPages = domHelper.createTable("top-pages", [
      "Page Path",
      "Visits",
      "Pages Served",
    ]);
    var topPageData = {
      0: ["/", utils.getTraffic(2000, 5000), utils.getTraffic(20000, 50000)],
      1: [
        "/about",
        utils.getTraffic(2000, 5000),
        utils.getTraffic(20000, 50000),
      ],
      2: [
        "/news/corporate-press-release",
        utils.getTraffic(2000, 5000),
        utils.getTraffic(20000, 50000),
      ],
      3: [
        "/rss.xml?category=techtrends",
        utils.getTraffic(2000, 5000),
        utils.getTraffic(20000, 50000),
      ],
      4: [
        "/wp-json/wp/v2/posts",
        utils.getTraffic(2000, 5000),
        utils.getTraffic(20000, 50000),
      ],
      5: [
        "/contact-us",
        utils.getTraffic(2000, 5000),
        utils.getTraffic(20000, 50000),
      ],
    };

    for (var key in Object.keys(topPageData)) {
      var row = topPages.insertRow();
      for (var idx in topPageData[key]) {
        var cell = row.insertCell();
        cell.innerHTML = topPageData[key][idx];
      }
    }

    accessChartContainer.after(topPages);
    var ptitle = domHelper.addElement("top-pages-title", "h3");
    ptitle.appendChild(document.createTextNode("Top Pages"));
    ptitle.style = "";
    topPages.before(ptitle);

    // New Relic
    var newRelicContainer = domHelper.addElement("newRelicContainer", "div");
    newRelicContainer.innerHTML = newrelic.getNewRelic().outerHTML;
    var ntitle = domHelper.addElement("newrelic-title", "h3");
    ntitle.appendChild(document.createTextNode("New Relic APM"));
    ntitle.style = "";
    topPages.after(newRelicContainer);
    newRelicContainer.before(ntitle);
  }
})();

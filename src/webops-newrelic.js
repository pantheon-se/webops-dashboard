// ==UserScript==
// @name         Pantheon WebOps - New Relic
// @namespace    https://kyletaylor.dev
// @version      0.4
// @description  Always be wow-ing.
// @author       Kyle Taylor
// @match        https://*.dashboard.pantheon.io/organizations/*
// @grant        none
// ==/UserScript==

function loadScripts(scripts, type, callback) {
  let count = scripts.length;
  function scriptLoaded() {
    count--;
    if (count === 0) {
      callback();
    }
  }

  scripts.forEach(function (src) {
    const script = document.createElement("script");
    script.type = type === "js" ? "text/javascript" : "text/css";
    script.src = src;
    script.onload = scriptLoaded;
    document.head.appendChild(script);
  });
}

(function () {
  "use strict";

  const checkChartTime = performance.now();
  const checkExist = setInterval(function () {
    window.webopsSitesContainer = document.querySelector(
      ".sites-workspace .tool-region .js-sites-table"
    );
    if (
      window.webopsSitesContainer !== null &&
      Object.getOwnPropertyNames(window.webopsSitesContainer).length !== 0
    ) {
      clearInterval(checkExist);
      const scripts = [
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js",
      ];
      loadScripts(scripts, "js", main);
    } else {
      const diff1 = performance.now() - checkChartTime;
      console.log("Still waiting for sites list container", diff1 + " msec");
      if (diff1 > 200000) {
        clearInterval(checkExist);
        console.log("Bailed on sites list container");
      }
    }
  }, 1000);

  /**
   * Main function that runs after the required scripts are loaded
   */
  async function main() {
    const Chart = window.Chart || {};
    const container = window.webopsSitesContainer;
    window.org = window?.app?.organizations;

    if (window.org !== undefined) {
      window.org.id = Object.keys(window.org)[0];

      async function getSites(orgID) {
        const url = `/api/organizations/${orgID}/memberships/sites?hydrate=site&limit=500`;
        try {
          const responses = await fetch(url)
            .then((resp) => resp.ok ? resp.json() : Promise.reject("Failed to load sites"))
            .catch((err) => {
              console.error("Error fetching sites:", err);
              return [];
            });

          await Promise.all(responses.map(async (response) => {
            try {
              response["newrelic"] = await getNewRelicData(response.site.id);
              const application = response?.newrelic?.application;

              if (application) {
                const health = application.health_status;
                const host_count = application.application_summary?.host_count || "N/A";
                const response_time = application.application_summary?.response_time
                  ? (application.application_summary.response_time / 1000).toFixed(2)
                  : "N/A";

                const metrics = response.newrelic.metric_data?.metrics?.[0]?.timeslices || [];
                const metric_labels = metrics.map((metric) => metric.from);
                const metric_values = metrics.map((metric) => metric.values.average_response_time);

                const nr_box = addElement("nr-health-" + response.id, "div");
                nr_box.innerHTML = `
                  <ul>
                    <li>Health: ${health}</li>
                    <li>Hosts: ${host_count}</li>
                    <li>Response: ${response_time} sec.</li>
                  </ul>
                `;

                const site_selector = `.js-sites-table table tr a[href$="/sites/${response.id}"]`;
                const status_box = document.querySelector(site_selector);
                if (status_box) {
                  status_box.appendChild(nr_box);

                  const accessChartContainer = addElement("traffic-chart-" + response.id, "canvas");
                  accessChartContainer.style = "max-height: 100px";

                  new Chart(accessChartContainer, {
                    type: "line",
                    data: {
                      labels: metric_labels,
                      datasets: [{
                        label: "Avg Response Time",
                        data: metric_values,
                        backgroundColor: "#54ACEF",
                      }],
                    },
                    options: {
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: {},
                        x: { display: false },
                      },
                    },
                  });
                  status_box.after(accessChartContainer);
                }
              }
            } catch (error) {
              console.error("Error processing New Relic data for site:", error);
            }
          }));

          return responses;
        } catch (error) {
          console.error("Error in getSites:", error);
        }
      }

      await getSites(window.org.id);
    }
  }

  async function getNewRelicData(site_id) {
    const url = `/api/sites/${site_id}/environments/live/bindings?type=newrelic`;
    try {
      const response = await fetch(url)
        .then((resp) => resp.ok ? resp.json() : Promise.reject("Failed to load NR data"))
        .catch((err) => {
          console.error("Error fetching NR data:", err);
          return {};
        });

      if (Object.keys(response).length > 0) {
        const keys = Object.keys(response);
        const nr_data = response[keys[0]];

        const appData = await fetch("https://api.newrelic.com/v2/applications.json", {
          body: "filter[name]=(live)",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Api-Key": nr_data.api_key,
          },
          method: "POST",
        }).then((resp) => resp.ok ? resp.json() : Promise.reject("Failed to fetch NR app data"));

        if (appData.applications.length > 0) {
          const app = appData.applications[0];
          response["application"] = app;

          const metricData = await fetch(
            `https://api.newrelic.com/v2/applications/${app.id}/metrics/data.json`,
            {
              body: "names[]=HttpDispatcher&values[]=average_response_time",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Api-Key": nr_data.api_key,
              },
              method: "POST",
            }
          ).then((resp) => resp.ok ? resp.json() : Promise.reject("Failed to fetch NR metric data"));

          if (metricData && metricData.metric_data) {
            response["metric_data"] = metricData.metric_data;
          }
        }
      }
      return response;
    } catch (error) {
      console.error("Error in getNewRelicData:", error);
      return {};
    }
  }

  function addElement(id, tag, classes = "blank") {
    const newDiv = document.createElement(tag || "div");
    newDiv.id = id || randomString();
    newDiv.style = "margin-top: 2em;";
    classes.split(" ").forEach((cls) => newDiv.classList.add(cls));
    return newDiv;
  }

  function randomString() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
})();

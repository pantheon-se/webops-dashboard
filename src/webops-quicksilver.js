// ==UserScript==
// @name         Quicksilver Dashboard
// @namespace    https://kyletaylor.dev
// @version      0.1
// @description  Show Quicksilver
// @author       Kyle Taylor
// @match        https://*.dashboard.pantheon.io/sites/*.+
// @require      file:///Users/kyletaylor/server/github/webops-dashboard/webops-quicksilver.js
// @grant        none
// ==/UserScript==

const pantheon = require("./lib/pantheon");

/**
 * quicksilver_post_tasks
 * quicksilver_pre_tasks
 */

// Add Workflow data
const siteId = window?.site?.attributes?.id;
if (siteId !== "undefined") {
  // Create URL
  let workflowApi = `/api/sites/${siteId}/workflows`;
  fetch(workflowApi)
    .then((response) => {
      console.log("workflow response", response);
      if (response.ok) {
        response.json().then(async (workflowData) => {
          console.log(workflowData);
          var workflowContainer = await analyzeWorkflow(workflowData, siteId);
          accessChartContainer.after(workflowContainer);

          // Global CDN
          var ctitle = addElement("workflow-title", "h3");
          ctitle.appendChild(document.createTextNode("Quicksilver Workflows"));
          ctitle.style = "";
          workflowContainer.before(ctitle);
        });
      }
    })
    .catch((err) => console.log);
}

/**
 * Analyze quicksilver scripts
 * @param {*} data
 * @returns
 */
async function analyzeWorkflow(data, siteId) {
  console.log(data);

  let qs = [];
  const qsTemplate = {
    id: "Workflow ID",
    created_at: "Time",
    qs_name: "Job",
    type: "Trigger",
    result: "Status",
    total_time: "Runtime",
  };

  // Extract Quicksilver hooks
  for (let i in data) {
    let task = data[i];
    task.getWorkflowLog = async () => {
      const siteId = window.site.attributes.id;
      let workflowLogApi = `/api/sites/${siteId}/workflows/${task.id}?hydrate=operations_with_logs`;
      fetch(workflowLogApi)
        .then((response) => {
          console.log("workflow response", response);
          if (response.ok) {
            response.json().then((workflowLog) => {
              console.log("log", workflowLog);
            });
          }
        })
        .catch((err) => console.log);
    };
    //      console.log(task);
    // Specifically look for Quicksilver tasks
    if (
      task.hasOwnProperty("final_task") &&
      task.final_task.fn_name === "queue_swf_task"
    ) {
      // Add item to Quicksilver list
      qs.push({
        id: task.id,
        type: task.type,
        result: task.final_task.result,
        created_at: task.final_task.created_at,
        qs_name: task.final_task.description,
        run_time: task.final_task.run_time,
        log_output: await task.getWorkflowLog(),
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
    var eventType = pantheon.getWorkflowName(item.type);
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

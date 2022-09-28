/**
 * New Relic utilities
 */

const dom = require("./domHelper");

/**
 *  Add New Relic chart.
 * @returns iframe
 */
exports.getNewRelic = () => {
  var src =
    "https://chart-embed.service.newrelic.com/herald/9b64d1fb-5827-4289-a362-fe4b684842ef?height=400px&timepicker=true";
  var iframe = dom.addElement("newrelic", "iframe");
  iframe.src = src;
  iframe.scrolling = "no";
  iframe.style = "width: 100%;height: 430px;overflow: hidden; border: 0;";
  return iframe;
};

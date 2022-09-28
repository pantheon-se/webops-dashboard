// Check for New Relic
ready(".tool-region .new-relic", (el) => {
  console.log("WE FOUND NEW RELIC");
});

// Check for site traffic
const siteTrafEl = '.tool-region .block-header[text()="Site Traffic"]';
ready(siteTrafEl, (el) => {
  console.log("WE FOUND SITE TRAFFIC");
});

// Looker API in global space

exports.getAggregations = async function (duration) {
  duration = duration ?? "7d";
  let url = `/api/sites/${window.site.attributes.id}/environments/live/traffic?duration=${duration}`;
  let response = await fetch(url)
    .then(async (resp) => {
      if (resp.ok) {
        return await resp.json();
      }
      throw new Error("Network response was not ok.");
    })
    .catch((err) => console.error);
  return response;
};

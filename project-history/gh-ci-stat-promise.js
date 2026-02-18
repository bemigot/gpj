const url = "https://api.github.com/repos/bemigot/gpj/actions/runs?per_page=1";

fetch(url, { headers: { 'User-Agent': 'node-fetch' } })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    const latestRun = data.workflow_runs[0];
    console.log(`Status: ${latestRun.status}`);
    console.log(`Conclusion: ${latestRun.conclusion}`);
  })
  .catch(error => console.error("Error:", error.message));

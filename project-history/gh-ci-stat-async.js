async function getLatestRun() {
  const url = "https://api.github.com/repos/bemigot/gpj/actions/runs?per_page=1";
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'node-fetch' } // GitHub API requires a User-Agent header
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const latestRun = data.workflow_runs[0];

    console.log(`Status: ${latestRun.status}`);
    console.log(`Conclusion: ${latestRun.conclusion}`);
  } catch (error) {
    console.error("Failed to fetch data:", error.message);
  }
}

getLatestRun();

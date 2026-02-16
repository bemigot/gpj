const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');

// Resolve the path to the history file
const historyPath = path.join(os.homedir(), '.claude', 'history.jsonl');

if (!fs.existsSync(historyPath)) {
    console.error(`Error: File not found at ${historyPath}`);
    process.exit(1);
}

const rl = readline.createInterface({
    input: fs.createReadStream(historyPath),
    terminal: false
});

rl.on('line', (line) => {
    if (!line.trim()) return;

    try {
        const entry = JSON.parse(line);
        const { display, timestamp } = entry;

        if (timestamp && display) {
            const date = new Date(timestamp);

            // Format: YYYY-MM-DD HH:mm:ss
            const datePart = date.toISOString().replace('T', ' ').slice(0, 19);
            
            // Extract milliseconds and round to hundredths (first 2 digits)
            const ms = date.getMilliseconds().toString().padStart(3, '0');
            const hundredths = ms.slice(0, 2);

            console.log(`${datePart}.${hundredths} ${display.trim()}`);
        }
    } catch (err) {
	console.warn("invalid JSON line");
    }
});

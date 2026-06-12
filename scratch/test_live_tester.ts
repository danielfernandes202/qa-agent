
async function test() {
    console.log("Starting test...");
    try {
        const res = await fetch('http://localhost:3001/api/live-tester', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: 'https://example.com',
                instructions: 'Check the title',
                testDepth: 'basic'
            })
        });

        if (!res.ok) {
            console.error('HTTP Error', res.status);
        }

        const text = await res.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

test();

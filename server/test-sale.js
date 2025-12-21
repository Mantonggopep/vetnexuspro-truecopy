
async function testSale() {
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:4001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'vet@demo.com',
                password: '12doctor12'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        if (!token) {
            console.error("Login failed:", loginData);
            return;
        }
        console.log("Logged in. Token received.");

        // 2. Get an inventory item
        console.log("Fetching inventory...");
        const invRes = await fetch('http://localhost:4001/api/inventory', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const items = await invRes.data || await invRes.json();
        if (!Array.isArray(items) || items.length === 0) {
            console.log("No inventory items found. Cannot test sale.");
            return;
        }
        const item = items[0];
        console.log(`Using item: ${item.name} (${item.id})`);

        // 3. Create a sale
        const saleData = {
            id: `TEST_SALE_${Date.now()}`,
            clientName: 'Test Client',
            date: new Date().toISOString(),
            items: [
                {
                    itemId: item.id,
                    itemName: item.name,
                    quantity: 1,
                    unitPrice: 100,
                    total: 100
                }
            ],
            subtotal: 100,
            tax: 0,
            total: 100,
            paymentMethod: 'CASH',
            status: 'COMPLETED'
        };

        console.log("Creating sale...");
        const saleRes = await fetch('http://localhost:4001/api/sales', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(saleData)
        });
        const saleResult = await saleRes.json();
        if (saleRes.ok) {
            console.log("Sale created successfully!", saleResult);
        } else {
            console.error("Sale creation failed!");
            console.error("Status:", saleRes.status);
            console.error("Data:", JSON.stringify(saleResult, null, 2));
        }
    } catch (err) {
        console.error("Test execution failed:", err.message);
    }
}

testSale();

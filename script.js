
const sheetId = "1UMHM7iYsX5vafyNO-WTmMki4M9L_AiohXvUr_7a7dAI";

var products = [];

async function fetchFileContent(url) {
    const response = await fetch(url);
    const data = await response.text();
    return data;
}

function parseCSV(csv) {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];
        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && csv[i + 1] === '\n') i++;
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
        } else {
            current += char;
        }
    }
    if (current !== '' || row.length > 0) {
        row.push(current);
        rows.push(row);
    }
    return rows.map(r => r.map(c => c.trim()));
}

async function fetchGoogleSheetsCSV(sheetId, sheetGID) {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheetGID}`;
    try {
        const csv = await this.fetchFileContent(targetUrl);
        const array2D = parseCSV(csv);
        return array2D;
    } catch (error) {
        if (this.debugMode) console.error('Error al cargar el csv:', error);
    }
}

async function fetchGoogleSheetsCSVAsJson(sheetId, sheetGID = 0) {
    const array2D = await this.fetchGoogleSheetsCSV(sheetId, sheetGID);
    if (!array2D || array2D.length < 2) {
        if (this.debugMode) console.error("CSV no tiene suficientes datos.");
        return [];
    }
    const [headers, ...rows] = array2D;
    return rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] ?? "";
        });
        return obj;
    });
}

async function loadProducts() {
    products = await fetchGoogleSheetsCSVAsJson(sheetId, 0);
    products.sort((a, b) => a.Order - b.Order);
    console.log(products);
    displayProducts(products);
}

function generateProductHTML(product) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product';
    productDiv.innerHTML = `
        <div class="product-image">
            <img src="${product.ImageURL}" alt="${product.Name}">
        </div>
        <div class="product-info">
            <h2>${product.Name}</h2>
            <p>${product.Description.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    productDiv.addEventListener('click', () => {
        window.open(product.ProductURL, '_blank');
    });
    return productDiv;
}

function displayProducts(products) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';
    const enabledProducts = products.filter(product => {
        if (!product.Enabled) return false;
        const activationDate = new Date(product.Enabled.split('/').reverse().join('-'));
        return activationDate <= new Date();
    });
    const sections = {};
    enabledProducts.forEach(product => {
        const section = product.Section || 'Sin sección';
        if (!sections[section]) {
            sections[section] = [];
        }
        sections[section].push(product);
    });
    Object.keys(sections).forEach(sectionName => {
        const sectionTitle = document.createElement('h2');
        sectionTitle.textContent = sectionName;
        container.appendChild(sectionTitle);
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'products-section';
        sections[sectionName].forEach(product => {
            const productDiv = generateProductHTML(product);
            sectionDiv.appendChild(productDiv);
        });
        container.appendChild(sectionDiv);
    });
}

document.addEventListener('DOMContentLoaded', loadProducts);
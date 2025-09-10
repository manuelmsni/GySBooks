const sheetId = "1UMHM7iYsX5vafyNO-WTmMki4M9L_AiohXvUr_7a7dAI";
var products = [];
var countryCode = 'US';
var amazonLink = 'https://www.amazon.com/';

fetch('https://geolocation-db.com/json/')
  .then(res => {
    if (!res.ok) {
      throw new Error(`Error en la respuesta: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    if (data && data.country_code) {
        updateCountryCode(data.country_code);
    }
  })
  .catch(error => {
    console.log('Usando enlace por defecto:', amazonLink);
  });

function updateCountryCode(code) {
    countryCode = code;
    console.log('Country Code:', countryCode);
    updateAmazonLink(countryCode);
}

function updateAmazonLink(country) {
    switch (country) {
        case 'ES':
            amazonLink = 'https://www.amazon.es/';
            break;
        case 'FR':
            amazonLink = 'https://www.amazon.fr/';
            break;
        case 'US':
            amazonLink = 'https://www.amazon.com/';
            break;
        default:
            amazonLink = 'https://www.amazon.com/';
            break;
    }
    console.log('Amazon Link:', amazonLink);
}

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
            <h4>${product.Resume}</h4>
            <p>${product.Description.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    productDiv.addEventListener('click', () => {
        link = product.ProductURL.startsWith('http') ? product.ProductURL : amazonLink + product.ProductURL;
        window.open(link, '_blank');
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
        sectionTitle.id = normalizeId(sectionName);
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

function normalizeId(text) {
    return text.toLowerCase().replace(/\s+/g, '-');
}

async function loadMenu(){
    const menuOptions = await fetchGoogleSheetsCSVAsJson(sheetId, 2055755589);
    menuOptions.sort((a, b) => a.Order - b.Order);
    const navContainer = document.getElementById('nav-container');
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    menu.innerHTML = '';
    menuOptions.forEach(option => {
        const menuItem = document.createElement('a');
        menuItem.href = option.Link;
        if(option.Link.startsWith('http')){
            menuItem.target = '_blank';
            menuItem.rel = 'noopener noreferrer';
        }
        else
        {
            menuItem.href = '#' + normalizeId(option.Link);
        }
        menuItem.textContent = option.Text;
        menu.appendChild(menuItem);
        menuItem.addEventListener('click', () => {
            if(navContainer.classList.contains('active')){
                navContainer.classList.remove('active');
                toggle.classList.remove('active');
                menu.classList.remove('active');
            }
        });
    });
    if(!menuOptions || menuOptions.length === 0){
        toggle.style.display = 'none';
        menu.style.display = 'none';
        return;
    }
    else
    {
        toggle.addEventListener('click', () => {
            navContainer.classList.toggle('active');
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
        });
    }
}

function render(){
    loadMenu();
    loadProducts();
}

document.addEventListener('DOMContentLoaded', render());


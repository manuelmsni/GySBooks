const sheetId = "1UMHM7iYsX5vafyNO-WTmMki4M9L_AiohXvUr_7a7dAI";
var menuOptions = [];
var products = [];
var countries = [];
var productLinks = [];
var countryCode;
var amazonLink;

function getUrlParams() {
  const queryString = window.location.search;
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function setParam(key, value, concat = false) {
  const urlObj = new URL(window.location.href);
  const params = urlObj.searchParams;
  if (concat && params.has(key)) {
    params.append(key, value);
  } else {
    params.set(key, value);
  }
  urlObj.search = params.toString();
  window.history.pushState({}, '', urlObj.toString());
  return urlObj.toString();
}

async function detectCountryCode() {
    try {
        const response = await fetch('https://geolocation-db.com/json/');
        const data = await response.json();
        if (data && data.country_code) {
            return data.country_code;
        } else {
            throw new Error('No se pudo obtener el código de país');
        }
    } catch (error) {
        console.error('Error al obtener el código de país:', error);
        return 'US';
    }
}

function replaceAmazonPlaceholder(link){
    const placeHolder = '{$amazon}';
    if(link.includes(placeHolder)){
        return link.replace(placeHolder, amazonLink);
    }
    return link;
}

function updateCountryCode(code) {
    for (const c of countries) {
        if (c.Code === code) {
            amazonLink = c.Market;
            countryCode = c.Code;
            break;
        }
    }
    if (!amazonLink) {
        amazonLink = 'www.amazon.com';
        countryCode = 'US';
    }
    setParam('country', countryCode);
    refreshProductLinks();
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
            <p class="center"><a class="product-link" href="https://${amazonLink}/dp/${product.ID}" target="_blank">Comprar en Amazon 🛒</a></p>
            <h3>${product.Resume}</h3>
            <p>${product.Description.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    const link = productDiv.querySelector('.product-link');
    productLinks.push({ link: link, product: product });
    return productDiv;
}

function refreshProductLinks() {
    productLinks.forEach(item => {
        item.link.href = `https://${amazonLink}/dp/${item.product.ID}`;
    });
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
    const navContainer = document.getElementById('nav-container');
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    const countryPicker = document.getElementById('country-picker');
    countries.sort((a, b) => a.Code.localeCompare(b.Code));
    countryPicker.innerHTML = '';
    var enabledCountries = countries.filter(country => {
        if (!country.Enabled) return false;
        const activationDate = new Date(country.Enabled.split('/').reverse().join('-'));
        return activationDate <= new Date();
    });
    enabledCountries.forEach(c => {
        const option = document.createElement('option');
        option.value = c.Code;
        option.textContent = c.Flag ? c.Flag : c.Code;
        if(c.Code === countryCode){
            option.selected = true;
        }
        countryPicker.appendChild(option);
    });
    countryPicker.addEventListener('change', (e) => {
        updateCountryCode(e.target.value);
    });
    menu.innerHTML = '';
    var enabledMenuOptions = menuOptions.filter(option => {
        if (!option.Enabled) return false;
        const activationDate = new Date(option.Enabled.split('/').reverse().join('-'));
        return activationDate <= new Date();
    });
    enabledMenuOptions.forEach(option => {
        const menuItem = document.createElement('a');
        menuItem.textContent = option.Text;
        menu.appendChild(menuItem);
        menuItem.addEventListener('click', (e) => {
            if(option.Link.startsWith('http')){
                e.preventDefault();
                const updatedLink = replaceAmazonPlaceholder(option.Link);
                window.open(updatedLink, '_blank');
            } else {
                const targetId = normalizeId(option.Link);
                document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
            }

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

async function loadDatabase() {
    const [c, m, p] = await Promise.all([
        fetchGoogleSheetsCSVAsJson(sheetId, 1997883613),
        fetchGoogleSheetsCSVAsJson(sheetId, 2055755589),
        fetchGoogleSheetsCSVAsJson(sheetId, 0)
    ]);
    countries = c;
    menuOptions = m;
    products = p;
}

async function render(){
    const params = getUrlParams();
    await loadDatabase();
    if(params.country){
        updateCountryCode(params.country.toUpperCase());
    }
    else {
        detectCountryCode().then(code => updateCountryCode(code));
    }
    loadMenu();
    loadProducts();
}

document.addEventListener('DOMContentLoaded', render());


const sheetId = "1UMHM7iYsX5vafyNO-WTmMki4M9L_AiohXvUr_7a7dAI";

const productsPage = 0;
const menuOptionsPage = 2055755589;
const countriesPage = 1997883613;
const imagesPage = 202455128;
const fontsPage = 902677663;

var fonts = [];
var menuOptions = [];
var products = [];
var countries = [];
var productsImages = [];

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

function loadGoogleFonts() {
  const baseUrl = "https://fonts.googleapis.com/css2?";
  const query = fonts
    .map(f => "family=" + encodeURIComponent(f.Name))
    .join("&");
  const url = `${baseUrl}${query}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

async function detectCountryCode() {
    var countryCode = 'US';
    try {
        const response = await fetch('https://geolocation-db.com/json/');
        const data = await response.json();
        if (data && data.country_code) {
            countryCode = data.country_code;
        }
    } catch (error) {
        console.error('Error al obtener el código de país.', error);
    }
    console.log('Using country code:', countryCode);
    return countryCode;
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

function parseDropShadow(value, color = '#000000') {
    const parts = value.split('/').map(Number);
    const [x = 0, y = 0, blur = 0, alpha = 1, intensity = 1] = parts;
    let r = 0, g = 0, b = 0;
    if (color.startsWith('#') && color.length === 7) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
    }
    const shadows = [];
    const fullShadowsCount = Math.floor(intensity);
    for (let i = 0; i < fullShadowsCount; i++) {
        shadows.push(`drop-shadow(${x}px ${y}px ${blur}px rgba(${r},${g},${b},${alpha}))`);
    }
    const extra = intensity - fullShadowsCount;
    if (extra > 0) {
        shadows.push(`drop-shadow(${x}px ${y}px ${blur}px rgba(${r},${g},${b},${alpha * extra}))`);
    }
    return shadows.join(' ');
}

function createImageHTML(img, product) {
    let transformValues = [];
    if (img.Rotate) transformValues.push(`rotateZ(${img.Rotate}deg)`);
    if (img.ShiftVertical) transformValues.push(`translateY(${img.ShiftVertical}px)`);
    if (img.ShiftHorizontal) transformValues.push(`translateX(${img.ShiftHorizontal}px)`);

    let styleParts = [];
    if (transformValues.length) styleParts.push(`transform: ${transformValues.join(' ')};`);

    if (img.Shadow) {
        const dropShadow = parseDropShadow(img.Shadow, img.ShadowColor);
        styleParts.push(`filter: ${dropShadow};`);
    }

    const transformStyle = styleParts.length ? ` style="${styleParts.join(' ')}"` : '';

    const defaultSrc = img.Image.replace(/\\/g, '/');
    const hoverSrc = img.ImageHover ? img.ImageHover.replace(/\\/g, '/') : null;

    return hoverSrc
        ? `<div class="product-image">
                <img class="default triggerIMAGG"${transformStyle} src="${defaultSrc}" alt="${product.Name}">
                <img class="hover triggerIMAGG"${transformStyle} src="${hoverSrc}" alt="${product.Name}">
           </div>`
        : `<div class="product-image">
                <img${transformStyle} src="${defaultSrc}" alt="${product.Name}" class="triggerIMAGG">
           </div>`;
}


function generateProductSection(product) {
    const productSection = document.createElement('section');
    productSection.id = normalizeId(product.Name);
    productSection.className = 'product-section';
    const h2 = document.createElement('h2');
    h2.textContent = product.Name;
    h2.style.fontFamily = product.NameFont ? `'${product.NameFont}', sans-serif` : 'sans-serif';
    if (product.NameSize) {
        if (product.NameFont) {
            document.fonts.load(`1em '${product.NameFont}'`).then(() => {
                h2.style.fontSize = `${product.NameSize}px`;
            }).catch(() => {
                h2.style.fontSize = '';
            });
        } else {
            h2.style.fontSize = `${product.NameSize}px`;
        }
    }
    const productInfo = document.createElement('div');
    productInfo.className = 'product-info';
    productInfo.appendChild(h2);
    if (product.Resume) {
        const resume = document.createElement('p');
        resume.innerHTML = product.Resume.replace(/\n/g, '<br>');
        if (product.ResumeFont) {
            resume.style.fontFamily = `'${product.ResumeFont}', sans-serif`;
        }
        if (product.ResumeSize) {
            if (product.ResumeFont) {
                document.fonts.load(`1em '${product.ResumeFont}'`).then(() => {
                    resume.style.fontSize = `${product.ResumeSize}px`;
                }).catch(() => {
                    resume.style.fontSize = '';
                });
            } else {
                resume.style.fontSize = `${product.ResumeSize}px`;
            }
        }
        productInfo.appendChild(resume);
    }
    if(product.ID){
        const link = document.createElement('a');
        link.className = 'product-link';
        link.href = `https://${amazonLink}/dp/${product.ID}`;
        link.target = '_blank';
        link.textContent = 'Buy on Amazon 🛒';
        productLinks.push({ link: link, product: product });
        const pLink = document.createElement('p');
        pLink.className = 'center';
        pLink.appendChild(link);
        productInfo.appendChild(pLink);
    }
    const productImagesDiv = document.createElement('div');
    productImagesDiv.className = 'product-images';
    productImagesDiv.innerHTML = product.Images.map(img => createImageHTML(img, product)).join('');
    const innerSection = document.createElement('div');
    innerSection.className = 'inner-section';
    innerSection.appendChild(productInfo);
    innerSection.appendChild(productImagesDiv);
    productSection.appendChild(innerSection);
    return productSection;
}

function refreshProductLinks() {
    productLinks.forEach(item => {
        item.link.href = `https://${amazonLink}/dp/${item.product.ID}`;
    });
}


function displayProducts(products) {
    const productSections = products.map(p => generateProductSection(p));
    // add class even or odd to each section
    productSections.forEach((section, index) => {
        section.classList.add(index % 2 === 0 ? 'even' : 'odd');
    });
    document.body.append(...productSections);
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
    countries.forEach(c => {
        const option = document.createElement('option');
        option.value = c.Code;
        option.textContent = c.Flag ? c.Flag : c.Code;
        if(c.Code.toUpperCase().trim() === countryCode.toUpperCase().trim()){
            option.selected = true;
        }
        countryPicker.appendChild(option);
    });
    countryPicker.addEventListener('change', (e) => {
        updateCountryCode(e.target.value);
    });
    menu.innerHTML = '';
    menuOptions.forEach(option => {
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

function filterNotEnabled(items) {
    return items.filter(item => {
        if (!item.Enabled) return false;
        const activationDate = new Date(item.Enabled.split('/').reverse().join('-'));
        return activationDate <= new Date();
    });
}

async function loadDatabase() {
    const [c, m, p, i, f] = await Promise.all([
        fetchGoogleSheetsCSVAsJson(sheetId, countriesPage),
        fetchGoogleSheetsCSVAsJson(sheetId, menuOptionsPage),
        fetchGoogleSheetsCSVAsJson(sheetId, 0),
        fetchGoogleSheetsCSVAsJson(sheetId, imagesPage),
        fetchGoogleSheetsCSVAsJson(sheetId, fontsPage)
    ]);
    fonts = f;
    countries = filterNotEnabled(c);
    menuOptions = filterNotEnabled(m);
    productsImages = filterNotEnabled(i);
    products = filterNotEnabled(p);
    products.forEach(product => {
        const productImages = productsImages.filter(
            img => img.ProductName.toLowerCase() === product.Name.toLowerCase()
        );
        product.Images = productImages;
    });
}

async function render(){
    const params = getUrlParams();
    await loadDatabase();
    loadGoogleFonts();
    if(params.country){
        updateCountryCode(params.country.toUpperCase());
    }
    else {
        var countryCode = await detectCountryCode();
        updateCountryCode(countryCode);
    }
    loadMenu();
    loadProducts();
    modalWindowForIMAGG();
    openTriggersForIMAGG();
}


function modalWindowForIMAGG() {
    if(document.getElementById("DivIMAGG") === null){
        var divIMAGG = document.createElement("div");
        divIMAGG.id = "DivIMAGG";
        divIMAGG.classList.add("hidden", "exitIMAGG");

        var bodyIMAGG = document.createElement("div");
        bodyIMAGG.id = "BodyIMAGG";

        var exitIMAGG = document.createElement("a");
        exitIMAGG.id = "ExitIMAGG";
        exitIMAGG.innerHTML = "X";
        exitIMAGG.classList.add("exitIMAGG");

        var pExitIMAGG = document.createElement("p");
        pExitIMAGG.appendChild(exitIMAGG);

        var figure = document.createElement("figure");

        var imgIMAGG = document.createElement("img");
        imgIMAGG.id = "IMAGG";
        imgIMAGG.src = "";

        var h2TitleIMAGG = document.createElement("h2");
        h2TitleIMAGG.id = "TitleIMAGG";

        var figcaptionIMAGG = document.createElement("figcaption");
        figcaptionIMAGG.id = "CaptionIMAGG";

        figure.appendChild(imgIMAGG);
        figure.appendChild(h2TitleIMAGG);
        figure.appendChild(figcaptionIMAGG);

        bodyIMAGG.appendChild(pExitIMAGG);
        bodyIMAGG.appendChild(figure);

        divIMAGG.appendChild(bodyIMAGG);
        document.body.appendChild(divIMAGG);
    }
};

function openTriggersForIMAGG() {
    var openTriggers = document.querySelectorAll(".triggerIMAGG");

    openTriggers.forEach(function (trigger) {

        trigger.addEventListener("click", function triggerIMGG() {
            // Bloqueamos scroll usando position: fixed
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.dataset.scrollY = scrollY;

            // Configuración del modal
            const divIMAGG = document.getElementById("DivIMAGG");
            divIMAGG.style.overflowY = "scroll";
            document.getElementById("IMAGG").src = this.getAttribute("src");
            document.getElementById("TitleIMAGG").innerText = this.getAttribute("title");
            
            const caption = document.getElementById("CaptionIMAGG");
            caption.innerHTML = ''; // Limpiamos caption

            const alt = this.getAttribute("alt");

            if (!this.hasAttribute("alt")) {
                console.log('The HTML standard states that the "alt" attribute in an <img> tag is mandatory in terms of semantics!');
            } else if (alt.includes("IMAGG_ls")) {
                const lines = alt.split("IMAGG_ls");
                const paragraphs = lines.map(line => `<p>${line}</p>`);
                caption.innerHTML = paragraphs.join('');
            } else {
                caption.innerHTML = `<p>${alt}</p>`;
            }

            divIMAGG.classList.remove('hidden');
        });

        // Triggers para cerrar el modal
        var closeTriggers = document.querySelectorAll(".exitIMAGG");

        closeTriggers.forEach(function (trigger) {

            trigger.addEventListener("click", function (e) {
                if (e.target !== this) return;

                // Restauramos scroll
                const scrollY = document.body.dataset.scrollY;
                document.body.style.position = '';
                document.body.style.top = '';
                window.scrollTo(0, scrollY);

                // Cerramos modal
                document.getElementById("DivIMAGG").classList.add('hidden');
            });

        });

    });
};

document.addEventListener('DOMContentLoaded', render());


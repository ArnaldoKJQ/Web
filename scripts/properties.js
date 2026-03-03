(async function () {
  // Helper: parse CSV (handles quoted, multiline)
  function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if ((char === "\n" || char === "\r") && !insideQuotes) {
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell);
          if (currentRow.some((c) => c && c.trim())) rows.push(currentRow);
          currentRow = [];
          currentCell = "";
        }
        if (char === "\r" && nextChar === "\n") i++;
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.some((c) => c && c.trim())) rows.push(currentRow);
    }
    return rows;
  }

  // Default placeholder images (match original index.html defaults)
  const DEFAULT_PLACEHOLDERS = [
    "https://images.unsplash.com/photo-1600585152220-90363fe7e115?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
  ];

  function parseFeatures(featureText) {
    if (!featureText) return [];
    return featureText
      .split(/\n|•|;|\\u2022/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseImages(imageText) {
    if (!imageText) return DEFAULT_PLACEHOLDERS.slice();
    const parts = imageText
      .split(/;|\n/)
      .map((img) => img.trim())
      .filter(Boolean);
    if (parts.length === 0) return DEFAULT_PLACEHOLDERS.slice();
    return parts.map((img) => {
      if (img.startsWith("http")) return img;
      if (img.startsWith("\\")) img = img.slice(1);
      img = img.replace(/\\/g, "/");
      return `./resource/properties/${img}`;
    });
  }

  // Load CSV and return properties array
  async function loadProperties() {
    const res = await fetch("./resource/property-details.csv");
    const txt = await res.text();
    const rows = parseCSV(txt);
    if (!rows || rows.length === 0) return [];
    const headers = rows[0].map((h) => h.trim());
    const props = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => !c || !c.trim())) continue;
      const obj = {};
      headers.forEach((h, idx) => (obj[h] = (row[idx] || "").trim()));
      obj.features = parseFeatures(obj["Features"]);
      obj.images = parseImages(obj["Image (Leave Blank)"]);
      obj._id = `property-${i}`;
      // price formatting
      obj._price =
        (obj["Status"] || "").toLowerCase().trim() === "rent"
          ? `RM ${obj["Price"]}/mo`
          : obj["Price"]
            ? `RM ${obj["Price"]}`
            : "N/A";
      props.push(obj);
    }
    return props;
  }

  // Helper: get field value by name (case-insensitive, ignores non-alphanumeric)
  function getFieldValue(obj, desiredName) {
    if (!obj || !desiredName) return undefined;
    const normalize = (s) =>
      (s || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const want = normalize(desiredName);
    for (const k of Object.keys(obj)) {
      if (normalize(k) === want) return obj[k];
    }
    return undefined;
  }

  // Helper: get normalized home-page tags from the 'Home Page' column.
  // Supports values like: Featured, Sale, Rent or multiple values separated by commas/semicolons.
  function getHomePageTags(p) {
    const raw = getFieldValue(p, "home page") || getFieldValue(p, "homepage");
    if (!raw) return [];
    return raw
      .toString()
      .split(/[;,|\/\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((s) => {
        if (s === "for sale" || s === "sale") return "sale";
        if (s === "for rent" || s === "rent" || s === "rental") return "rent";
        if (s === "featured" || s === "home" || s === "homepage")
          return "featured";
        return s;
      });
  }

  // Card renderer
  function createCardHTML(p) {
    const statusClass =
      (p["Status"] || "").toLowerCase().trim() === "rent"
        ? "bg-blue-600"
        : "bg-green-600";
    const priceColor =
      (p["Status"] || "").toLowerCase().trim() === "rent"
        ? "text-blue-600"
        : "text-green-600";
    const img =
      p.images && p.images.length ? p.images[0] : DEFAULT_PLACEHOLDERS[0];
    const size = p["Built up size sqft"]
      ? `${p["Built up size sqft"]} sq.ft.`
      : p["Land size sqft"] || "N/A";

    return `
      <div class="property-card bg-white rounded-lg overflow-hidden shadow-md transition duration-300" data-id="${
        p._id
      }">
        <div class="relative">
          <img src="${img}" alt="${(p["Name"] || "Property").replace(
            /"/g,
            "",
          )}" class="w-full h-64 object-cover" />
          <div class="absolute top-4 right-4 ${statusClass} text-white px-3 py-1 rounded-full text-sm font-semibold">${
            p["Status"] || ""
          }</div>
        </div>
        <div class="p-6">
          <h3 class="text-xl font-bold mb-2">${p["Name"] || ""}</h3>
          <p class="text-gray-600 mb-4"><i class="fas fa-map-marker-alt text-blue-500 mr-2"></i>${
            p["Location"] || ""
          }</p>
          <div class="flex justify-between mb-4">
            <span class="text-gray-700"><i class="fas fa-ruler-combined text-blue-500 mr-2"></i>${size}</span>
            <span class="text-gray-700"><i class="fas fa-building text-blue-500 mr-2"></i>${
              p["Type"] || ""
            }</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold ${priceColor}">${p._price}</span>
            <button class="view-details bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-300">View Details</button>
          </div>
        </div>
      </div>
    `;
  }

  // Modal helpers
  function setupModalHandlers(container) {
    const modal = container.querySelector("#propertyModal");
    const closeBtns = modal.querySelectorAll("#closeModal, #closeModalBtn");
    closeBtns.forEach((b) =>
      b.addEventListener("click", () => {
        modal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
      }),
    );
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
      }
    });
  }

  function openModalWithData(container, p) {
    const modal = container.querySelector("#propertyModal");
    modal.querySelector("#propertyTitle").textContent = p["Name"] || "";
    modal.querySelector("#propertyLocation").textContent = p["Location"] || "";
    modal.querySelector("#propertyPrice").textContent = p._price || "";
    modal.querySelector("#propertySize").textContent = p["Built up size sqft"]
      ? `${p["Built up size sqft"]} sq.ft.`
      : p["Land size sqft"] || "N/A";
    modal.querySelector("#propertyType").textContent = p["Type"] || "";
    modal.querySelector("#propertyStatus").textContent = p["Status"] || "";
    modal.querySelector("#propertyDescription").textContent =
      p["Description"] || "";

    const featuresList = modal.querySelector("#propertyFeatures");
    featuresList.innerHTML = "";
    if (p.features && p.features.length)
      p.features.forEach((f) => {
        const li = document.createElement("li");
        li.textContent = f;
        featuresList.appendChild(li);
      });

    const mainImage = modal.querySelector("#mainImage");
    if (p.images && p.images.length) mainImage.src = p.images[0];
    const thumbnails = modal.querySelectorAll(
      "#propertyModal .grid.grid-cols-4 img",
    );
    thumbnails.forEach((imgEl, idx) => {
      if (p.images && p.images[idx]) {
        imgEl.src = p.images[idx];
        imgEl.parentElement.style.display = "block";
      } else {
        imgEl.parentElement.style.display = "none";
      }
    });

    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  // Public render function
  window.renderPropertiesPage = async function (status, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.innerHTML = '<p class="text-center text-gray-600">Loading...</p>';
    const props = await loadProperties();
    const filtered = props.filter(
      (p) =>
        (p["Status"] || "").toLowerCase().trim() ===
        (status || "").toLowerCase().trim(),
    );
    // If the container itself is already a grid, populate it directly.
    container.innerHTML = "";
    let gridEl;
    if (container.classList.contains("grid")) {
      gridEl = container;
      // ensure the expected responsive columns are present
      gridEl.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
    } else {
      gridEl = document.createElement("div");
      gridEl.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
    }
    filtered.forEach((p) => {
      gridEl.innerHTML += createCardHTML(p);
    });
    if (gridEl !== container) container.appendChild(gridEl);

    // Insert modal markup (one per page)
    const modalHtml = `
      <div id="propertyModal" class="fixed inset-0 z-50 hidden overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" aria-hidden="true"><div class="absolute inset-0 bg-gray-500 opacity-75"></div></div>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div class="flex justify-between items-start">
                    <h3 id="propertyTitle" class="text-2xl leading-6 font-bold text-gray-900 mb-4">Property Details</h3>
                    <button id="closeModal" class="text-gray-400 hover:text-gray-500"><i class="fas fa-times text-2xl"></i></button>
                  </div>

                  <div class="mb-6">
                    <div class="relative h-64 md:h-96 bg-gray-100 rounded-lg overflow-hidden mb-4"><img id="mainImage" src="" alt="Property Image" class="w-full h-full object-cover"/></div>
                    <div class="grid grid-cols-4 gap-2">
                      <div class="cursor-pointer"><img src="" alt="Thumbnail" class="w-full h-20 object-cover rounded" onclick="(function(e){document.getElementById('mainImage').src=e.src;})(this)"/></div>
                      <div class="cursor-pointer"><img src="" alt="Thumbnail" class="w-full h-20 object-cover rounded" onclick="(function(e){document.getElementById('mainImage').src=e.src;})(this)"/></div>
                      <div class="cursor-pointer"><img src="" alt="Thumbnail" class="w-full h-20 object-cover rounded" onclick="(function(e){document.getElementById('mainImage').src=e.src;})(this)"/></div>
                      <div class="cursor-pointer"><img src="" alt="Thumbnail" class="w-full h-20 object-cover rounded" onclick="(function(e){document.getElementById('mainImage').src=e.src;})(this)"/></div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 class="text-xl font-bold mb-2" id="propertyTitle">&nbsp;</h4>
                      <p id="propertyLocation" class="text-gray-600 mb-4"></p>
                      <div class="space-y-2">
                        <p class="text-gray-700"><span class="font-semibold">Price:</span> <span id="propertyPrice"></span></p>
                        <p class="text-gray-700"><span class="font-semibold">Size:</span> <span id="propertySize"></span></p>
                        <p class="text-gray-700"><span class="font-semibold">Type:</span> <span id="propertyType"></span></p>
                        <p class="text-gray-700"><span class="font-semibold">Status:</span> <span id="propertyStatus"></span></p>
                      </div>
                    </div>
                    <div>
                      <h4 class="text-xl font-bold mb-2">Description</h4>
                      <p id="propertyDescription" class="text-gray-700 mb-4"></p>
                      <h4 class="text-xl font-bold mb-2">Features</h4>
                      <ul id="propertyFeatures" class="list-disc list-inside text-gray-700 space-y-1"></ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Contact Agent</button>
              <button id="closeModalBtn" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", modalHtml);

    // wire up view buttons
    container.querySelectorAll(".view-details").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".property-card");
        const id = card.getAttribute("data-id");
        const p = filtered.find((x) => x._id === id);
        if (p) openModalWithData(container, p);
      });
    });

    setupModalHandlers(container);
  };

  // Render the main index page sections: featured, rentals and sales
  window.renderIndexPage = async function () {
    const props = await loadProperties();
    // expose for compatibility
    window.propertiesArray = props;
    window.properties = {};
    props.forEach((p) => (window.properties[p._id] = p));

    const featuredContainer = document.querySelector(".py-16.bg-white .grid");
    const rentalContainer = document.querySelector("#for-rent .grid");
    const saleContainer = document.querySelector("#for-sale .grid");

    if (featuredContainer) featuredContainer.innerHTML = "";
    if (rentalContainer) rentalContainer.innerHTML = "";
    if (saleContainer) saleContainer.innerHTML = "";

    const rentalProperties = props.filter(
      (p) => (p["Status"] || "").toLowerCase().trim() === "rent",
    );
    const saleProperties = props.filter(
      (p) => (p["Status"] || "").toLowerCase().trim() === "sale",
    );

    // Determine home-page tags for each property
    const featuredHome = props.filter((p) =>
      getHomePageTags(p).includes("featured"),
    );
    const rentalHome = rentalProperties.filter((p) =>
      getHomePageTags(p).includes("rent"),
    );
    const saleHome = saleProperties.filter((p) =>
      getHomePageTags(p).includes("sale"),
    );

    console.debug(
      "Home-page counts -> featured:",
      featuredHome.length,
      "rent:",
      rentalHome.length,
      "sale:",
      saleHome.length,
    );

    // Featured: show only properties explicitly marked as 'Featured'
    if (featuredContainer) {
      const featuredList = featuredHome.slice(0, 3);
      if (featuredContainer.classList.contains("grid")) {
        featuredContainer.className =
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        featuredList.forEach(
          (p) => (featuredContainer.innerHTML += createCardHTML(p)),
        );
      } else {
        const featured = document.createElement("div");
        featured.className =
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        featuredList.forEach((p) => (featured.innerHTML += createCardHTML(p)));
        featuredContainer.appendChild(featured);
      }
    }

    // Rentals: show only rentals explicitly marked as 'Rent' on the Home Page
    if (rentalContainer) {
      const toShow = rentalHome;
      if (rentalContainer.classList.contains("grid")) {
        rentalContainer.className =
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        toShow.forEach((p) => (rentalContainer.innerHTML += createCardHTML(p)));
      } else {
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        toShow.forEach((p) => (grid.innerHTML += createCardHTML(p)));
        rentalContainer.appendChild(grid);
      }
    }

    // Sales: show only sales explicitly marked as 'Sale' on the Home Page
    if (saleContainer) {
      const toShow = saleHome;
      if (saleContainer.classList.contains("grid")) {
        saleContainer.className =
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        toShow.forEach((p) => (saleContainer.innerHTML += createCardHTML(p)));
      } else {
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
        toShow.forEach((p) => (grid.innerHTML += createCardHTML(p)));
        saleContainer.appendChild(grid);
      }
    }

    // Wire view buttons to use the existing modal in the page (if present)
    document.querySelectorAll(".property-card .view-details").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.target.closest(".property-card");
        const id = card.getAttribute("data-id");
        const p = props.find((x) => x._id === id);
        if (p) {
          // Use the page modal if present
          if (document.querySelector("#propertyModal")) {
            openModalWithData(document, p);
            setupModalHandlers(document);
          } else {
            // fallback: open a simple popup
            alert(p["Name"] || "Property");
          }
        }
      });
    });
  };

  // Make a small global helper for thumbnail clicks used in index.html modal
  window.changeMainImage = function (imgEl) {
    const main = document.getElementById("mainImage");
    if (main && imgEl && imgEl.src) main.src = imgEl.src;
  };

  // Initialize shared UI behaviors: mobile menu, smooth scroll, contact form
  function initSiteUI() {
    const mobileMenuButton = document.getElementById("mobile-menu-button");
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenuButton) {
      mobileMenuButton.addEventListener("click", () => {
        if (mobileMenu) mobileMenu.classList.toggle("open");
      });
    }

    // Theme toggle
    function initThemeToggle() {
      const themeToggleBtn = document.getElementById("theme-toggle");
      const themeToggleMobileBtn = document.getElementById(
        "theme-toggle-mobile",
      );
      const html = document.documentElement;
      const savedTheme = localStorage.getItem("theme") || "dark";

      // Apply saved theme
      if (savedTheme === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }

      const updateIcon = (isDark) => {
        const icon = isDark ? "fa-sun" : "fa-moon";
        if (themeToggleBtn) {
          themeToggleBtn.querySelector("i").className = `fas ${icon}`;
        }
        if (themeToggleMobileBtn) {
          themeToggleMobileBtn.querySelector("i").className =
            `fas ${icon} text-xl`;
        }
      };

      updateIcon(savedTheme === "dark");

      const toggleTheme = () => {
        const isDark = html.classList.toggle("dark");
        const newTheme = isDark ? "dark" : "light";
        localStorage.setItem("theme", newTheme);
        updateIcon(isDark);
      };

      if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
      if (themeToggleMobileBtn)
        themeToggleMobileBtn.addEventListener("click", toggleTheme);
    }

    initThemeToggle();

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        // allow normal behavior for full links
        const href = this.getAttribute("href");
        if (!href || href === "#") return;
        // if href points to another page anchor (starts with / or http), let the browser handle it
        if (href.startsWith("http") || href.startsWith("/")) return;

        e.preventDefault();
        const targetId = href;
        const targetElement = document.querySelector(targetId);
        if (targetElement) targetElement.scrollIntoView({behavior: "smooth"});
        if (mobileMenu && mobileMenu.classList.contains("open"))
          mobileMenu.classList.remove("open");
      });
    });

    const contactForm = document.querySelector(".contact-form");
    if (contactForm) {
      contactForm.addEventListener("submit", () => {});
    }
  }

  // Auto initialize UI and optionally render index page when this script loads
  document.addEventListener("DOMContentLoaded", () => {
    try {
      initSiteUI();
    } catch (err) {
      console.warn("initSiteUI error", err);
    }

    // If this looks like the index page (has featured container and both sections), render it
    const featuredContainer = document.querySelector(".py-16.bg-white .grid");
    const rentalContainer = document.querySelector("#for-rent .grid");
    const saleContainer = document.querySelector("#for-sale .grid");
    if (featuredContainer || (rentalContainer && saleContainer)) {
      if (window.renderIndexPage) {
        try {
          window.renderIndexPage();
        } catch (e) {
          console.warn("renderIndexPage failed", e);
        }
      }
    }
  });
})();

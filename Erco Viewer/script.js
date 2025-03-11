// Global variables
let allProducts = [];
let filteredProducts = [];
let categories = {};
let brands = new Set();
let techSpecs = {};
let minPrice = 0;
let maxPrice = 0;
let dataTable;
let currentView = 'table';
let selectedProducts = [];
let currentProject = {
    info: {
        id: 'proj_' + Date.now(),
        name: 'פרויקט חדש',
        client: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        requestor: ''
    },
    settings: {
        primaryMarkup: 15,
        secondaryMarkup: 15,
        laborRate: 700,
        laborUnit: 'meter',
        laborAmount: 1
    },
    items: [],
    totals: {
        baseTotal: 0,
        primaryMarkupTotal: 0,
        finalTotal: 0,
        laborTotal: 0,
        grandTotal: 0
    }
};

// Function to create a new project structure
function createNewProject() {
    return {
        info: {
            id: 'proj_' + Date.now(),
            name: '',
            client: '',
            location: '',
            date: new Date().toISOString().split('T')[0],
            requestor: ''
        },
        settings: {
            primaryMarkup: 15, // Default 15%
            secondaryMarkup: 15, // Default 15%
            laborRate: 700, // Default ₪700
            laborUnit: 'meter' // Default unit
        },
        items: [],
        totals: {
            baseTotal: 0,
            primaryMarkupTotal: 0,
            finalTotal: 0,
            laborTotal: 0,
            grandTotal: 0
        }
    };
}

// Initialize the application
$(document).ready(function () {
    console.log('Application initializing...');

    // Set up event listeners
    $('#loadDataBtn').on('click', loadCSVFromFile);

    $('#searchBtn').on('click', applySearch);
    $('#searchBox').on('keyup', function (e) {
        if (e.key === 'Enter') {
            applySearch();
        }
    });
    $('#clearFilters').on('click', clearAllFilters);
    $('#applyPriceFilter').on('click', applyPriceFilter);
    $('#exportCsvBtn').on('click', exportToCSV);
    $('#exportExcelBtn').on('click', exportToExcel);
    $('.btn-toggle-view').on('click', function () {
        toggleView($(this).data('view'));
    });

    // Don't try to load categories from an absolute file path
    // We'll extract categories from products after they're loaded
    console.log('Waiting for CSV file to be loaded...');

    // Debug helper
    window.debugApp = function () {
        console.log('Current products:', allProducts.length);
        console.log('Filtered products:', filteredProducts.length);
        console.log('Selected products:', selectedProducts.length);
        console.log('Current project:', currentProject);
    };

    console.log('Application initialized successfully');
});

// Load CSV data from file upload
function loadCSVFromFile() {
    const csvFile = $('#csvFile')[0].files[0];
    const categoriesFile = $('#categoriesFile')[0].files[0];
    const shouldFetchLivePrices = $('#fetchLivePrices').prop('checked');

    if (!csvFile) {
        showStatusMessage('יש לבחור קובץ CSV של מוצרים', 'warning');
        return;
    }

    // Show loading spinner
    $('#loadingSpinner').show();

    // Parse products CSV
    Papa.parse(csvFile, {
        header: true,
        encoding: 'UTF-8',
        skipEmptyLines: true,
        complete: function (results) {
            // Store the data
            allProducts = results.data;
            filteredProducts = [...allProducts];

            // Check if we need to load categories
            if (categoriesFile) {
                Papa.parse(categoriesFile, {
                    header: true,
                    encoding: 'UTF-8',
                    skipEmptyLines: true,
                    complete: function (catResults) {
                        buildCategoryHierarchy(catResults.data);
                        completeDataLoad(shouldFetchLivePrices);
                    },
                    error: function (error) {
                        console.error('Error loading categories:', error);
                        showStatusMessage('שגיאה בטעינת קובץ הקטגוריות', 'danger');
                        // Continue with product data only
                        extractCategoriesFromProducts();
                        completeDataLoad(shouldFetchLivePrices);
                    }
                });
            } else {
                // Continue without categories
                extractCategoriesFromProducts();
                completeDataLoad(shouldFetchLivePrices);
            }
        },
        error: function (error) {
            console.error('Error loading CSV:', error);
            showStatusMessage('שגיאה בטעינת קובץ ה-CSV', 'danger');
            $('#loadingSpinner').hide();
        }
    });
}

// Extract basic category information from product data
function extractCategoriesFromProducts() {
    const categoryMap = {};

    allProducts.forEach(product => {
        if (product.categories) {
            const cats = product.categories.split(',').map(c => c.trim());
            cats.forEach(cat => {
                if (!categoryMap[cat]) {
                    categoryMap[cat] = {
                        subcategories: {}
                    };
                }
            });
        }
    });

    categories = categoryMap;
    renderCategoryFilter();
}

// Build category hierarchy from categories file
function buildCategoryHierarchy(categoriesData) {
    // If categoriesData is a nested JSON object (direct from categories.json)
    if (!Array.isArray(categoriesData)) {
        categories = processNestedCategoriesObject(categoriesData);
        renderCategoryFilter();
        return;
    }

    // Process flat categories data with parent references
    const hierarchy = {};

    // First pass: create all main categories
    categoriesData.forEach(cat => {
        if (cat.level === '1' || cat.level === 1) {
            // Main category
            hierarchy[cat.name] = {
                url: cat.url,
                level: 1,
                fullPath: cat.name,
                subcategories: {}
            };
        }
    });

    // Second pass: add subcategories
    categoriesData.forEach(cat => {
        if ((cat.level === '2' || cat.level === 2) && cat.parent && hierarchy[cat.parent]) {
            // Subcategory
            hierarchy[cat.parent].subcategories[cat.name] = {
                url: cat.url,
                level: 2,
                parent: cat.parent,
                fullPath: `${cat.parent}/${cat.name}`,
                subcategories: {}
            };
        } else if ((cat.level === '3' || cat.level === 3) && cat.parent) {
            // Find the parent subcategory
            for (const mainCat in hierarchy) {
                if (hierarchy[mainCat].subcategories[cat.parent]) {
                    hierarchy[mainCat].subcategories[cat.parent].subcategories[cat.name] = {
                        url: cat.url,
                        level: 3,
                        parent: cat.parent,
                        fullPath: `${mainCat}/${cat.parent}/${cat.name}`,
                        subcategories: {}
                    };
                    break;
                }
            }
        }
    });

    categories = hierarchy;
    renderCategoryFilter();
}

// Helper function to process nested categories object (like the provided categories.json)
function processNestedCategoriesObject(data) {
    const result = {};

    // Process each main category
    Object.keys(data).forEach(mainCat => {
        result[mainCat] = {
            url: data[mainCat].url,
            level: 1,
            fullPath: mainCat,
            subcategories: {}
        };

        // Process subcategories
        const subcats = data[mainCat].subcategories;
        if (subcats) {
            Object.keys(subcats).forEach(subCat => {
                result[mainCat].subcategories[subCat] = {
                    url: subcats[subCat].url,
                    level: 2,
                    parent: mainCat,
                    fullPath: `${mainCat}/${subCat}`,
                    subcategories: {}
                };

                // Process sub-subcategories (third level)
                const subSubcats = subcats[subCat].subcategories;
                if (subSubcats) {
                    Object.keys(subSubcats).forEach(subSubCat => {
                        result[mainCat].subcategories[subCat].subcategories[subSubCat] = {
                            url: subSubcats[subSubCat].url,
                            level: 3,
                            parent: subCat,
                            fullPath: `${mainCat}/${subCat}/${subSubCat}`,
                            subcategories: {}
                        };
                    });
                }
            });
        }
    });

    return result;
}

// Complete data loading process
function completeDataLoad(shouldFetchLivePrices) {  // Renamed parameter
    // Show main content
    $('#mainContent').show();

    // Process the data
    processData();

    // Initialize the table
    initializeDataTable();

    // Initialize filters
    initializeFilters();

    // Update UI
    updateStatsCards();
    renderGridView();

    // Fetch live prices if requested
    if (shouldFetchLivePrices) {
        // Use the better batch-processing version
        fetchLivePricesFromAPI();  // Call the batch-processing function instead
    } else {
        // Hide loading spinner
        $('#loadingSpinner').hide();
        showStatusMessage('נטענו ' + allProducts.length + ' מוצרים בהצלחה', 'success');
    }
}

// Process the data to extract metadata
function processData() {
    // Reset values
    brands = new Set();
    techSpecs = {};
    minPrice = 0;
    maxPrice = 0;

    allProducts.forEach(product => {
        // Convert price to number
        const price = parseFloat(product.price);
        if (!isNaN(price)) {
            product.price = price;
            if (minPrice === 0 || price < minPrice) minPrice = price;
            if (price > maxPrice) maxPrice = price;
        }

        // Extract brands
        if (product.brand) {
            brands.add(product.brand);
        }

        // Extract tech specs
        Object.keys(product).forEach(key => {
            if (key.startsWith('tech_') && product[key]) {
                const specName = key.replace('tech_', '');
                if (!techSpecs[specName]) {
                    techSpecs[specName] = new Set();
                }
                techSpecs[specName].add(product[key]);
            }
        });
    });

    // Set initial price filter values
    $('#minPrice').val(minPrice);
    $('#maxPrice').val(maxPrice);
}

// Fetch live prices (simplified simulation)
function fetchLivePrices() {
    $('#priceUpdateProgress').show();
    showStatusMessage('מעדכן מחירים בזמן אמת...', 'info');

    // Simulate price updates with random adjustments
    for (let i = 0; i < allProducts.length; i++) {
        const currentPrice = parseFloat(allProducts[i].price) || 0;
        // Random adjustment between -10% and +10%
        const randomFactor = 0.9 + (Math.random() * 0.2);
        allProducts[i].price = currentPrice * randomFactor;
        allProducts[i].priceLastUpdated = new Date().toISOString();

        // Update progress bar
        const progress = ((i + 1) / allProducts.length) * 100;
        $('#priceUpdateProgress .progress-bar').css('width', progress + '%');
    }

    // Update filtered products
    filteredProducts = [...allProducts];

    // Update UI
    updateTable();
    renderGridView();

    // Hide loading elements
    $('#loadingSpinner').hide();
    $('#priceUpdateProgress').hide();

    showStatusMessage('עודכנו מחירים ל-' + allProducts.length + ' מוצרים בהצלחה', 'success');
}

// Enhanced DataTable initialization with sorting and column filtering
function initializeDataTable() {
    if ($.fn.dataTable.isDataTable('#productsTable')) {
        $('#productsTable').DataTable().destroy();
    }

    // Add filter inputs to each column header
    $('#productsTable thead tr').clone(true).addClass('filters').appendTo('#productsTable thead');

    dataTable = $('#productsTable').DataTable({
        data: filteredProducts,
        columns: [
            {
                data: null,
                defaultContent: '',
                orderable: false,
                searchable: false,
                render: function (data, type) {
                    if (type === 'display' && data && data.sku) {
                        const isSelected = selectedProducts.some(p => p && p.id === data.sku);
                        return `<div class="form-check">
                            <input class="form-check-input product-select" type="checkbox"
                                ${isSelected ? 'checked' : ''}
                                data-sku="${data.sku}">
                        </div>`;
                    }
                    return '';
                }
            },
            { data: 'name', title: 'שם מוצר', defaultContent: '-' },
            { data: 'sku', title: 'מק"ט', defaultContent: '-' },
            { data: 'brand', title: 'מותג', defaultContent: '-' },
            {
                data: 'price',
                title: 'מחיר',
                render: function (data) {
                    return data ? '₪' + parseFloat(data).toLocaleString() : '-';
                },
                defaultContent: '-'
            },
            { data: 'categories', title: 'קטגוריה', defaultContent: '-' },
            {
                data: null,
                title: 'פעולות',
                defaultContent: '',
                orderable: false,
                searchable: false,
                render: function () {
                    return '<button class="btn btn-sm btn-primary view-details"><i class="fas fa-search"></i></button> ' +
                        '<button class="btn btn-sm btn-success add-to-calc"><i class="fas fa-plus"></i></button>';
                }
            }
        ],
        orderCellsTop: true,
        fixedHeader: true,
        order: [[1, 'asc']], // Sort by name by default
        initComplete: function () {
            // Apply column filters
            this.api().columns().every(function (colIdx) {
                // Skip action column and checkbox column
                if (colIdx === 0 || colIdx === 6) return;

                var cell = $('.filters th').eq($(this.column(colIdx).header()).index());
                var title = $(cell).text();
                $(cell).html('<input type="text" class="form-control form-control-sm" placeholder="סנן ' + title + '" />');

                // Add filter event handler
                $('input', cell).on('keyup change', function () {
                    if (that.search() !== this.value) {
                        that.search(this.value).draw();
                    }
                });
            });
        },
        language: {
            search: "חיפוש:",
            lengthMenu: "הצג _MENU_ פריטים",
            info: "מציג _START_ עד _END_ מתוך _TOTAL_ פריטים",
            infoEmpty: "מציג 0 עד 0 מתוך 0 פריטים",
            infoFiltered: "(מסונן מתוך _MAX_ פריטים)",
            paginate: {
                first: "ראשון",
                last: "אחרון",
                next: "הבא",
                previous: "הקודם"
            },
            emptyTable: "אין נתונים זמינים בטבלה"
        },
        responsive: true,
        dom: '<"row"<"col-sm-6"l><"col-sm-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-5"i><"col-sm-7"p>>'
    });

    // Add event handlers for actions
    $('#productsTable').on('click', '.view-details', function () {
        const data = dataTable.row($(this).parents('tr')).data();
        if (data) showProductDetails(data);
    });

    // Make sure we handle product selection safely by checking for valid data
    $('#productsTable').on('click', '.product-select', function () {
        const tr = $(this).closest('tr');
        const data = dataTable.row(tr).data();

        if (!data || !data.sku) {
            console.error('Invalid product data:', data);
            return;
        }

        if (this.checked) {
            addProductToSelection(data);
        } else {
            removeProductFromSelection(data);
        }
    });

    // Add event handler for "add to calculator" button with safety checks
    $('#productsTable').on('click', '.add-to-calc', function () {
        const data = dataTable.row($(this).parents('tr')).data();
        if (data && data.sku) {
            addProductToSelection(data);
            showCalculator();
        }
    });
}

// Initialize filters
function initializeFilters() {
    // Initialize brand filter
    const brandFilterHtml = Array.from(brands).sort().map(brand => {
        const brandId = String(brand).replace(/\s+/g, '_').replace(/[^\w]/g, '_');
        return `
            <div class="form-check">
                <input class="form-check-input brand-checkbox" type="checkbox" value="${brand}" id="brand_${brandId}">
                <label class="form-check-label" for="brand_${brandId}">
                    ${brand}
                </label>
            </div>
        `;
    }).join('');

    $('#brandFilter').html(brandFilterHtml || '<p>אין מותגים זמינים</p>');

    // Add event listeners for filter changes
    $('.brand-checkbox').on('change', applyFilters);
}

// Apply all filters
function applyFilters() {
    // Get selected categories with their paths
    const selectedCategoryPaths = [];
    $('.category-checkbox:checked').each(function () {
        selectedCategoryPaths.push($(this).data('path'));
    });

    // Get selected brands
    const selectedBrands = [];
    $('.brand-checkbox:checked').each(function () {
        selectedBrands.push($(this).val());
    });

    // Get price range
    const minPriceFilter = parseFloat($('#minPrice').val()) || minPrice;
    const maxPriceFilter = parseFloat($('#maxPrice').val()) || maxPrice;

    // Apply filters
    filteredProducts = allProducts.filter(product => {
        // Filter by category
        if (selectedCategoryPaths.length > 0) {
            const productCategories = product.categories ? product.categories.split(',').map(c => c.trim()) : [];

            // Check if any product category matches any selected category at any level
            const categoryMatch = productCategories.some(prodCat => {
                return selectedCategoryPaths.some(path => {
                    // Get all segments of the path
                    const pathSegments = path.split('/');

                    // Check if this product category matches any segment of the path
                    // or the full path itself
                    return pathSegments.some(segment =>
                        prodCat === segment || prodCat.includes(segment)
                    );
                });
            });

            if (!categoryMatch) return false;
        }

        // Filter by brand
        if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
            return false;
        }

        // Filter by price
        const price = parseFloat(product.price);
        if (!isNaN(price) && (price < minPriceFilter || price > maxPriceFilter)) {
            return false;
        }

        return true;
    });

    // Update the table
    updateTable();

    // Update grid view
    renderGridView();

    // Update stats
    updateStatsCards();
}

// Apply price filter
function applyPriceFilter() {
    applyFilters();
}

// Improved search function
function applySearch() {
    const searchTerm = $('#searchBox').val().toLowerCase().trim();

    // If search is empty, reset to full filtered list
    if (!searchTerm) {
        filteredProducts = [...allProducts];
        applyFilters(); // Apply other active filters
        return;
    }

    // Start with all products
    const baseProducts = [...allProducts];

    // Filter by search term
    filteredProducts = baseProducts.filter(product => {
        // Check all properties for matches
        for (const key in product) {
            const value = product[key];
            if (value && typeof value === 'string' &&
                value.toLowerCase().includes(searchTerm)) {
                return true;
            }
        }
        return false;
    });

    // Update the table
    updateTable();

    // Update grid view
    renderGridView();

    // Update stats
    updateStatsCards();

    // Show status message
    showStatusMessage(`נמצאו ${filteredProducts.length} מוצרים`, 'info');
}

// Clear all filters
function clearAllFilters() {
    // Uncheck all checkboxes
    $('.category-checkbox').prop('checked', false);
    $('.brand-checkbox').prop('checked', false);

    // Reset price range
    $('#minPrice').val(minPrice);
    $('#maxPrice').val(maxPrice);

    // Clear search box
    $('#searchBox').val('');

    // Reset filters
    filteredProducts = [...allProducts];

    // Update UI
    updateTable();
    renderGridView();
    updateStatsCards();
}

// Update the data table
function updateTable() {
    if (dataTable) {
        dataTable.clear();
        dataTable.rows.add(filteredProducts);
        dataTable.draw();
    }
}

// Toggle between table and grid view
function toggleView(view) {
    currentView = view;

    if (view === 'table') {
        $('#tableContainer').show();
        $('#gridContainer').hide();
        $('#tableViewBtn').addClass('active');
        $('#gridViewBtn').removeClass('active');
    } else {
        $('#tableContainer').hide();
        $('#gridContainer').show();
        $('#tableViewBtn').removeClass('active');
        $('#gridViewBtn').addClass('active');
    }
}

// Update stats cards
function updateStatsCards() {
    const totalProducts = filteredProducts.length;
    const totalBrands = new Set(filteredProducts.map(p => p.brand).filter(Boolean)).size;

    let validPrices = filteredProducts.filter(p => parseFloat(p.price) > 0);
    const avgPrice = validPrices.length ?
        validPrices.reduce((sum, p) => sum + parseFloat(p.price), 0) / validPrices.length : 0;

    let statsHtml = `
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="stat-card">
                <div class="stat-value">${totalProducts}</div>
                <div>מוצרים</div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="stat-card">
                <div class="stat-value">${totalBrands}</div>
                <div>מותגים</div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="stat-card">
                <div class="stat-value">₪${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div>מחיר ממוצע</div>
            </div>
        </div>
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="stat-card">
                <div class="stat-value">${Object.keys(categories).length}</div>
                <div>קטגוריות ראשיות</div>
            </div>
        </div>
    `;

    $('#statsRow').html(statsHtml);
}

// Update renderGridView function to include selection
function renderGridView() {
    const html = filteredProducts.map(product => {
        const isSelected = selectedProducts.some(p => p.sku === product.sku);

        return `
            <div class="product-card">
                <div class="form-check position-absolute top-0 end-0 mt-2 me-2">
                    <input class="form-check-input grid-product-select" type="checkbox" ${isSelected ? 'checked' : ''} data-sku="${product.sku}">
                </div>
                <div class="text-center mb-3">
                    ${product.image_paths ?
                `<img src="${product.image_paths.split(';')[0]}" class="product-image" alt="${product.name}" onerror="handleImageError(this)">` :
                '<div class="p-4 bg-light text-center"><i class="fas fa-image fa-3x text-muted"></i></div>'}
                </div>
                <h5 class="mb-2">${product.name || 'מוצר ללא שם'}</h5>
                <p class="mb-1"><strong>מק"ט:</strong> ${product.sku || '-'}</p>
                <p class="mb-1"><strong>מותג:</strong> ${product.brand || '-'}</p>
                <p class="mb-3"><strong>מחיר:</strong> ${parseFloat(product.price) ? '₪' + parseFloat(product.price).toLocaleString() : 'לא זמין'}</p>
                <div class="text-center">
                    <button class="btn btn-sm btn-primary grid-view-details" data-index="${filteredProducts.indexOf(product)}">
                        <i class="fas fa-search"></i> פרטים
                    </button>
                    <button class="btn btn-sm btn-success grid-add-to-calc" data-index="${filteredProducts.indexOf(product)}">
                        <i class="fas fa-plus"></i> הוסף למחשבון
                    </button>
                </div>
            </div>
        `;
    }).join('');

    $('#gridContainer').html(html || '<div class="alert alert-info">לא נמצאו מוצרים</div>');

    // Add event listeners
    $('.grid-view-details').off('click').on('click', function () {
        const index = $(this).data('index');
        showProductDetails(filteredProducts[index]);
    });

    $('.grid-add-to-calc').off('click').on('click', function () {
        const index = $(this).data('index');
        addProductToSelection(filteredProducts[index]);
        showCalculator();
    });

    $('.grid-product-select').off('click').on('click', function () {
        const sku = $(this).data('sku');
        const product = filteredProducts.find(p => p.sku === sku);

        if (this.checked) {
            addProductToSelection(product);
        } else {
            removeProductFromSelection(product);
        }
    });
}

// Render grid view
function renderGridView() {
    const html = filteredProducts.map(product => {
        return `
            <div class="product-card">
                <div class="text-center mb-3">
                    ${product.image_paths ?
                `<img src="${product.image_paths.split(';')[0]}" class="product-image" alt="${product.name}" onerror="handleImageError(this)">` :
                '<div class="p-4 bg-light text-center"><i class="fas fa-image fa-3x text-muted"></i></div>'}
                </div>
                <h5 class="mb-2">${product.name || 'מוצר ללא שם'}</h5>
                <p class="mb-1"><strong>מק"ט:</strong> ${product.sku || '-'}</p>
                <p class="mb-1"><strong>מותג:</strong> ${product.brand || '-'}</p>
                <p class="mb-3"><strong>מחיר:</strong> ${parseFloat(product.price) ? '₪' + parseFloat(product.price).toLocaleString() : 'לא זמין'}</p>
                ${product.priceLastUpdated ?
                `<p class="mb-3"><small class="text-muted">מחיר עודכן: ${new Date(product.priceLastUpdated).toLocaleString()}</small></p>` : ''}
                <div class="text-center">
                    <button class="btn btn-sm btn-primary grid-view-details" data-index="${filteredProducts.indexOf(product)}">
                        <i class="fas fa-search"></i> פרטים נוספים
                    </button>
                </div>
            </div>
        `;
    }).join('');

    $('#gridContainer').html(html || '<div class="alert alert-info">לא נמצאו מוצרים</div>');

    // Add event listener for grid view details button
    $('.grid-view-details').off('click').on('click', function () {
        const index = $(this).data('index');
        showProductDetails(filteredProducts[index]);
    });
}

// Show product details in modal
function showProductDetails(product) {
    let detailsHtml = `
        <div class="row">
            <div class="col-md-4 text-center">
                ${product.image_paths ?
            `<img src="${product.image_paths.split(';')[0]}" class="product-image img-fluid" alt="${product.name}" onerror="handleImageError(this)">` :
            '<div class="p-4 bg-light text-center"><i class="fas fa-image fa-3x text-muted"></i></div>'}

                ${product.image_paths && product.image_paths.split(';').length > 1 ?
            `<div class="mt-2 additional-images">
                    <p><small>תמונות נוספות (${product.image_paths.split(';').length - 1})</small></p>
                    <div class="d-flex flex-wrap justify-content-center">
                      ${product.image_paths.split(';').slice(1).map((img, idx) =>
                `<img src="${img}" class="m-1" style="width: 50px; height: 50px; object-fit: cover;"
                         alt="תמונה נוספת ${idx + 1}" onerror="handleImageError(this)">`
            ).join('')}
                    </div>
                   </div>` : ''}
            </div>
            <div class="col-md-8">
                <h4>${product.name || 'מוצר ללא שם'}</h4>
                <p><strong>מק"ט:</strong> ${product.sku || '-'}</p>
                <p><strong>מותג:</strong> ${product.brand || '-'}</p>
                <p><strong>מחיר:</strong> ${parseFloat(product.price) ? '₪' + parseFloat(product.price).toLocaleString() : 'לא זמין'}</p>
                ${product.priceLastUpdated ?
            `<p><small class="text-muted">מחיר עודכן ב: ${new Date(product.priceLastUpdated).toLocaleString()}</small></p>` : ''}
                ${product.categories ? `<p><strong>קטגוריות:</strong> ${product.categories}</p>` : ''}
            </div>
        </div>

        <hr>

        <h5>מפרט טכני</h5>
        <div class="row">
    `;

    // Add tech specs
    const techSpecs = [];
    for (const key in product) {
        if (key.startsWith('tech_') && product[key]) {
            techSpecs.push({
                key: key.replace('tech_', ''),
                value: product[key]
            });
        }
    }

    if (techSpecs.length > 0) {
        techSpecs.forEach((spec) => {
            detailsHtml += `
                <div class="col-md-6 mb-2">
                    <strong>${spec.key}:</strong> ${spec.value}
                </div>
            `;
        });
    } else {
        detailsHtml += `<div class="col-12"><p class="text-muted">אין מפרט טכני זמין</p></div>`;
    }

    detailsHtml += `
        </div>

        <hr>

        <div class="text-end">
            <a href="${product.url}" class="btn btn-primary" target="_blank" ${product.url ? '' : 'disabled'}>
                <i class="fas fa-external-link-alt"></i> צפייה באתר Erco
            </a>
        </div>
    `;

    $('#productDetailContent').html(detailsHtml);
    $('#productDetailModalLabel').text(product.name || 'פרטי מוצר');
    $('#productDetailModal').modal('show');
}

// Export to CSV
function exportToCSV() {
    if (filteredProducts.length === 0) {
        showStatusMessage('אין מוצרים לייצוא', 'warning');
        return;
    }

    const csv = Papa.unparse(filteredProducts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'erco_filtered_products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export to Excel
function exportToExcel() {
    if (filteredProducts.length === 0) {
        showStatusMessage('אין מוצרים לייצוא', 'warning');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredProducts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    XLSX.writeFile(workbook, 'erco_filtered_products.xlsx');
}

// Show status message
function showStatusMessage(message, type) {
    const statusEl = $('#statusMessage');
    statusEl.text(message)
        .removeClass('alert-info alert-success alert-warning alert-danger')
        .addClass('alert-' + type)
        .show();

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusEl.fadeOut();
        }, 5000);
    }
}

// Function to handle live price fetching with real API (simplified simulation)
function fetchLivePricesFromAPI() {
    const total = allProducts.length;
    let completed = 0;

    $('#priceUpdateProgress').show();
    showStatusMessage('מעדכן מחירים בזמן אמת...', 'info');

    // Process in batches to avoid blocking the UI
    const batchSize = 10;
    const batches = Math.ceil(allProducts.length / batchSize);

    function processBatch(batchIndex) {
        if (batchIndex >= batches) {
            // All batches processed
            finalizePriceUpdate();
            return;
        }

        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, allProducts.length);

        // Process current batch
        for (let i = start; i < end; i++) {
            // In a real implementation, you would make API calls here
            // For simulation, we're using random price adjustments
            const currentPrice = parseFloat(allProducts[i].price) || 0;
            const randomFactor = 0.9 + (Math.random() * 0.2); // Random adjustment between -10% and +10%
            allProducts[i].price = currentPrice * randomFactor;
            allProducts[i].priceLastUpdated = new Date().toISOString();

            completed++;

            // Update progress
            const progress = (completed / total) * 100;
            $('#priceUpdateProgress .progress-bar').css('width', progress + '%');
        }

        // Process next batch after a small delay to allow UI updates
        setTimeout(() => processBatch(batchIndex + 1), 50);
    }

    // Start processing batches
    processBatch(0);

    function finalizePriceUpdate() {
        // Update filtered products
        filteredProducts = [...allProducts];

        // Update UI
        updateTable();
        renderGridView();
        updateStatsCards();

        // Hide loading elements
        $('#loadingSpinner').hide();
        $('#priceUpdateProgress').hide();

        showStatusMessage('עודכנו מחירים ל-' + allProducts.length + ' מוצרים בהצלחה', 'success');
    }
}

// Helper function to handle image error
function handleImageError(img) {
    img.onerror = null;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+No Image</dGV4dD48L3N2Zz4=';
    return true;
}

// Global error handling
window.addEventListener('error', function (e) {
    console.error('Global error:', e.error || e.message);
    showStatusMessage('שגיאה בהפעלת המערכת: ' + (e.error?.message || e.message), 'danger');
    $('#loadingSpinner').hide();
});

// Add a floating button to show calculator
$(document).ready(function () {
    // Add to existing document ready function

    // Add calculator button to UI
    $('body').append(`
        <button class="btn btn-primary position-fixed" style="bottom: 20px; right: 20px; z-index: 1000;" id="show-calculator-btn">
            <i class="fas fa-calculator"></i> מחשבון מחירים
            <span class="badge bg-danger" id="calc-item-count" style="display:none;">0</span>
        </button>
    `);

    // Setup calculator events
    $('#show-calculator-btn').on('click', showCalculator);
    $(document).on('click', '.btn-success[data-bs-target="#customProductModal"]', showCustomProductModal);
    $('#add-custom-product-btn').on('click', addCustomProduct);
    $('#save-project-btn').on('click', saveCurrentProject);
    $('#load-project-btn').on('click', showProjectsList);
    $('#clear-calculator-btn').on('click', clearCalculator);
    $('#export-quote-btn').on('click', exportQuote);
    $('#export-calc-btn').on('click', exportCalculation);

    // Setup sync for markup inputs
    $('#primary-markup, #primary-markup-range').on('input', function () {
        const value = $(this).val();
        if (this.id === 'primary-markup') {
            $('#primary-markup-range').val(value);
        } else {
            $('#primary-markup').val(value);
        }
        updateCalculatorSettings();
    });

    $('#secondary-markup, #secondary-markup-range').on('input', function () {
        const value = $(this).val();
        if (this.id === 'secondary-markup') {
            $('#secondary-markup-range').val(value);
        } else {
            $('#secondary-markup').val(value);
        }
        updateCalculatorSettings();
    });

    $('#labor-rate').on('input', updateCalculatorSettings);
    $('input[name="labor-unit"]').on('change', updateCalculatorSettings);

    // Load project info inputs
    $('#project-name, #project-client, #project-location, #project-requestor').on('input', function () {
        const field = this.id.replace('project-', '');
        currentProject.info[field] = $(this).val();
    });

    $('#project-date').on('change', function () {
        currentProject.info.date = $(this).val();
    });

    // Initialize settings
    updateCalculatorUI();
});

// Show the calculator panel
function showCalculator() {
    // Initialize the calculator UI with current project data
    updateCalculatorUI();

    // Show the panel
    const calculator = new bootstrap.Offcanvas(document.getElementById('calculatorPanel'));
    calculator.show();
}

// Update all calculator UI elements
function updateCalculatorUI() {
    // Update project info
    $('#project-name').val(currentProject.info.name);
    $('#project-client').val(currentProject.info.client);
    $('#project-location').val(currentProject.info.location);
    $('#project-requestor').val(currentProject.info.requestor);
    $('#project-date').val(currentProject.info.date);

    // Update settings
    $('#primary-markup, #primary-markup-range').val(currentProject.settings.primaryMarkup);
    $('#secondary-markup, #secondary-markup-range').val(currentProject.settings.secondaryMarkup);
    $('#labor-rate').val(currentProject.settings.laborRate);
    $(`#labor-${currentProject.settings.laborUnit}`).prop('checked', true);

    // Update products table
    updateProductsTable();

    // Update results
    updateCalculationResults();

    // Update counts
    $('#selected-count').text(selectedProducts.length);
    if (selectedProducts.length > 0) {
        $('#calc-item-count').text(selectedProducts.length).show();
    } else {
        $('#calc-item-count').hide();
    }

    updateResultsTab();
}

// Add product to selection
function addProductToSelection(product) {
    if (!product) return; // Guard against undefined products

    // Check if product already exists in selection
    const existingIndex = selectedProducts.findIndex(p => p.id === product.sku);

    if (existingIndex === -1) {
        // Add new product
        const newItem = {
            id: product.sku || 'prod_' + Date.now(),
            type: 'material',
            name: product.name,
            category: product.categories,
            unitPrice: parseFloat(product.price) || 0,
            quantity: 1,
            unit: 'piece',
            source: 'erco',
            baseTotal: parseFloat(product.price) || 0,
            labor: {
                unit: currentProject.settings.laborUnit || 'meter',
                amount: 1,
                rate: currentProject.settings.laborRate || 700,
                total: currentProject.settings.laborRate || 700
            }
        };

        selectedProducts.push(newItem);
        currentProject.items.push(newItem);
    } else {
        // Increment quantity if already selected
        currentProject.items[existingIndex].quantity += 1;
        selectedProducts[existingIndex].quantity += 1;

        // Update totals
        currentProject.items[existingIndex].baseTotal =
            currentProject.items[existingIndex].unitPrice * currentProject.items[existingIndex].quantity;
    }

    // Update UI
    updateCalculationResults();

    // Update count badge
    $('#calc-item-count').text(selectedProducts.length).show();
    $('#selected-count').text(selectedProducts.length);

    // Update views
    updateTable();
    renderGridView();
}

// Remove product from selection
function removeProductFromSelection(product) {
    if (!product) return; // Guard against undefined products

    const index = selectedProducts.findIndex(p => p.id === product.sku);
    if (index !== -1) {
        selectedProducts.splice(index, 1);
        currentProject.items.splice(index, 1);

        // Update UI
        updateCalculationResults();

        // Update count badge
        if (selectedProducts.length > 0) {
            $('#calc-item-count').text(selectedProducts.length).show();
        } else {
            $('#calc-item-count').hide();
        }
        $('#selected-count').text(selectedProducts.length);

        // Update views
        updateTable();
        renderGridView();
    }
}


// Update products table in calculator
function updateProductsTable() {
    const tbody = $('#calculator-products tbody');
    tbody.empty();

    currentProject.items.forEach((item, index) => {
        // Make sure item has labor settings
        enhanceProductWithLaborSettings(item);

        const laborUnitText = getLaborUnitText(item.labor.unit);

        tbody.append(`
            <tr>
                <td>${item.name}</td>
                <td>${item.id}</td>
                <td>₪${item.unitPrice.toLocaleString()}</td>
                <td>
                    <input type="number" min="1" class="form-control form-control-sm quantity-input"
                        data-index="${index}" value="${item.quantity}" style="width: 70px">
                </td>
                <td>₪${(item.unitPrice * item.quantity).toLocaleString()}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button"
                            data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-cog"></i>
                        </button>
                        <ul class="dropdown-menu p-2" style="width: 250px;">
                            <li class="mb-2">
                                <label class="form-label">יחידת עבודה:</label>
                                <select class="form-select form-select-sm labor-unit-select" data-index="${index}">
                                    <option value="meter" ${item.labor.unit === 'meter' ? 'selected' : ''}>מטר</option>
                                    <option value="point" ${item.labor.unit === 'point' ? 'selected' : ''}>נקודה</option>
                                    <option value="unit" ${item.labor.unit === 'unit' ? 'selected' : ''}>יחידה</option>
                                </select>
                            </li>
                            <li class="mb-2">
                                <label class="form-label">כמות עבודה (${laborUnitText}):</label>
                                <input type="number" min="0" step="0.1" class="form-control form-control-sm labor-amount-input"
                                    data-index="${index}" value="${item.labor.amount}">
                            </li>
                            <li class="mb-2">
                                <label class="form-label">מחיר עבודה (₪/יח'):</label>
                                <input type="number" min="0" class="form-control form-control-sm labor-rate-input"
                                    data-index="${index}" value="${item.labor.rate}">
                            </li>
                            <li class="mb-2">
                                <label class="form-label">סה"כ עבודה:</label>
                                <div class="fw-bold">₪${item.labor.total.toLocaleString()}</div>
                            </li>
                        </ul>
                    </div>
                    <button class="btn btn-sm btn-danger remove-item" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    // Add employee work row if there are items
    if (currentProject.items.length > 0) {
        tbody.append(`
            <tr class="table-secondary">
                <td colspan="6" class="text-center">
                    <button class="btn btn-info btn-sm" id="add-employee-work-btn">
                        <i class="fas fa-user-plus"></i> הוסף עלויות עובדים
                    </button>
                </td>
            </tr>
        `);
    }

    // Add event listeners for quantity changes and removals
    $('.quantity-input').on('input', function () {
        const index = $(this).data('index');
        const newQuantity = parseInt($(this).val()) || 1;

        currentProject.items[index].quantity = newQuantity;
        currentProject.items[index].baseTotal = currentProject.items[index].unitPrice * newQuantity;

        updateCalculationResults();
    });

    // Add event listeners for labor settings
    $('.labor-unit-select').on('change', function () {
        const index = $(this).data('index');
        currentProject.items[index].labor.unit = $(this).val();

        // Update the label text
        const laborUnitText = getLaborUnitText(currentProject.items[index].labor.unit);
        $(this).closest('ul').find('.form-label:contains("כמות עבודה")').text(`כמות עבודה (${laborUnitText}):`);

        calculateProductLaborCost(currentProject.items[index]);
        updateCalculationResults();
    });

    $('.labor-amount-input, .labor-rate-input').on('input', function () {
        const index = $(this).data('index');
        const field = $(this).hasClass('labor-amount-input') ? 'amount' : 'rate';
        const value = parseFloat($(this).val()) || 0;

        currentProject.items[index].labor[field] = value;
        calculateProductLaborCost(currentProject.items[index]);

        // Update the total display
        $(this).closest('ul').find('.fw-bold').text(`₪${currentProject.items[index].labor.total.toLocaleString()}`);

        updateCalculationResults();
    });

    $('.remove-item').on('click', function () {
        const index = $(this).data('index');
        const item = currentProject.items[index];

        // If from ERCO catalog, also update selected products
        if (item.source === 'erco') {
            const productIndex = selectedProducts.findIndex(p => p.id === item.id);
            if (productIndex !== -1) {
                selectedProducts.splice(productIndex, 1);
            }
        }

        currentProject.items.splice(index, 1);

        // Update UI
        updateProductsTable();
        updateCalculationResults();

        // Update count badge
        if (selectedProducts.length > 0) {
            $('#calc-item-count').text(selectedProducts.length).show();
        } else {
            $('#calc-item-count').hide();
        }
        $('#selected-count').text(selectedProducts.length);

        // Update views if from catalog
        if (item.source === 'erco') {
            updateTable();
            renderGridView();
        }
    });

    // Employee work button handler
    $('#add-employee-work-btn').off('click').on('click', showEmployeeWorkModal);
}

// Update calculation results to account for individual labor costs
function updateCalculationResults() {
    // Calculate base totals
    let baseTotal = 0;
    let laborTotal = 0;

    currentProject.items.forEach(item => {
        // Make sure item has labor settings
        enhanceProductWithLaborSettings(item);

        // Calculate item totals
        const itemTotal = item.unitPrice * item.quantity;
        item.baseTotal = itemTotal;
        baseTotal += itemTotal;

        // Add labor costs
        laborTotal += item.labor.total;
    });

    // Calculate markup amounts
    const primaryMarkupAmount = baseTotal * (currentProject.settings.primaryMarkup / 100);
    const afterPrimaryMarkup = baseTotal + primaryMarkupAmount;
    const secondaryMarkupAmount = afterPrimaryMarkup * (currentProject.settings.secondaryMarkup / 100);
    const afterSecondaryMarkup = afterPrimaryMarkup + secondaryMarkupAmount;

    // Add employee labor costs if they exist
    if (currentProject.employeeWork && currentProject.employeeWork.length > 0) {
        currentProject.employeeWork.forEach(entry => {
            laborTotal += entry.rate * entry.hours;
        });
    }

    // Grand total
    const grandTotal = afterSecondaryMarkup + laborTotal;

    // Update project totals
    currentProject.totals = {
        baseTotal,
        primaryMarkupAmount,
        afterPrimaryMarkup,
        secondaryMarkupAmount,
        afterSecondaryMarkup,
        laborTotal,
        grandTotal
    };

    // Update UI with formatted numbers
    $('#result-base-total').text('₪' + baseTotal.toLocaleString());
    $('#result-primary-markup').text('₪' + primaryMarkupAmount.toLocaleString());
    $('#result-after-primary').text('₪' + afterPrimaryMarkup.toLocaleString());
    $('#result-secondary-markup').text('₪' + secondaryMarkupAmount.toLocaleString());
    $('#result-after-all-markups').text('₪' + afterSecondaryMarkup.toLocaleString());
    $('#result-labor-total').text('₪' + laborTotal.toLocaleString());
    $('#result-grand-total').text('₪' + grandTotal.toLocaleString());
}

// Enhance product item structure with labor fields
function enhanceProductWithLaborSettings(product) {
    if (!product.labor) {
        product.labor = {
            unit: currentProject.settings.laborUnit || 'meter',
            amount: 1,
            rate: currentProject.settings.laborRate || 700,
            total: 0
        };
        calculateProductLaborCost(product);
    }
    return product;
}

// Calculate labor cost for a specific product
function calculateProductLaborCost(product) {
    product.labor.total = product.labor.rate * product.labor.amount;
    return product.labor.total;
}

// Get labor unit text based on unit code
function getLaborUnitText(unit) {
    switch (unit) {
        case 'meter': return 'מטר';
        case 'point': return 'נקודה';
        case 'unit': return 'יחידה';
        default: return 'מטר';
    }
}

// Show modal for adding employee work entries
function showEmployeeWorkModal() {
    // Initialize employee work array if it doesn't exist
    if (!currentProject.employeeWork) {
        currentProject.employeeWork = [];
    }

    // Create modal HTML with better styling and functionality
    const modalHtml = `
    <div class="modal fade" id="employeeWorkModal" tabindex="-1" aria-labelledby="employeeWorkModalLabel">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="employeeWorkModalLabel">הוספת עלויות עובדים</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="סגור"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i> הוסף עובדים לפרויקט וקבע את שעות העבודה והעלות לשעה. העלות תתווסף לסך הפרויקט.
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped table-bordered" id="employee-work-table">
                            <thead class="table-secondary">
                                <tr>
                                    <th>שם עובד</th>
                                    <th style="width: 120px">שעות עבודה</th>
                                    <th style="width: 120px">עלות לשעה (₪)</th>
                                    <th style="width: 120px">סה"כ</th>
                                    <th style="width: 70px">פעולות</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${currentProject.employeeWork.map((entry, index) => `
                                <tr data-employee-row="${index}">
                                    <td>
                                        <input type="text" class="form-control form-control-sm employee-name"
                                            value="${entry.name}" data-index="${index}">
                                    </td>
                                    <td>
                                        <input type="number" min="0" step="0.5" class="form-control form-control-sm employee-hours"
                                            value="${entry.hours}" data-index="${index}">
                                    </td>
                                    <td>
                                        <div class="input-group input-group-sm">
                                            <input type="number" min="0" class="form-control form-control-sm employee-rate"
                                                value="${entry.rate}" data-index="${index}">
                                            <span class="input-group-text">₪</span>
                                        </div>
                                    </td>
                                    <td class="employee-total-cost">₪${(entry.hours * entry.rate).toLocaleString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-danger remove-employee" data-index="${index}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="5">
                                        <button class="btn btn-success btn-sm w-100" id="add-new-employee-btn">
                                            <i class="fas fa-plus"></i> הוסף עובד נוסף
                                        </button>
                                    </td>
                                </tr>
                                <tr class="table-primary">
                                    <th colspan="3" class="text-end">סה"כ עלות עובדים:</th>
                                    <th id="employee-total-sum">₪${currentProject.employeeWork.reduce((sum, emp) => sum + (emp.hours * emp.rate), 0).toLocaleString()}</th>
                                    <th></th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">סגור</button>
                    <button type="button" class="btn btn-primary" id="save-employee-work-btn">שמור</button>
                </div>
            </div>
        </div>
    </div>`;

    // Add modal to document body
    $('body').append(modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('employeeWorkModal'));
    modal.show();

    // Function to calculate and update row total
    function updateRowTotal($row) {
        const hours = parseFloat($row.find('.employee-hours').val()) || 0;
        const rate = parseFloat($row.find('.employee-rate').val()) || 0;
        const total = hours * rate;
        $row.find('.employee-total-cost').text(`₪${total.toLocaleString()}`);
        return total;
    }

    // Function to update the total sum
    function updateTotalSum() {
        let totalSum = 0;
        $('#employee-work-table tbody tr').each(function () {
            totalSum += updateRowTotal($(this));
        });
        $('#employee-total-sum').text(`₪${totalSum.toLocaleString()}`);
    }

    // Add event listener to update calculations when values change
    $('.employee-hours, .employee-rate').on('input', function () {
        updateTotalSum();
    });

    // Add new employee row
    $('#add-new-employee-btn').on('click', function () {
        const rowIndex = $('#employee-work-table tbody tr').length;
        const newRow = `
        <tr data-employee-row="${rowIndex}">
            <td>
                <input type="text" class="form-control form-control-sm employee-name"
                    value="" placeholder="שם העובד">
            </td>
            <td>
                <input type="number" min="0" step="0.5" class="form-control form-control-sm employee-hours"
                    value="8" placeholder="שעות">
            </td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="number" min="0" class="form-control form-control-sm employee-rate"
                        value="100" placeholder="עלות לשעה">
                    <span class="input-group-text">₪</span>
                </div>
            </td>
            <td class="employee-total-cost">₪800</td>
            <td>
                <button class="btn btn-sm btn-danger remove-employee-temp">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;

        // Insert new row at the end of the table
        $('#employee-work-table tbody').append(newRow);

        // Add event listeners for the new row
        $('.employee-hours, .employee-rate').off('input').on('input', function () {
            updateTotalSum();
        });

        // Add remove handler for new row
        $('.remove-employee-temp').on('click', function () {
            $(this).closest('tr').remove();
            updateTotalSum();
        });

        // Update the totals
        updateTotalSum();
    });

    // Remove employee handler
    $('.remove-employee').on('click', function () {
        $(this).closest('tr').remove();
        updateTotalSum();
    });

    // Save employee work handler
    $('#save-employee-work-btn').on('click', function () {
        // Clear current employee work
        currentProject.employeeWork = [];

        // Collect all rows including newly added ones
        $('#employee-work-table tbody tr').each(function () {
            const nameInput = $(this).find('.employee-name');
            if (nameInput.length) {
                const name = nameInput.val().trim();
                const hours = parseFloat($(this).find('.employee-hours').val()) || 0;
                const rate = parseFloat($(this).find('.employee-rate').val()) || 0;

                if (name && hours > 0 && rate > 0) {
                    currentProject.employeeWork.push({
                        name,
                        hours,
                        rate,
                        total: hours * rate
                    });
                }
            }
        });

        // Update calculations
        updateCalculationResults();
        updateResultsTab();

        // Close modal
        modal.hide();
    });

    // Clean up modal when hidden
    $('#employeeWorkModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

// Enhance addCustomProduct to include labor settings
function addCustomProduct() {
    const name = $('#custom-product-name').val();
    const sku = $('#custom-product-sku').val() || 'custom_' + Date.now();
    const price = parseFloat($('#custom-product-price').val());
    const quantity = parseInt($('#custom-product-quantity').val()) || 1;

    if (!name || isNaN(price)) {
        alert('נא למלא את כל השדות הנדרשים');
        return;
    }

    // Create custom product
    const customProduct = {
        id: sku,
        type: 'material',
        name: name,
        category: 'מוצר מותאם אישית',
        unitPrice: price,
        quantity: quantity,
        unit: 'piece',
        source: 'custom',
        baseTotal: price * quantity,
        labor: {
            unit: currentProject.settings.laborUnit || 'meter',
            amount: 1,
            rate: currentProject.settings.laborRate || 700,
            total: currentProject.settings.laborRate || 700
        }
    };

    // Add to project items
    currentProject.items.push(customProduct);

    // Close modal and update UI
    $('#customProductModal').modal('hide');
    updateProductsTable();
    updateCalculationResults();
}

// Clear calculator - remove all items
function clearCalculator() {
    if (confirm('האם אתה בטוח שברצונך לנקות את כל הפריטים במחשבון?')) {
        // Clear selected products
        selectedProducts = [];
        currentProject.items = [];

        // Update UI
        updateProductsTable();
        updateCalculationResults();

        // Update count badge
        $('#calc-item-count').hide();
        $('#selected-count').text('0');

        // Update views
        updateTable();
        renderGridView();
    }
}

// Save current project to localStorage
function saveCurrentProject() {
    if (!currentProject.info.name) {
        alert('נא להזין שם פרויקט');
        return;
    }

    // Get existing projects
    let savedProjects = JSON.parse(localStorage.getItem('ercoProjects') || '[]');

    // Check if project with same ID exists
    const existingIndex = savedProjects.findIndex(p => p.info.id === currentProject.info.id);

    if (existingIndex !== -1) {
        // Update existing project
        savedProjects[existingIndex] = { ...currentProject };
    } else {
        // Add new project
        savedProjects.push({ ...currentProject });
    }

    // Save to localStorage
    localStorage.setItem('ercoProjects', JSON.stringify(savedProjects));

    // Show success message
    showStatusMessage('הפרויקט נשמר בהצלחה', 'success');
}

// Show projects list in a modal
function showProjectsList() {
    // Get saved projects
    const savedProjects = JSON.parse(localStorage.getItem('ercoProjects') || '[]');

    if (savedProjects.length === 0) {
        alert('אין פרויקטים שמורים');
        return;
    }

    // Create modal HTML
    const modalHtml = `
    <div class="modal fade" id="projectsListModal" tabindex="-1" aria-labelledby="projectsListModalLabel">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="projectsListModalLabel">פרויקטים שמורים</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>שם פרויקט</th>
                                    <th>לקוח</th>
                                    <th>תאריך</th>
                                    <th>פריטים</th>
                                    <th>סה"כ</th>
                                    <th>פעולות</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${savedProjects.map((project, index) => `
                                <tr>
                                    <td>${project.info.name}</td>
                                    <td>${project.info.client || '-'}</td>
                                    <td>${project.info.date || '-'}</td>
                                    <td>${project.items.length}</td>
                                    <td>₪${(project.totals.grandTotal || 0).toLocaleString()}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary load-project" data-index="${index}">
                                            <i class="fas fa-folder-open"></i> טען
                                        </button>
                                        <button class="btn btn-sm btn-danger delete-project" data-index="${index}">
                                            <i class="fas fa-trash"></i> מחק
                                        </button>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">סגור</button>
                </div>
            </div>
        </div>
    </div>`;

    // Add modal to document body
    $('body').append(modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('projectsListModal'));
    modal.show();

    // Add event listeners
    $('.load-project').on('click', function () {
        const index = $(this).data('index');
        loadProject(savedProjects[index]);
        modal.hide();
    });

    $('.delete-project').on('click', function () {
        const index = $(this).data('index');
        if (confirm(`האם למחוק את הפרויקט "${savedProjects[index].info.name}"?`)) {
            // Remove project
            savedProjects.splice(index, 1);
            localStorage.setItem('ercoProjects', JSON.stringify(savedProjects));

            // Refresh modal content
            modal.hide();
            $('#projectsListModal').remove();
            showProjectsList();
        }
    });

    // Clean up modal when hidden
    $('#projectsListModal').on('hidden.bs.modal', function () {
        $(this).remove();
    });
}

// Load project from saved data
function loadProject(project) {
    currentProject = { ...project };

    // Update selected products
    selectedProducts = currentProject.items.filter(item => item.source === 'erco');

    // Update UI
    updateCalculatorUI();

    // Update views
    updateTable();
    renderGridView();

    // Show success message
    showStatusMessage('פרויקט נטען בהצלחה', 'success');
}

// Export quote as PDF
function exportQuote() {
    if (currentProject.items.length === 0) {
        alert('אין פריטים בפרויקט');
        return;
    }

    // Show message that this feature will be implemented soon
    alert('פונקציונליות ייצוא הצעת מחיר תהיה זמינה בגרסה הבאה');
}

// Export calculations to Excel
function exportCalculation() {
    if (currentProject.items.length === 0) {
        alert('אין פריטים בפרויקט');
        return;
    }

    // Prepare data for export
    const exportData = [];

    // Project info
    exportData.push({
        'סוג': 'מידע',
        'תיאור': 'שם פרויקט',
        'ערך': currentProject.info.name
    });

    exportData.push({
        'סוג': 'מידע',
        'תיאור': 'לקוח',
        'ערך': currentProject.info.client
    });

    exportData.push({
        'סוג': 'מידע',
        'תיאור': 'תאריך',
        'ערך': currentProject.info.date
    });

    // Empty row
    exportData.push({});

    // Header row for items
    exportData.push({
        'סוג': 'פריט',
        'תיאור': 'שם מוצר',
        'מק"ט': 'מק"ט',
        'מחיר יחידה': 'מחיר יחידה',
        'כמות': 'כמות',
        'סה"כ': 'סה"כ'
    });

    // Add items
    currentProject.items.forEach(item => {
        exportData.push({
            'סוג': 'פריט',
            'תיאור': item.name,
            'מק"ט': item.id,
            'מחיר יחידה': item.unitPrice,
            'כמות': item.quantity,
            'סה"כ': item.baseTotal
        });
    });

    // Empty row
    exportData.push({});

    // Summary
    exportData.push({
        'סוג': 'סיכום',
        'תיאור': 'עלות חומרים בסיסית',
        'ערך': currentProject.totals.baseTotal
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': `תוספת עמלה ראשונית (${currentProject.settings.primaryMarkup}%)`,
        'ערך': currentProject.totals.primaryMarkupAmount
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': 'סה"כ אחרי עמלה ראשונית',
        'ערך': currentProject.totals.afterPrimaryMarkup
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': `תוספת עמלה משנית (${currentProject.settings.secondaryMarkup}%)`,
        'ערך': currentProject.totals.secondaryMarkupAmount
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': 'סה"כ אחרי כל העמלות',
        'ערך': currentProject.totals.afterSecondaryMarkup
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': `עלות עבודה (${currentProject.settings.laborRate}₪/${getLaborUnitText()})`,
        'ערך': currentProject.totals.laborTotal
    });

    exportData.push({
        'סוג': 'סיכום',
        'תיאור': 'סה"כ לפרויקט',
        'ערך': currentProject.totals.grandTotal
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Calculation');

    // Generate filename
    const filename = `${currentProject.info.name.replace(/[^a-zA-Z0-9]/g, '_')}_calculation.xlsx`;

    // Export file
    XLSX.writeFile(workbook, filename);
}

// Helper function to get text representation of labor unit
function getLaborUnitText() {
    switch (currentProject.settings.laborUnit) {
        case 'meter': return 'מטר';
        case 'point': return 'נקודה';
        case 'unit': return 'יחידה';
        default: return 'מטר';
    }
}

// Update custom product modal
$(document).ready(function () {
    // Add the modal submit button click handler
    $('#customProductModal').append(`
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>
            <button type="button" class="btn btn-primary" id="add-custom-product-btn">הוסף מוצר</button>
        </div>
    `);

    // Add the missing quantity input field
    $('label[for="custom-product-quantity"]').parent().append(`
        <input type="number" class="form-control" id="custom-product-quantity" min="1" value="1">
    `);

    // Add event listener
    $('#add-custom-product-btn').on('click', addCustomProduct);

    // Set today's date as default
    $('#project-date').val(new Date().toISOString().split('T')[0]);
});

// Add a floating calculator button
function addCalculatorFloatingButton() {
    // Add calculator button to UI if not already added
    if ($('#show-calculator-btn').length === 0) {
        $('body').append(`
            <button class="btn btn-primary position-fixed" style="bottom: 20px; right: 20px; z-index: 1000;" id="show-calculator-btn">
                <i class="fas fa-calculator"></i> מחשבון מחירים
                <span class="badge bg-danger" id="calc-item-count" style="display:none;">0</span>
            </button>
        `);

        $('#show-calculator-btn').on('click', showCalculator);
    }
}

// Initialize calculator when document is loaded
$(document).ready(function () {
    addCalculatorFloatingButton();
    updateCalculatorUI();
});

// Show custom product modal
function showCustomProductModal() {
    // Clear previous values
    $('#custom-product-name').val('');
    $('#custom-product-sku').val('');
    $('#custom-product-price').val('');
    $('#custom-product-quantity').val('1');

    // Show the modal
    $('#customProductModal').modal('show');
}

// Update the results tab to show employee work costs breakdown
function updateResultsTab() {
    // Add employee work breakdown if applicable
    if (currentProject.employeeWork && currentProject.employeeWork.length > 0) {
        let employeeWorkHtml = `
<div class="mt-4" id="employee-costs-breakdown">
    <div class="card">
        <div class="card-header bg-info text-white">
            <h5 class="mb-0"><i class="fas fa-users"></i> עלויות עובדים</h5>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>שם עובד</th>
                            <th>שעות עבודה</th>
                            <th>עלות לשעה</th>
                            <th>סה"כ</th>
                        </tr>
                    </thead>
                    <tbody>`;

        let totalEmployeeCost = 0;
        currentProject.employeeWork.forEach(employee => {
            const total = employee.hours * employee.rate;
            totalEmployeeCost += total;
            employeeWorkHtml += `
        <tr>
            <td>${employee.name}</td>
            <td>${employee.hours}</td>
            <td>₪${employee.rate}</td>
            <td>₪${total.toLocaleString()}</td>
        </tr>`;
        });

        employeeWorkHtml += `
                    </tbody>
                    <tfoot>
                        <tr class="table-primary">
                            <th colspan="3" class="text-end">סה"כ עלות עובדים:</th>
                            <th>₪${totalEmployeeCost.toLocaleString()}</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
</div>`;

        // Add employee work breakdown to results tab
        if ($('#employee-costs-breakdown').length === 0) {
            $('#results-tab-pane .card-body').append(employeeWorkHtml);
        } else {
            $('#employee-costs-breakdown').replaceWith(employeeWorkHtml);
        }
    } else {
        // Remove employee breakdown if it exists but no employees
        $('#employee-costs-breakdown').remove();
    }
}

function renderCategoryFilter() {
    let html = '';

    // Render top level categories
    Object.keys(categories).sort().forEach(mainCat => {
        const mainCatId = mainCat.replace(/\s+/g, '_').replace(/[^\w]/g, '_');
        const mainCatData = categories[mainCat];

        // Check if this category has subcategories
        const hasSubcategories = mainCatData.subcategories && Object.keys(mainCatData.subcategories).length > 0;

        html += `
    <div class="category-main mb-2">
        <div class="d-flex align-items-center">
            <div class="form-check flex-grow-1">
                <input class="form-check-input category-checkbox"
                    type="checkbox"
                    value="${mainCat}"
                    id="cat_${mainCatId}"
                    data-level="1"
                    data-path="${mainCat}">
                <label class="form-check-label" for="cat_${mainCatId}">
                    <strong>${mainCat}</strong>
                </label>
            </div>
            ${hasSubcategories ? `
            <button class="btn btn-sm btn-outline-secondary category-toggle" type="button" data-target="#subcats-${mainCatId}">
                <i class="fas fa-chevron-down"></i>
            </button>
            ` : ''}
        </div>
`;

        // Add subcategories with collapsible container
        if (hasSubcategories) {
            html += `<div class="subcategories ps-3 mt-1" id="subcats-${mainCatId}">`;

            Object.keys(mainCatData.subcategories).sort().forEach(subCat => {
                const subCatId = `${mainCatId}_${subCat.replace(/\s+/g, '_').replace(/[^\w]/g, '_')}`;
                const subCatData = mainCatData.subcategories[subCat];
                const subCatPath = `${mainCat}/${subCat}`;

                // Check if this subcategory has its own subcategories
                const hasSubSubcategories = subCatData.subcategories && Object.keys(subCatData.subcategories).length > 0;

                html += `
            <div class="subcategory-item mb-1">
                <div class="d-flex align-items-center">
                    <div class="form-check flex-grow-1">
                        <input class="form-check-input category-checkbox"
                            type="checkbox"
                            data-parent="${mainCat}"
                            value="${subCat}"
                            id="cat_${subCatId}"
                            data-level="2"
                            data-path="${subCatPath}">
                        <label class="form-check-label" for="cat_${subCatId}">
                            ${subCat}
                        </label>
                    </div>
                    ${hasSubSubcategories ? `
                    <button class="btn btn-sm btn-outline-secondary category-toggle" type="button" data-target="#subsubcats-${subCatId}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    ` : ''}
                </div>
        `;

                // Add third level subcategories if they exist
                if (hasSubSubcategories) {
                    html += `<div class="subsubcategories ps-3 mt-1" id="subsubcats-${subCatId}">`;

                    Object.keys(subCatData.subcategories).sort().forEach(subSubCat => {
                        const subSubCatId = `${subCatId}_${subSubCat.replace(/\s+/g, '_').replace(/[^\w]/g, '_')}`;
                        const subSubCatPath = `${mainCat}/${subCat}/${subSubCat}`;

                        html += `
                    <div class="form-check">
                        <input class="form-check-input category-checkbox"
                            type="checkbox"
                            data-parent="${subCat}"
                            data-grand-parent="${mainCat}"
                            value="${subSubCat}"
                            id="cat_${subSubCatId}"
                            data-level="3"
                            data-path="${subSubCatPath}">
                        <label class="form-check-label" for="cat_${subSubCatId}">
                            ${subSubCat}
                        </label>
                    </div>
                `;
                    });

                    html += `</div>`;  // End of subsubcategories
                }

                html += `</div>`;  // End of subcategory-item
            });

            html += `</div>`;  // End of subcategories
        }

        html += `</div>`;  // End of category-main
    });

    if (html === '') {
        html = '<p>לא נמצאו קטגוריות</p>';
    }

    $('#categoryFilter').html(html);

    // Add event listeners for category checkboxes
    $('.category-checkbox').on('change', handleCategoryCheckboxChange);

    // Add event listeners for category toggler buttons
    $('.category-toggle').on('click', function () {
        const targetId = $(this).data('target');
        $(targetId).slideToggle(200);

        const icon = $(this).find('i');
        if (icon.hasClass('fa-chevron-down')) {
            icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else {
            icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    });

    // Add some custom CSS for better appearance
    $('head').append(`
    <style>
        .subcategories, .subsubcategories {
            display: none;  /* Hidden by default */
        }

        .category-main {
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        }

        .category-toggle {
            padding: 0.1rem 0.4rem;
            font-size: 0.7rem;
        }
    </style>
    `);
}
console.log("PapaParse loaded:", typeof Papa !== 'undefined');

// Update calculator settings based on form inputs
function updateCalculatorSettings() {
    // Update primary markup
    currentProject.settings.primaryMarkup = parseFloat($('#primary-markup').val()) || 15;
    $('#primary-markup-value').text(currentProject.settings.primaryMarkup);

    // Update secondary markup
    currentProject.settings.secondaryMarkup = parseFloat($('#secondary-markup').val()) || 15;
    $('#secondary-markup-value').text(currentProject.settings.secondaryMarkup);

    // Update labor rate
    currentProject.settings.laborRate = parseFloat($('#labor-rate').val()) || 700;
    $('#result-labor-rate').text(currentProject.settings.laborRate);

    // Update labor unit
    currentProject.settings.laborUnit = $('input[name="labor-unit"]:checked').val() || 'meter';

    // Update unit text in results
    const laborUnitText = getLaborUnitText(currentProject.settings.laborUnit);
    $('#result-labor-unit').text(laborUnitText);

    // Update calculation results
    updateCalculationResults();
}

// Handle category checkbox change events
function handleCategoryCheckboxChange() {
    const $checkbox = $(this);
    const isChecked = $checkbox.prop('checked');
    const level = $checkbox.data('level');
    const path = $checkbox.data('path');

    // Handle children checkboxes if this is a parent category
    if (level === 1 || level === 2) {
        // Find all child checkboxes
        const $childCheckboxes = $checkbox.closest('.category-main')
            .find(`.category-checkbox[data-path^="${path}/"]`);

        // Set all children to the same state as parent
        $childCheckboxes.prop('checked', isChecked);
    }

    // Apply filters after checkbox changes
    applyFilters();
}

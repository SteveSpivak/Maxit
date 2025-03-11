// Auto-loader for CSV and JSON data

// Default file paths
const DEFAULT_PRODUCTS_CSV = 'data/products.csv';
const DEFAULT_CATEGORIES_JSON = 'data/categories.json';

// Auto-load function that runs on page load
function autoLoadData() {
    console.log("Auto-loading data on page initialization");
    $('#loadingSpinner').show();
    showStatusMessage('טוען נתונים אוטומטית, אנא המתן...', 'info');

    // Update UI to show which files are being loaded
    $('#defaultCsvName').text(DEFAULT_PRODUCTS_CSV.split('/').pop());
    $('#defaultCategoriesName').text(DEFAULT_CATEGORIES_JSON.split('/').pop());

    // First try to load the products CSV
    window.dataLoaderAPI.loadCSVData(DEFAULT_PRODUCTS_CSV, false)
        .then(data => {
            console.log("Successfully loaded products data:", data.length, "products");

            // Store the data
            allProducts = data;
            filteredProducts = [...allProducts];

            // Now try to load the categories JSON
            return window.dataLoaderAPI.loadJSONData(DEFAULT_CATEGORIES_JSON, false)
                .then(jsonData => {
                    console.log("Successfully loaded categories data");
                    categories = window.dataLoaderAPI.processNestedCategoriesObject(jsonData);
                    renderCategoryFilter();
                })
                .catch(error => {
                    console.warn("Failed to load categories JSON, extracting from products:", error);
                    extractCategoriesFromProducts();
                });
        })
        .then(() => {
            // Complete the data loading process
            const shouldFetchLivePrices = false; // Default to not fetch prices automatically
            window.dataLoaderAPI.completeDataLoad(shouldFetchLivePrices);
        })
        .catch(error => {
            console.error("Auto-loading failed:", error);
            showStatusMessage('טעינה אוטומטית נכשלה. אנא טען קובץ באופן ידני.', 'warning');
            $('#loadingSpinner').hide();
        });
}

// Reset data and reload
function resetData() {
    console.log("Resetting and reloading data");

    // Clear any selected files
    $('#csvFile').val('');
    $('#categoriesFile').val('');

    // Reset checkboxes
    $('#fetchLivePrices').prop('checked', false);

    // Reload data
    autoLoadData();
}

// Wait for document to be ready, then auto-load
$(document).ready(function() {
    console.log("Document ready, initializing auto-loader");

    // Add reset button handler
    $('#resetDataBtn').on('click', resetData);

    // Start auto-loading after a short delay to allow UI to render
    setTimeout(autoLoadData, 500);
});

/**
 * Auto-loader script that runs after all other scripts are loaded
 * to ensure proper initialization of components
 */

$(document).ready(function() {
    // Make sure currentProject is initialized
    if (!currentProject) {
        initializeCurrentProject();
    }

    // Show calculator button
    addCalculatorFloatingButton();

    // Set up calculator event handlers
    setupCalculatorEventHandlers();

    // Handle click on the "Add to Calculator" buttons
    $('.add-to-calc').off('click').on('click', function() {
        const index = $(this).data('index');
        addProductToSelection(filteredProducts[index]);
        showCalculator();
    });

    // Handle click on product checkboxes
    $('.product-select').off('click').on('click', function() {
        const sku = $(this).data('sku');
        const product = filteredProducts.find(p => p.sku === sku);

        if (this.checked) {
            addProductToSelection(product);
        } else {
            removeProductFromSelection(product);
        }
    });

    console.log('Auto-loader initialized successfully');
});

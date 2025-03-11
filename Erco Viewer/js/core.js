// Core application functionality

// Global variables
let allProducts = [];
let filteredProducts = [];
let selectedProducts = [];
let categories = {};
let currentView = 'table';
let currentProject = null;

// Initialize the application
$(document).ready(function () {
    console.log('Core application initializing...');

    // Load data automatically on startup
    loadCSVData();
    loadCategoriesData();

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

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log('Core application initialized successfully');
});

// Show status message
function showStatusMessage(message, type = 'info') {
    const statusElement = $('#statusMessage');
    statusElement.removeClass('alert-info alert-success alert-warning alert-danger')
        .addClass('alert-' + type)
        .html(message)
        .fadeIn();
}

// Toggle between table and grid views
function toggleView(viewType) {
    currentView = viewType;
    $('.view-container').hide();
    $(`#${viewType}View`).show();
    $('.btn-toggle-view').removeClass('active');
    $(`.btn-toggle-view[data-view="${viewType}"]`).addClass('active');
}

// Check if JavaScript libraries are available
function checkDependencies() {
    const dependencies = [
        { name: 'jQuery', check: typeof $ !== 'undefined' },
        { name: 'Papa Parse', check: typeof Papa !== 'undefined' },
        { name: 'DataTables', check: typeof $.fn.DataTable !== 'undefined' },
        { name: 'Bootstrap', check: typeof bootstrap !== 'undefined' },
        { name: 'SheetJS', check: typeof XLSX !== 'undefined' }
    ];

    const missingDeps = dependencies.filter(dep => !dep.check);
    if (missingDeps.length > 0) {
        console.error('Missing dependencies:', missingDeps.map(d => d.name).join(', '));
        showStatusMessage('חסרות ספריות JavaScript: ' + missingDeps.map(d => d.name).join(', '), 'danger');
        return false;
    }

    return true;
}

// Debug helper
window.debugApp = function () {
    console.log('===== APPLICATION DEBUG INFO =====');
    console.log('Current products:', allProducts.length);
    console.log('Filtered products:', filteredProducts.length);
    console.log('Selected products:', selectedProducts.length);
    console.log('Categories:', categories);
    console.log('Current view:', currentView);
    console.log('Current project:', currentProject);
    console.log('================================');
};

// Load CSV data from a fixed path
function loadCSVData() {
    console.log('Loading product data from CSV file...');

    // For local development (avoiding CORS issues)
    if (window.location.protocol === 'file:') {
        // Create a file input element programmatically
        const input = document.createElement('input');
        input.type = 'file';

        // Try to load the CSV file using the input
        const filePath = 'data/all_products.csv';
        console.log(`Attempting to load ${filePath}`);

        // Since we can't directly access the file system due to browser security,
        // use Papa Parse directly on the file content in a manual load approach
        if (typeof Papa !== 'undefined') {
            // Try to parse the file contents directly
            $.ajax({
                url: filePath,
                dataType: 'text',
                cache: false,
                success: function(csvText) {
                    processCSVData(csvText);
                    showStatusMessage('Product data loaded successfully', 'success');
                },
                error: function(err) {
                    console.error('Error loading CSV file:', err);
                    showStatusMessage('Could not load product data automatically due to browser security restrictions. Please use the "Load Data" button to select the file manually.', 'warning');

                    // Show the file input button as a fallback
                    $('#loadDataContainer').show();
                }
            });
        } else {
            console.error('Papa Parse library not found');
            showStatusMessage('CSV parsing library not loaded. Please check your internet connection.', 'danger');
        }
    } else {
        // Normal fetch approach for server environments
        fetch('data/all_products.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                // Process the CSV data
                processCSVData(csvText);
                showStatusMessage('Product data loaded successfully', 'success');
            })
            .catch(error => {
                console.error('Error loading CSV data:', error);
                showStatusMessage('Error loading product data. Please try again.', 'danger');
                // Show the file input button as a fallback
                $('#loadDataContainer').show();
            });
    }
}

// Process CSV data and populate the products array
function processCSVData(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]);

    allProducts = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = parseCSVLine(lines[i]);
        const product = {};

        headers.forEach((header, index) => {
            product[header] = values[index] || '';
        });

        allProducts.push(product);
    }

    filteredProducts = [...allProducts];
    console.log(`Processed ${allProducts.length} products`);

    // Update UI with products
    updateProductDisplay();
}

// Helper function to parse CSV lines correctly (handling quoted values)
function parseCSVLine(line) {
    const result = [];
    let startPos = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
            result.push(line.substring(startPos, i).replace(/^"|"$/g, '').replace(/""/g, '"'));
            startPos = i + 1;
        }
    }

    // Add the last field
    result.push(line.substring(startPos).replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
}

// Load categories data from JSON file
function loadCategoriesData() {
    console.log('Loading categories data from JSON file...');

    // For local development (avoiding CORS issues)
    if (window.location.protocol === 'file:') {
        $.ajax({
            url: 'categories.json',
            dataType: 'json',
            cache: false,
            success: function(data) {
                categories = data;
                console.log('Categories data loaded successfully');
                processCategoriesForDisplay();
            },
            error: function(err) {
                console.error('Error loading categories data:', err);
                showStatusMessage('Could not load categories data. Using default categories.', 'warning');
                // Use empty categories as fallback
                categories = {};
                processCategoriesForDisplay();
            }
        });
    } else {
        // Normal fetch approach for server environments
        fetch('categories.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                categories = data;
                console.log('Categories data loaded successfully');
                processCategoriesForDisplay();
            })
            .catch(error => {
                console.error('Error loading categories data:', error);
                showStatusMessage('Error loading categories data.', 'danger');
                // Use empty categories as fallback
                categories = {};
                processCategoriesForDisplay();
            });
    }
}

// Process categories for display in filters, etc.
function processCategoriesForDisplay() {
    // Here you would implement UI updates based on the categories
    console.log('Processing categories for display');

    // Example: Populate category filter dropdown
    const categorySelect = $('#categoryFilter');
    if (categorySelect.length) {
        categorySelect.empty();
        categorySelect.append('<option value="">All Categories</option>');

        for (const category in categories) {
            categorySelect.append(`<option value="${category}">${category}</option>`);
        }
    }
}

// Update product display based on the current filtered products
function updateProductDisplay() {
    console.log('Updating product display with', filteredProducts.length, 'products');

    // Implementation depends on the existing UI structure
    // For example:
    const productContainer = $('#productContainer');
    if (productContainer.length) {
        if (currentView === 'table') {
            updateTableView(productContainer);
        } else {
            updateGridView(productContainer);
        }
    }
}

// Load CSV from user-selected file
function loadCSVFromFile() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (file) {
        // Use Papa Parse for reliable CSV parsing
        if (typeof Papa !== 'undefined') {
            Papa.parse(file, {
                header: true,
                complete: function(results) {
                    if (results.data && results.data.length > 0) {
                        allProducts = results.data;
                        filteredProducts = [...allProducts];
                        console.log(`Processed ${allProducts.length} products using Papa Parse`);
                        updateProductDisplay();
                        showStatusMessage('CSV file loaded successfully', 'success');
                    } else {
                        console.error('No data found in CSV file or parsing error');
                        showStatusMessage('Error: File contains no data or is not valid CSV', 'danger');
                    }
                },
                error: function(error) {
                    console.error('Papa Parse error:', error);
                    showStatusMessage('Error parsing CSV file', 'danger');
                }
            });
        } else {
            // Fallback to the original method if Papa Parse is not available
            const reader = new FileReader();
            reader.onload = function(e) {
                const csvText = e.target.result;
                processCSVData(csvText);
                showStatusMessage('CSV file loaded successfully', 'success');
            };
            reader.onerror = function() {
                showStatusMessage('Error reading file', 'danger');
            };
            reader.readAsText(file);
        }
    } else {
        showStatusMessage('Please select a CSV file', 'warning');
    }
}

// Function stubs for other functionality
function applySearch() {
    // Implementation needed
    console.log('Search applied');
}

function clearAllFilters() {
    // Implementation needed
    console.log('Filters cleared');
}

function applyPriceFilter() {
    // Implementation needed
    console.log('Price filter applied');
}

function exportToCSV() {
    // Implementation needed
    console.log('Export to CSV');
}

function exportToExcel() {
    // Implementation needed
    console.log('Export to Excel');
}

function updateTableView(container) {
    // Implementation needed
    console.log('Updating table view');
}

function updateGridView(container) {
    // Implementation needed
    console.log('Updating grid view');
}

function toggleView(view) {
    currentView = view;
    updateProductDisplay();
    console.log('View toggled to:', view);
}

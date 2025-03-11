// Functions for loading CSV data and processing categories

// Load CSV data from file or URL
function loadCSVData(source, isFile = true) {
    return new Promise((resolve, reject) => {
        console.log("Loading CSV data", isFile ? "from file" : "from URL", source);

        if (isFile) {
            // Source is a File object
            Papa.parse(source, {
                header: true,
                encoding: 'UTF-8',
                skipEmptyLines: true,
                complete: function (results) {
                    console.log("CSV parsing complete:", results.data.length, "products loaded");
                    resolve(results.data);
                },
                error: function (error) {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                }
            });
        } else {
            // Source is a URL string
            $.ajax({
                url: source,
                dataType: 'text',
                success: function(data) {
                    Papa.parse(data, {
                        header: true,
                        encoding: 'UTF-8',
                        skipEmptyLines: true,
                        complete: function (results) {
                            console.log("CSV parsing complete:", results.data.length, "products loaded");
                            resolve(results.data);
                        },
                        error: function (error) {
                            console.error('Error parsing CSV from URL:', error);
                            reject(error);
                        }
                    });
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching CSV from URL:", error);
                    reject(error);
                }
            });
        }
    });
}

// Load JSON data from file or URL
function loadJSONData(source, isFile = true) {
    return new Promise((resolve, reject) => {
        console.log("Loading JSON data", isFile ? "from file" : "from URL", source);

        if (isFile) {
            // Source is a File object
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const jsonData = JSON.parse(event.target.result);
                    console.log("JSON data loaded successfully");
                    resolve(jsonData);
                } catch (error) {
                    console.error("Error parsing JSON data:", error);
                    reject(error);
                }
            };
            reader.onerror = function() {
                console.error("Error reading JSON file");
                reject(new Error("Error reading JSON file"));
            };
            reader.readAsText(source);
        } else {
            // Source is a URL string
            $.ajax({
                url: source,
                dataType: 'json',
                success: function(data) {
                    console.log("JSON data loaded successfully from URL");
                    resolve(data);
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching JSON from URL:", error);
                    reject(error);
                }
            });
        }
    });
}

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
    showStatusMessage('טוען נתונים, אנא המתן...', 'info');

    // Process the CSV file
    loadCSVData(csvFile)
        .then(data => {
            // Store the data
            allProducts = data;
            filteredProducts = [...allProducts];

            if (categoriesFile) {
                const fileExt = categoriesFile.name.split('.').pop().toLowerCase();

                if (fileExt === 'json') {
                    return loadJSONData(categoriesFile)
                        .then(jsonData => {
                            categories = processNestedCategoriesObject(jsonData);
                            renderCategoryFilter();
                            return true;
                        });
                } else {
                    return loadCSVData(categoriesFile)
                        .then(catData => {
                            buildCategoryHierarchy(catData);
                            return true;
                        });
                }
            } else {
                // Extract categories from products if no categories file
                extractCategoriesFromProducts();
                return true;
            }
        })
        .then(() => {
            // Complete the data loading process
            completeDataLoad(shouldFetchLivePrices);
        })
        .catch(error => {
            console.error('Error in data loading process:', error);
            showStatusMessage('שגיאה בטעינת הנתונים: ' + error.message, 'danger');
            $('#loadingSpinner').hide();
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
    console.log("Processing nested categories object");

    try {
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

        console.log("Processed categories structure:", Object.keys(result).length, "main categories");
        return result;
    } catch (error) {
        console.error("Error processing nested categories:", error);
        showStatusMessage('שגיאה בעיבוד מבנה הקטגוריות', 'warning');
        return {}; // Return empty object to prevent further errors
    }
}

// Complete data loading process
function completeDataLoad(shouldFetchLivePrices) {
    console.log("Completing data load process, fetch prices:", shouldFetchLivePrices);

    try {
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
            fetchLivePricesFromAPI();
        } else {
            // Hide loading spinner
            $('#loadingSpinner').hide();
            showStatusMessage('נטענו ' + allProducts.length + ' מוצרים בהצלחה', 'success');
        }
    } catch (error) {
        console.error("Error completing data load:", error);
        $('#loadingSpinner').hide();
        showStatusMessage('שגיאה בעיבוד הנתונים: ' + error.message, 'danger');
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

// Export these functions for use in auto-loader
window.dataLoaderAPI = {
    loadCSVData,
    loadJSONData,
    processNestedCategoriesObject,
    completeDataLoad
};

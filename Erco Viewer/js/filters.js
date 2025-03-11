// Functions for filtering products

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

// Render category filter UI
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

// Calculator functionality for the Erco Viewer application

// Show the calculator panel - make it globally available
window.showCalculator = function() {
    // Make sure currentProject is initialized
    if (!currentProject) {
        initializeCurrentProject();
    }

    // Initialize the calculator UI with current project data
    updateCalculatorUI();

    // Show the panel as a modal instead of offcanvas
    const calculatorPanel = document.getElementById('calculatorPanel');
    if (calculatorPanel) {
        const calculatorModal = new bootstrap.Modal(calculatorPanel);
        calculatorModal.show();
    }
};

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

// Add custom product to calculator
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

// Set up calculator event handlers
function setupCalculatorEventHandlers() {
    // Handler for adding custom product
    $('#add-custom-product-btn').off('click').on('click', addCustomProduct);

    // Handler for clearing calculator
    $('#clear-calculator-btn').off('click').on('click', clearCalculator);

    // Handlers for markup changes
    $('#primary-markup, #primary-markup-range').off('input').on('input', function() {
        const value = $(this).val();
        $('#primary-markup, #primary-markup-range').val(value);
        $('#primary-markup-value').text(value);
        currentProject.settings.primaryMarkup = parseFloat(value);
        updateCalculationResults();
    });

    $('#secondary-markup, #secondary-markup-range').off('input').on('input', function() {
        const value = $(this).val();
        $('#secondary-markup, #secondary-markup-range').val(value);
        $('#secondary-markup-value').text(value);
        currentProject.settings.secondaryMarkup = parseFloat(value);
        updateCalculationResults();
    });

    // Handler for labor rate changes
    $('#labor-rate').off('input').on('input', function() {
        currentProject.settings.laborRate = parseFloat($(this).val()) || 700;
        updateCalculationResults();
    });

    // Handler for labor unit changes
    $('input[name="labor-unit"]').off('change').on('change', function() {
        currentProject.settings.laborUnit = $(this).val();
        updateCalculationResults();
    });
}

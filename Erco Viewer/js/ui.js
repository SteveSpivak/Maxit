// UI-related functions

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

// Render grid view
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
                ${product.priceLastUpdated ?
                `<p class="mb-3"><small class="text-muted">מחיר עודכן: ${new Date(product.priceLastUpdated).toLocaleString()}</small></p>` : ''}
                <div class="text-center">
                    <button class="btn btn-sm btn-primary grid-view-details" data-index="${filteredProducts.indexOf(product)}">
                        <i class="fas fa-search"></i> פרטים נוספים
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

// Add a floating button to show calculator
function addCalculatorFloatingButton() {
    // Add calculator button to UI if not already added
    if ($('#show-calculator-btn').length === 0) {
        $('body').append(`
            <div class="calculator-floating-container">
                <button class="btn calculator-float-btn" id="show-calculator-btn">
                    <div class="calculator-btn-content">
                        <div class="calculator-icon">
                            <i class="fas fa-calculator"></i>
                        </div>
                        <div class="calculator-text">
                            <span>מחשבון מחירים</span>
                            <span class="badge bg-danger ms-1" id="calc-item-count">0</span>
                        </div>
                    </div>
                </button>
            </div>
        `);

        $('#show-calculator-btn').on('click', showCalculator);

        // Initialize notification badge
        updateCalculatorBadge();
    }
}

// Update the calculator button badge
function updateCalculatorBadge() {
    const count = selectedProducts.length;
    const $badge = $('#calc-item-count');

    if (count > 0) {
        $badge.text(count).show();
    } else {
        $badge.hide();
    }
}

// Show calculator modal
function showCalculator() {
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
}

// Setup calculator UI components
function setupCalculatorUI() {
    // Products tab event handlers
    $('#clear-calculator-btn').on('click', function() {
        if (confirm('האם אתה בטוח שברצונך לנקות את כל המוצרים מהמחשבון?')) {
            selectedProducts = [];
            updateCalculatorProducts();
            updateCalculatorBadge();
        }
    });

    $('#add-more-products-btn').on('click', function() {
        // Close the calculator and focus on the search
        const calculatorPanel = document.getElementById('calculatorPanel');
        if (calculatorPanel) {
            const calculator = bootstrap.Offcanvas.getInstance(calculatorPanel);
            if (calculator) calculator.hide();
        }
        $('#searchBox').focus();
    });

    // Work tab event handlers
    $('#add-work-unit-btn').on('click', showWorkUnitModal);
    $('#manage-employees-btn, #add-first-employee-btn').on('click', showEmployeeWorkModal);

    // Work unit modal handlers
    $('#work-unit-type').on('change', function() {
        if ($(this).val() === 'custom') {
            $('#custom-unit-container').show();
        } else {
            $('#custom-unit-container').hide();
        }
    });

    $('#add-work-unit-confirm').on('click', addWorkUnit);

    // Markup sliders
    $('#primary-markup-range').on('input', function() {
        const value = $(this).val();
        $('#primary-markup').val(value);
        $('#primary-markup-value').text(value);
        updateCalculationResults();
    });

    $('#secondary-markup-range').on('input', function() {
        const value = $(this).val();
        $('#secondary-markup').val(value);
        $('#secondary-markup-value').text(value);
        updateCalculationResults();
    });

    $('#primary-markup').on('change', function() {
        const value = $(this).val();
        $('#primary-markup-range').val(value);
        $('#primary-markup-value').text(value);
        updateCalculationResults();
    });

    $('#secondary-markup').on('change', function() {
        const value = $(this).val();
        $('#secondary-markup-range').val(value);
        $('#secondary-markup-value').text(value);
        updateCalculationResults();
    });

    // Project management
    $('#save-project-btn').on('click', saveProject);
    $('#load-project-btn').on('click', loadProject);
    $('#export-project-btn').on('click', exportProject);
    $('#import-project-btn').on('click', importProject);

    // Export results
    $('#export-quote-btn').on('click', exportQuote);
    $('#export-calc-btn').on('click', exportCalculation);

    // Custom product
    $('#add-custom-product-btn').on('click', addCustomProduct);
}

// Update calculator UI
function updateCalculatorUI() {
    updateCalculatorProducts();
    updateWorkUnitsTable();
    updateEmployeesTable();
    updateCalculationResults();
}

// Update calculator products table
function updateCalculatorProducts() {
    const $table = $('#calculator-products tbody');
    let html = '';
    let subtotal = 0;

    if (selectedProducts && selectedProducts.length > 0) {
        selectedProducts.forEach((product, index) => {
            const total = product.price * product.quantity;
            subtotal += total;
            html += `
            <tr data-sku="${product.sku}">
                <td class="text-truncate" title="${product.name}">${product.name}</td>
                <td>${product.sku || '-'}</td>
                <td>₪${parseFloat(product.price).toLocaleString()}</td>
                <td>
                    <input type="number" class="form-control form-control-sm product-quantity"
                        data-index="${index}" value="${product.quantity}" min="1" style="width: 70px;">
                </td>
                <td>₪${total.toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger remove-product" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    } else {
        html = `
        <tr class="text-center text-muted">
            <td colspan="6" class="py-3">
                <i class="fas fa-shopping-cart fa-2x mb-2"></i>
                <p>אין מוצרים במחשבון</p>
                <small>הוסף מוצרים מהקטלוג או צור מוצר מותאם אישית</small>
            </td>
        </tr>`;
    }

    $table.html(html);
    $('#products-subtotal').text(`₪${subtotal.toLocaleString()}`);
    $('#selected-count').text(selectedProducts.length);

    // Add event handlers
    $('.product-quantity').on('change', function() {
        const index = $(this).data('index');
        const newQuantity = parseInt($(this).val()) || 1;

        if (newQuantity < 1) $(this).val(1);

        // Update product quantity
        selectedProducts[index].quantity = newQuantity;

        // Update total
        const total = selectedProducts[index].price * newQuantity;
        $(this).closest('tr').find('td:nth-child(5)').text(`₪${total.toLocaleString()}`);

        // Update subtotal
        updateCalculationResults();
    });

    $('.remove-product').on('click', function() {
        const index = $(this).data('index');
        selectedProducts.splice(index, 1);
        updateCalculatorProducts();
        updateCalculatorBadge();
        updateCalculationResults();
    });
}

// Show work unit modal
function showWorkUnitModal(editIndex = null) {
    // Reset form
    $('#work-description').val('');
    $('#work-unit-type').val('meter');
    $('#custom-unit-name').val('');
    $('#work-price').val('');
    $('#work-quantity').val('1');
    $('#custom-unit-container').hide();

    // If editing an existing unit
    if (editIndex !== null && currentProject.workUnits && currentProject.workUnits[editIndex]) {
        const unit = currentProject.workUnits[editIndex];
        $('#work-description').val(unit.description);
        $('#work-unit-type').val(unit.unitType);
        $('#work-price').val(unit.price);
        $('#work-quantity').val(unit.quantity);

        if (unit.unitType === 'custom') {
            $('#custom-unit-container').show();
            $('#custom-unit-name').val(unit.unitName);
        }

        // Change button to update
        $('#add-work-unit-confirm').text('עדכן').data('edit-index', editIndex);
    } else {
        // Reset button to add
        $('#add-work-unit-confirm').text('הוסף').removeData('edit-index');
    }

    // Show the modal
    $('#workUnitModal').modal('show');
}

// Add or update work unit
function addWorkUnit() {
    const description = $('#work-description').val().trim();
    const unitType = $('#work-unit-type').val();
    let unitName = '';

    switch(unitType) {
        case 'meter': unitName = 'מטר'; break;
        case 'point': unitName = 'נקודה'; break;
        case 'unit': unitName = 'יחידה'; break;
        case 'hour': unitName = 'שעה'; break;
        case 'day': unitName = 'יום עבודה'; break;
        case 'area': unitName = 'מ"ר'; break;
        case 'custom': unitName = $('#custom-unit-name').val().trim() || 'יחידה מותאמת'; break;
    }

    const price = parseFloat($('#work-price').val()) || 0;
    const quantity = parseFloat($('#work-quantity').val()) || 0;
    const total = price * quantity;

    if (!description || price <= 0 || quantity <= 0) {
        alert('יש למלא את כל השדות הנדרשים');
        return;
    }

    // Initialize work units array if it doesn't exist
    if (!currentProject.workUnits) {
        currentProject.workUnits = [];
    }

    const workUnit = {
        id: `work-${Date.now()}`,
        description,
        unitType,
        unitName,
        price,
        quantity,
        total
    };

    // Check if editing or adding
    const editIndex = $('#add-work-unit-confirm').data('edit-index');
    if (editIndex !== undefined) {
        currentProject.workUnits[editIndex] = workUnit;
    } else {
        currentProject.workUnits.push(workUnit);
    }

    // Update UI
    updateWorkUnitsTable();
    updateCalculationResults();

    // Close the modal
    $('#workUnitModal').modal('hide');
}

// Update work units table
function updateWorkUnitsTable() {
    const $table = $('#work-units-table tbody');
    let html = '';
    let subtotal = 0;

    if (currentProject.workUnits && currentProject.workUnits.length > 0) {
        currentProject.workUnits.forEach((unit, index) => {
            subtotal += unit.total;
            html += `
            <tr data-id="${unit.id}">
                <td>${unit.description}</td>
                <td>${unit.unitName}</td>
                <td>₪${unit.price.toLocaleString()}</td>
                <td>${unit.quantity}</td>
                <td>₪${unit.total.toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-work-unit" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-work-unit" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    } else {
        html = `
        <tr class="text-center text-muted">
            <td colspan="6" class="py-3">
                <i class="fas fa-tools fa-2x mb-2"></i>
                <p>לא נוספו יחידות עבודה</p>
                <small>הוסף יחידות עבודה כדי לכלול עלויות התקנה והתאמה בהצעת המחיר</small>
            </td>
        </tr>`;
    }

    $table.html(html);
    $('#work-subtotal').text(`₪${subtotal.toLocaleString()}`);

    // Event handlers
    $('.edit-work-unit').on('click', function() {
        const index = $(this).data('index');
        showWorkUnitModal(index);
    });

    $('.delete-work-unit').on('click', function() {
        const index = $(this).data('index');
        if (confirm('האם אתה בטוח שברצונך למחוק את יחידת העבודה הזו?')) {
            currentProject.workUnits.splice(index, 1);
            updateWorkUnitsTable();
            updateCalculationResults();
        }
    });
}

// Update employees table (abbreviated version)
function updateEmployeesTable() {
    const $table = $('#employees-table tbody');
    let html = '';
    let subtotal = 0;

    if (currentProject.employeeWork && currentProject.employeeWork.length > 0) {
        currentProject.employeeWork.forEach(employee => {
            const total = employee.hours * employee.rate;
            subtotal += total;
            html += `
            <tr>
                <td>${employee.name}</td>
                <td>${employee.hours}</td>
                <td>₪${employee.rate.toLocaleString()}</td>
                <td>₪${total.toLocaleString()}</td>
            </tr>`;
        });
    } else {
        html = `
        <tr class="text-center text-muted">
            <td colspan="4" class="py-3">
                <i class="fas fa-user-plus fa-2x mb-2"></i>
                <p>לא נוספו עובדים כרגע</p>
                <button class="btn btn-sm btn-outline-primary" id="add-first-employee-btn">
                    הוסף עובד
                </button>
            </td>
        </tr>`;
    }

    $table.html(html);
    $('#employees-subtotal').text(`₪${subtotal.toLocaleString()}`);
}

// Update calculation results
function updateCalculationResults() {
    // Calculate products total
    const productsTotal = selectedProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
    }, 0);

    // Calculate work units total
    const workTotal = currentProject.workUnits ? currentProject.workUnits.reduce((sum, unit) => {
        return sum + unit.total;
    }, 0) : 0;

    // Calculate employee costs
    const employeesTotal = currentProject.employeeWork ? currentProject.employeeWork.reduce((sum, employee) => {
        return sum + (employee.hours * employee.rate);
    }, 0) : 0;

    // Base total is sum of products, work and employees
    const baseTotal = productsTotal + workTotal + employeesTotal;

    // Get markup percentages
    const primaryMarkup = parseFloat($('#primary-markup').val()) || 0;
    const secondaryMarkup = parseFloat($('#secondary-markup').val()) || 0;

    // Calculate markup amounts
    const primaryMarkupAmount = baseTotal * (primaryMarkup / 100);
    const afterPrimary = baseTotal + primaryMarkupAmount;
    const secondaryMarkupAmount = afterPrimary * (secondaryMarkup / 100);
    const grandTotal = afterPrimary + secondaryMarkupAmount;

    // Update UI
    $('#result-products-total').text(`₪${productsTotal.toLocaleString()}`);
    $('#result-work-total').text(`₪${workTotal.toLocaleString()}`);
    $('#result-employee-total').text(`₪${employeesTotal.toLocaleString()}`);
    $('#result-base-total').text(`₪${baseTotal.toLocaleString()}`);

    $('#result-primary-markup-percent').text(primaryMarkup);
    $('#result-primary-markup').text(`₪${primaryMarkupAmount.toLocaleString()}`);
    $('#result-after-primary').text(`₪${afterPrimary.toLocaleString()}`);

    $('#result-secondary-markup-percent').text(secondaryMarkup);
    $('#result-secondary-markup').text(`₪${secondaryMarkupAmount.toLocaleString()}`);
    $('#result-grand-total').text(`₪${grandTotal.toLocaleString()}`);
}

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

// Add custom product to selection
function addCustomProduct() {
    const name = $('#custom-product-name').val().trim();
    let sku = $('#custom-product-sku').val().trim();
    const price = parseFloat($('#custom-product-price').val()) || 0;
    const quantity = parseInt($('#custom-product-quantity').val()) || 1;

    if (!name || price <= 0) {
        alert('יש למלא את שם המוצר ומחיר');
        return;
    }

    // Generate SKU if not provided
    if (!sku) {
        sku = 'CUSTOM-' + Date.now().toString().substr(-6);
    }

    // Create custom product
    const customProduct = {
        name: name,
        sku: sku,
        price: price,
        quantity: quantity,
        isCustom: true
    };

    // Add to selected products
    addProductToSelection(customProduct);

    // Close the modal
    $('#customProductModal').modal('hide');

    // Show calculator if not already shown
    showCalculator();
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

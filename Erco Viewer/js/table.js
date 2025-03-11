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

// Update the data table
function updateTable() {
    if (dataTable) {
        dataTable.clear();
        dataTable.rows.add(filteredProducts);
        dataTable.draw();
    }
}

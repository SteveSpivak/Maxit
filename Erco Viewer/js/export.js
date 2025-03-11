// Export functionality for the Erco Viewer application

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

// Export quote as PDF - Enhanced version
function exportQuote() {
    if (currentProject.items.length === 0) {
        alert('אין פריטים בפרויקט');
        return;
    }

    // This is a placeholder for future implementation
    // In a real implementation, we would use a library like jsPDF to generate a PDF

    try {
        // Show message that this feature will be implemented soon
        alert('פונקציונליות ייצוא הצעת מחיר תהיה זמינה בגרסה הבאה');

        // Log for debugging
        console.log('Quote export requested for project:', currentProject.info.name);
        console.log('Project contains', currentProject.items.length, 'items');
    } catch (error) {
        console.error('Error during quote export:', error);
        showStatusMessage('שגיאה בייצוא הצעת המחיר', 'danger');
    }
}

// Export calculations to Excel
function exportCalculation() {
    if (currentProject.items.length === 0) {
        alert('אין פריטים בפרויקט');
        return;
    }

    try {
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
            'תיאור': `עלות עבודה (${currentProject.settings.laborRate}₪/${getLaborUnitText(currentProject.settings.laborUnit)})`,
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

        showStatusMessage('הקובץ יוצא בהצלחה', 'success');
    } catch (error) {
        console.error('Error exporting calculation:', error);
        showStatusMessage('שגיאה בייצוא החישובים', 'danger');
    }
}

// Export product list with images for catalog
function exportProductCatalog() {
    if (filteredProducts.length === 0) {
        showStatusMessage('אין מוצרים לייצוא', 'warning');
        return;
    }

    try {
        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Prepare data for export - simplified version without images
        const catalogData = filteredProducts.map(product => ({
            'שם מוצר': product.name || '',
            'מק"ט': product.sku || '',
            'מותג': product.brand || '',
            'מחיר': product.price ? '₪' + parseFloat(product.price).toLocaleString() : '',
            'קטגוריה': product.categories || '',
            'קישור לתמונה': product.image_paths ? product.image_paths.split(';')[0] : ''
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(catalogData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Catalog');

        // Export file
        XLSX.writeFile(workbook, 'erco_product_catalog.xlsx');

        showStatusMessage(`יוצאו ${filteredProducts.length} מוצרים בהצלחה`, 'success');
    } catch (error) {
        console.error('Error exporting catalog:', error);
        showStatusMessage('שגיאה בייצוא הקטלוג', 'danger');
    }
}

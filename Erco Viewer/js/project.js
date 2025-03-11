// Project management functions for saving, loading, and exporting projects

// Initialize the current project with default values
function initializeCurrentProject() {
    window.currentProject = {
        info: {
            name: 'פרויקט חדש',
            client: '',
            location: '',
            requestor: '',
            date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
        },
        items: [],
        workUnits: [],
        employeeWork: [],
        settings: {
            primaryMarkup: 15,
            secondaryMarkup: 15,
            laborRate: 700,
            laborUnit: 'meter'
        },
        totals: {
            baseTotal: 0,
            primaryMarkupAmount: 0,
            afterPrimaryMarkup: 0,
            secondaryMarkupAmount: 0,
            afterSecondaryMarkup: 0,
            laborTotal: 0,
            grandTotal: 0
        }
    };

    // Make sure selectedProducts is initialized
    if (!window.selectedProducts) {
        window.selectedProducts = [];
    }

    return window.currentProject;
}

// Set up global initialization when page loads
$(document).ready(function() {
    // Initialize project if not already done
    if (!window.currentProject) {
        initializeCurrentProject();
    }

    // Setup calculator event handlers
    if (typeof setupCalculatorEventHandlers === 'function') {
        setupCalculatorEventHandlers();
    }

    // Make sure calculator UI components are configured
    if (typeof setupCalculatorUI === 'function') {
        setupCalculatorUI();
    }
});

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
}

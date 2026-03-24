// src/js/spreadsheet.js
// DOM generation + jQuery interactivity + editing + summary updates

(function initSpreadsheet($, global) {
    'use strict';

    const DATA_URL = '../data/grades.csv';
    const SELECTORS = {
        tableContainer: '#table-container',
        summarySelected: '#summary-selected',
        summaryCount: '#summary-count',
        summaryMean: '#summary-mean',
        summaryMin: '#summary-min',
        summaryMax: '#summary-max'
    };

    // Tracks whether the user last selected a row or column header
    const selectionState = {
        type: null,
        index: null
    };

    // Cached jQuery handles for the live-updating summary panel
    const summaryEls = {
        selected: $(SELECTORS.summarySelected),
        count: $(SELECTORS.summaryCount),
        mean: $(SELECTORS.summaryMean),
        min: $(SELECTORS.summaryMin),
        max: $(SELECTORS.summaryMax)
    };

    const getAssignments = () => Gradebook.getAssignments();
    const getStudents = () => Gradebook.getStudents();

    const formatGrade = (value) => {
        const numeric = Gradebook.parseNumber(value);
        if (numeric === null) {
            return '—';
        }
        return Number.isInteger(numeric) ? `${numeric}` : numeric.toFixed(1);
    };

    // Builds the gradebook table entirely from Gradebook data
    const renderTable = () => {
        const $container = $(SELECTORS.tableContainer);
        $container.empty();

        const assignments = getAssignments();
        const students = getStudents();

        if (!assignments.length || !students.length) {
            $container.append(
                $('<p>').addClass('chart-placeholder').text('No grade data found.')
            );
            return;
        }

        const $table = $('<table>').addClass('gradebook-table');
        const $thead = $('<thead>');
        const $headerRow = $('<tr>');
        $headerRow.append(
            $('<th>', {
                scope: 'col',
                text: 'Student',
                class: 'column-header column-header--name',
                'data-col-index': -1
            })
        );

        assignments.forEach((assignment, index) => {
            const $th = $('<th>', {
                scope: 'col',
                class: 'column-header',
                text: assignment,
                'data-col-index': index,
                tabindex: 0
            });
            $headerRow.append($th);
        });

        $thead.append($headerRow);
        $table.append($thead);

        const $tbody = $('<tbody>');
        students.forEach((student, rowIndex) => {
            const $row = $('<tr>', { 'data-row-index': rowIndex });
            const $rowHeader = $('<th>', {
                scope: 'row',
                class: 'row-header',
                'data-row-index': rowIndex,
                text: student.name,
                tabindex: 0
            });
            $row.append($rowHeader);

            student.grades.forEach((grade, colIndex) => {
                const $cell = $('<td>', {
                    class: 'grade-cell',
                    'data-row-index': rowIndex,
                    'data-col-index': colIndex,
                    text: formatGrade(grade),
                    tabindex: 0
                });
                $row.append($cell);
            });

            $tbody.append($row);
        });

        $table.append($tbody);
        $container.append($table);
    };

    const resetSummary = () => {
        summaryEls.selected.text('None: -');
        summaryEls.count.text('0');
        summaryEls.mean.text('—');
        summaryEls.min.text('—');
        summaryEls.max.text('—');
    };

    // Populates the summary card with stats for the active selection
    const updateSummary = (typeLabel, name, values) => {
        if (!typeLabel) {
            resetSummary();
            return;
        }
        const stats = Gradebook.computeStats(values);
        summaryEls.selected.text(`${typeLabel}: ${name}`);
        summaryEls.count.text(String(stats.count));
        summaryEls.mean.text(Gradebook.formatNumber(stats.mean));
        summaryEls.min.text(Gradebook.formatNumber(stats.min));
        summaryEls.max.text(Gradebook.formatNumber(stats.max));
    };

    const updateChart = (values) => {
        if (!values || !values.length) {
            GradeChart.update(null);
            return;
        }
        const frequencies = Gradebook.toLetterFrequencies(values);
        GradeChart.update(frequencies);
    };

    // Applies visual highlight + summary/chart refresh for current selection
    const applySelection = () => {
        $('td.grade-cell').removeClass('selected');
        $('th.column-header, th.row-header').removeClass('active');

        if (!selectionState.type) {
            resetSummary();
            GradeChart.update(null);
            return;
        }

        if (selectionState.type === 'column') {
            const colIndex = selectionState.index;
            const assignmentName = getAssignments()[colIndex];
            $(`th.column-header[data-col-index="${colIndex}"]`).addClass('active');
            $(`td.grade-cell[data-col-index="${colIndex}"]`).addClass('selected');
            const values = Gradebook.getColumnGrades(colIndex);
            updateSummary('Column', assignmentName, values);
            updateChart(values);
        } else if (selectionState.type === 'row') {
            const rowIndex = selectionState.index;
            $(`th.row-header[data-row-index="${rowIndex}"]`).addClass('active');
            $(`td.grade-cell[data-row-index="${rowIndex}"]`).addClass('selected');
            const studentName = getStudents()[rowIndex].name;
            const values = Gradebook.getRowGrades(rowIndex);
            updateSummary('Row', studentName, values);
            updateChart(values);
        }
    };

    const deselectAll = () => {
        selectionState.type = null;
        selectionState.index = null;
        applySelection();
    };

    const selectColumn = (colIndex) => {
        selectionState.type = 'column';
        selectionState.index = colIndex;
        applySelection();
    };

    const selectRow = (rowIndex) => {
        selectionState.type = 'row';
        selectionState.index = rowIndex;
        applySelection();
    };

    // Recomputes summary/chart if an edit touches the active row/column
    const refreshSelectionAfterEdit = (rowIndex, colIndex) => {
        if (!selectionState.type) return;
        if (
            (selectionState.type === 'row' && selectionState.index === rowIndex) ||
            (selectionState.type === 'column' && selectionState.index === colIndex)
        ) {
            applySelection();
        }
    };

    const showValidationError = ($cell, input, message) => {
        $cell.addClass('invalid');
        input.attr('aria-invalid', 'true');
        input.attr('title', message);
    };

    const clearValidationError = ($cell, input) => {
        $cell.removeClass('invalid');
        input.removeAttr('aria-invalid');
        input.removeAttr('title');
    };

    const commitEdit = ($cell, rowIndex, colIndex, input) => {
        const rawValue = input.val().trim();
        if (rawValue === '') {
            Gradebook.setGrade(rowIndex, colIndex, null);
            $cell.removeClass('editing').text('—');
            refreshSelectionAfterEdit(rowIndex, colIndex);
            return true;
        }

        const numeric = Number(rawValue);
        if (!Number.isFinite(numeric)) {
            showValidationError($cell, input, 'Please enter a numeric grade.');
            return false;
        }

        try {
            Gradebook.setGrade(rowIndex, colIndex, numeric);
            clearValidationError($cell, input);
            $cell.removeClass('editing').text(formatGrade(numeric));
            refreshSelectionAfterEdit(rowIndex, colIndex);
            return true;
        } catch (error) {
            showValidationError($cell, input, error.message);
            return false;
        }
    };

    const cancelEdit = ($cell, rowIndex, colIndex) => {
        const currentValue = Gradebook.getGrade(rowIndex, colIndex);
        $cell.removeClass('editing invalid').text(formatGrade(currentValue));
    };

    // Inline edit mode swaps the cell for a text input until committed
    const startEditingCell = ($cell) => {
        const rowIndex = Number($cell.data('rowIndex'));
        const colIndex = Number($cell.data('colIndex'));
        if (Number.isNaN(rowIndex) || Number.isNaN(colIndex)) return;

        if ($cell.hasClass('editing')) return;
        $cell.addClass('editing');
        const currentValue = Gradebook.getGrade(rowIndex, colIndex);
        const $input = $('<input>', {
            type: 'text',
            class: 'grade-input',
            value: currentValue ?? ''
        });
        $cell.empty().append($input);
        $input.trigger('focus').select();

        $input.on('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const saved = commitEdit($cell, rowIndex, colIndex, $input);
                if (saved) {
                    $input.off('blur');
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                $input.off('blur');
                cancelEdit($cell, rowIndex, colIndex);
            }
        });

        $input.on('blur', () => {
            cancelEdit($cell, rowIndex, colIndex);
        });
    };

    // Event delegation keeps the table interactive after any rerender
    const bindEvents = () => {
        const $container = $(SELECTORS.tableContainer);

        $container.on('click keydown', 'th.column-header', (event) => {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            const colIndex = Number($(event.currentTarget).data('colIndex'));
            if (colIndex >= 0) {
                selectColumn(colIndex);
            }
            event.preventDefault();
        });

        $container.on('click keydown', 'th.row-header', (event) => {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            const rowIndex = Number($(event.currentTarget).data('rowIndex'));
            selectRow(rowIndex);
            event.preventDefault();
        });

        $container.on('click', 'td.grade-cell', (event) => {
            startEditingCell($(event.currentTarget));
        });
    };

    // Bootstraps data fetch, table render, event wiring, and chart init
    const init = async () => {
        try {
            await Gradebook.loadFromCsv(DATA_URL);
            renderTable();
            bindEvents();
            GradeChart.init('#chart');
            resetSummary();
        } catch (error) {
            $(SELECTORS.tableContainer).html(
                $('<p>').addClass('chart-placeholder').text(error.message)
            );
            console.error(error);
        }
    };

    $(init);

    global.GradebookUI = {
        deselectAll,
        selectColumn,
        selectRow
    };
})(jQuery, window);

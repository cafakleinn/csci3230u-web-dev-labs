// src/js/gradebook.js
// Data + parsing + utilities for Gradebook Explorer

(function attachGradebookUtilities(global) {
    const DEFAULT_DATA_URL = '../data/grades.csv';
    // Ordered from highest to lowest to short-circuit letter lookups
    const LETTER_SCALE = [
        { grade: 'A', min: 90 },
        { grade: 'B', min: 80 },
        { grade: 'C', min: 70 },
        { grade: 'D', min: 60 },
        { grade: 'F', min: -Infinity }
    ];

    let assignments = [];
    let students = [];

    const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const cloneTable = () => ({
        assignments: [...assignments],
        students: students.map(({ name, grades }) => ({
            name,
            grades: [...grades]
        }))
    });

    const ensureRowIndex = (rowIndex) => {
        if (rowIndex < 0 || rowIndex >= students.length) {
            throw new RangeError(`Invalid row index: ${rowIndex}`);
        }
    };

    const ensureColumnIndex = (colIndex) => {
        if (colIndex < 0 || colIndex >= assignments.length) {
            throw new RangeError(`Invalid column index: ${colIndex}`);
        }
    };

    // Converts grades.csv text into assignment headers + student rows
    const parseCsv = (text) => {
        const rows = text.trim().split(/\r?\n/).filter(Boolean);
        if (!rows.length) {
            throw new Error('grades.csv is empty.');
        }

        const headerCells = rows.shift().split(',').map((cell) => cell.trim());
        const assignmentHeaders = headerCells.slice(1);

        const parsedStudents = rows.map((row) => {
            const cells = row.split(',').map((cell) => cell.trim());
            const name = cells[0] || 'Student';
            const grades = cells.slice(1).map(parseNumber);
            return { name, grades };
        });

        return { assignments: assignmentHeaders, students: parsedStudents };
    };

    // Fetches CSV once and hydrates in-memory assignments/students arrays
    const loadFromCsv = async (url = DEFAULT_DATA_URL) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unable to load grades.csv (${response.status})`);
        }
        const text = await response.text();
        const parsed = parseCsv(text);
        assignments = parsed.assignments;
        students = parsed.students;
        return cloneTable();
    };

    const getAssignments = () => [...assignments];
    const getStudents = () => students.map((s, index) => ({ ...s, index }));

    const getGrade = (rowIndex, colIndex) => {
        ensureRowIndex(rowIndex);
        ensureColumnIndex(colIndex);
        return students[rowIndex].grades[colIndex] ?? null;
    };

    const getRowGrades = (rowIndex) => {
        ensureRowIndex(rowIndex);
        return [...students[rowIndex].grades];
    };

    const getColumnGrades = (colIndex) => {
        ensureColumnIndex(colIndex);
        return students.map((student) => student.grades[colIndex] ?? null);
    };

    const setGrade = (rowIndex, colIndex, rawValue) => {
        ensureRowIndex(rowIndex);
        ensureColumnIndex(colIndex);
        const numeric = parseNumber(rawValue);
        if (numeric !== null && (numeric < 0 || numeric > 100)) {
            throw new RangeError('Grades must be between 0 and 100.');
        }
        students[rowIndex].grades[colIndex] = numeric;
        return numeric;
    };

    const sanitizeValues = (values) =>
        values
            .map(parseNumber)
            .filter((value) => value !== null && Number.isFinite(value));

    // Mean/min/max used by the summary panel; ignores blanks gracefully
    const computeStats = (values) => {
        const numeric = sanitizeValues(values);
        if (!numeric.length) {
            return {
                count: 0,
                mean: null,
                min: null,
                max: null
            };
        }

        const total = numeric.reduce((sum, value) => sum + value, 0);
        return {
            count: numeric.length,
            mean: total / numeric.length,
            min: Math.min(...numeric),
            max: Math.max(...numeric)
        };
    };

    // Converts a numeric score to the matching LETTER_SCALE bracket
    const toLetterGrade = (value) => {
        const numeric = parseNumber(value);
        if (numeric === null) return null;
        const bracket = LETTER_SCALE.find((scale) => numeric >= scale.min);
        return bracket ? bracket.grade : 'F';
    };

    // Aggregates A–F ratios for the histogram, skipping null entries
    const toLetterFrequencies = (values) => {
        const numericValues = sanitizeValues(values);
        const counts = LETTER_SCALE.reduce(
            (acc, scale) => ({ ...acc, [scale.grade]: 0 }),
            {}
        );

        numericValues.forEach((value) => {
            const letter = toLetterGrade(value) ?? 'F';
            counts[letter] += 1;
        });

        const total = numericValues.length || 1;
        const ratios = Object.fromEntries(
            Object.entries(counts).map(([letter, count]) => [
                letter,
                count / total
            ])
        );

        return { counts, ratios, total: numericValues.length };
    };

    const formatNumber = (value, digits = 2) => {
        if (value === null || value === undefined || Number.isNaN(value)) {
            return '—';
        }
        return Number(value).toFixed(digits);
    };

    global.Gradebook = {
        loadFromCsv,
        getAssignments,
        getStudents,
        getRowGrades,
        getColumnGrades,
        setGrade,
        getGrade,
        computeStats,
        toLetterGrade,
        toLetterFrequencies,
        formatNumber,
        parseNumber,
        dataSnapshot: cloneTable
    };
})(window);

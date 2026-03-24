# Lab 04–06 — Gradebook Explorer (Starter Code)

This starter package supports Labs 04–06 for **CSCI3230U Web App Development**.

You will build a web-based gradebook explorer that:
- Loads a CSV gradebook (`grades.csv`)
- Lets the user select rows/columns, edit cells, and compute summaries
- Generates a D3 bar chart of letter-grade frequencies (A–F) for the selected data

---

## Directory Structure

```text
lab04_06_gradebook_explorer/
├─ README.md
└─ src/
   ├─ pages/
   │  └─ spreadsheet.html
   ├─ css/
   │  └─ spreadsheet.css
   ├─ js/
   │  ├─ spreadsheet.js
   │  ├─ gradebook.js
   │  └─ chart.js
   └─ data/
      └─ grades.csv
```

## How to Run (Important)

Because this lab loads grades.csv, you must run a local web server (opening the HTML file directly with file:// will not work with fetch() in most browsers).

```bash
python -m http.server 8000
```

Then open:

```bash
http://localhost:8000/src/pages/spreadsheet.html
```

From the project root (lab04_06_gradebook_explorer/), run:
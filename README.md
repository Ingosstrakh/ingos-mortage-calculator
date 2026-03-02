# Ingosstrakh mortgage calculator

This repository is a static browser app that parses an unstructured client text and calculates mortgage insurance premiums.

## Project structure

- `index.html` and `index_mobile.html`: UI entrypoints.
- `parser.js`: text parser that extracts bank, amount (OSZ), borrowers (DOB, gender, shares), object type, risk flags.
- `config_banks.js`: central bank configuration (aliases, markup percent, discount rules).
- `tariffs_*.js`: tariff tables.
  - `tariffs_life.js`
  - `tariffs_property.js`
  - `tariffs_ifl.js`
- `calculator_v2.js`: performs calculations and formats result HTML.
- `installment_calculator.js`: installment schedule calculator for life premium.
- `server.js`: minimal local static HTTP server.

## Local run

Modern browsers do not allow `file:///.../index.html` to load local sibling JS files due to security restrictions.

Run a local HTTP server:

```bash
PORT=8080 node server.js
```

Then open `http://localhost:8080/index.html`.


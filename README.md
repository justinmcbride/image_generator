# image_generator

This project is a small Node.js CLI script that generates patterned PNG images.

It uses:
- [`commander`](https://www.npmjs.com/package/commander) to read CLI options
- [`jimp`](https://www.npmjs.com/package/jimp) to create and write image files

## What it does

`index.js` creates an image pattern and writes the result to:

`output/<shape>_1px_<width>x<height>.png`

## Usage

Run the script with width and height values (and an optional shape):

```bash
node index.js -w 256 -h 256 -s checkers
```

Available shapes:
- `checkers` (default)
- `stripes`
- `diamonds`
- `circle`

Example output file:

`output/checkers_1px_256x256.png`

## Suggested improvements and feature tasks

- [ ] Add CLI options for custom colors (background, foreground, base) using hex values.
- [ ] Add CLI option for configurable box size (currently fixed at 1px).
- [ ] Add support for additional pattern types (e.g. noise, waves, gradients, triangles).
- [ ] Add deterministic randomization with a `--seed` option for reproducible generated images.
- [ ] Add support for batch generation (multiple sizes/shapes in one command).
- [ ] Add output format options (JPEG/WebP) and quality/compression controls.
- [ ] Add input validation for width/height (required, positive integers, safe upper bounds).
- [ ] Add an option to control output directory and custom output filenames.
- [ ] Add automated tests for CLI argument parsing and output file naming behavior.
- [ ] Add snapshot/image-diff tests to validate generated pattern output over time.
- [ ] Add a `--help` examples section showing common generation workflows.
- [ ] Add CI checks for `npm test` to ensure test coverage gates future changes.

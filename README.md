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

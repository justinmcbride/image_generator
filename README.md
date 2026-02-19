# image_generator

This project is a small Node.js CLI script that generates checkerboard PNG images.

It uses:
- [`commander`](https://www.npmjs.com/package/commander) to read CLI options
- [`jimp`](https://www.npmjs.com/package/jimp) to create and write image files

## What it does

`index.js` creates an image with alternating background/foreground pixels (a checker pattern) and writes the result to:

`output/checkers_1px_<width>x<height>.png`

## Usage

Run the script with width and height values:

```bash
node index.js -w 256 -h 256
```

Example output file:

`output/checkers_1px_256x256.png`

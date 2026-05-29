# image_generator

This project is a small Node.js CLI script that generates patterned PNG images.

It uses:
- [`commander`](https://www.npmjs.com/package/commander) to read CLI options
- [`jimp`](https://www.npmjs.com/package/jimp) to create and write image files

## What it does

`index.js` creates an image pattern and writes the result to:

`output/<shape>_1px_<width>x<height>.png`

When a mask is applied, the output file is named:

`output/<shape>_1px_<width>x<height>_<mask>_<mask-color>.png`

## Usage

Run the script with width and height values (and optional shape/mask options):

```bash
node index.js -w 256 -h 256 -s checkers
```

Both `-w` (width) and `-h` (height) are required and must be positive integers. The script will exit with a non-zero status and print an error message if they are missing or invalid.

Available shapes:
- `checkers` (default)
- `stripes`
- `diamonds`
- `circle`

If an unrecognized shape is provided, the script will print a warning and default to `checkers`.

Example output file:

`output/checkers_1px_256x256.png`

## Masks

A mask can be applied over the generated image using `--mask`. Pixels outside the mask area are replaced with the configured mask color.

```bash
node index.js -w 256 -h 256 -s checkers --mask circle --mask-color black
```

Available masks:
- `circle` — circular mask centered in the image, sized to fit the shortest dimension
- `diamond` — diamond mask centered in the image, sized to fit the shortest dimension

Available mask colors (area outside the mask):
- `black` (default)
- `white`
- `transparent`

Example output file:

`output/checkers_1px_256x256_circle_black.png`

## Emoji

An emoji character can be used as the shape pattern or as a mask using `--emoji`. This is required when `--shape emoji` or `--mask emoji` is selected.

```bash
node index.js -w 256 -h 256 -s emoji -e 🐙
```

You can also combine an emoji mask with any shape:

```bash
node index.js -w 256 -h 256 -s checkers --mask emoji -e ⭐
```

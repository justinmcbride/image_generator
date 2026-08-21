# Architecture

The design behind [`STORY.md`](../STORY.md), stated plainly.

## The core idea

Every image is produced by answering one question for every pixel:

> Is this pixel foreground, or background?

Nothing in this project renders geometry, blends colors, or antialiases anything. There is
one boolean per pixel, and two colors to choose between. Every feature is a new way of
answering that same question.

## Module map

| File | Responsibility |
| --- | --- |
| `index.js` | CLI surface. Parses options with `commander`, prints results, sets the exit code. |
| `imageGenerator.js` | Orchestration. Validates options, resolves the output filename, runs the pixel passes, writes the PNG. |
| `shapeGenerator.js` | Answers "is this pixel foreground?" for each supported shape. |
| `maskGenerator.js` | Answers "does this pixel survive?" for each supported mask, plus mask color resolution. |
| `emojiRenderer.js` | Rasterizes an emoji glyph into a 2D boolean grid via `node-canvas`. |
| `test/` | One test file per module, run with the built-in Node test runner (`npm test`). |

## The two passes

`generateImage()` walks the image twice, and the order matters.

1. **Shape pass** — for each `(x, y)`, `isForegroundPixel()` picks `FOREGROUND_COLOR`
   (green) or `BACKGROUND_COLOR` (black).
2. **Mask pass** — for each `(x, y)`, if `isInsideMask()` is false the pixel is overwritten
   with the chosen mask color.

The passes are kept separate rather than fused into one loop because they answer
independent questions. A shape does not need to know whether a mask exists, and a mask does
not need to know what pattern it is cutting into. That independence is what let emoji
support drop into both sides without touching either one's logic.

Masks are always centered and always sized against `Math.min(width, height)`, so a mask can
never extend past the shorter edge of a non-square image.

## Why shapes are pure predicates

`isForegroundPixel( w, h, gridWidth, gridHeight, shape, emojiGrid )` takes coordinates and
returns a boolean. It allocates nothing, holds no state, and has no side effects.
Consequences:

- Shapes are trivially unit-testable — assert on a coordinate, get a boolean.
- Adding a shape means adding one branch and one entry in the `SHAPES` array.
- Circle uses squared distance compared against a squared radius, avoiding `Math.sqrt()`
  inside a per-pixel loop.

`isInsideMask()` follows the same contract for the same reasons.

## The emoji path

`renderEmojiGrid()` is the one place where the project reaches outside of arithmetic. It:

1. Creates an off-screen canvas at the target dimensions.
2. Sets the font size to 80% of the smaller dimension, with a fallback chain of color emoji
   families (`Apple Color Emoji`, `Segoe UI Emoji`, `Noto Color Emoji`).
3. Centers the glyph using `measureText()` bounding-box metrics rather than `textAlign` and
   `textBaseline`. A glyph's advance width is not its inked extent, and for emoji the
   difference is large enough to be visible.
4. Reads back `ImageData` and thresholds the alpha channel at 128 to produce a
   `boolean[height][width]` grid.

The grid is computed once, before either pass, and reused by both. The shape branch and the
mask branch each do a single lookup: `emojiGrid[y][x] === true`. From the rest of the
system's point of view, an emoji is indistinguishable from any other predicate.

## Error handling philosophy

There are two tiers, and they are deliberately different:

- **Fatal** — missing or invalid dimensions, or `--emoji` omitted when an emoji shape or
  mask was requested. These are collected by `validateOptions()`, reported together, and
  produce a non-zero exit code. The program cannot guess these values.
- **Recoverable** — an unrecognized shape, mask, or mask color. These print a warning naming
  the valid options and then fall back to a sensible default (checkers, no mask, black). A
  typo should not cost you the run.

Validation returns an array of error strings rather than throwing, so a single invocation
reports every problem at once instead of one per run.

## Output naming

The filename encodes the full set of inputs:

```
output/<shape>_1px_<width>x<height>[_<mask>_<mask-color>].png
```

For emoji, the shape and mask segments become `emoji_<character>`. Because every parameter
appears in the name, the `output/` directory is a self-describing archive and repeat runs
with identical options are idempotent. The directory is created on demand and its contents
are gitignored.

## Continuous integration

`.github/workflows/pr-generation-artifacts.yml` runs on every pull request. It installs
dependencies, runs the test suite, generates the full matrix of shapes and mask
combinations at 256×256, verifies that PNGs were actually produced, zips them, uploads the
bundle as an artifact, and posts (or updates) a pull request comment linking to it.

The comment is located by a hidden HTML marker so repeated pushes update one comment rather
than accumulating new ones. The intent is that reviewers can look at the rendered output,
not just a green check.

## Adding a new shape

1. Add the name to `SHAPES` in `shapeGenerator.js`.
2. Add a branch to `isForegroundPixel()` returning a boolean for the given coordinates.
3. Add tests in `test/shapeGenerator.test.js`.
4. Document it in `README.md` and add it to the CI generation matrix.

Adding a mask follows the same shape, using `MASKS` and `isInsideMask()` in
`maskGenerator.js`.

# The Ballad of the One-Pixel Checkerboard

The story of this repository, in four short chapters.

## Chapter 1: The Loop

The whole thing starts in `index.js`, which is barely fifty lines and knows it. It asks
`commander` for a width and a height, and it refuses to proceed without them.
`validateOptions()` in `imageGenerator.js` is the bouncer at the door: no width, no
height, no entry. Not an integer? Not positive? `❌ Error:` and out you go, with a
non-zero exit code to prove it meant business.

Once you are through, the program does the most honest thing a graphics program can do:
it walks every single pixel, one at a time, and asks a yes-or-no question.
`isForegroundPixel()`. Green, or black. That is the whole renderer.

The answers are almost aggressively simple:

- **checkers** — `(x + y) % 2 === 1`. One-pixel squares. Zoom in and it is a
  checkerboard; zoom out and it is a gray fog.
- **stripes** — `x % 2 === 1`. Vertical hairlines.
- **diamonds** — Manhattan distance from center, modulo 4. A taxicab metric in a costume.
- **circle** — squared distance against a squared radius, because there is no reason to
  pay for a square root you do not need.

That is the founding myth of this repository: the filename says `_1px_` because every
pattern is drawn at a resolution of one pixel, and every shape is just a different
arithmetic opinion about a coordinate pair.

## Chapter 2: The Second Pass

Then someone wanted to cut a hole in it.

So `maskGenerator.js` arrived, and with it a second pass over every pixel. The first pass
decides what the image **is**; the second decides what part of it **survives**.
`isInsideMask()` — circle or diamond, always centered, always sized to
`Math.min(width, height)` so it never spills off the edge. Everything outside gets painted
over in black, white, or nothing at all (`rgbaToInt(0, 0, 0, 0)`, the transparent void).

The repository is polite about mistakes, which is a nicer personality trait than most CLIs
have. Ask for a shape that does not exist and you get a warning and a checkerboard. Ask for
an unrecognized mask and it shrugs and skips the mask. It never dies over a typo; it only
dies over a missing width.

Every choice you make gets written into the filename, so the output directory becomes a
self-documenting archive:

```
output/checkers_1px_256x256_circle_black.png
```

You can never lose track of what made what.

## Chapter 3: The Emoji Incident 🎨

Here is where the story gets good.

In a single commit, the repository doubled in size and changed its nature:
`feat: add emoji support for shapes, masks, and CLI output`.

The idea is genuinely lovely. What if the yes-or-no question about each pixel was not
answered by arithmetic, but by an **emoji**?

`emojiRenderer.js` pulls in `node-canvas`, draws your emoji at 80% of the image's smallest
dimension, then reads the raw `ImageData` back out and thresholds the alpha channel at 128.
Anything more opaque than half is `true`. Anything less is `false`. Out comes a 2D boolean
grid — a pixelated stencil of a 🐙 or a 🌮 or whatever you handed it.

And then it slots into the exact same machinery. `emojiGrid[y][x] === true` is now just
another branch inside `isForegroundPixel()`, sitting right alongside `(x + y) % 2 === 1`
like it always belonged there. It works as a **shape** (fill the emoji with
checkerboard-green) and as a **mask** (cut the pattern into the emoji's silhouette). Same
two passes. No refactor required.

That is the quiet triumph of the story. The original design — *one boolean per pixel* — was
abstract enough that a font rasterizer could walk in the front door and be treated as a
peer of `x % 2`.

## Chapter 4: Two Minutes Later

The next commit landed two minutes after the one before it:
`fix: center emoji using actual bounding box metrics`.

Because the emoji was not centered. `textAlign` and `textBaseline` *say* they center things,
but glyph metrics lie — an emoji's advance width and its actual inked bounding box are not
the same rectangle, and the difference is visible the instant you render a 🎉 into a
256×256 square. So the fix threw out the declarative centering and did it by hand with
`measureText()`: `actualBoundingBoxLeft + actualBoundingBoxRight` for the width,
`actualBoundingBoxAscent + actualBoundingBoxDescent` for the height.

Measure the ink, center the ink. Nine lines added, three removed, two minutes of elapsed
time. It is the most relatable commit in the repository: the feature worked, the feature
looked *slightly* wrong, and someone could not leave it alone.

## Epilogue: The Gallery

There is one more character worth meeting: `.github/workflows/pr-generation-artifacts.yml`.

On every pull request, CI runs the tests, generates every shape and every mask and every
mask color, zips the results, uploads them as an artifact, and posts a comment on the pull
request with a download link. It is careful about it, too: a hidden HTML marker lets it find
and *update* its own previous comment instead of spamming a new one on every push.

Which means this repository does something rare. It does not just tell you the tests passed.
It hands you the pictures and says: **look at them yourself.**

For a project whose entire soul is "is this pixel green or not," that is exactly the right
kind of proof.

---

*Four modules. One boolean per pixel. One very carefully centered emoji.* 🖼️

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the same story told as a design
document.

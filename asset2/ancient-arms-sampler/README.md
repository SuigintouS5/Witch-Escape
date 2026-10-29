# Ancient Arms — Free Sampler

A free slice of **Ancient Arms**: four weapons in plain steel, plus three
enchanted samples so you can see the loops run in your own engine.

| | |
|---|---|
| Plain weapons | sword, axe, bow, shield — **1 frame each** |
| Enchanted samples | **axe · fire**, **mace · frost**, **sword · serrated** — **8-frame seamless loops** |
| Cells | 22 × 56 px, 2 px padding, pivot 0.5/0.5, 16 pixels per unit |
| Format | PNG spritesheet + `.sheet.json` index, engine-agnostic |

**7 sheets.** Same files, same names, same format, same licence as the
full pack — the full pack drops in on top of this without renaming anything.

## What's in the full pack

Every weapon in every element — **238 sheets**:

- all **12 weapons** (sword, dagger, axe, spear, halberd, war scythe, mace,
  war hammer, flail, staff, bow, shield), plain and in **16 elements**: blood, fire, forked, frost, gravity,
  holy, molten, poison, sandstorm, serrated, shattered, stormcaller,
  thornbound, thunder, void, water
- the **sword** in all sixteen (see `UPGRADE.png`)
- the flail split into haft and head for your own chain physics
- `Spike.png`, the flail head as a throwable

    https://lumiolab.itch.io/ancient-arms

## Reading the index

Each `.sheet.json` lists every cell's `rect` as `[x, y, w, h]`. **`y` is
measured from the bottom** of the image (Unity's convention). If your
importer crops top-down, flip it: `top = imageHeight - y - h`. Or ignore the
index entirely and slice by the 22 × 56 grid.

## Licence

Free for commercial and non-commercial use, no attribution required. You
may not redistribute these files as assets. See `LICENSE.txt`.

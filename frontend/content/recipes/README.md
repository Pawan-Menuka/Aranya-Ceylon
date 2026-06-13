# Adding a recipe

Recipes are **file-based content**. To publish a new recipe, create one `.mdx`
file in this folder (`content/recipes/`) and push — the site rebuilds and the
recipe is pre-rendered as static HTML (instant load, no database, great SEO).

- The **file name** is the URL slug: `golden-milk.mdx` → `/recipes/golden-milk`.
- Only `*.mdx` files become recipes (this README and any other file are ignored).
- The structured fields live in the **YAML frontmatter** (between the `---`
  lines); the **intro prose** is the markdown body below the frontmatter.

Copy this template and edit it:

```mdx
---
title: "Recipe Title"
dek: "One-sentence hook shown on the card and under the title."
course: "Curries & Mains"   # or: Sweet & Bakes | Drinks | Sides & Basics
accent: "#3C3A36"           # spice colour for the card tint / step numbers
featured: false             # true = candidate for the index spotlight (optional)
prep: 20                    # minutes
cook: 40                    # minutes
serves: 4                   # use 0 for "makes a batch" (hides the serves stat)
difficulty: "Easy"          # Easy | Medium | Hard
publishedAt: "2026-06-13"   # ISO date — newest sorts first
spices:                     # catalog product names, shown as "shop the spices"
  - "Ceylon Cinnamon Quills"
  - "Ground Turmeric"
ingredients:                # one or more groups; `group` is optional
  - group: "For the spice"
    items:
      - "1 tbsp coriander seeds"
      - "6 whole cloves"
  - items:                  # a group with no heading
      - "400ml coconut milk"
method:                     # numbered automatically
  - "First step."
  - "Second step."
tips:                       # optional
  - "A helpful note."
---

The intro paragraph(s) in markdown. *Italics*, **bold**, and `> quotes` all work.
```

The new `course` only needs to be one of the four above to appear as a filter
chip; chips with no recipes are hidden automatically.

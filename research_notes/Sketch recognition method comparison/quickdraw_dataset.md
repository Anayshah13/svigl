# Google Quick, Draw! dataset as a labeled sample for a small comparative sketch-recognition study

Checked 27 October 2026. GCS object timestamps on sampled files are **18–25 May 2017**; treat headline “50 million / 345 classes” figures as the 2017 public dump, not a live-growing corpus. The browse UI, GitHub docs, Hugging Face loader, and `storage.googleapis.com` HTTP objects were reachable on this date.

## Official download URLs and formats (simplified ndjson, raw strokes, 28×28 numpy, Sketch-RNN npz, 2026 mirrors)

### Takeaway
The canonical host is the public GCS bucket `quickdraw_dataset`. Four per-category full-set formats plus Sketch-RNN `.npz` remain downloadable over HTTPS without `gsutil`. Hugging Face `google/quickdraw` wraps the same dump; Kaggle hosts a 2018 competition copy under different terms.

### Cited Findings
- Official browse page: “Over 15 million players have contributed millions of drawings… That’s why we’re open-sourcing them, for anyone to play with.” — [Quick, Draw! The Data](https://quickdraw.withgoogle.com/data)
- GitHub docs: “The Quick Draw Dataset is a collection of 50 million drawings across 345 categories… The dataset is available on Google Cloud Storage as ndjson files seperated by category.” Example command: `gsutil -m cp 'gs://quickdraw_dataset/full/simplified/*.ndjson' .` Console: [Cloud Storage browser](https://console.cloud.google.com/storage/browser/quickdraw_dataset/). — [googlecreativelab/quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Full-set formats listed by that README (each one file per category):
  - Raw `.ndjson`: [gs://quickdraw_dataset/full/raw](https://console.cloud.google.com/storage/browser/quickdraw_dataset/full/raw)
  - Simplified `.ndjson`: [gs://quickdraw_dataset/full/simplified](https://console.cloud.google.com/storage/browser/quickdraw_dataset/full/simplified)
  - Binary `.bin`: [gs://quickdraw_dataset/full/binary](https://console.cloud.google.com/storage/browser/quickdraw_dataset/full/binary)
  - Numpy bitmaps `.npy`: [gs://quickdraw_dataset/full/numpy_bitmap](https://console.cloud.google.com/storage/browser/quickdraw_dataset/full/numpy_bitmap)
  - Sketch-RNN `.npz` / `.full.npz`: [gs://quickdraw_dataset/sketchrnn](https://console.cloud.google.com/storage/browser/quickdraw_dataset/sketchrnn)
- HTTPS pattern still valid 27 Oct 2026 (GCS XML listing returned `200` with `Size` and `LastModified`). Examples:
  - `https://storage.googleapis.com/quickdraw_dataset/full/raw/cat.ndjson` — 521,081,210 bytes, last modified 2017-05-18
  - `https://storage.googleapis.com/quickdraw_dataset/full/simplified/cat.ndjson` — 76,676,944 bytes, last modified 2017-05-18
  - `https://storage.googleapis.com/quickdraw_dataset/full/binary/cat.bin` — 19,571,324 bytes, last modified 2017-05-18
  - `https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/cat.npy` — 96,590,448 bytes, last modified 2017-05-18
  - `https://storage.googleapis.com/quickdraw_dataset/sketchrnn/cat.npz` — 14,842,947 bytes, last modified 2017-05-25
  - `https://storage.googleapis.com/quickdraw_dataset/sketchrnn/cat.full.npz` — 22,019,949 bytes, last modified 2017-05-25
  - Multi-word names use a space in the object key: `full/numpy_bitmap/The Mona Lisa.npy` (96,164,352 bytes). HTTP clients must encode the space as `%20`. — GCS listing of those keys (this research pass)
- Raw drawing schema: `key_id`, `word`, `recognized`, `timestamp`, `countrycode`, `drawing` where `drawing` is strokes of `[x[], y[], t[]]`; “`x` and `y` are the pixel coordinates, and `t` is the time in milliseconds since the first point.” Raw drawings “can have vastly different bounding boxes and number of points due to the different devices.” — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Simplified drawings: timing removed; “positioned and scaled the data into a 256x256 region” via (1) top-left align min=0, (2) uniform scale max=255, (3) resample strokes at 1 pixel spacing, (4) RDP with epsilon 2.0. Same metadata keys as raw. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Numpy bitmaps: “All the simplified drawings have been rendered into a 28x28 grayscale bitmap in numpy `.npy` format… aligned to the center of the drawing's bounding box rather than the top-left corner.” Generation snippet cited at [issue 19 comment](https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262). — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Sketch-RNN files: “75K samples (70K Training, 2.5K Validation, 2.5K Test) has been randomly selected from each category, processed with RDP… epsilon… 2.0.” Full-category files use `.full.npz`. Load in Python 3 with `np.load(..., encoding='latin1', allow_pickle=True)`. Conversion notebook: [hardmaru/quickdraw-ndjson-to-npz](https://github.com/hardmaru/quickdraw-ndjson-to-npz). — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); Magenta [sketch_rnn README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- Hugging Face mirror (live 27 Oct 2026): configs `raw`, `preprocessed_simplified_drawings`, `preprocessed_bitmaps` (default, 28×28), `sketch_rnn`, `sketch_rnn_full`; homepage still `https://quickdraw.withgoogle.com/data`; license CC BY 4.0. Viewer disabled because the repo still uses a loading script. — [huggingface.co/datasets/google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Kaggle 2018 copy still hosted: `train_raw.zip`, `train_simplified.zip`, `test_raw.csv`, `test_simplified.csv`; **244.4 GB**, 683 files; license “Subject to Competition Rules” (must accept rules / sign in). Competition dates 26 Sep 2018 – 4 Dec 2018. — [Kaggle data page](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/data); [overview](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/overview)
- Example third-party wget of raw ndjson (same GCS URL): `wget https://storage.googleapis.com/quickdraw_dataset/full/raw/jail.ndjson`. — [hardmaru/quickdraw-ndjson-to-npz](https://github.com/hardmaru/quickdraw-ndjson-to-npz)

### Inferences
- As of October 2026 the 2017 GCS dump is still the practical source of truth; timestamps have not moved since May 2017, so “ongoing” in the sense of new drawings being appended is not supported by object metadata.
- For a method that needs strokes, prefer `full/simplified/*.ndjson` or `sketchrnn/*.npz`. For a method that needs bitmaps, prefer `full/numpy_bitmap/*.npy` rather than re-rasterizing unless canvas/stroke-width is an experimental factor.
- Hugging Face is a convenience wrapper, not a second dump: counts (below) match the GitHub “50 million / 345” story.
- The Magenta docs URL `https://magenta.tensorflow.org/datasets/sketchrnn` is still referenced from Magenta’s README; a direct fetch of that Magenta site URL was blocked in this session, but GCS `sketchrnn/` listed successfully.

### Gaps
- `gsutil` / console HTML for the full bucket listing was not retrieved (console fetch classified/blocked). Total bucket size is therefore estimated from per-file samples plus Hugging Face counts, not from a billed-bytes figure.
- GitHub `categories.txt` raw fetch returned an empty body in this session; the 345-class list below is from Hugging Face’s class table, which matches the README’s “345 categories” claim.
- Did not HEAD every one of 345 objects; sizes below for “full set” are extrapolations.

## How many categories, how many drawings, and what the label is (prompt vs visual judgment)

### Takeaway
There are **345 prompt categories** and **50,426,266** drawings in the public full dump. The label `word` is **the category the player was asked to draw**, not a human “this looks like X” judgment. A separate `recognized` boolean records whether the **in-game classifier** accepted the drawing.

### Cited Findings
- “50 million drawings across 345 categories… tagged with metadata including **what the player was asked to draw**.” — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); same wording on [Hugging Face](https://huggingface.co/datasets/google/quickdraw)
- Hugging Face exact split sizes:
  - `raw` / `preprocessed_simplified_drawings` / `preprocessed_bitmaps`: **50,426,266** examples, all placed in a single “train” split (no official class-balanced test split in these configs).
  - `sketch_rnn`: train **24,150,000** = 345×70,000; validation **862,500** = 345×2,500; test **862,500** = 345×2,500.
  - `sketch_rnn_full`: train **43,988,874**; validation **862,500**; test **862,500**.
  — [Hugging Face “Data Splits”](https://huggingface.co/datasets/google/quickdraw)
- Field definition: “`word`: Category the player was prompted to draw.” “`recognized`: Whether the word was recognized by the game.” Hugging Face: “The annotations are machine-generated and match the category the player was prompted to draw.” Bitmaps use `label` with the same meaning. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [Hugging Face](https://huggingface.co/datasets/google/quickdraw)
- Game mechanics (20-second limit; 6 random categories per game; computer must recognize to score): Google AI blog, 28 Sep 2018. — [Introducing the Kaggle “Quick, Draw!” Doodle Recognition Challenge](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- Per-class bitmap counts implied by GCS `.npy` byte size (uint8 28×28 = 784 bytes/drawing plus a small NumPy header). Measured:
  - `cat.npy` 96,590,448 bytes → **123,202** drawings ((96,590,448 − 80) / 784 = 123,202)
  - `hexagon.npy` 111,669,120 bytes → **142,435** drawings
  - `The Mona Lisa.npy` 95,164,352 bytes → **121,383** drawings
  — GCS `Size` fields (this research pass) plus the README’s 28×28 grayscale spec
- Mean drawings per class if the 50,426,266 dump is split evenly: 50,426,266 / 345 ≈ **146,163**. That is consistent with the three measured classes sitting in the 121k–142k band.
- Kaggle overview (2018) says the public subset “contains 50M drawings encompassing **340** label categories,” and “a subset was publicly released” of “more than 1B drawings.” — [Kaggle overview](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/overview)
- Sketch-RNN paper (v4, 19 May 2017): each class used in that work is “70K training samples, in addition to 2.5K validation and 2.5K test samples”; the game “expands daily” and grew from an initial 75 classes (listed in the paper’s Table 1) to “hundreds of classes.” Those 75k/2.5k/2.5k numbers are a **sample**, not the full dump. — [arXiv:1704.03477](https://arxiv.org/abs/1704.03477)
- Browse UI on [quickdraw.withgoogle.com/data](https://quickdraw.withgoogle.com/data) is the recognized-drawing gallery; downloadable files still contain unrecognized and possibly inappropriate drawings. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [Quick-Draw-for-Processing README quoting that distinction](https://github.com/codybenlewis/quick-draw-for-processing)

### Inferences
- For a comparative study, treat Quick, Draw! as **prompt-supervised, game-noisy** data. Accuracy against `word` measures “did the system recover the prompt?”, which is the same target as the original game and the Kaggle challenge, not “would a human name this sketch X?”.
- `recognized=true` is **not** a clean-label filter: Google’s own Kaggle writeup says early recognition truncates drawings, so many `recognized=true` sketches are incomplete.
- The 340 vs 345 discrepancy is real in published sources. A solo benchmark that wants to cite “the official dump” should use **345 / Hugging Face 50,426,266**. A benchmark that wants to cite Kaggle MAP@3 numbers must use the Kaggle files (340 classes) and cannot silently mix GCS 345-class files.

### Gaps
- No official table of drawings **per class** was retrieved (only three classes reverse-engineered from `.npy` sizes). Class imbalance exists but the min/max class sizes are not sourced here.
- Which five classes Kaggle dropped relative to the 345-class dump is not stated on the Kaggle overview/data pages fetched.
- Fraction of `recognized=true` vs `false` globally was not measured (would require streaming ndjson).

## License and terms of use (personal benchmark, redistribution, third-party APIs)

### Takeaway
Google released the dump under **CC BY 4.0**. A personal side-project benchmark that attributes Google and links the license is in-scope. Redistribution of the files (or a subset) is allowed under CC BY. The license does **not** add a special ban on sending images to third-party APIs; it also does **not** license Google’s trademarks or waive the need to follow the API vendor’s own terms.

### Cited Findings
- GitHub LICENSE / README: “This data made available by Google, Inc. under the Creative Commons Attribution 4.0 International license. https://creativecommons.org/licenses/by/4.0/” Dataset metadata table: license name “CC BY 4.0”, url `https://creativecommons.org/licenses/by/4.0/`. Intended audience: “developers, researchers, and artists.” — [README License](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [LICENSE file](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/LICENSE)
- Hugging Face repeats: “The data is made available by Google, Inc. under the Creative Commons Attribution 4.0 International license.” — [Hugging Face licensing](https://huggingface.co/datasets/google/quickdraw)
- CC BY 4.0 grant (SPDX copy of the legal code): worldwide, royalty-free, non-exclusive, irrevocable license to (A) “reproduce and Share the Licensed Material, in whole or in part”; (B) “produce, reproduce, and Share Adapted Material.” Media/formats: licensed rights may be exercised “in all media and formats whether now known or hereafter created.” Downstream: “You may not offer or impose any additional or different terms… that restrict exercise of the Licensed Rights.” Patent and trademark rights “are not licensed.” Attribution (Section 3) requires identifying the creator/licensor, copyright notice, license notice/URI, and an indication of modifications if you adapted the material. — [SPDX CC-BY-4.0](https://spdx.org/licenses/CC-BY-4.0.html)
- Content warning from Google: “while this collection of drawings was individually moderated, it may still contain inappropriate content.” Hugging Face points to GitHub issues [74](https://github.com/googlecreativelab/quickdraw-dataset/issues/74) and [18](https://github.com/googlecreativelab/quickdraw-dataset/issues/18) for “problematic” sketches. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [Hugging Face](https://huggingface.co/datasets/google/quickdraw)
- Kaggle files are **not** the same legal wrapper: “License: Subject to Competition Rules” and “To see this data you need to agree to the competition rules.” — [Kaggle data page](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/data)

### Inferences
- Using GCS or Hugging Face files for a **local or published personal benchmark**, including training CNNs / sequence models and reporting scores, is the use Google invited (“explore, study, and learn from”), provided you keep CC BY attribution (e.g. “Quick, Draw! dataset © Google, Inc., CC BY 4.0”).
- Redistributing a 20–50 class subset (GitHub release, paper supplementary, Hugging Face dataset) is allowed as “Share… in part,” with attribution, license URI, and a note if you filtered or re-rasterized.
- Sending doodle images or strokes to a third-party vision/LLM API is **not forbidden by CC BY 4.0**—Sharing includes reproduction in any medium. Constraints that *do* apply: (1) you must still attribute if you publicly share outputs that include the material; (2) you cannot impose extra restrictions on recipients of the doodles themselves; (3) the API vendor’s terms (training-on-inputs, data retention, prohibited content) are a separate contract; (4) Google did not license the “Quick, Draw!” trademark as a product endorsement (CC BY §2(a)(6) / §2(b)(2)).
- Prefer the GCS/HF dump over Kaggle if the only goal is a side project: Kaggle’s competition rules are extra and the contest is long over.

### Gaps
- Direct fetch of `https://creativecommons.org/licenses/by/4.0/legalcode` was blocked in this session; the grant language above is from the SPDX reproduction of that legal code, not from creativecommons.org HTML.
- No Google “dataset terms of use” page beyond the GitHub LICENSE was found. If Google’s game ToS said something extra about player doodles, it was not located here.
- Whether specific commercial APIs’ training-on-customer-data clauses conflict with a researcher’s wishes is vendor-specific and not in the dataset license.

## Storage size: full set vs a stratified 20–50 class sample; easy vs abstract classes

### Takeaway
The full dump is tens of gigabytes even in the compact formats (order **~25–40 GB** simplified or 28×28 numpy; **~180 GB** raw for all 345 classes, extrapolated from `cat`). A 30-class afternoon subset is about **0.4–3 GB** depending on format. Many animal/object/food classes overlap a party drawing game; several classes are abstract shapes, homonyms, or culturally specific landmarks.

### Cited Findings
- Measured GCS sizes (May 2017 objects, still present Oct 2026):

  | Object | Bytes | MiB |
  |---|---:|---:|
  | `full/numpy_bitmap/cat.npy` | 96,590,448 | 92.1 |
  | `full/numpy_bitmap/hexagon.npy` | 111,669,120 | 106.5 |
  | `full/numpy_bitmap/The Mona Lisa.npy` | 95,164,352 | 90.8 |
  | `full/simplified/cat.ndjson` | 76,676,944 | 73.1 |
  | `full/simplified/squiggle.ndjson` | 46,987,790 | 44.8 |
  | `full/raw/cat.ndjson` | 521,081,210 | 496.9 |
  | `full/binary/cat.bin` | 19,571,324 | 18.7 |
  | `sketchrnn/cat.npz` | 14,842,947 | 14.2 |
  | `sketchrnn/cat.full.npz` | 22,019,949 | 21.0 |

  — GCS listings (this research pass)
- Uncompressed bitmap math from the official 28×28 spec and Hugging Face count: 50,426,266 × 784 bytes ≈ **39.53 GB** of pixel payload for all bitmaps, plus 345 small `.npy` headers. That matches “345 × ~90–110 MB files.”
- Kaggle bundle (raw+simplified train zips + tests): **244.4 GB**. — [Kaggle data](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/data)
- All 345 class names (id 0–344) as published by Hugging Face include both party-game nouns and abstract/hard labels. Examples of the latter from that table: `animal migration`, `camouflage`, `circle`, `hexagon`, `octagon`, `line`, `squiggle`, `zigzag`, `stitches`, `spreadsheet`, `yoga`, `The Eiffel Tower`, `The Great Wall of China`, `The Mona Lisa`, `see saw`. Party-adjacent animals/objects/food from the same table include e.g. `cat`, `dog`, `fish`, `bird`, `house`, `car`, `tree`, `flower`, `sun`, `pizza`, `apple`, `banana`, `hamburger`, `ice cream`, `hat`, `shoe`. — [Hugging Face class table](https://huggingface.co/datasets/google/quickdraw)
- Homonym / concept-mismatch example called out by Google: “in the category seesaw, we have observed a number of saw drawings.” — [Google AI Kaggle blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- Colin Morris (2017), using Sketch-RNN likelihood on the **flamingo** class: typical drawings are recognizable flamingos; the low-likelihood tail includes scribbles, cheating, wrong-category drawings (pineapple, compass), graffiti/NSFW, and atypical-but-valid poses. Google’s public gallery is described as already moderated but not clean. — [Finding bad flamingo drawings](https://colinmorris.github.io/blog/bad_flamingos)

### Inferences
- Rough **full-set** storage if `cat` is typical (mark as extrapolation, not a billed total):
  - 345 × 96.6 MB numpy ≈ **33 GB** (lower bound vs 39.5 GB payload math; use ~34–40 GB)
  - 345 × 73 MB simplified ≈ **25 GB**
  - 345 × 497 MB raw ≈ **171 GB**
  - 345 × 14.2 MB sketchrnn 75k `.npz` ≈ **4.9 GB**
- Stratified sample a solo developer can hold locally:
  - **20 classes × 75k Sketch-RNN `.npz`**: ~280 MB (`20 × 14.2 MB` if like `cat`)
  - **30 classes × 28×28 `.npy` (all drawings ~120k–140k each)**: ~2.8–3.2 GB
  - **30 classes × 500 drawings** taken from simplified ndjson: a few tens of MB after slicing (must download whole class files first unless using Hugging Face streaming)
  - **50 classes × 100–500 drawings** of both strokes and bitmaps: well under 1 GB **after** subsetting; download cost is the full per-class files unless you stream
- For overlap with a party drawing game, prefer concrete, single-object nouns (animals, food, vehicles, furniture, body parts). Avoid: geometric primitives (`circle`, `square`, `hexagon`, `line`, `zigzag`, `squiggle`), scene-level or mass nouns (`animal migration`, `rain`, `ocean`, `garden`), culturally specific Fine Art / landmarks (`The Mona Lisa`, `The Eiffel Tower`), and homonyms (`see saw` / saw, `bat` animal vs sports).
- `binary` `.bin` is the smallest stroke encoding of the **full** class (~19 MB for cat vs 73 MB simplified ndjson) if the custom parser in the GitHub examples is acceptable.

### Gaps
- No sourced total of `gs://quickdraw_dataset` from Google Cloud’s “bucket size” UI.
- No sourced ranking of “easy to sketch” beyond game design, the flamingo case study, and the seesaw/saw anecdote. Human sketchability was not measured here.
- Exact byte cost of “100–500 drawings per class” depends on stroke complexity; only full-file sizes are sourced.

## Known issues, game bias, label noise, and published train/test splits (including Kaggle)

### Takeaway
Labels are noisy by construction: 20-second game, early stop on recognition, prompt misunderstanding, scribbles, and residual NSFW. The two splits people actually cite are (1) Sketch-RNN’s **70k / 2.5k / 2.5k per class** random sample and (2) the 2018 Kaggle challenge’s **game-noisy train vs hand-labeled, shifted test**, scored with **MAP@3**.

### Cited Findings
- Google’s four-way taxonomy of label quality (2018):
  1. Correct, recognized only at the end
  2. Correct but **incomplete** because the computer recognized early (“probably fairly common in images that are marked as recognized correctly”)
  3. Correct but **never recognized**; players add detail or scribble out
  4. **Incorrect** (different concept for the word; seesaw vs saw)
  — [Google AI Kaggle blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- “The game generated more than 1B drawings, of which a subset was publicly released as the basis for this competition’s training set.” Training “comes from the game itself (where drawings can be incomplete or may not match the label)”; the challenge is to “perform well on a **manually-labeled test set from a different distribution**.” — [Kaggle overview](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/overview); [Google AI blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- Kaggle metric: MAP@3; up to 3 word guesses; spaces in official labels must become underscores (`roller coaster` → `roller_coaster`). — [Kaggle overview](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/overview)
- Kaggle participation (historical, page still up 2026): 7,156 entrants, 1,309 teams, 21,314 submissions; $25,000 prize; ended 4 Dec 2018. — [Kaggle overview](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/overview)
- A 14th-place writeup (competition era): trained on **all images including unrecognized**; validation = **500 images per class**; raster **224×224**; 3 channels = first 1/3, 2/3, and all strokes (stroke-order encoding). Public LB ~0.947 per model, 0.950 ensemble. — [pudae 14th place solution](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/pudae-14th-place-solution)
- Sketch-RNN / Magenta split (the one with files on GCS): 70,000 / 2,500 / 2,500 **randomly selected** per category; `.full.npz` adds extra training strokes but keeps the same 2.5k/2.5k val/test according to Hugging Face (`sketch_rnn_full` train 43,988,874 ≠ 345×70k). RDP ε=2.0. Paper Table 1 lists the original 75 classes used in that work. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [arXiv:1704.03477 supplement](https://arxiv.org/abs/1704.03477); [Hugging Face Data Splits](https://huggingface.co/datasets/google/quickdraw)
- Full raw/simplified/bitmap configs on Hugging Face have **no** train/val/test split: everything is `train` (50,426,266). — [Hugging Face](https://huggingface.co/datasets/google/quickdraw)
- Morris 2017 flamingo study: wrong-category drawings, scribbles after failure, graffiti, and “have you ever even seen a flamingo?” drawings exist **inside a single prompt file**. The public website gallery is filtered more aggressively than the download. — [bad flamingos](https://colinmorris.github.io/blog/bad_flamingos)
- Stroke order/direction “often helps making handwriting recognizers better” vs rendering as images. — [Google AI blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- Device heterogeneity: raw `x,y` are real-valued with “vastly different bounding boxes.” — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)

### Inferences
- A small comparative study should **not** invent a new random split and then compare to published Sketch-RNN or Kaggle numbers. Use:
  - **Sequence methods / Sketch-RNN-style:** official `sketchrnn/{class}.npz` 70k/2.5k/2.5k
  - **“Can we beat the game recognizer” / noisy-train realism:** Kaggle files + MAP@3, accepting 340 classes and competition rules
  - **Quick local CNN vs sequence bake-off:** draw a **new** stratified split from GCS, and say so; do not mix Kaggle’s hidden test
- Recognition-game bias: models trained only on `recognized=true` overfit incomplete canonical doodles; models trained on all strokes see scribble-outs. Either choice should be reported.
- Multiple objects / extra detail are not annotated; there is no instance segmentation. One `word` per drawing.

### Gaps
- Kaggle test-set size, class list (the missing 5), and whether test CSVs remain downloadable without accepting rules were not visible behind the login wall (data page states 244.4 GB total).
- No official percentage of incorrect or incomplete labels.
- TensorFlow r1 recurrent_quickdraw tutorial file was empty when fetched; that tutorial’s split (if any) is not sourced here.

## Preprocessing: ndjson strokes → Sketch-RNN format and → rasters (canvas, stroke width)

### Takeaway
Simplified ndjson is already in a **256×256, RDP ε=2.0** stroke space. Sketch-RNN wants **stroke-3** (Δx, Δy, pen-up) in `.npz`, converted on the fly to **stroke-5** with a start token. Official bitmaps are **28×28**, bbox-centered, from those simplified strokes. Re-rasterizing at 224×224 with thicker strokes and stroke-order channels was a winning Kaggle practice and will **not** match 28×28 CNN numbers.

### Cited Findings
- Simplified pipeline (canonical): top-left align; scale max coordinate to 255; resample 1 px; RDP ε=2.0; **no timestamps**. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Official bitmaps: rendered from simplified data, **28×28 grayscale**, **centered on the drawing’s bounding box** (not the top-left alignment of the ndjson). — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- Sketch-RNN on-disk format is **stroke-3**: list of `(Δx, Δy, p)` with `p=1` if the pen is lifted after that point. Magenta `DataLoader` converts to **stroke-5** `(Δx, Δy, p1, p2, p3)` automatically. Paper: initial absolute coordinate at origin; `p1` pen-down (draw to next), `p2` pen-up after this point, `p3` end of sketch. Suggested max sequence length **< 250**; paper RDP ε=**2.0**; offsets in the paper were then scaled so training-set Δx,Δy have **std 1**. — [Magenta sketch_rnn README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md); [arXiv:1704.03477 §3.1](https://arxiv.org/abs/1704.03477)
- Hugging Face documents the exact stroke-3 → stroke-5 padding used as Sketch-RNN input: zero array `(max_len, 5)`; copy Δx,Δy; `result[:,3] = pen_up`; `result[:,2] = 1 - pen_up`; remaining rows `p3=1`; **prepend** `[0, 0, 1, 0, 0]`. — [Hugging Face sketch_rnn notes](https://huggingface.co/datasets/google/quickdraw)
- Conversion from raw ndjson to Sketch-RNN npz: [hardmaru/quickdraw-ndjson-to-npz](https://github.com/hardmaru/quickdraw-ndjson-to-npz) — “Stroke-5 format with RDP at variable epsilon”; notebook “target length to be 200 steps.” `util.py` comments: stroke-3 vs stroke-5; `stroke_to_quickdraw` rescales by `255.0/max_dim_size` and **clamps to 0–255**; `create_image` rasterizes with `IMAGE_SIZE` and 1-pixel Bresenham-style lines (`pixels[...]=1`). — [util.py](https://github.com/hardmaru/quickdraw-ndjson-to-npz/blob/master/util.py)
- Kaggle high-placing raster choice: **224×224**, three channels encoding stroke progress (1/3, 2/3, all strokes), no augmentation in that writeup. — [14th place solution](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/pudae-14th-place-solution)
- Magenta visualization helper uses SVG `stroke_width = 1` at a `factor=0.045` scale (display, not training). — [Hugging Face visualization snippet](https://huggingface.co/datasets/google/quickdraw)

### Inferences
- Path **ndjson → Sketch-RNN** for a small study: download `sketchrnn/{class}.npz` and skip DIY unless you need a custom ε or length cap. If DIY: simplified ndjson → per-stroke polylines → RDP (already done if simplified) → convert absolute (x,y) to Δx,Δy with pen-up at stroke ends → save `train/valid/test` arrays → Magenta loader does stroke-5.
- Path **ndjson → vision/CNN raster**:
  - **Match Google’s published 28×28 files:** just load `.npy` (do not re-render).
  - **Match Kaggle-style modern CNNs:** render simplified 256-space strokes onto a larger canvas (e.g. 224 or 256) with anti-aliased **stroke width > 1 px**; 1-px lines on 28×28 drop most of the path. Center vs top-left alignment is a documented difference between `.npy` and ndjson and will shift features if mixed.
- Stroke width and canvas size are not a single official “accuracy-maximizing” choice; the only **official** raster is 28×28. Published recognition numbers from Kaggle used much larger canvases. A fair method comparison must freeze one rasterizer for all bitmap methods.

### Gaps
- The actual Python snippet in [issue 19](https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262) (line width, invert, uint8 scale) did not load in this session; official 28×28 stroke width is therefore **not quoted**.
- No sourced ablation from Google of 28×28 vs 224×224 vs stroke width on the same split.
- Whether `.npy` values are `{0,255}` or `{0,1}` was not read from a file (binary `.npy` was listed, not downloaded).

## Concrete minimal download a person can finish in an afternoon

### Takeaway
Do **not** download raw ndjson or the Kaggle 244 GB bundle. For a 20–30 class bake-off that supports **both** stroke and bitmap methods, the smallest honest package is the Sketch-RNN `.npz` files (built-in split, ~14 MB/class) plus either the matching 28×28 `.npy` (~100 MB/class) or on-the-fly rasterization from those npz files.

### Cited Findings
- HTTPS one-liner pattern (worked for `cat` listing in Oct 2026):
  - Strokes with official split: `https://storage.googleapis.com/quickdraw_dataset/sketchrnn/cat.npz`
  - Full-class strokes: `https://storage.googleapis.com/quickdraw_dataset/sketchrnn/cat.full.npz`
  - 28×28 bitmaps: `https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap/cat.npy`
  - Simplified strokes (all drawings, no split): `https://storage.googleapis.com/quickdraw_dataset/full/simplified/cat.ndjson`
  - Bulk: `gsutil -m cp 'gs://quickdraw_dataset/full/simplified/*.ndjson' .` — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); GCS (this pass)
- `cat.npz` = 14.8 MB; `cat.npy` = 96.6 MB; `cat.ndjson` simplified = 76.7 MB; `cat.ndjson` raw = 521 MB. — GCS sizes above
- Hugging Face can stream configs without saving 50M rows locally (`load_dataset("google/quickdraw", ...)`); the card still points at the same GCS-backed dump. — [Hugging Face](https://huggingface.co/datasets/google/quickdraw)
- Sketch-RNN files already contain 70k/2.5k/2.5k splits, RDP ε=2.0, stroke-3. — [README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)

### Inferences
- **Afternoon plan A (recommended, both modalities, ~0.4–3.5 GB, 20–30 classes):**
  1. Pick 20–30 party-game classes from the 345-name list (e.g. `cat, dog, fish, bird, flower, house, car, tree, apple, pizza, hat, shoe, cup, guitar, airplane` — names exist in the official list).
  2. Download `sketchrnn/{class}.npz` for each (~14 MB × 30 ≈ **420 MB**, minutes on broadband).
  3. **Either** rasterize stroke-3 to a frozen canvas (256 or 224, documented stroke width) **or** download `full/numpy_bitmap/{class}.npy` (~3 GB for 30 classes) if the study must include Google’s 28×28 representation.
  4. Score on the **npz test split** (2,500/class) so sequence and bitmap methods see the same key_ids’ sketches (bitmap methods must render those test strokes, not a random slice of `.npy`, if the comparison is to be paired).
- **Afternoon plan B (bitmap-only, MNIST-like):** 10–20 `.npy` files (~1–2 GB). No official test split; hold out e.g. last 2,500 rows **only if** you document that this is **not** the Sketch-RNN split (row order is not sourced as matching).
- **Avoid in an afternoon:** `full/raw/*.ndjson` (~0.5 GB **per class**), Kaggle `train_raw.zip` / 244 GB, and unfiltered 345-class numpy (~35–40 GB).
- Attribution line to keep with the local subset: Quick, Draw! dataset © Google, Inc., [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

### Gaps
- Download bandwidth and whether `gsutil -m` still works without a GCP project were not tested (HTTPS GET of object metadata succeeded; full object bodies were not downloaded).
- Pairing `.npy` rows with `.npz` examples is **not** documented as aligned; for a paired stroke-vs-bitmap comparison, generate both views from the same stroke file rather than assuming the numpy dump shares order with Sketch-RNN npz.
- A “100–500 drawings per class” slice requires a sampling script; Google does not ship a mini-subset archive.

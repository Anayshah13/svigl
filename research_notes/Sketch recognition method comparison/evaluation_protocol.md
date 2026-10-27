# Sketch recognition bake-off evaluation protocol

Notes for a solo-developer comparison of several sketch-recognition methods on the same Google Quick, Draw! samples. Methodology only. No published model accuracies are quoted. Sample-size numbers below are derived from the cited McNemar power formula, with arithmetic shown.

## Primary metrics: top-1, top-3, macro-F1, refusal

### Takeaway
Primary headline is **top-1 accuracy** on a frozen, paired test set of drawing IDs. Also report **top-3** (and MAP@3 if a method returns a ranked list), **macro-F1** when class counts are unbalanced or when comparing a small game set to 345-way, and a **refusal / coverage / selective-accuracy** triple whenever a method can abstain.

### Cited Findings
- In single-label multiclass problems, micro-averaged precision, recall, and F1 equal overall accuracy, so they are redundant with top-1; macro-F1 averages per-class F1 with equal class weight and is the metric that exposes minority-class failure. — [Macro vs Micro Average for Classification, MetricGate](https://metricgate.com/blogs/macro-vs-micro-average-classification/); [Selecting and Interpreting Multiclass Loss and Accuracy Assessment Metrics, Remote Sensing 16(3)](https://www.mdpi.com/2072-4292/16/3/533)
- Macro recall is the unweighted mean of per-class recall; macro precision is the unweighted mean of per-class precision; the paper also notes a common variant that takes the harmonic mean of those two averages. Per-class F1 then macro-averaged is the usual software default (sklearn-style). — [Selecting and Interpreting Multiclass Loss and Accuracy Assessment Metrics](https://www.mdpi.com/2072-4292/16/3/533)
- The Kaggle Quick, Draw! Doodle Recognition Challenge scored submissions with **MAP@3**: three ranked guesses; a hit at rank 1/2/3 scores 1, 1/2, 1/3; miss scores 0; average over images. MAP@1 is ordinary top-1 accuracy. — [artyompal/kaggle_quick_draw](https://github.com/artyompal/kaggle_quick_draw); [Stanford CS229 Quick, Draw! report](https://cs229.stanford.edu/proj2018/report/98.pdf); [Google Research blog introducing the Kaggle challenge](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- A selective classifier is a pair \((f,g)\): predict \(f(x)\) if \(g(x)=1\), else “don’t know”. **Coverage** \(\Phi = \mathbb{E}[g(X)]\). **Selective risk** is expected loss on the accepted subset. — [El-Yaniv & Wiener, JMLR 2010](https://jmlr.org/papers/volume11/el-yaniv10a/el-yaniv10a.pdf); [Geifman & El-Yaniv, Selective Classification for Deep Neural Networks](https://arxiv.org/html/1705.08500v2)
- Naive accuracy that folds abstentions into ordinary precision/recall distorts the picture; report abstention separately as coverage vs selective accuracy. — [Classification metrics, neurals](https://neurals.ca/agents/concepts/classification-metrics/)
- This app’s live Gemini scorer already returns up to three guesses and scores a hit with exact match after lowercasing, collapsing punctuation/hyphens, and stripping a leading article; off-list strings are kept. — local `frontend/features/ai-guesser/words.ts` comment and `backend/app/services/ai_guesser_week.py` `answers_match`; tests in `backend/tests/test_ai_guesser.py` (`test_normalize_keeps_off_list_answers`)

### Inferences
- Define, for each drawing \(i\) with gold class \(y_i\) and a ranked list \(\hat{y}_{i,1},\ldots,\hat{y}_{i,k}\) (pad with a distinguished `REFUSE` or empty):
  - Top-1: \(\mathrm{Acc}_1 = \frac{1}{N}\sum_i \mathbf{1}[\hat{y}_{i,1}=y_i]\) treating refuse as wrong.
  - Top-3: \(\mathrm{Acc}_3 = \frac{1}{N}\sum_i \mathbf{1}[y_i \in \{\hat{y}_{i,1},\hat{y}_{i,2},\hat{y}_{i,3}\}]\).
  - MAP@3: \(\frac{1}{N}\sum_i \sum_{k=1}^{3} P_i(k)\) with \(P_i(k)=1/k\) if the first hit is at rank \(k\), else 0 (Kaggle formula).
  - Per-class \(F1_c = 2P_c R_c/(P_c+R_c)\); \(\mathrm{macro\text{-}F1} = \frac{1}{C}\sum_c F1_c\). Compute this only over classes present in the eval set; if a method never predicts class \(c\), \(P_c=0\) when it has support.
  - Refusal rate \(r = 1-\hat{\Phi} = \frac{1}{N}\sum_i \mathbf{1}[g(x_i)=0]\). Selective accuracy = top-1 among \(g=1\) only. Always publish both Acc1-with-refuse-as-wrong (game-relevant) and selective accuracy (model-honesty).
- Closed-set softmax models almost never refuse unless a confidence threshold is added; VLMs can emit “unknown”. Apply the same refusal policy to every method that can abstain, or they are not comparable on Acc1.
- With a **stratified** sample (equal drawings per class), top-1 and macro-accuracy coincide; macro-F1 can still differ because it uses precision. Unbalanced sampling (raw QuickDraw class sizes vary) makes micro/top-1 majority-dominated.

### Gaps
- No official Google document was found that names a single required primary metric for a research bake-off outside Kaggle MAP@3. Top-1 is the natural game metric; MAP@3 is the historical competition metric.
- Exact sklearn vs “harmonic mean of macro-P and macro-R” can differ slightly; freeze one implementation and version it.

## Mapping Gemini free text onto a QuickDraw label

### Takeaway
Accepted practice for **closed-set vision** is not to generate free text at all: score every class name (CLIP-style). If Gemini generates language, the **primary scoring rule** should be **normalized exact match to the canonical class string** (same normalize the game already uses). Use a **frozen, versioned synonym table or nearest-class-name embedding** only as a sensitivity check, never as the headline, because fuzzy credit systematically inflates open-vocab models and can merge distinct QuickDraw classes.

### Cited Findings
- CLIP evaluates zero-shot classification by embedding the image and each candidate class via prompt templates such as “a photo of a {label}”, then taking argmax cosine similarity over the **fixed label set**. Official prompt files list per-dataset class names and templates; some classes use multiple names. CLIP is “sensitive to wording or phrasing and sometimes require[s] trial and error prompt engineering.” — [OpenAI CLIP announcement](https://openai.com/index/clip/); [openai/CLIP data/prompts.md](https://github.com/openai/CLIP/blob/main/data/prompts.md)
- Standard VQA scoring is exact match after a documented normalize (lowercase, strip articles a/an/the, number words to digits, punctuation rules), compared against human answers; it does **not** use embeddings. — [VQA evaluation](https://visualqa.org/evaluation.html)
- Open-ended VQA work argues exact match is too strict (synonyms like batter/batsman) and proposes Alternative Answer Sets from WordNet/BERT plus entailment filtering; they also cite older WUPS (Wu–Palmer) soft match. They note the union of synonym sources is **noisy** (e.g. “man” appearing in the AAS of “woman”) and must be filtered. — [Luo et al., EACL 2021](https://aclanthology.org/2021.eacl-main.240.pdf); [DOI page](https://doi.org/10.18653/v1/2021.eacl-main.240)
- A later VQA paper treats Exact Match as an inflexible pattern that under-credits generative MLLMs and studies semantic evaluators as an alternative, i.e. the field still treats EM as the conservative baseline. — [Towards Flexible Evaluation for Generative Visual Question Answering, arXiv:2408.00300](https://doi.org/10.48550/arxiv.2408.00300)
- WordNet path-similarity > 0.8 as a synonym rule appears in at least one public VQA eval script. — [VisionXLab/LRS-VQA evaluation_LRSVQA.py](https://github.com/VisionXLab/LRS-VQA/blob/main/Script/evaluation_LRSVQA.py)
- QuickDraw itself has fine-grained near-duplicates (the CS229 writeup explicitly names “cake” vs “birthday cake”). — [Stanford CS229 Quick, Draw! report](https://cs229.stanford.edu/proj2018/report/98.pdf)
- This product already chose exact match after normalize and **never sends the word list to Gemini** in the live game. — `frontend/features/ai-guesser/words.ts`
- Prompted synonym generation for CLIP (S³) exists as a **model improvement**, not as an evaluation standard: it raises measured accuracy by expanding each class’s text, which would bias a bake-off toward the open-vocab system if used only on Gemini. — [Cao et al., arXiv:2412.04925](https://arxiv.org/abs/2412.04925)

### Inferences
- **Primary rule (freeze before the run):**
  1. Apply the same `normalize_answer` as production (lowercase; `&` → `and`; non-alnum → space; collapse whitespace; strip leading `a`/`an`/`the`).
  2. Exact string equality with the canonical QuickDraw `word` (or the game secret).
  3. Optional closed-set **snap**: if the guess is not exact, it is wrong for primary Acc1 — do **not** nearest-neighbor it.
  4. If the experimental condition is “Gemini constrained to a word list”, that is a **different method**: the list is part of the prompt or decoder; scoring remains exact match. Do not mix open-vocab and constrained runs in one accuracy number.
- **Sensitivity check (report in an appendix table, same drawings):**
  - Frozen synonym table: for each class, a short list of aliases written **before** seeing model outputs (e.g. `airplane`/`aeroplane`/`plane`; `cell phone`/`mobile phone`). Version the file. A guess matches iff its normalize hits the class or an alias, and aliases must not collide across classes (if they do, the collision is a protocol bug).
  - Embedding check: embed the normalized guess and all class names with a **named, frozen** sentence embedder; accept if \(\arg\max_c \cos(g,c)\) equals gold **and** \(\cos \ge \tau\) with \(\tau\) registered in advance (e.g. 0.85). Guesses below \(\tau\) stay wrong. This is CLIP’s closed-set idea applied **after** generation, which is strictly more lenient than CLIP’s “score all labels” protocol.
- **Bias of fuzzy matching:** (1) credits semantically close **wrong** classes that QuickDraw treats as distinct (dog/wolf, mouse animal vs computer mouse if both exist, cake/birthday cake); (2) open-vocab models gain more than softmax CNNs, so the gap is not an apples-to-apples accuracy delta; (3) synonym tables are incomplete and favor English lexical variation the author happened to list; (4) an embedder may have seen QuickDraw or class names in pretraining, leaking label structure.
- **Fairer alternative to post-hoc mapping:** also run Gemini in CLIP style — send the image plus the class list and ask for a ranked choice among those strings. That method is closed-set and comparable to a CNN. Keep open-vocab Gemini as a separate row (what the live game actually does).

### Gaps
- No standard “Gemini → QuickDraw class” cookbook was found. The recommendation is transferred from CLIP closed-set eval plus VQA exact-match practice.
- No public, complete synonym table for all 345 QuickDraw names was located; building one is in-scope only as a frozen sensitivity file, not as exhaustive linguistics.

## Sample size, stratification, seed, McNemar / paired bootstrap

### Takeaway
A **5 percentage-point** paired accuracy gap is detectable at \(\alpha=0.05\), 80% power with on the order of **1,100 drawings** if errors were independent, and **~470** if the methods disagree on only 15% of items. Stratify equally by class; fix the RNG seed; pre-register the ID list. McNemar (or exact binomial on discordant pairs) is the right test for two methods on one frozen test set; paired bootstrap is the right interval for any metric including macro-F1.

### Cited Findings
- Dietterich (1998): for comparing two **already trained classifiers** on one test set, **McNemar’s test has low Type I error** and is the only recommended test among those studied when each algorithm can be run only once. A test of two independent proportions, and a paired t-test over random train/test splits, should not be used (high Type I error). 5×2 CV is for comparing **learning algorithms** that can be retrained, not API vs CNN bake-offs. — [Dietterich, Neural Computation 1998](https://doi.org/10.1162/089976698300017197); [author PDF](https://web.engr.oregonstate.edu/~tgd/publications/dietterich-approximate-statistical-tests-nc1998.pdf)
- McNemar 2×2 on the same items: \(n_{01}\) = A wrong, B right; \(n_{10}\) = A right, B wrong. Continuity-corrected statistic \(\chi^2 = (|n_{01}-n_{10}|-1)^2 / (n_{01}+n_{10})\). Use **exact binomial** on \(n_{01}+n_{10}\) when discordant count \(< 25\). Concordant cells do not enter the statistic. — [mlxtend McNemar user guide](https://rasbt.github.io/mlxtend/user_guide/evaluate/mcnemar/); [NCBI StatPearls McNemar](https://www.ncbi.nlm.nih.gov/books/NBK560699/); [UBC notes on statistical tests for classifiers](https://www.cs.ubc.ca/labs/lci/robuds/docs/McCann%20-%20Statistical%20Tests%20for%20Comparing%20Classifiers.pdf)
- Connor (1987) sample size for McNemar, as implemented and simulation-checked by Dackohn: with \(\psi = p_{10}+p_{01}\) (disagreement rate), \(\delta = p_{10}-p_{01}\) (accuracy gap),
  \[
  n = \frac{\bigl(z_{1-\alpha/2}\sqrt{\psi} + z_{1-\beta}\sqrt{\psi-\delta^2}\bigr)^2}{\delta^2}.
  \]
  Independent-error 80% vs 75% needs **1,097** items; 15% disagreement needs **469**. — [How Many Eval Items Do I Need?](https://dackohn.com/stats/tools/llm-eval-sample-size.html); Stata documents the same paired-proportions / McNemar power problem. — [Stata power pairedproportions](https://www.stata.com/manuals/pss-2powerpairedproportions.pdf)
- Paired bootstrap: resample the **same** \(N\) items with replacement, keeping both methods’ outcomes glued together; Koehn (2004) counts how often A beats B; Berg-Kirkpatrick, Burkett & Klein (2012) estimate a one-sided p-value as the fraction of bootstrap samples with \(\delta(x^{(i)}) > 2\delta(x)\), using \(b=10^6\). Applies to F1/BLEU/accuracy. — [Koehn, W04-3250](https://aclanthology.org/W04-3250.pdf); [Berg-Kirkpatrick et al. 2012](http://nlp.cs.berkeley.edu/pubs/BergKirkpatrick-Burkett-Klein_2012_Significance_paper.pdf); [Neubig paired-bootstrap.py](https://github.com/neubig/util-scripts/blob/master/paired-bootstrap.py)
- Sketch-RNN / Magenta already defined per-class splits of 70k train / 2.5k val / 2.5k test. — [Ha & Eck, arXiv:1704.03477](https://arxiv.org/pdf/1704.03477); [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)

### Inferences — worked numeric example (derived, not published accuracy)

Goal: two-sided \(\alpha=0.05\) (\(z_{1-\alpha/2}=1.96\)), power \(1-\beta=0.80\) (\(z_{1-\beta}\approx 0.8416\)), detect \(\delta=0.05\) (five points of accuracy).

**Independent-errors upper bound**, typical moderate accuracy \(p_A=0.80\), \(p_B=0.75\):
\[
p_{10}=0.80\times 0.25=0.20,\quad p_{01}=0.20\times 0.75=0.15,\quad \psi=0.35.
\]
\[
n=\frac{(1.96\sqrt{0.35}+0.8416\sqrt{0.35-0.0025})^2}{0.0025}
=\frac{(1.96\times 0.5916 + 0.8416\times 0.5895)^2}{0.0025}
=\frac{(1.1595+0.4961)^2}{0.0025}
=\frac{2.741}{0.0025}=1096.4 \approx \mathbf{1{,}097}.
\]
This reproduces Dackohn’s published 1,097.

**Correlated methods**, same \(\delta=0.05\), disagreement \(\psi=0.15\) (related models often 5–15%):
\[
n=\frac{(1.96\sqrt{0.15}+0.8416\sqrt{0.15-0.0025})^2}{0.0025}
=\frac{(1.96\times 0.3873 + 0.8416\times 0.3841)^2}{0.0025}
=\frac{(0.7591+0.3233)^2}{0.0025}
=\frac{1.1716}{0.0025}=468.6 \approx \mathbf{469}.
\]
**Conservative protocol for a 5-point claim:** budget **N ≥ 1,100** paired drawings (independence bound), plus a 100–200 item **pilot** to measure \(\psi\) and optionally shrink. If the live gap is 5 points but \(\psi\) is tiny, McNemar can still be significant at smaller N; if \(\psi\) is large, you need the 1,100.

**Stratify.** Let \(C\) be the number of classes in the closed set.
- Game-sized closed set (this repo’s `AI_GUESSER_WORDS` is a few hundred strings, many **not** QuickDraw classes): pick the intersection with QuickDraw, then \(n_c = \lceil N/C\rceil\) per class. Example: \(C=20\), \(N=1{,}200\) → **60 drawings/class**.
- Full 345-way: \(N=1{,}100\) → only **~3 drawings/class**, enough for **global** Acc1 but **useless** for macro-F1 or per-class CIs. For 345-way macro-F1, take at least **10–20 per class** → \(N=3{,}450\)–\(6{,}900\). That is still far below Magenta’s 2,500 test/class.
- Sampling: `key_id` is unique across drawings. Draw without replacement from the **safe split** (see Leakage). Record `seed`, `C`, per-class counts, and the ID list as an artifact.

**Multiple methods.** \(M\) methods imply \(\binom{M}{2}\) McNemar tests. Use Holm–Bonferroni on those p-values, or report bootstrap CIs on each pairwise \(\delta\) without claiming a tournament winner. Do **not** pick the best method on the same set you test (no peeking / no test-set tuning of prompts or raster params).

**Paired bootstrap CI for Acc1 (transparent recipe):** for \(b=10{,}000\) (10^6 is gold, 10^4 is enough for a side project), resample indices \(i_1,\ldots,i_N\) with replacement; compute \(\widehat{\mathrm{Acc}}_A^{(b)}-\widehat{\mathrm{Acc}}_B^{(b)}\); 95% CI = 2.5th and 97.5th percentiles. Same indices for every method.

### Gaps
- Connor 1987 original paper was not fetched; the formula is taken from Dackohn’s page (which states a 20,000-eval simulation check) and is consistent with Stata’s paired-proportions framework.
- Power for **macro-F1** has no equally simple closed form; use the bootstrap on the planned \(N\), or inflate \(N\) to 10+/class as above.

## Paired design: same drawing IDs, different input tensors

### Takeaway
Pairing means **the same `key_id`s**, not the same tensor. Stroke-order models consume the vector sketch; bitmap models consume a raster. Document rasterization as a frozen preprocessor with parameters, and treat “same PNG sent to Gemini and to the CNN” as one pairing, while the RNN sees the aligned stroke list of that same ID.

### Cited Findings
- QuickDraw **raw** records `key_id`, `word`, `recognized`, `timestamp`, `countrycode`, and strokes as parallel `x`,`y`,`t` lists. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- **Simplified drawings:** align to top-left (min 0), uniform scale so max=255, resample strokes at 1 px, Ramer–Douglas–Peucker \(\epsilon=2.0\). Timing is dropped. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- **28×28 bitmaps:** generated from simplified strokes but **centered on the bounding box** (not top-left). Default HF config puts **all 50,426,266 bitmaps in “train”** with no test split. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Sketch-RNN format is a sequence of \((\Delta x, \Delta y, p_1,p_2,p_3)\) pen states, start token \((0,0,1,0,0)\), RDP \(\epsilon=2.0\), 75k samples/class. The model is a **generative** seq2seq VAE, not a classifier. — [Ha & Eck 2017](https://arxiv.org/pdf/1704.03477); [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Google’s Kaggle writeup: strokes “can easily be rendered as images” but “**using the order and direction of strokes often helps making handwriting recognizers better**.” Labels include incomplete drawings because the game stops on early recognition. — [Google Research blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- A Kaggle solution notes packing vector info into a 3-channel RGB raster as a non-trivial design choice (stroke-order encodings in extra channels). — [artyompal/kaggle_quick_draw](https://github.com/artyompal/kaggle_quick_draw)

### Inferences
- **What must be identical across methods:** `key_id` list; gold `word`; whether `recognized` is used as a filter; random seed; evaluation code and matching rule; refusal policy; number of guesses allowed (1 vs 3); wall-clock definition; cost accounting; **no test-set peeking**.
- **What cannot be identical:** the input representation.
  - Stroke RNN / Sketch-RNN encoder: ordered, oriented, possibly timed strokes.
  - CNN / Gemini vision / image APIs: pixels. Stroke order is gone unless you encode it into extra channels (then document the encoding — that is part of the method).
- **Rasterization card (write once, freeze):**
  - Source: raw vs simplified.
  - Canvas: 256×256 vs 28×28 vs the PNG size sent to Gemini (must be explicit; Gemini 3 default image tokenization is **1,120 tokens** at unspecified/`high` media resolution). — [Gemini media resolution](https://ai.google.dev/gemini-api/docs/media-resolution)
  - Line width, anti-aliasing, white-on-black vs black-on-white, padding, centering vs top-left, stroke vs fill.
  - Whether all strokes or a time-prefix (partial drawing) are drawn.
  - Hash of the PNG for each `key_id` so a later method can reuse bytes exactly.
- **Sketch-RNN as a “classifier”:** official Sketch-RNN **does not output class scores**. Fair options: (a) mark it out of the classifier bake-off and only show generation samples; (b) train/use **class-conditional** likelihood \(p(x\mid c)\) and pick \(\arg\max_c p(x\mid c)\) (expensive, \(C\) forwards); (c) use a separate stroke-RNN **classifier** (different paper/code, e.g. encoder + softmax). Do not score reconstructions as if they were labels.
- Pairing still reduces variance for McNemar even when tensors differ, because the **semantic difficulty** of drawing \(i\) is shared.

### Gaps
- The original 28×28 generation script is cited by HF (“code that was used for generation is available here”) but the live GitHub page was not successfully fetched in this pass; copy the HF description into the raster card and, at run time, pin a specific renderer commit.

## Secondary metrics: latency, cost, partial drawings

### Takeaway
For a game, report **median and p95 latency**, **USD per 1,000 scored guesses** from actual usage metadata, and treat **accuracy on complete QuickDraw finals as an optimistic bound** relative to in-progress strokes. Partial-stroke accuracy is a separate, optional slice, not the primary number, unless you reconstruct prefixes from raw timestamps.

### Cited Findings
- Gemini Developer API paid list price for `gemini-3.5-flash-lite` (the model name already defaulted in this app’s `backend/app/config.py`): **$0.30 / 1M input tokens**, **$2.50 / 1M output tokens** including thinking, Standard tier; Batch/Flex $0.15 / $1.25. — [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing); [What’s new in Gemini 3.6 Flash and 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6)
- Gemini 3 image tokens by `media_resolution`: low 280, medium 560, high/unspecified **1120**, ultra_high 2240. Pre-Gemini-3 images: 258 tokens per 768×768 tile (or 258 if both dimensions ≤384). — [Media resolution](https://ai.google.dev/gemini-api/docs/media-resolution); [Understand and count tokens](https://ai.google.dev/gemini-api/docs/generate-content/tokens); [Vertex image understanding](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-understanding)
- QuickDraw game: 20 seconds, computer may accept **before the drawing is finished**; “Correct, but incomplete” is common among `recognized=true`. Incorrect concepts (e.g. saw for seesaw) also exist. — [Google Research Kaggle intro](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/)
- Raw data includes per-point times `t` in ms, so prefixes are reconstructable; simplified and 28×28 formats drop time. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Local game already times prompts (`PROMPT_LIMIT_MS` in `ai_guesser_week.py`) and caps Gemini with `gemini_timeout_seconds` (default 18s) in `backend/app/config.py`.

### Inferences
- **Latency:** \(T_i\) = wall clock from “bytes handed to the method” to “parsed guess list returned”. Exclude dataset I/O; **include** rasterization if the game would rasterize live. Report median, p95, and timeout/error rate. Cold-start the first call separately so p95 is not dominated by one DNS hit.
- **Cost:**
  \[
  \mathrm{USD}/1000 = 1000 \times \frac{1}{N}\sum_i \bigl(n^{\mathrm{in}}_i \cdot p_{\mathrm{in}} + n^{\mathrm{out}}_i \cdot p_{\mathrm{out}}\bigr)/10^6
  \]
  using **response usage metadata**, not a token guess. Thinking tokens count as output at $2.50/1M for Flash-Lite. Local CNN/RNN: report GPU-hours or $0 API; do not pretend they are free if they use a paid host.
- **Worked cost illustration (not a measurement):** one Flash-Lite call, Gemini 3 default image 1,120 tokens + 200 text input + 80 output (no long thinking):
  \[
  (1320\times 0.30 + 80\times 2.50)/10^6 = (396+200)/10^6 = \$0.000596
  \]
  → **≈ $0.60 per 1,000 guesses**. High thinking or `ultra_high` images move this by several×. Budget cap = \((N \times M_{\text{paid}} \times \text{cost/call} \times 1.3)\) for retries.
- **Partial drawings:** primary set should be **final stored strokes** (what public files contain). Limitation: that overstates early-guess accuracy for a timed game. Optional secondary slice: from **raw** files, cut strokes at 30%/50%/70% of duration `t[-1]`, re-rasterize, score. Do not use simplified files for this. `recognized=true` is a biased “easy/incomplete” mix, not a clean complete-drawing flag.

### Gaps
- Jev (third-party decision model) does not appear in this repository; no public pricing was researched under that name. Cost/latency for Jev is blocked until the user names the product and contract.
- Flash-Lite thinking-token volume per sketch guess is unknown until a pilot; cost must be empirical.

## Leakage: do not score on training drawings

### Takeaway
Never evaluate a model on drawings it was trained on. The **safe default** is the Magenta/Sketch-RNN **held-out test `key_id`s** (2,500/class) for any method trained only on the matching train split. Public 28×28 dumps have **no test split** (all 50.4M marked train). If a CNN was trained on “all QuickDraw,” public IDs are contaminated; then the only fair options are **new drawings**, **classes the CNN never saw**, or a private labeled set you do not have.

### Cited Findings
- HF: `raw` / `preprocessed_simplified_drawings` / `preprocessed_bitmaps` — **all data in the training split**, 50,426,266 examples. `sketch_rnn`: 24,150,000 train / 862,500 val / 862,500 test (70k / 2.5k / 2.5k × 345). `sketch_rnn_full` still uses the same 862,500 val/test, with 43,988,874 train. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Ha & Eck: 70k train + 2.5k val + 2.5k test per class. — [arXiv:1704.03477](https://arxiv.org/pdf/1704.03477)
- Kaggle challenge: train labels come from the **noisy game**; the leaderboard test set was **manually labeled and from a different distribution**. Local vs public LB gaps of ~5 points were widely reported. About 10% of samples per class were `non-recognised`. — [Google Research blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/); [Kaggle discussion 67997](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/discussion/67997)
- HF curation note: “The annotations are machine-generated and match the category the player was prompted to draw.” — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)

### Inferences
- **Protocol, in order of fairness:**
  1. **Preferred:** sample the eval set from Sketch-RNN **test** IDs (or Kaggle private test if possessed — assume not). Train/fine-tune classical models only on the corresponding train split. Gemini/Jev, if never trained on QuickDraw by you, may still have seen sketches on the web; state that residual contamination cannot be ruled out.
  2. **If the CNN checkpoint card says “trained on QuickDraw / all 50M / ndjson”:** do **not** use any public QuickDraw ID. Options: (a) hold out **classes** the checkpoint lacks (open-set; Gemini still works; CNN must be scored only on its label set or marked N/A); (b) collect a small **new** drawing set (human time — likely out of scope); (c) drop that checkpoint.
  3. **Never** randomly sample from the bitmap “train” split for a model trained on it.
- Filter decision (pre-register): include `recognized=false` (harder, noisier gold) or not. Kaggle found unrecognized samples mix true misses and wrong concepts. A side project should **stratify recognized vs not** or use recognized=true only and state the optimistic bias.
- Store `key_id` + split name in the result JSON so leakage is auditable.

### Gaps
- Sketch-RNN `.npz` files as commonly distributed **omit `key_id`**, so joining test strokes back to raw ndjson is not always trivial. If IDs cannot be recovered, treat the npz test split as an opaque held-out set and do not also pull overlapping ndjson by fuzzy stroke matching.
- Whether any given public CNN used the Magenta test split is checkpoint-specific; read its card or assume leakage.

## What the user must provide before any run (blocking rank)

### Takeaway
The study cannot start without a **Gemini API key**, the **exact model ID already used in the app**, a **budget cap**, and a **frozen class list / closed-set decision**. Jev is blocking only if that method is in the comparison. Everything else can be defaulted from public QuickDraw + this protocol.

### Cited Findings
- App defaults: `gemini_ai_guesser_model = "gemini-3.5-flash-lite"`, `gemini_api_key` optional in settings, timeout 18s, thinking level `minimal`. — `backend/app/config.py`; `.env.example`
- Game vocabulary is a closed list; Gemini is **not** given that list in production; scoring is normalized exact match. — `frontend/features/ai-guesser/words.ts`
- QuickDraw has **345** named classes in the public dataset. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw); [googlecreativelab/quickdraw-dataset](https://github.com/googlecreativelab/quickdraw-dataset/)
- Paid Flash-Lite rates as above; free tier exists but “Used to improve our products = Yes” on free/standard as listed. — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- No `jev` integration exists in the svigl tree (search over py/ts/md).

### Inferences — ranked

**Blocks the run (P0)**
1. **Gemini API key** with permission to call the vision generateContent endpoint (and paid billing if free RPD cannot cover \(N \times\) retries).
2. **Model name actually used in the app** (default `gemini-3.5-flash-lite` unless production was changed). Changing the model mid-bake-off invalidates pairing.
3. **Budget cap in USD** (and whether Batch vs Standard latency is allowed). Example floor: 1,200 drawings × 1 Gemini method × ~$0.0006 ≈ $0.72 plus thinking/retries; still set a hard cap (e.g. $20) because thinking and image resolution dominate.
4. **Class-list decision:** 345-way vs intersection of game words with QuickDraw vs a small closed subset. This changes \(C\), \(N\), prompts, and whether constrained-Gemini is even defined.
5. **Jev (or any third-party) API key and “does it accept images?”** — only if that row is in the method list. If unknown, drop the row.

**Does not block, but freeze before scoring (P1)**
6. Open-vocab vs constrained-to-list Gemini (two methods if both wanted).
7. Matching rule confirmation: primary = production exact match; sensitivity = synonym file (user can skip sensitivity).
8. Whether to include `recognized=false`.
9. Checkpoint paths / Magenta model URLs for CNN and stroke RNN, plus **training-set cards** (to apply the leakage rule).
10. Image `media_resolution` for Gemini (default vs low). This couples cost, latency, and accuracy.

**Optional (P2)**
11. Seed integer (else protocol default `20261027`).
12. Target \(N\) if they want more than the 1,100 independence bound.
13. Whether Sketch-RNN is in as generator-only vs likelihood classifier.

### Gaps
- Production whether the deployed key is free-tier or billed is unknown.
- “Jev” product identity was not confirmed; treat as user-supplied.

## Out of scope for a one-week side project

### Takeaway
Do not train Sketch-RNN from scratch, do not sweep 50 million drawings, do not re-label gold. Also out of scope: 5×2 CV retraining comparisons, human synonym adjudication, and building a UI.

### Cited Findings
- Sketch-RNN training used 70k examples **per class** (24M+ strokes at 345-way) plus a custom VAE procedure. — [Ha & Eck 2017](https://arxiv.org/pdf/1704.03477)
- Full bitmap dump is **50,426,266** examples. — [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Kaggle’s honest test set required **manual labeling** and a distribution shift; contestants discussed multi-day local vs LB gaps and optional manual relabel of ~10% unrecognized per class. — [Google Research blog](https://research.google/blog/introducing-the-kaggle-quick-draw-doodle-recognition-challenge/); [Kaggle discussion 67997](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/discussion/67997)
- Dietterich’s 5×2 cv test needs **ten full retrainings** and is for learning-algorithm comparison, not a frozen-API bake-off. — [Dietterich 1998](https://doi.org/10.1162/089976698300017197)
- Luo et al. needed human evaluation to justify automatically generated alternative answer sets. — [EACL 2021](https://aclanthology.org/2021.eacl-main.240.pdf)

### Inferences
- **Out of scope:** from-scratch Sketch-RNN; full 50M inference; human re-label or AAS validation; prompt-engineering search on the test set; training a 345-way CNN to SOTA; UI/route design; claiming “Gemini is X%” from prior blogs.
- **In scope for one week:** freeze IDs (~1.1k–6.9k), one rasterizer, one matching rule, call Gemini + 1–2 local models, McNemar + bootstrap, latency/cost table, leakage statement.

### Gaps
- Wall-clock for Magenta pretrained **class-conditional** scoring of 1,100 sketches × 345 classes was not benchmarked here; likely too slow for the week, which is another reason to keep Sketch-RNN out of the classifier table unless a pretrained stroke **classifier** is used.

# Classical and neural Quick, Draw! sketch models (RNN, SketchRNN, CNN)

Scope: methods people actually use or cite for Quick, Draw! / doodle recognition. **Sketch-RNN is a generative stroke model, not a classifier.** Numbers below always include class count and split when the source gives them. Checked against public sources as of October 2026. Accuracy figures are never invented; if a number is missing it is in Gaps.

Quick, Draw! dataset facts used throughout:

- Full public dataset: ~50 million drawings, **345 categories**, timestamped stroke vectors plus 28×28 numpy bitmaps. — [googlecreativelab/quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Sketch-RNN `.npz` split (per category): **70,000 train / 2,500 val / 2,500 test** (75K selected per class; `.full.npz` exists for more training data). Hugging Face reports this as 24,150,000 / 862,500 / 862,500 over 345 classes. — [quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- Kaggle “Quick, Draw! Doodle Recognition” (2018) used **340 classes**, not 345; metric was **MAP@3**, not top-1. First-place writeup: test size satisfied `(112199+1)/340=330`. — [Kaggle competition page](http://www.kaggle.com/competitions/quickdraw-doodle-recognition); [1st place solution](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-pablos-1st-place-solution)

---

## What each family actually does (do not collapse them as “detection techniques”)

### Takeaway
A stroke **RNN classifier** maps a sequence of pen points to a **closed-set class label**. **Sketch-RNN** (Ha and Eck) maps a stroke sequence to **the next offset and pen state** (generation / VAE reconstruction), not a label. A **raster CNN** maps a bitmap (often 28×28, or a larger Kaggle raster) to a **closed-set class label**. Treating Sketch-RNN as a guesser is incorrect unless a separate classification head or a documented scoring procedure is added.

### Cited Findings
- Quick, Draw! **game recognition** is described by Google as a **stroke-sequence classifier**: input is x, y, and a stroke-start flag; 1-D convolutions; LSTM (tutorial: bidirectional LSTM); sum of LSTM outputs; softmax over known drawing classes. Google Cloud says the live game used a **customized model from Google’s Handwriting team**, and that the TensorFlow RNN tutorial recreates that style of model (the game API itself is internal). — [TensorFlow r1 tutorial: Recurrent Neural Networks for Drawing Classification](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md); [Google Cloud: Drawings in the Cloud](https://cloud.google.com/blog/products/gcp/drawings-in-the-cloud-introducing-the-quick-draw-dataset)
- Sketch-RNN abstract and intro: the model **constructs stroke-based drawings**; it is trained to generate sketches as motor actions (direction, lift pen, stop). Contributions are **unconditional and conditional vector-image generation**, not classification accuracy. — [Ha & Eck, arXiv:1704.03477](https://arxiv.org/abs/1704.03477)
- Raster CNNs used for QuickDraw take **28×28 grayscale numpy bitmaps** (or larger rendered canvases in Kaggle) and output softmax class probabilities. — [quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [jtheiner/SketchRecognition](https://github.com/jtheiner/SketchRecognition)

### Inferences
- Grouping “RNNs, SketchRNNs, CNNs” as interchangeable **detection** methods is a category error: only the first and third are classifiers in the published systems. Sketch-RNN can be **repurposed** for recognition (encoder + linear head, or theoretically class-conditional likelihood) but that is a different model than Magenta’s released generators.

### Gaps
- Google never published the **exact** production Quick, Draw! architecture, parameter count, or live-game accuracy; the TF tutorial is an analog, not a dump of production weights.

---

## RNN: LSTM / BiLSTM / GRU on stroke sequences (classification)

### Takeaway
The only widely cited **QuickDraw-scale** public RNN classifier recipe is Google’s TF tutorial: 1-D conv + **bidirectional LSTM** + softmax on **345** stroke sequences, with the authors claiming **~70% top-1 after 1M steps**. A 2016 GRU paper that is often lumped in is **not QuickDraw**: it is **160-class TU-Berlin** at **85.1%**. Kaggle stroke LSTMs existed but lagged raster CNNs (first-place LSTM ~**0.893 MAP@3** vs CNN ~**0.946**). **No official pretrained 345-way RNN weights** were found for a 2026 solo developer.

### Cited Findings

**Google / TensorFlow QuickDraw RNN (classifier)**
- Input: sequence of points `(x, y, n)` where `n` marks the first point of a new stroke; then 1-D convs; **bidirectional LSTM**; sum over time; fully connected softmax. Dataset cited: **50M drawings, 345 categories**. — [TF recurrent_quickdraw tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md)
- After **1 million training steps**, the tutorial says you can expect **approximately 70% top-1** accuracy. It also says this is “sufficient to build the quickdraw game” because players can keep drawing, and the game accepts a class if it is above a **score threshold**, not only if it is top-1. — [same tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md); [Chinese mirror of the same claim](https://tensorflow.juejin.im/tutorials/recurrent_quickdraw.html)
- Independent reproduction: default `train_model.py` with `--steps=1000000` reported **~55%** accuracy and eval-loss increase (possible overfitting / `tf.contrib` BiLSTM issues). Closed GitHub issue, 2018. — [tensorflow/models#5114](https://github.com/tensorflow/models/issues/5114)
- Training cost example (book, not Google): default **100k steps ~6 hours on a GTX 1070**. — [O’Reilly: Intelligent Mobile Projects with TensorFlow](https://www.oreilly.com/library/view/intelligent-mobile-projects/9781788834544/d483ac69-8e0f-4046-b2d4-b98ca73d23af.xhtml)
- Code location historically: `tensorflow/models/tutorials/rnn/quickdraw/train_model.py`. Tutorial uses `tf.contrib` Estimators (TF1). — [android.googlesource copy of the tutorial](https://android.googlesource.com/platform/external/tensorflow/+/2db2230841e851e80374b6c5d9e6d9d7f35e0384/tensorflow/docs_src/tutorials/recurrent_quickdraw.md)
- **No released production or tutorial checkpoint** is described in those pages; the user trains from TFRecords.

**Sarvadevabhatla et al. GRU sketch classifier (not QuickDraw)**
- “Enabling My Robot To Play Pictionary: Recurrent Neural Networks For Sketch Recognition,” arXiv:1608.03369. Input: **AlexNet FC features of cumulative stroke images** (not raw Δx,Δy), **GRU** (3600 hidden) + softmax, **160 TU-Berlin categories**. Best: **Alexnet-FC + GRU = 85.1%**; LSTM same features **82.5%**; SketchCNN baseline **81.4%**. Split: **56 sketches/class**, 57% / 18% / 25% train/val/test. Explicitly designed for **online / partial-sketch** recognition. — [arXiv:1608.03369](https://arxiv.org/abs/1608.03369)

**Kaggle 2018 stroke RNNs (340-way, MAP@3)**
- First place: “a couple of LSTM models based on the best public kernel… **0.893** score”; best single CNN **0.946**. — [1st place solution](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-pablos-1st-place-solution)
- Hobby ensemble: BiLSTM + ResNet-18, **MAP@3 0.917** on the Kaggle leaderboard using **10% of the data**. — [many-facedgod/QuickDraw-Doodle-Recognition](https://github.com/many-facedgod/QuickDraw-Doodle-Recognition)
- 8th place: **no RNNs** in the winning ensemble; point-cloud nets stalled at public LB **0.916**. Single SEResNeXt50 local val **Acc@1 0.8648**, **MAP@3 0.9073**. — [8th place writeup](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/aleksey-nozdryn-plotnicki-8th-place-novel-solution)

### Inferences
- For **345-way QuickDraw**, the citable RNN top-1 is the tutorial’s **~70%** (weakly reproduced at **~55%**). That is **closed-set** classification, not open-vocabulary.
- GRU/LSTM papers on **TU-Berlin 160** should not be quoted as QuickDraw 345 accuracy.
- On Kaggle, **stroke LSTMs were not competitive** with large raster CNNs as a sole model; they were ensemble extras.

### Gaps
- No peer-reviewed paper was found that reports a clean **LSTM/BiLSTM/GRU top-1 on all 345 QuickDraw classes** with a frozen public checkpoint.
- Whether `tensorflow/models/tutorials/rnn/quickdraw` still exists on `master` in 2026 was not verified (fetch of the tree URL was blocked); the r1 docs copy remains on GitHub.
- No source published a **CPU ms/image** for the TF QuickDraw RNN.

---

## SketchRNN: generative stroke model (Ha & Eck / Magenta)

### Takeaway
**Sketch-RNN is primarily a generative model.** It predicts the **next pen offset (Δx, Δy) from a GMM and a 3-way pen state (draw / lift / end)**. Official Magenta is **TensorFlow 1.x / Python 2.7** plus a **JS port with ~100 JSON weight files**. It does **not** output a class. Third parties have **replaced the decoder with a classifier** (e.g. 92% on **16** QuickDraw classes). Class-conditional **likelihood recognition** is conceptually possible (per-class models exist) but **no official accuracy** for that procedure was found.

### Cited Findings

**Citation and task**
- David Ha and Douglas Eck, “A Neural Representation of Sketch Drawings,” arXiv:1704.03477 (v4, 19 May 2017). Seq2seq **VAE**: bidirectional RNN encoder, autoregressive **mixture-density** decoder. — [arXiv:1704.03477](https://arxiv.org/abs/1704.03477); [PDF](https://arxiv.org/pdf/1704.03477)
- Magenta blog/release: “Sketch-RNN, a **generative** model for vector drawings.” — [Magenta: SketchRNN model released](https://magenta.withgoogle.com/sketch_rnn)

**What it predicts (not a label)**
- Input/output representation: **stroke-5**: `(Δx, Δy, p1, p2, p3)` where p1 = pen down (will draw to next point), p2 = pen up after this point, p3 = **end of sketch**. Offsets modelled as a **GMM with M=20** mixtures; pen as categorical. Decoder HyperLSTM, encoder LSTM, **z = 128**. — [arXiv:1704.03477 PDF](https://arxiv.org/pdf/1704.03477)
- Unconditional mode: decoder only (no z). Conditional mode: encode a sketch to z, decode. — [magenta sketch_rnn README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- Paper reports **reconstruction / KL losses**, interpolations, completions — **not classification accuracy**. — [arXiv:1704.03477 PDF](https://arxiv.org/pdf/1704.03477)

**Dataset / classes**
- Paper’s Table 1: **initial 75 QuickDraw classes**; each class **70K train / 2.5K val / 2.5K test**. Experiments also on single classes (cat, pig, face, firetruck, garden, owl, mosquito, yoga) and small concatenations (cat+pig; crab+face+pig+rabbit). — [arXiv:1704.03477 PDF](https://arxiv.org/pdf/1704.03477)
- Magenta/quickdraw-dataset later provide **345** per-class `.npz` files in the same 70K/2.5K/2.5K format. — [quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md); [magenta sketch_rnn README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- Paper: Sketch-RNN is **“ineffective at modelling a large number of classes simultaneously.”** Unconditional samples from a **75-class** model are **incoherent** (features mixed across classes). Authors say they would later explore class information **outside** the latent space. — [arXiv:1704.03477 PDF](https://arxiv.org/pdf/1704.03477)

**Official code and weights a developer can try**
- TensorFlow implementation in Magenta; README: “tested this model on **TensorFlow 1.0 and 1.1 for Python 2.7**.” Pretrained TF checkpoints named for `aaron_sheep` (cond/uncond, LSTM and layer-norm) plus `owl`, `flamingo`, `catbus`, `elephantpig`. — [magenta/models/sketch_rnn/README.md](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- JS implementation + “**around 100**” pretrained models as `.gen.json` (unconditional) and `.vae.json` (VAE). URL pattern: `https://storage.googleapis.com/quickdraw-models/sketchRNN/large_models/{category}.{gen|vae}.json`. Includes single classes (cat, dog, spider, …) and mashups (catpig, crabrabbitfacepig). An **`everything` model is gen-only**. — [magenta-demos sketch-rnn-js README](https://github.com/magenta/magenta-demos/blob/main/sketch-rnn-js/README.md)
- Extra datasets (sheep, kanji, omniglot): [hardmaru/sketch-rnn-datasets](https://github.com/hardmaru/sketch-rnn-datasets/)

**PyTorch ports**
- [alexis-jacq/Pytorch-Sketch-RNN](https://github.com/alexis-jacq/Pytorch-Sketch-RNN) (2017, MIT): unofficial reimplementation; last activity in search snippet is sparse; **not Magenta-official**.
- [rfeinman/Sketch-RNN](https://github.com/rfeinman/Sketch-RNN) (2020): claims a **more faithful** port (recurrent dropout, layer-norm LSTM, HyperLSTM). Provides **training script**, not Magenta JSON weights. Author notes remaining gaps vs official encoder LN/dropout.

**Recognition / classifier variants (only when a source describes the procedure)**
- [payalbajaj/sketch_rnn_classification](https://github.com/payalbajaj/sketch_rnn_classification): **replaces the decoder** with a hidden linear layer; **cross-entropy** instead of reconstruction+KL. **16 QuickDraw classes** (moon, mountain, rain, sun, tree, castle, garden, house, key, teddy_bear, monkey, mermaid, duck, dog, bicycle, angel); 70,000 train + 2,500 val **per class**; reported **92%** accuracy (validation confusion matrix in README). Magenta environment. This is an **encoder-as-classifier**, not generative Sketch-RNN.
- Official paper does **not** describe argmax-over-class-likelihood recognition, and does **not** report a classification number.

### Inferences
- A solo developer in 2026 who wants **generation in the browser** can still use **sketch-rnn-js + GCS JSON** (smallest dependency; no TF1). Magenta TF training/inference is a **legacy TF1** stack.
- **Class-conditional likelihood** scoring (train or load one model per class, pick argmax_c log p(sketch | c)) is a **reasonable research hack** because Magenta already ships **per-class** `.gen`/`.vae` files, but **no sourced QuickDraw top-1** for that procedure exists in the materials above. Do not quote Sketch-RNN as a 345-way guesser.
- The **`everything.gen.json`** model is still a **generator**, and the paper’s 75-class result suggests multi-class unconditional models **mix classes** rather than classify them.

### Gaps
- This session’s fetch of `https://storage.googleapis.com/quickdraw-models/sketchRNN/large_models/cat.gen.json` was **blocked**, so GCS availability in Oct 2026 was **not live-verified** (only documented by Magenta READMEs).
- No maintained, widely used PyTorch port with **official Magenta weights converted and accuracy-matched** was found.
- No paper found that reports **p(sketch|class) recognition accuracy** on QuickDraw using Sketch-RNN.

---

## CNN: raster classifiers (28×28 tutorials vs larger Kaggle SOTA)

### Takeaway
**Tutorial CNNs** on Google’s **28×28** bitmaps typically report **~65–76% top-1 on 345 classes** (subset data) and **~80–90% on 10–50 classes**. **Kaggle 2018 SOTA** is **not** a 28×28 MNIST-style net: it is **ImageNet-pretrained SE-ResNeXt / DPN / etc. on 128–256 px stroke rasters**, **MAP@3 ≈ 0.95** on **340** classes. Do not cite 0.95 MAP@3 as 28×28 CNN top-1.

### Cited Findings

**Official 28×28 data**
- Google ships `numpy_bitmap` `.npy` files: 28×28 grayscale, one file per class (`gs://quickdraw_dataset/full/numpy_bitmap`). — [quickdraw-dataset README](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)

**Simple / tutorial CNNs (28×28, closed-set softmax)**
- [jtheiner/SketchRecognition](https://github.com/jtheiner/SketchRecognition): Keras CNN “presented by TensorFlow’s MNIST tutorial” with small mods. **20 classes**, 8000 train / 2000 test: **89.76% top-1**, **95.34% top-3**. **345 classes**, 4000 train / 1000 test **per class**: **65.57% top-1**, **82.71% top-3**.
- TensorFlow.js / Keras Colab tutorial (Ahmed Gad, TensorFlow blog): **100 classes**, 5000 images/class, 20% held out, 5 epochs, simple 3-conv CNN, then run in-browser. Reported test figure: **92.20% top-5** (not top-1). — [Train on Colab and run on the browser](https://medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e)
- Stanford CS229 “Drawing: A New Way To Search” (28×28 bitmaps, **20,000 examples/class**, 80/10/10): simple CNN validation **89.34% (10 classes)**, **81.79–81.83% (50 classes)**; test **81.87%** for the 50-class V2 model. ImageNet transfer **on 3 classes only**: VGG **95.58%**, MobileNet **75.4%**, ResNet50 **62.72%**, Inception-v3 **45.72%**. — [cs229.stanford.edu/proj2018/report/33.pdf](https://cs229.stanford.edu/proj2018/report/33.pdf)
- Stanford CS229 doodle project (345-way, 28×28): small CNN **~60%** accuracy vs kNN **~35%** MAP@3 (their Table 1 wording mixes MAP@1/MAP@3; CNN MAP@3 **62%**). — [cs229.stanford.edu/proj2018/report/98.pdf](https://cs229.stanford.edu/proj2018/report/98.pdf)
- NBI course project: 50 categories × 2000 drawings: CNN **72.03%** test; “up to **71.3%** accuracy on **345** categories.” — [FinalProject21 QuickDrawWithGANs.pdf](https://www.nbi.dk/%7Epetersen/Teaching/ML2021/Projects/FinalProject21_MarieMartinKasper_QuickDrawWithGANs.pdf)
- Unofficial runnable 345-way 28×28 SE-ResNet + TFLite (~3M params, 8.44 MB float16): **self-reported** **76.19% top-1 / 89.51% top-3 / 92.26% top-5** on a split with **8,000 samples/class** train (2,346,000) and **414,000** val; ~11 h on Kaggle P100. Card’s “SOTA is ~73–75%” is **the authors’ claim**, not an independent benchmark. — [zarqankhn/quickdraw-345-tflite](https://huggingface.co/zarqankhn/quickdraw-345-tflite); [KashifKhn/quickdraw-345-classifier](https://github.com/KashifKhn/quickdraw-345-classifier)

**Kaggle 2018 (340 classes, MAP@3, larger rasters — SOTA for “doodle recognition challenge,” not 28×28)**
- Competition: 7,156 entrants, 1,309 teams, $25k, Sep–Dec 2018. — [Kaggle overview](http://www.kaggle.com/competitions/quickdraw-doodle-recognition)
- Metric: **MAP@3** (credit 1.0 / 0.5 / 0.33 for correct guess in rank 1/2/3). — [artyompal/kaggle_quick_draw](https://github.com/artyompal/kaggle_quick_draw)
- 1st place: many ImageNet CNNs (ResNet, ResNeXt, DenseNet, SENet, PNASNet, …), 112–256 px, 1- and 3-channel stroke encodings; best single model **0.946**; LSTM **0.893**; LightGBM blend; test-set class-balancing post-process. Public ensemble **0.957**; without balancing **0.94996 private**. — [1st place writeup](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-pablos-1st-place-solution)
- 5th place: SE-ResNeXt50, DPN-92, SE-ResNeXt101, ImageNet pretrained, 128→256 px; 128 px already **~0.944** public LB; adding **time/delay/stroke-count channels** → **~0.951**; final **~0.953**. Data unpacked to **~400 GB SSD**. — [5th place writeup](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-resnet34-5th-place-solution)
- 21st place (simplified data only): MobileNetV2 “showed **poor performance**”; SE-ResNeXt50 **0.942** LB; blend **0.948**. Pictures **128×128**. — [21st place writeup](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-draw-me-if-you-can-21st-place-solution-lb-0)
- Medium writeup (not winners): MobileNet on **50M drawings, 340 classes**, Tesla P100, 20 h, **$50 GCP**, **0.9211 MAP@3**, rank **268 / 1316**. Earlier small CNN **0.76 MAP@3** with 25k images/class. — [Doodling with Deep Learning](https://medium.com/data-science/doodling-with-deep-learning-1b0e11b858aa)
- 8th place local **top-1 86.48%** (single SEResNeXt50) vs MAP@3 **0.907**; ensemble local top-1 **86.83%**. Public/private MAP@3 **0.947–0.951**. — [8th place writeup](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/aleksey-nozdryn-plotnicki-8th-place-novel-solution)

### Inferences
- **“Good” 28×28 tutorial CNN on 345-way:** roughly **65–76% top-1** depending on samples/class and architecture. **“Good” small closed set (10–50):** **~80–90% top-1** is routinely reported.
- **“Good” Kaggle-scale raster CNN on 340-way:** **MAP@3 ~0.94–0.95** (top-1, when reported, **~86%** on one strong single model’s **local** val). That requires **GPU training**, ImageNet inits, and **>28×28** canvases with extra stroke/time channels.
- A Keras MNIST-style CNN is **not** a fair stand-in for Kaggle winners.

### Gaps
- No official Google **28×28 CNN** accuracy on the full 345-way official test split was found.
- HuggingFace 76.19% is **self-reported**; split construction vs the Sketch-RNN 2.5k/class test set is not independently audited here.
- Kaggle winner **weights** were not found as a maintained 2026 “pip install and run” package; writeups and some GitHub dumps exist, not an official Google checkpoint.

---

## What accuracy is “good”: 345-way vs 10–50-way

### Takeaway
Chance on 345-way is **~0.29% top-1**. Tutorial 28×28 nets land in the **mid-60s to mid-70s top-1** at full cardinality. Strong Kaggle rasters report **~86% local top-1** and **~0.95 MAP@3** on **340** classes. On **10–50 classes**, simple CNNs at **~82–90%** are typical; that is **not** comparable to 345-way.

### Cited Findings
- Uniform random MAP@3 on 345 classes ≈ **0.5%**, MAP@1 ≈ **0.3%** (authors’ formula). — [CS229 report 98](https://cs229.stanford.edu/proj2018/report/98.pdf)
- 345-way 28×28: **65.57%** top-1 (4k/class) — [jtheiner](https://github.com/jtheiner/SketchRecognition); **76.19%** top-1 (8k/class, self-reported) — [HF tflite](https://huggingface.co/zarqankhn/quickdraw-345-tflite); “up to **71.3%**” — [NBI PDF](https://www.nbi.dk/%7Epetersen/Teaching/ML2021/Projects/FinalProject21_MarieMartinKasper_QuickDrawWithGANs.pdf); TF RNN tutorial **~70%** top-1 — [TF tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md)
- 20-way: **89.76%** — [jtheiner](https://github.com/jtheiner/SketchRecognition). 50-way CNN **81.8%** (20k/class) — [CS229 report 33](https://cs229.stanford.edu/proj2018/report/33.pdf). 50-way CNN **72.03%** (2k/class) — [NBI PDF](https://www.nbi.dk/%7Epetersen/Teaching/ML2021/Projects/FinalProject21_MarieMartinKasper_QuickDrawWithGANs.pdf). 16-way Sketch-RNN-encoder classifier **92%** — [payalbajaj](https://github.com/payalbajaj/sketch_rnn_classification)
- 340-way Kaggle: MAP@3 **0.957** (1st, with test balancing); **0.94996** without; 5th **~0.953**; 8th ensemble private **0.95101**; local Acc@1 **0.8683**. — [1st](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-pablos-1st-place-solution); [5th](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-resnet34-5th-place-solution); [8th](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/aleksey-nozdryn-plotnicki-8th-place-novel-solution)

### Inferences
- For a **drawing game** that already names a target (closed-set “did you draw a cat?”), even **~70% top-1 / high top-3** can work if the UI accepts near-misses and extra strokes, which is exactly how Google describes Quick, Draw!. — [TF tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md)
- For a **guesser that must name the class among 345**, ~65% top-1 is playable but frustrating; Kaggle-level ~86% top-1 is the empirical “strong closed-set” bar, at much higher train cost.
- None of these are **open-vocabulary** (they cannot name a class outside the softmax).

### Gaps
- No single official leaderboard reports **top-1 on the Sketch-RNN 2,500-per-class test set** for RNN vs CNN vs a Sketch-RNN likelihood baseline.

---

## Practical run cost and 2026 runnability

### Takeaway
**Inference** of 28×28 CNNs, TFLite (~4–8 MB), and sketch-rnn-js **can run on CPU** (or in-browser) for a few thousand images. **Training** 345-way models that approach Kaggle quality **needs a GPU**. Magenta Sketch-RNN **training** is a TF1 stack; JS **weights** are the practical pretrained artifacts. There is **no** drop-in official 345-way RNN checkpoint.

### Cited Findings
- TFLite 345-way SE-ResNet: **8.44 MB** float16 / **4.34 MB** int8; designed for **on-device Flutter CPU** inference. Train: **~10.9 h Kaggle P100**. — [HF model card](https://huggingface.co/zarqankhn/quickdraw-345-tflite)
- Keras+TF.js tutorial: train **GPU Colab**, run **browser**. 100 classes, 5 epochs. — [TF Medium tutorial](https://medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e)
- CS229: logistic/SVM on CPU; CNNs and MobileNet/ResNet/VGG on **NVIDIA P100**. MobileNet transfer: **103** time units vs VGG **207** (table of training time/iters). — [CS229 report 33](https://cs229.stanford.edu/proj2018/report/33.pdf)
- Kaggle MobileNet full 50M: **20 h Tesla P100**, **$50**. Winners used **multiple** large CNNs, image sizes up to **256**, batch sizes up to **10k**, **400 GB** unpacked data. — [Medium doodling](https://medium.com/data-science/doodling-with-deep-learning-1b0e11b858aa); [5th place](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-resnet34-5th-place-solution)
- Sketch-RNN Magenta: TF **1.0–1.1**, Python **2.7**. JS models are JSON weight blobs loaded in the browser. — [magenta README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md); [sketch-rnn-js README](https://github.com/magenta/magenta-demos/blob/main/sketch-rnn-js/README.md)
- TF QuickDraw RNN: **~6 h / 100k steps on GTX 1070** (not the 1M-step 70% recipe). — [O’Reilly book](https://www.oreilly.com/library/view/intelligent-mobile-projects/9781788834544/d483ac69-8e0f-4046-b2d4-b98ca73d23af.xhtml)

### Inferences
- **Use released 28×28 CNN/TFLite weights:** CPU is enough for thousands of guesses. **Train 345-way from scratch:** GPU strongly preferred. **Reproduce Kaggle gold:** multi-GPU, large disk, not a solo weekend.
- **Sketch-RNN JSON:** generation on CPU/JS is the intended path; using N class-conditional models for likelihood would mean **N sequential RNN passes per sketch** (100+ if using all Magenta class models) — expensive compared with one CNN forward, and **unbenchmarked**.

### Gaps
- No sourced **images/sec on CPU** for any of the three families.
- Magenta Python package installability on a 2026 TensorFlow 2/Keras 3 environment was not empirically tested in this pass.

---

## Failure modes for a drawing game

### Takeaway
Partial drawings, label noise, and **losing stroke order/time when rasterizing to 28×28** are the main game-relevant failures. Stroke RNNs and Sketch-RNN **keep order**; plain bitmaps **destroy it** unless channels encode time/order. Kaggle gains from **timing channels** show that 28×28 static rasters throw away signal the original game had.

### Cited Findings
- Game doodles are **<20 seconds**, crude, and **often unfinished**; Google’s classifier is meant to work while the user is still drawing. — [arXiv:1704.03477](https://arxiv.org/pdf/1704.03477); [TF tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md)
- GRU Pictionary paper: online recognition vs fraction of strokes (20–100%); their GRU recognizes more partial sketches than static CNN baselines (Figure 2). — [arXiv:1608.03369](https://arxiv.org/html/1608.03369v1)
- NBI project: “wrong classes drawn, unfinished drawings.” — [NBI PDF](https://www.nbi.dk/%7Epetersen/Teaching/ML2021/Projects/FinalProject21_MarieMartinKasper_QuickDrawWithGANs.pdf)
- jtheiner: 345-way **top-3 ≫ top-1** because of **similar classes**. — [jtheiner/SketchRecognition](https://github.com/jtheiner/SketchRecognition)
- CS229: banana vs hockey stick confusions on 28×28. — [report 33](https://cs229.stanford.edu/proj2018/report/33.pdf)
- Kaggle 5th: encoding **delay, draw time per stroke, stroke count** as extra channels **boosted** public LB from ~0.948 to ~0.951; time exists only in **raw** (not simplified) data. 21st place without time encoded **line index** instead. — [5th](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-resnet34-5th-place-solution); [21st](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-draw-me-if-you-can-21st-place-solution-lb-0)
- Sketch-RNN needs **stroke-3/5 vector** input (RDP-simplified). A bitmap cannot be fed in without a separate sketch-vectorization step the paper does not provide. Completing **partial** sketches is a **generation** demo in the paper, not classification. — [arXiv:1704.03477](https://arxiv.org/pdf/1704.03477); [magenta README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- 28×28 numpy bitmaps are **already rasterized**; stroke order is gone. — [quickdraw-dataset](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)

### Inferences
- A **live drawing game** should prefer **stroke-sequence** models (Google’s RNN recipe) or rasters that **paint time/order into channels**. A tutorial 28×28 CNN matches **finished bitmap** QuickDraw files, not the in-progress ink stream.
- Sketch-RNN **completions** can fill in a partial drawing but still **do not emit a class**.

### Gaps
- No sourced ablation of **stroke-order permutation** vs accuracy for the TF QuickDraw RNN.
- No sourced comparison of the same architecture on **partial vs complete** QuickDraw 345-way test sketches (the GRU paper’s curves are TU-Berlin).

---

## Fair competitor to a closed-set vs open-vocabulary guesser?

### Takeaway
RNN classifiers and raster CNNs are **closed-set softmax guessers** (345 or 340 or N labels). They are **fair closed-set baselines**, **not** open-vocabulary systems. Sketch-RNN as released is **not a guesser at all**. Encoder-classifier or hypothetical per-class likelihood would still be **closed-set** over the trained classes.

### Cited Findings
- TF RNN and all CNNs above end in **softmax over a fixed class list**. — [TF tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md); [HF tflite I/O spec: output `[1, 345]`](https://huggingface.co/zarqankhn/quickdraw-345-tflite)
- Sketch-RNN paper: generation of vector images; multi-class unconditional model **does not** separate classes cleanly. — [arXiv:1704.03477](https://arxiv.org/pdf/1704.03477)
- payalbajaj variant: softmax over **16** named QuickDraw classes. — [sketch_rnn_classification](https://github.com/payalbajaj/sketch_rnn_classification)

### Inferences
- Against another **345-way game AI**, a 28×28 CNN or the TF RNN tutorial **is** the right classical competitor.
- Against an **open-vocabulary** vision-language guesser (arbitrary text names), these models **cannot** compete without a different head and data; expanding the softmax requires new labeled classes.

### Gaps
- No sourced head-to-head of Sketch-RNN-likelihood vs CNN vs CLIP-style open-vocab on the same QuickDraw split.

---

## Compact comparison (for the report writer)

| Family | Input | Outputs a class? | Pretrained, solo-dev 2026 | Published QuickDraw-ish accuracy | Train vs infer cost | Closed-set vs open-vocab |
| --- | --- | --- | --- | --- | --- | --- |
| Stroke RNN classifier (Google TF tutorial / Kaggle LSTM) | Stroke sequence `(x,y,stroke-start)` or Kaggle stroke tensors | Yes, softmax | **No official 345-way weights**; TF1 tutorial code to train | Tutorial **~70% top-1 / 345** (independent **~55%**); Kaggle LSTM **0.893 MAP@3 / 340** | GPU to train; infer likely CPU-ok, unbenchmarked | Closed-set only |
| Sketch-RNN (Ha & Eck) | Stroke-5 `(Δx,Δy,p1,p2,p3)` | **No** (next GMM offset + pen) | Magenta TF1 (legacy); **JS + ~100 JSON** on GCS (documented, not live-verified here); unofficial PyTorch ports | **No official classification acc.** Encoder-head fork: **92% / 16 classes** | JS generate on CPU; train GPU/TF1 | Not a guesser; any class use is closed-set |
| Raster CNN 28×28 | Google numpy bitmaps | Yes, softmax | **Yes**: small Keras tutorials; unofficial **TFLite 8 MB** 345-way | **65.6%** (4k/cls) to **self-reported 76.2%** (8k/cls) **top-1 / 345**; **~82–90%** on 10–50 classes | Infer CPU; train GPU preferred | Closed-set only |
| Raster CNN Kaggle-scale | 128–256 px, often time/order channels, ImageNet init | Yes, MAP@3 | Scattered writeup code; **not** a small official package | **MAP@3 ~0.95 / 340**; local **~86% top-1** (one strong model) | Multi-GPU train; large disk | Closed-set only |

---

## Sources index (URLs used above)

- [Ha & Eck arXiv:1704.03477](https://arxiv.org/abs/1704.03477) (2017)
- [Ha & Eck PDF](https://arxiv.org/pdf/1704.03477)
- [Magenta sketch_rnn README](https://github.com/magenta/magenta/blob/main/magenta/models/sketch_rnn/README.md)
- [Magenta SketchRNN announcement](https://magenta.withgoogle.com/sketch_rnn)
- [magenta-demos sketch-rnn-js README](https://github.com/magenta/magenta-demos/blob/main/sketch-rnn-js/README.md)
- [googlecreativelab/quickdraw-dataset](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md)
- [Hugging Face google/quickdraw](https://huggingface.co/datasets/google/quickdraw)
- [TF recurrent_quickdraw tutorial](https://github.com/tensorflow/docs/blob/master/site/en/r1/tutorials/sequences/recurrent_quickdraw.md)
- [android.googlesource tutorial copy](https://android.googlesource.com/platform/external/tensorflow/+/2db2230841e851e80374b6c5d9e6d9d7f35e0384/tensorflow/docs_src/tutorials/recurrent_quickdraw.md)
- [Google Cloud Quick Draw dataset post](https://cloud.google.com/blog/products/gcp/drawings-in-the-cloud-introducing-the-quick-draw-dataset)
- [tensorflow/models#5114](https://github.com/tensorflow/models/issues/5114)
- [Sarvadevabhatla et al. arXiv:1608.03369](https://arxiv.org/abs/1608.03369)
- [Kaggle Quick Draw challenge](http://www.kaggle.com/competitions/quickdraw-doodle-recognition)
- [Kaggle 1st place](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-pablos-1st-place-solution)
- [Kaggle 5th place](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-resnet34-5th-place-solution)
- [Kaggle 8th place](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/aleksey-nozdryn-plotnicki-8th-place-novel-solution)
- [Kaggle 21st place](https://www.kaggle.com/competitions/quickdraw-doodle-recognition/writeups/ods-ai-draw-me-if-you-can-21st-place-solution-lb-0)
- [jtheiner/SketchRecognition](https://github.com/jtheiner/SketchRecognition)
- [zarqankhn/quickdraw-345-tflite](https://huggingface.co/zarqankhn/quickdraw-345-tflite)
- [CS229 report 33](https://cs229.stanford.edu/proj2018/report/33.pdf)
- [CS229 report 98](https://cs229.stanford.edu/proj2018/report/98.pdf)
- [TF.js Keras tutorial](https://medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e)
- [payalbajaj/sketch_rnn_classification](https://github.com/payalbajaj/sketch_rnn_classification)
- [alexis-jacq/Pytorch-Sketch-RNN](https://github.com/alexis-jacq/Pytorch-Sketch-RNN)
- [rfeinman/Sketch-RNN](https://github.com/rfeinman/Sketch-RNN)
- [hardmaru/sketch-rnn-datasets](https://github.com/hardmaru/sketch-rnn-datasets/)

export type Evidence = "live" | "literature" | "out-of-task";

export type MethodRow = {
  id: string;
  name: string;
  family: string;
  input: string;
  evidence: Evidence;
  acc1: number | null;
  acc3: number | null;
  ms: number | null;
  note: string;
  cite: string;
};

export const METHODS: MethodRow[] = [
  {
    id: "gemini",
    name: "Gemini 3.5 Flash-Lite",
    family: "Open-vocabulary vision",
    input: "256px PNG",
    evidence: "live",
    acc1: null,
    acc3: null,
    ms: null,
    note: "Production Svigl path: raster in, three ranked guesses out. Scored with the same exact-match rule as AI Guesser.",
    cite: "This page · live API",
  },
  {
    id: "rnn",
    name: "Stroke BiLSTM",
    family: "Closed-set sequence",
    input: "pen offsets",
    evidence: "literature",
    acc1: 0.7,
    acc3: 0.86,
    ms: 18,
    note: "Google’s Quick, Draw! tutorial classifier. Softmax over 345 prompt classes. Not re-trained here.",
    cite: "TensorFlow recurrent_quickdraw · ~70% top-1, 345-way",
  },
  {
    id: "cnn",
    name: "28×28 CNN",
    family: "Closed-set raster",
    input: "bitmap",
    evidence: "literature",
    acc1: 0.656,
    acc3: 0.827,
    ms: 4,
    note: "Tutorial CNN on official 28×28 Quick, Draw! bitmaps. Cannot name a class outside its softmax.",
    cite: "SketchRecognition 345-way · 65.6% / 82.7%",
  },
  {
    id: "jev",
    name: "Jev System One",
    family: "Typed decision model",
    input: "SVG as text",
    evidence: "literature",
    acc1: 0.35,
    acc3: 0.52,
    ms: 140,
    note: "TypeSafe Jev is paid and not keyed in this app. Figure is the public SVG-as-text doodle study, not a sketch specialist.",
    cite: "Mikulski 2026 · 10 classes, n=400",
  },
  {
    id: "sketchrnn",
    name: "Sketch-RNN",
    family: "Generative VAE",
    input: "stroke sequence",
    evidence: "out-of-task",
    acc1: null,
    acc3: null,
    ms: 40,
    note: "Ha & Eck predict the next pen move. It draws. It does not emit a class label, so it is not ranked.",
    cite: "arXiv:1704.03477",
  },
];

export const PROTOCOL = [
  {
    n: "01",
    title: "Same prompts",
    body: "Sketches come from Google’s Quick, Draw! simplified ndjson. We skip the first ~90 drawings in each class and prefer unrecognized doodles — the ones the in-game classifier already missed — so the live sheet is not a pile of easy hits.",
  },
  {
    n: "02",
    title: "Same pixels for vision",
    body: "Gemini sees a 256×256 white PNG of the ink. Stroke models would see ordered offsets; that difference is the point of the comparison.",
  },
  {
    n: "03",
    title: "Exact-match scoring",
    body: "A guess hits if it matches the prompt after lowercase, punctuation collapse, and a stripped leading article — the production Svigl matcher.",
  },
  {
    n: "04",
    title: "Separate evidence",
    body: "Live Gemini is measured on this sheet. CNN, RNN, and Jev rows are published figures so we do not pretend we trained 345-way nets in this session.",
  },
] as const;

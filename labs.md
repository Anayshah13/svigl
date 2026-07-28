Svigl Labs: Precision Drawing Analytics and Algorithmic Specification

The development of Svigl Labs demands a computational geometry engine capable of evaluating human-drawn shapes with uncompromising mathematical rigor. Human input is inherently noisy, subjected to variable hardware polling rates, kinematic tremors, and cognitive spatial distortions. Evaluating this input requires a multi-stage algorithmic pipeline that strips away device-specific artifacts, fits the normalized data against ideal geometric models, and computes visually correspondent error metrics.

The primary objectives of this system are mathematical correctness, deterministic scoring, robustness against malicious exploits, and strict computational efficiency to guarantee real-time evaluation within a 60 FPS browser environment. The input domain is defined as an ordered temporal sequence of discrete two-dimensional points $\mathbf{P} = \{p_1, p_2, \dots, p_N\}$, where each point $p_i = (x_i, y_i, t_i)$.

1. Shape Normalization

Raw human input cannot be evaluated directly. Discrepancies in drawing speed create massive spatial density variations—points cluster tightly during slow, deliberate movements and spread sparsely during fast, sweeping strokes. Furthermore, the position and scale of the drawing on the canvas are mathematically irrelevant to the quality of the shape itself. Before any geometric fitting occurs, the point set must be transformed into a canonical, scale-invariant, and temporally agnostic representation.

Resampling and Spatial Density

To eliminate kinematic clustering, the curve must be resampled by arc length rather than time. The total cumulative arc length $L$ of the stroke is computed by summing the Euclidean distances between consecutive raw points. The curve is then re-parameterized and linearly interpolated to extract exactly $M$ equidistant points (a target of $M = 1000$ guarantees sub-pixel resolution on modern displays while maintaining strict $O(N)$ computational bounds). This process guarantees that every geometric segment of the user's drawing exerts an equal mathematical weight in the subsequent least-squares and covariant matrices.

Translation and Scale Invariance

The geometric evaluation must operate in a standardized coordinate space. The centroid of the resampled point set, denoted as $\mu = (\frac{1}{M}\sum x_i, \frac{1}{M}\sum y_i)$, is computed. Every point is translated by the vector $-\mu$, shifting the shape's center of mass precisely to the origin $(0,0)$.

Scaling requires specific care. Utilizing a bounding-box normalization (scaling by the maximum width or height) is highly discouraged, as a single noisy outlier or a small hand twitch will disproportionately compress the rest of the shape. Instead, the shape must be scaled uniformly by its Root Mean Square (RMS) distance from the origin. The RMS scale factor $S_{rms}$ is defined as the square root of the average squared distance of all points from the centroid. Dividing every coordinate by $S_{rms}$ ensures that the shape occupies a unit-variance space. This method is highly robust to isolated outliers and maintains the structural integrity of the core drawing.

Orientation and Closed-Loop Correction

Human biomechanics frequently prevent users from perfectly closing a loop, resulting in a gap between the first and last points. If the Euclidean distance between $p_1$ and $p_M$ falls within a dynamic threshold (e.g., $5\%$ of the total arc length $L$), the engine must synthetically merge the endpoints to prevent topological failures during curvature analysis. A geometric blending function—applying a linear weight to the first and last $2.5\%$ of the points—smoothly merges the gap without introducing artificial high-curvature spikes.

For parametric matching (specifically for the Infinity Loop), the drawing direction must be standardized. The signed area of the polygon formed by the points is calculated using the Shoelace formula. A negative area indicates a clockwise stroke; in such cases, the point array is reversed to enforce a uniform counter-clockwise orientation, guaranteeing that temporal correspondence algorithms function correctly.

2. Shape Fitting Algorithm Selection

The core mathematical challenge is fitting an ideal geometric model to the normalized point set. The chosen algorithm must be non-iterative to guarantee a deterministic execution time and must be immune to the "essential bias" that plagues naive algebraic approximations.

2.1 Perfect Circle: Algorithm Comparison

Fitting a circle to scattered data is a well-documented problem in computational geometry. The objective is to find a center $(x_c, y_c)$ and radius $R$ that minimizes the distance to the data points.

|

| Algorithm | Methodology | Tradeoffs | Recommendation Status |
| Geometric Fit (ODR) | Minimizes true Euclidean distance iteratively (Levenberg-Marquardt). | Highly accurate but computationally expensive. Iterative nature risks divergence or infinite loops in browser environments. | Rejected |
| Kåsa Fit (Least Squares) | Minimizes the squared algebraic distance $F(x,y) = x^2 + y^2 - R^2$. | Extremely fast but introduces severe essential bias. Tends to heavily underestimate the radius for noisy or incomplete arcs. | Rejected |
| Pratt Fit | Algebraic fit with a constrained parameter space ($A^2 + B^2 + C^2 = 1$). | Reduces essential bias significantly compared to Kåsa, but still exhibits a second-order bias. Solved via Generalized Eigenvalue Problem. | Acceptable Alternative |
| Taubin Fit | Algebraic fit approximating geometric distance via first-order Taylor expansion. | Reduces non-linear optimization to a highly stable generalized eigenvalue problem. Achieves near-geometric accuracy non-iteratively. Highly robust to human noise. | Selected |
| Hyper Fit (Chernov) | Eliminates essential bias entirely by combining Pratt and Taubin methods. | The absolute mathematical optimum. However, the matrix construction is more complex, and the benefits are only visible on extremely short arcs ($<10^\circ$). For closed loops, it performs identically to Taubin. | Rejected (Overkill) |

Conclusion for Circle: The Taubin Fit is the undisputed optimal choice for Svigl Labs. It guarantees a mathematically stable, non-iterative, $O(N)$ execution while delivering accuracy indistinguishable from the computationally heavy geometric fits.

2.2 Perfect Square and Triangle: Algorithm Comparison

Polygons present a different challenge: identifying the sharp discontinuities (corners) in a continuous human stroke, and verifying the linear integrity of the edges connecting them.

| Algorithm | Methodology | Tradeoffs | Recommendation Status |
| Hough Transform | Votes for lines in a quantized parameter space (rho, theta). | Highly robust to gaps, but computationally slow and restricted by the resolution of the accumulator array. Fails to identify exact corner intersections easily. | Rejected |
| Convex Hull | Wraps the outermost points in a convex polygon. | Extremely fast, but completely ignores concave errors (e.g., if a user draws a square with an inward-bowing edge, the convex hull masks the error). | Rejected |
| Principal Component Analysis (PCA) | Analyzes the variance of subsets of points to find line segments. | Effective for single lines, but requires complex heuristic windowing to detect corners accurately. | Rejected |
| Split-and-Merge | Iteratively splits curves at maximum deviation points and merges collinear segments. | Good for general vectorization, but threshold tuning for highly noisy human data can yield unpredictable vertex counts. | Acceptable Alternative |
| Ramer-Douglas-Peucker (RDP) | Recursively decimates points that lie close to a line segment connecting endpoints. | The gold standard for corner detection. By dynamically modulating the distance threshold $\epsilon$ via binary search, it can be forced to isolate exactly 3 or 4 vertices. | Selected |

Conclusion for Polygons: The Ramer-Douglas-Peucker (RDP) algorithm, paired with Ordinary Least Squares (OLS) regression on the isolated edge segments, is the optimal approach. RDP reliably extracts the topological skeleton of the human drawing, allowing the system to isolate the edges and verify their straightness, orthogonality, and length equality. By wrapping the classic RDP in a binary search loop, we can dynamically adjust the $\epsilon$ threshold to force the algorithm to return exactly $V$ vertices (where $V=4$ for a square and $V=3$ for a triangle).

2.3 Infinity Loop: Algorithm Comparison

The infinity loop is mathematically represented by the Lemniscate of Bernoulli. Fitting this self-intersecting curve requires parametric alignment rather than algebraic roots.

| Algorithm | Methodology | Tradeoffs | Recommendation Status |
| Bezier / Spline Fitting | Fits a multi-degree control-point curve to the data. | A catastrophic choice for scoring. Splines will overfit to the user's mistakes, modeling their wobbly lines perfectly rather than measuring the deviation from an ideal shape. | Rejected |
| Algebraic Lemniscate Fit | Solves for the coefficients of $(x^2+y^2)^2 = 2a^2(x^2-y^2)$. | Highly unstable. The 4th-degree algebraic equation creates massive numerical instability and local minima when applied to noisy, non-uniform coordinate data. | Rejected |
| Generalized Procrustes Analysis (GPA) | Iteratively aligns multiple shapes to a mean shape. | Designed for statistical shape analysis of $N > 2$ shapes. Unnecessary for a 1-to-1 comparison against a perfect reference model. | Rejected |
| Ordinary Procrustes Analysis (OPA) | Calculates the optimal rotation and translation to align a test shape to a reference shape via SVD. | The mathematically optimal approach for 1-to-1 shape comparison. By generating a "perfect" Lemniscate and using OPA to align the user's drawing, the exact spatial error can be quantified instantly. | Selected |

Conclusion for Infinity Loop: Generate a canonical Lemniscate of Bernoulli (parameterized over the same $N$ points), scale both the reference and the user's drawing to an RMS of 1.0, and utilize Ordinary Procrustes Analysis to find the optimal rotational alignment. The residual distance serves as the primary error metric.

3. Error Metrics and Human Perception

Translating spatial deviations into a percentage score requires mathematical metrics that align tightly with human visual perception. A shape may be mathematically accurate in terms of mean variance but visually abhorrent due to high-frequency jitter. The following metrics are strictly required to build a holistic profile of the drawing.

Root Mean Square Error (RMSE)

The fundamental metric for overall geometric deviation. For the circle, it is calculated as the standard deviation of the residuals (the distance of each point from the fitted Taubin radius). RMSE is highly effective because it penalizes variance symmetrically and aligns perfectly with the assumption that human motor noise follows a Gaussian distribution.

Hausdorff Distance (Maximum Deviation)

RMSE fails to penalize localized catastrophic failures. If a user draws a perfect circle but flattens one edge significantly, the RMSE may remain low, but a human observer will instantly perceive the shape as ruined. The Hausdorff distance identifies the single greatest deviation between the user's shape $X$ and the ideal shape $Y$:

$$d_H(X,Y) = \max \left\{ \sup_{x \in X} \inf_{y \in Y} d(x,y), \, \sup_{y \in Y} \inf_{x \in X} d(x,y) \right\}$$

Incorporating the Hausdorff distance ensures that localized spikes heavily penalize the final score.

Turning Angle Function (TAF)

The Turning Angle Function converts the geometric shape from the spatial domain into the frequency/curvature domain. It represents the cumulative angle of the tangent to the curve as a function of the arc length $s$. Let $\theta(s)$ be the tangent angle. The TAF is defined as $\Theta(s)$, where discontinuities are unwrapped.

$$\Theta(s) = \text{unwrap}(\arctan \left( \frac{dy(s)}{dx(s)} \right))$$

The derivative of the TAF represents the curvature of the line. A perfect straight line has a curvature of zero; a perfect circle has a constant non-zero curvature. Human drawings contain high-frequency micro-tremors. By calculating the variance of the first derivative of the TAF (after applying a slight Gaussian smoothing window to negate pixel-discretization noise), the engine can accurately quantify the "smoothness" and "confidence" of the stroke.

Corner Orthogonality and Isotropic Variance

For polygons, visual perfection requires distinct structural invariants. Corner angle error is computed as the absolute deviation from the ideal internal angles ($90^\circ$ for squares, $60^\circ$ for equilateral triangles). Isotropic variance measures the equality of side lengths; a square with perfect $90^\circ$ angles is a rectangle if the variance of its four edge lengths is non-zero.

Lobe Symmetry and Intersection Precision

The Infinity Loop is uniquely judged by its bilateral symmetry and intersection mechanics. The symmetry is quantified by splitting the Procrustes-aligned drawing at the y-axis and calculating the ratio of the left bounding area to the right bounding area. Furthermore, the intersection of the stroke must occur precisely at the geometric origin $(0,0)$. The Euclidean distance from the true stroke intersection to the origin dictates the intersection penalty.

The Two-Thirds Power Law (Kinematic Confidence)

Human motor control dictates that drawing speed is inversely proportional to curvature. The Two-Thirds Power Law states $V(t) = K \cdot R(t)^{1/3}$, where $V$ is tangential velocity, $R$ is the radius of curvature, and $K$ is the velocity gain factor. By analyzing the variance of $K$ across the stroke, the engine can measure true biomechanical fluency. A constant $K$ implies a confident, smooth, and natural movement, while a highly variable $K$ indicates halting, corrective, or tracing behaviors.

4. Score Weighting Models

The engine must collapse the multi-dimensional error metrics into a single percentage $[0, 100]$. The weights applied to these metrics are not arbitrary; they reflect the Gestalt principles of human visual perception, prioritizing the features that the brain detects most readily.

4.1 Game 1: Perfect Circle

| Metric | Weight | Mathematical Justification |
| Roundness (RMSE) | 60% | The variance from the Taubin radius is the dominant characteristic of circularity. |
| Smoothness (TAF Variance) | 15% | Heavily penalizes "hairy" or jagged lines that technically average out to a good circle. |
| Max Deviation (Hausdorff) | 10% | Applies a strict penalty for flat spots or severe lumps. |
| Closure Gap | 10% | The ratio of the gap distance to the total arc length. A circle is fundamentally a closed loop. |
| Kinematic Confidence | 5% | Variance of the velocity gain factor $K$ (Two-Thirds Power Law). |

4.2 Game 2: Perfect Square

| Metric | Weight | Mathematical Justification |
| Corner Orthogonality | 40% | The defining structural trait. Measured as the mean absolute error from $90^\circ$ for the 4 RDP vertices. |
| Edge Straightness (TAF) | 30% | The RMS orthogonal distance of inter-vertex points to the ideal OLS line segments. Prevents bowing. |
| Side Equality (Isotropy) | 15% | Variance of the 4 side lengths. Differentiates a true square from a rectangle. |
| Closure Gap | 10% | Required for structural completeness. |
| Kinematic Confidence | 5% | Variance of the velocity gain factor $K$. |

4.3 Game 3: Perfect Triangle (Equilateral)

| Metric | Weight | Mathematical Justification |
| Equilateral Angles | 40% | Mean absolute error from $60^\circ$ for the 3 RDP vertices. |
| Edge Straightness | 30% | RMS distance of stroke to the ideal OLS edge segments. |
| Side Equality (Isotropy) | 15% | Variance of the 3 side lengths. |
| Closure Gap | 10% | Structural completeness. |
| Kinematic Confidence | 5% | Variance of the velocity gain factor $K$. |

4.4 Game 4: Infinity Loop

| Metric | Weight | Mathematical Justification |
| Procrustes Distance | 45% | The primary shape-matching metric against the canonical Lemniscate of Bernoulli. |
| Lobe Symmetry | 25% | Humans struggle most with making both loops identical. Ratio of left-vs-right bounding box areas. |
| Intersection Precision | 15% | The crossing must occur at the origin. Measured as the Euclidean distance from $(0,0)$. |
| Smoothness (TAF) | 10% | Evaluates the continuous curvature, particularly around the high-curvature distal lobes. |
| Kinematic Confidence | 5% | Variance of the velocity gain factor $K$. |

5. Difficulty Tuning and the Exponential Decay Model

A critical failure in many drawing evaluation systems is score inflation. A linear mapping of mathematical error to a percentage score results in terrible drawings easily achieving $80\%+$, removing the competitive integrity of the leaderboard. Human error in precise motor tasks scales logarithmically in perception but linearly in geometry. Therefore, the scoring model must utilize an Exponential Decay Function.

The unified weighted error $E_{total}$ (where $E_{total} = 0$ is absolute perfection) is mapped to a final score $S$ using the formula:

$$S = 100 \cdot e^{-k \cdot E_{total}}$$

The decay constant $k$ determines the strictness of the game and must be uniquely calibrated based on human biomechanical limits for each shape. The calibration is established by defining strict boundary conditions:

$S = 100\%$: Mathematically impossible. Requires $E_{total} = 0$. Screen pixel discretization, input polling rates, and physical hand tremors guarantee this can never be achieved organically.

$S = 99\%$: Extremely rare. Achievable only by an error margin approaching the physical limits of hardware (e.g., an RMSE of $<0.005$ in a unit-scaled bounding box).

$S = 95\%$: Genuinely impressive. Requires a highly skilled, confident, and accurate stroke.

$S = 50\%$: Visibly flawed, asymmetrical, or jagged.

If testing reveals that an $E_{total}$ of $0.05$ represents an outstanding circle that should score $95\%$, the constant $k$ is calculated as:

$$95 = 100 \cdot e^{-k \cdot 0.05} \implies \ln(0.95) = -k \cdot 0.05 \implies k \approx 1.025$$

To prevent the exponential tail from awarding points to absolute garbage, a hard floor is implemented. If the raw exponential calculation yields $S < 30\%$, the score is immediately mapped to $0\%$. This ensures that users cannot randomly scribble and achieve a $25\%$ score.

6. Anti-Cheat and Exploit Mitigation

Because the SVG application runs in a client-side browser, malicious actors can easily manipulate the DOM, intercept network requests, or utilize external hardware assistance to achieve perfect scores. The backend engine must validate the kinematic and geometric signatures of the drawing to prevent cheating.

| Exploit Vector | Detection Mechanism | Mitigation Strategy |
| DOM / Payload Manipulation | The client must not transmit SVG <path> strings. It must transmit the raw [{x,y,t}] arrays. | The backend scoring engine independently rebuilds and verifies the geometry. Manual string edits fail. |
| Algorithmic Bots (Perfect Speed) | Bots inject points with a mathematically perfect time delta ($\Delta t$) and spatial distance. | Calculate the variance of Euclidean velocity $v = ds/dt$. Human strokes exhibit a natural acceleration/deceleration curve. If velocity variance $< 0.001$, flag as synthetic and reject. |
| Rulers / Hardware Straight-edges | Utilizing a physical ruler creates perfectly linear pixel increments. | Analyze the Turning Angle Function over straight segments. Human hands possess a baseline physiological tremor. If TAF variance is identically $0.000$, flag as hardware assistance. |
| Monitor Tracing | Users placing a translucent guide over the screen to trace a perfect circle. | Tracing forces a high-friction, slow, and highly corrective kinematic profile that violates the Two-Thirds Power Law. If completion time $T > 10,000$ms or velocity gain variance is extremely high, apply a severe confidence penalty or reject. |
| Scribbling / Overlapping | Drawing massive chaotic zig-zags that statistically cover the area of the ideal shape. | Calculate the Isoperimetric Quotient $Q = \frac{4\pi A}{P^2}$. For a circle, $Q=1$. If $Q < 0.2$, the drawing is an invalid scribble. Reject instantly. |
| Multiple Concentric Loops | Drawing a circle three times rapidly to average out the spatial error. | Integrate the total absolute turning angle $\sum \vert{}\Delta \theta\vert{}$. A single closed loop totals $2\pi$ ($360^\circ$). If the sum exceeds $2.5\pi$, the user has drawn multiple loops. Reject. |

7. Performance and Algorithmic Complexity

The entire scoring engine must execute in real-time, comfortably fitting within the 16.6ms budget of a 60 FPS browser render loop, even on lower-end mobile devices. The selection of non-iterative mathematical algorithms guarantees this performance.

Assuming a normalized payload of $N = 1000$ points:

Arc-length Resampling: Requires a single sequential pass over the array to calculate cumulative distances, followed by a linear interpolation pass. Complexity: $O(N)$.

Translation and RMS Scaling: A single pass to compute the centroid, a second pass to compute the RMS distance, and a third pass to scale. Complexity: $O(N)$.

Taubin Fit (Circle): Building the covariance moment matrices requires iterating over the points once, $O(N)$. Solving the characteristic polynomial of the resulting $4 \times 4$ matrix using the Newton-Raphson method takes $O(1)$ time, as matrix dimensions are fixed and independent of $N$. Total: $O(N)$.

Ramer-Douglas-Peucker (Polygons): The average case complexity is $O(N \log N)$. With the binary search wrapper for dynamic $\epsilon$, it runs $O(K \cdot N \log N)$ where $K$ is the constant number of binary search iterations (e.g., 20). In a browser, this will execute in less than 2 milliseconds. Total: $O(N \log N)$.

Ordinary Procrustes Analysis (Infinity Loop): Constructing the cross-covariance matrix between the reference array and input array is $O(N)$. Computing the Singular Value Decomposition (SVD) of the resulting $2 \times 2$ matrix is trivial and executes in $O(1)$ time. Total: $O(N)$.

Conclusion: The overall time complexity of the highest-overhead pipeline is bounded by $O(N \log N)$. Memory footprint is strictly $O(N)$ for the arrays. The entire evaluation will consume less than 3ms of CPU time, guaranteeing flawless 60 FPS performance.

8. Mathematical Foundations and Algorithms

This section provides the rigorous mathematical derivations required for the coding agent to construct the engine.

8.1 Taubin Circle Fit Mathematics

The Taubin method represents a circle as the algebraic equation $F(x,y) = A(x^2 + y^2) + Bx + Cy + D = 0$. The objective function to minimize is the ratio of the algebraic distance to the square of the spatial gradient:

$$\mathcal{F}(A,B,C,D) = \frac{\sum_{i=1}^N (A z_i + B x_i + C y_i + D)^2}{\sum_{i=1}^N (4A^2 z_i + 4AB x_i + 4AC y_i + B^2 + C^2)}$$

where $z_i = x_i^2 + y_i^2$. By moving the origin to the centroid of the data ($\sum x_i = 0$, $\sum y_i = 0$), we isolate $D$. The problem reduces to solving the generalized eigenvalue problem:

$$\mathbf{M} \mathbf{v} = \lambda \mathbf{N} \mathbf{v}$$

where $\mathbf{v} = [A, B, C]^T$.

The matrices are constructed from the moments of the data:

$$\mathbf{M} = \begin{bmatrix} S_{zz} & S_{xz} & S_{yz} \\ S_{xz} & S_{xx} & S_{xy} \\ S_{yz} & S_{xy} & S_{yy} \end{bmatrix}, \quad \mathbf{N} = \begin{bmatrix} 4S_{z} & 2S_{x} & 2S_{y} \\ 2S_{x} & N & 0 \\ 2S_{y} & 0 & N \end{bmatrix}$$

Since data is centered, $S_x = 0$ and $S_y = 0$, heavily simplifying $\mathbf{N}$. The optimal parameters are the elements of the eigenvector $\mathbf{v}$ corresponding to the smallest positive eigenvalue $\lambda$. The root can be found deterministically using the Newton-Raphson method on the characteristic polynomial $\det(\mathbf{M} - \lambda \mathbf{N}) = 0$. The radius is recovered via $R = \sqrt{\frac{B^2+C^2}{4A^2} - \frac{D}{A}}$.

8.2 Ramer-Douglas-Peucker (RDP) Algorithm

RDP operates by drawing a line between the first point $p_1$ and the last point $p_k$ of a curve segment. It computes the perpendicular distance of every intermediate point $p_i$ to this line:

$$d(p_i, L) = \frac{\vert{}(y_k - y_1)x_i - (x_k - x_1)y_i + x_k y_1 - y_k x_1\vert{}}{\sqrt{(y_k - y_1)^2 + (x_k - x_1)^2}}$$

If the maximum distance $d_{max}$ is greater than a threshold $\epsilon$, the curve is split at that point, and the algorithm recursively evaluates the two new segments.

Dynamic Binary Search for $\epsilon$: Standard RDP uses a static $\epsilon$, resulting in a variable number of corners. To force exactly 4 corners for a square, the engine wraps RDP in a binary search:

// Pseudocode
let min_eps = 0.0;
let max_eps = 2.0; // Assuming RMS scaled space
let best_vertices = [];

for (let i = 0; i < 20; i++) {
    let eps = (min_eps + max_eps) / 2;
    let vertices = RDP(points, eps);
    
    if (vertices.length > target_vertices) {
        min_eps = eps; // Need stricter threshold to remove noise
    } else if (vertices.length < target_vertices) {
        max_eps = eps; // Threshold too strict, lost corners
    } else {
        best_vertices = vertices;
        // Optionally break early or continue to find the tightest eps
    }
}
return best_vertices;



8.3 Ordinary Procrustes Analysis Mathematics

Given two centered $N \times 2$ matrices, $\mathbf{X}$ (the user input) and $\mathbf{Y}$ (the ideal Lemniscate of Bernoulli reference), scaled to unit RMS. We seek the rotation matrix $\mathbf{R}$ that minimizes $\vert{}\vert{}\mathbf{Y} - \mathbf{X}\mathbf{R}^T\vert{}\vert{}_F$.

Calculate the cross-covariance matrix $\mathbf{C} = \mathbf{Y}^T \mathbf{X}$. (This is a $2 \times 2$ matrix).

Compute the Singular Value Decomposition $\mathbf{C} = \mathbf{U} \mathbf{\Sigma} \mathbf{V}^T$.

The optimal rotation matrix is $\mathbf{R} = \mathbf{U} \mathbf{V}^T$.

Check $\det(\mathbf{R})$. If $\det(\mathbf{R}) < 0$, it indicates a reflection. Multiply the second column of $\mathbf{U}$ by $-1$ and recompute $\mathbf{R}$ to constrain the transformation strictly to rotation.

Apply the rotation to the user input $\mathbf{X}' = \mathbf{X}\mathbf{R}^T$ and compute point-to-point Euclidean distances for the final error.

9. Recommended Final Pipeline

The following linear execution path represents the complete lifecycle of a drawing evaluation within the Svigl Labs backend:

Collect Points: Ingest JSON payload [{x, y, t}].

Security Check: Validate minimum point count, evaluate bounding box size, run Isoperimetric Quotient check, and verify velocity variance. Reject bots immediately.

Resample: Re-interpolate stroke into 1,000 equidistant spatial points based on arc length.

Normalize: Translate centroid to $(0,0)$ and scale coordinates using RMS distance $= 1.0$.

Topological Fixes: Enforce counter-clockwise direction (via Shoelace formula) and apply linear blending to closure gaps if start/end points are within $5\%$ proximity.

Shape Fit & Metric Computation:

Circle: Taubin Fit $\rightarrow$ RMSE, Hausdorff, TAF variance.

Polygons: Dynamic RDP $\rightarrow$ Corner Angle Error, Edge Straightness (RMSE), Edge Isotropy.

Infinity Loop: Lemniscate Generation + Procrustes SVD $\rightarrow$ Procrustes Distance, Symmetry Area Ratio, Intercept Error.

Weighted Error Model: Multiply metrics by designated domain weights to produce $E_{total}$.

Exponential Tuning: Transform $E_{total}$ via $S = 100 \cdot e^{-k \cdot E_{total}}$.

Floor Enforcement: Cap score to two decimal places, floor scores under 30% to 0%.

Output: Return final JSON object to the game frontend.

10. Final Engineering Specification

This section provides the explicit, unambiguous variables and weights required for the coding agent to directly implement the scoring engine.

Global Configuration

| Parameter | Value | Description |
| TARGET_POINTS ($M$) | 1000 | Resolution for arc-length resampling. |
| CLOSURE_THRESHOLD | 0.05 | Max gap (ratio to total length) permitted for synthetic closure. |
| SCORE_FLOOR | 30.0 | Minimum raw score before being forced to 0. |

Game 1: Perfect Circle

| Component | Value / Formula |
| Fitting Algorithm | Taubin Fit (See Section 8.1) |
| Decay Constant ($k$) | 1.35 |
| Weight: Roundness | 0.60 $\times$ (RMSE from calculated Taubin radius) |
| Weight: Smoothness | 0.15 $\times$ (Variance of the Turning Angle Function derivative) |
| Weight: Closure | 0.10 $\times$ (Euclidean distance between raw $p_1$ and $p_N$) |
| Weight: Max Dev | 0.10 $\times$ (Hausdorff distance from Taubin radius) |
| Weight: Confidence | 0.05 $\times$ (Variance of velocity gain factor $K$) |

Game 2: Perfect Square

| Component | Value / Formula |
| Fitting Algorithm | Dynamic RDP (Target vertices = 4, Binary Search Iterations = 20) |
| Decay Constant ($k$) | 1.50 |
| Weight: Orthogonality | 0.40 $\times$ (Mean error of internal angles from $90^\circ$) |
| Weight: Straightness | 0.30 $\times$ (RMSE of edge points to ideal OLS line segments) |
| Weight: Side Equality | 0.15 $\times$ (Variance of the 4 calculated edge lengths) |
| Weight: Closure | 0.10 $\times$ (Euclidean gap distance) |
| Weight: Confidence | 0.05 $\times$ (Variance of velocity gain factor $K$) |
| Rejection Threshold | If RDP binary search cannot find exactly 4 corners within bounds, abort (not a square). |

Game 3: Perfect Triangle

| Component | Value / Formula |
| Fitting Algorithm | Dynamic RDP (Target vertices = 3) |
| Decay Constant ($k$) | 1.45 |
| Weight: Angles | 0.40 $\times$ (Mean error of internal angles from $60^\circ$) |
| Weight: Straightness | 0.30 $\times$ (RMSE of edge points to ideal OLS line segments) |
| Weight: Side Equality | 0.15 $\times$ (Variance of the 3 calculated edge lengths) |
| Weight: Closure | 0.10 $\times$ (Euclidean gap distance) |
| Weight: Confidence | 0.05 $\times$ (Variance of velocity gain factor $K$) |

Game 4: Infinity Loop

| Component | Value / Formula |
| Reference Model | Lemniscate of Bernoulli: $x = \frac{\sqrt{2}\cos(t)}{1+\sin^2(t)}$, $y = \frac{\sqrt{2}\cos(t)\sin(t)}{1+\sin^2(t)}$ |
| Fitting Algorithm | Ordinary Procrustes Analysis (SVD of $2 \times 2$ covariance matrix) |
| Decay Constant ($k$) | 1.05 (More forgiving due to complex motor demands) |
| Weight: Procrustes | 0.45 $\times$ (Residual Euclidean distance after rotational alignment) |
| Weight: Symmetry | 0.25 $\times$ $\vert{}1.0 - (\text{Area}_{left} / \text{Area}_{right})\vert{}$ |
| Weight: Intersection | 0.15 $\times$ (Euclidean distance of calculated intersection to $(0,0)$) |
| Weight: Smoothness | 0.10 $\times$ (Variance of Turning Angle Function derivative) |
| Weight: Confidence | 0.05 $\times$ (Variance of velocity gain factor $K$) |

Expected Output Payload

The scoring engine must resolve to a strictly typed output suitable for leaderboard databases:

{
  "status": "VALID", // Or "REJECTED_BOT", "REJECTED_SCRIBBLE"
  "final_score": 96.45,
  "metrics": {
    "primary_error": 0.024,
    "smoothness_error": 0.011,
    "closure_error": 0.002
  },
  "flags": {
    "is_hardware_assisted": false
  }
}

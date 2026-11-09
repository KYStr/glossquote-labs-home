# Elliptical Corner Radius Explorer — author document checks

These are author checks of document arithmetic and coverage, not product tests or independent approval. No product implementation or browser execution is included.

|Case|Exact factor|Limiting sides|Adjusted x (TL/TR/BR/BL)|Adjusted y (TL/TR/BR/BL)|
|---|---|---|---|---|
|default|1|none|24, 24, 24, 24|16, 16, 16, 16|
|all80|5/8|top, right, bottom, left|50, 50, 50, 50|50, 50, 50, 50|
|asymmetric|4/5|top|72, 48, 24, 16|8, 24, 40, 8|
|resize|1|none|90, 60, 30, 20|10, 30, 50, 10|
|zero|1|none|0, 0, 0, 0|0, 0, 0, 0|
|zero-axis|5/8|right, left|0, 50, 50, 0|50, 50, 50, 50|
|repeating|5/6|top, right, bottom, left|50, 50, 50, 50|50, 50, 50, 50|

## v0.2 display tie check

W=H40, all eight requested radii640: exact f=1/32; four-place half-away display0.0313, adjusted-radius display20.00. All four sides limit. Display rounding never feeds back into radius calculation; f1 displays1.0000.

The contrast change defines a finite desktop criterion only. No actual contrast measurement has been performed. Product/native GUI/technical tests: NOT_RUN. All nine product quality scores: null. Independent document review is separately recorded by its reviewer; this author check does not grant readiness, publication or implementation.

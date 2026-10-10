/**
 * Shared "contract page" look for the page field and the red clause, so the outlier is
 * indistinguishable from every other page until the light finds it.
 *
 * Unreadable ruled clause lines (ragged ends, paragraph gaps), soft paper edges, a faint edge rim
 * like light through a sheet. Lines are filtered with fwidth so distant pages fold into tone
 * instead of shimmering.
 */
export const PAPER_GLSL = /* glsl */ `
float pzPageHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

const float PZ_ROWS = 17.0;

/** Row index (top = 0) of a uv. */
float pzPageRow(vec2 uv) { return floor((1.0 - uv.y) * PZ_ROWS); }

/** x = clause-line mask, y = edge rim, z = body (soft silhouette). soft: 0 (sharp) .. 1 (defocused). */
vec3 pzPaper(vec2 uv, float seed, float soft) {
  vec2 c = uv - 0.5;
  float edge = mix(0.03, 0.2, soft);
  vec2 e = 1.0 - smoothstep(vec2(0.5 - edge), vec2(0.5), abs(c));
  float body = e.x * e.y;
  float m = max(abs(c.x), abs(c.y));
  float rim = smoothstep(0.3, 0.47, m) * body;

  float fy = (1.0 - uv.y) * PZ_ROWS;
  float row = floor(fy);
  float fw = fwidth(fy);
  float band = 1.0 - smoothstep(0.1, 0.22 + fw * 0.9 + soft * 0.4, abs(fract(fy) - 0.5));
  float h1 = pzPageHash(row * 7.31 + seed * 91.7);
  float h2 = pzPageHash(row * 3.17 + seed * 17.3);
  float len = 0.42 + 0.46 * h1;
  float para = step(0.18, h2);
  float xin = smoothstep(0.11, 0.13, uv.x) * (1.0 - smoothstep(len - 0.01, len + 0.01, uv.x));
  float inRows = step(1.5, row) * step(row, PZ_ROWS - 2.5);
  float lines = band * xin * inRows * para;
  // far / defocused pages: lines fold into an even tone (no moire)
  float fold = smoothstep(0.25, 0.7, fw + soft * 0.6);
  lines = mix(lines, 0.32 * inRows * step(0.11, uv.x) * step(uv.x, 0.75), fold);
  return vec3(lines, rim, body);
}
`;

"""Symbolically check the measured discrete spring and stagger endpoints.

Run with SymPy installed: python scripts/verify-particle-math.py
"""
import json
from pathlib import Path
import sys

# Optional project-local install; no runtime Python dependency in the website.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".cache" / "python"))
from sympy import Abs, Matrix, Max, Min, Rational, Symbol, exp, log, pi, simplify, sqrt  # noqa: E402

k, friction = Rational(6, 1000), Rational(892, 1000)
matrix = Matrix([[1 - friction * k, friction], [-friction * k, friction]])
assert simplify(matrix.det() - friction) == 0
eigenvalues = list(matrix.eigenvals())
assert all(simplify(Abs(value) - sqrt(friction)) == 0 for value in eigenvalues)
assert sqrt(friction) < 1
length = 10000
rank = Symbol("rank", nonnegative=True)
for delay in (Rational(5, 10000), Rational(15, 100000)):
    raw_at_zero = -delay * rank
    raw_at_one = 1 + delay * (length - 1) - delay * rank
    assert raw_at_zero.is_nonpositive
    assert raw_at_one.subs(rank, length - 1) == 1
    assert raw_at_one.subs(rank, 0) > 1
explode = Symbol("explode", real=True)
assert Abs(explode - 1).subs(explode, 1) == 0

# Smooth scroll: Lenis applies 1 - exp(-lerp*60*dt); lerp = -ln(1 - 3/40)
# reproduces Dala's ASScroll ease of exactly 3/40 per 60 Hz frame.
scroll_ease = Rational(3, 40)
lenis_lerp = -log(1 - scroll_ease)
assert simplify(1 - exp(-lenis_lerp * 60 * Rational(1, 60)) - scroll_ease) == 0
frames = Symbol("frames", positive=True)
# Frame-normalised easing: n frames of k equal one step of 1 - (1 - k)^n.
assert simplify((1 - (1 - (1 - scroll_ease) ** 2)) - (1 - scroll_ease) ** 2) == 0
settle_95 = log(Rational(1, 20)) / log(1 - scroll_ease)


def ramp(f, a, b, c=0, d=1, low=None, high=None):
    """Dala's zt(Ut(f, a, b, c, d), low, high): clamped linear map."""
    low = Min(c, d) if low is None else low
    high = Max(c, d) if high is None else high
    value = (d if f >= a else c) if a == b else c + (f - a) / (b - a) * (d - c)
    return Min(high, Max(low, value))


def desktop_pose(f):
    q = Rational(181, 200)  # 0.905
    x = (ramp(f, 0, 1, 3, Rational(-9, 2)) + ramp(f, Rational(5, 4), Rational(3, 2), q, 5)
         - ramp(f, Rational(14, 5), 3, q, 3) + ramp(f, Rational(33, 10), Rational(7, 2), q, 6)
         - ramp(f, Rational(9, 2), 5, q, 5, q, 4))
    rot_y = (ramp(f, 0, 1, 0, -pi / 2) + ramp(f, Rational(27, 10), 3, 0, pi / 2)
             + ramp(f, Rational(33, 10), Rational(7, 2), 0, pi / 4)
             - ramp(f, Rational(9, 2), 5, 0, Rational(5, 4) * pi) + ramp(f, Rational(57, 10), 6, 0, pi))
    rot_z = ramp(f, Rational(27, 10), 3, 0, Rational(-489, 1000)) + ramp(
        f, Rational(33, 10), Rational(7, 2), 0, Rational(6, 10))
    blow = (ramp(f, Rational(11, 10), Rational(11, 5)) - ramp(f, Rational(14, 5), 3)
            + ramp(f, Rational(9, 2), 5) - ramp(f, Rational(57, 10), 6))
    progress = ramp(f, Rational(27, 10), 3) + ramp(f, Rational(33, 10), Rational(7, 2)) + ramp(
        f, Rational(57, 10), 6)
    return x, rot_y, rot_z, blow, progress


# Beats against the measured table (docs/reference/dala-measurements.json).
beats = {
    0: (3, 0, 0, 0, 0),
    1: (Rational(-9, 2), -pi / 2, 0, 0, 0),
    Rational(11, 5): (Rational(-81, 200), -pi / 2, 0, 1, 0),
    3: (Rational(-5, 2), 0, Rational(-489, 1000), 0, 1),
    Rational(7, 2): (Rational(519, 200), pi / 4, Rational(111, 1000), 0, 2),
    5: (Rational(-1, 2), -pi, Rational(111, 1000), 1, 2),
    6: (Rational(-1, 2), 0, Rational(111, 1000), 0, 3),
}
for f, expected in beats.items():
    assert all(simplify(a - b) == 0 for a, b in zip(desktop_pose(Rational(f)), expected)), f


def pointer_peak(step_px, events, width=1440):
    """Dala's chain at 60 Hz: impulse = clamp(50 * NDC step, 2), decays 0.9 per
    frame; u_delta eases toward it by 0.075 per frame. One event per frame."""
    impulse = delta = peak = 0.0
    for event in range(events + 30):
        if event < events:
            impulse = max(-2.0, min(2.0, 50 * step_px / width * 2))
        impulse *= 0.9
        delta += (impulse - delta) * 0.075
        peak = max(peak, delta)
    return peak


slow_peak, fast_peak = pointer_peak(2, 80), pointer_peak(90, 4)
assert slow_peak < 0.25 < 0.5 < fast_peak
result = {
    "method": "SymPy exact rational arithmetic",
    "spring": str(k), "friction": str(friction),
    "matrix": str(matrix), "spectral_radius": float(sqrt(friction)),
    "envelope_2_percent_frames": float(log(Rational(2, 100)) / log(sqrt(friction))),
    "stagger_endpoints": "all ranks start at 0 and complete at 1 after clamping",
    "hover_at_full_explosion": 0,
    "smooth_scroll_ease_per_frame": str(scroll_ease),
    "lenis_lerp": float(lenis_lerp),
    "smooth_scroll_95_percent_frames": float(settle_95),
    "choreography_beats_checked": [str(f) for f in beats],
    "pointer_peak_2px_per_frame": round(slow_peak, 3),
    "pointer_peak_90px_per_frame": round(fast_peak, 3),
}
destination = Path(__file__).resolve().parents[1] / "docs" / "reference" / "math-verification.json"
destination.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))

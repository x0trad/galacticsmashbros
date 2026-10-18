"""Front (down-facing) walk for the robot, authored as explicit pixel-row edits. Zero API calls."""
import json, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from robot_anim import *

master, base = load_master()

# column bands measured on the master
LEG_L = (48, 96)      # left leg incl. boot (x)
LEG_R = (99, 148)
ARM_L = (28, 57)
ARM_R = (137, 166)
LEG_SEAM = 160        # inside the red greave band between knee disc and boot
ARM_SEAM = 127        # red arm-pad rows; repeated to lengthen the arm when it swings toward camera
UPPER_SEAMS = (122, 131)

def breathe(a, total):
    """Upper body (everything above the lowest seam, full width) moves by `total` px over planted legs."""
    out = a
    for seam, share in sorted([(s, t) for s, t in zip(UPPER_SEAMS, (total // 2, total - total // 2))], reverse=True):
        if share:
            out = band_bob(out, 0, W, 0, seam, share)
    return out

def pose(lift_l=0, lift_r=0, arm_l=0, arm_r=0, body=0, dx=0):
    a = base.copy()
    # legs first (they are below every upper-body seam)
    a = band_lift(a, *LEG_L, LEG_SEAM, lift_l)
    a = band_lift(a, *LEG_R, LEG_SEAM, lift_r)
    # arms: fists/forearms below the seam slide with a counter-swing
    a = band_shift_below(a, *ARM_L, ARM_SEAM, arm_l, y_end=156)
    a = band_shift_below(a, *ARM_R, ARM_SEAM, arm_r, y_end=156)
    a = breathe(a, body)
    a = sway(a, 0, 131, dx)   # weight shift of the upper body toward the planted leg
    return a

# 4-frame cycle: lift L / plant / lift R / plant. Opposite arm swings forward (down, closer to camera).
frames = [
    pose(lift_l=9, arm_r=3, arm_l=-2, body=-1, dx=1),
    pose(body=2),
    pose(lift_r=9, arm_l=3, arm_r=-2, body=-1, dx=-1),
    pose(body=2),
]

if __name__ == "__main__":
    doc = to_doc(master, "robot-walk-down", [("walk-down", 8, True, frames)])
    out = ROOT / "output/robot-walk"
    out.mkdir(parents=True, exist_ok=True)
    (out / "walk-down.sprite.json").write_text(json.dumps(doc))
    sheet(doc, 0, 2).save(out / "walk-down-sheet.png")
    print("ok")

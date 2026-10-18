"""Check the real local animation output and preservation of approved art."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('animate_sprite',ROOT/'scripts/animate_sprite.py')
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class SpriteRigTest(unittest.TestCase):
    def test_generated_animation_is_usable_without_repainting_the_character(self):
        with tempfile.TemporaryDirectory() as td:
            out=Path(td)
            original,frames,project=module.generate(ROOT/'assets/characters/robot-rig-study/master.sprite.json',ROOT/'assets/characters/robot-rig-study/walk-rig.json',out)
            self.assertEqual(len(frames),4)
            self.assertEqual(len({f.tobytes() for f in frames}),4)
            original_colours=set(original.getdata())
            for frame, encoded in zip(frames,project['animations'][0]['frames']):
                self.assertEqual(frame.size,(192,192))
                self.assertLessEqual(set(frame.getdata()),original_colours)
                self.assertEqual(frame.crop((0,0,192,118)).tobytes(),original.crop((0,0,192,118)).tobytes())
                self.assertNotEqual(frame.crop((48,145,148,184)).tobytes(),original.crop((48,145,148,184)).tobytes())
                self.assertEqual(frame.getchannel('A').getextrema(),(0,255))
                bounds=frame.getbbox()
                self.assertTrue(bounds[0]>0 and bounds[1]>0 and bounds[2]<192 and bounds[3]<192)
                single={**project,'animations':[{'frames':[encoded]}]}
                self.assertEqual(module.decode(single).tobytes(),frame.tobytes())
            with Image.open(out/'walk-down-sheet.png') as sheet:
                self.assertEqual(sheet.size,(768,192))
            self.assertEqual(json.loads((out/'provenance.json').read_text())['api_calls'],0)
            with Image.open(out/'walk-preview.gif') as gif:
                self.assertEqual(gif.n_frames,4)

if __name__=='__main__': unittest.main()

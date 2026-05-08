import imageio
from rembg import remove, new_session
from PIL import Image
import numpy as np
from tqdm import tqdm

input_path = r"E:\Portfolio\rea.mp4"
output_path = r"E:\Portfolio\rea_nobg.webm"

reader = imageio.get_reader(input_path)
meta = reader.get_meta_data()
fps = meta.get('fps', 24)
session = new_session('u2net')
writer = imageio.get_writer(output_path, fps=fps, codec='libvpx-vp9', format='FFMPEG', pixelformat='yuva420p', bitrate='4M')
try:
    for frame in tqdm(reader, desc='Removing background', total=int(meta.get('duration',0)*fps)):
        img = Image.fromarray(frame)
        out = remove(img, session=session)
        out = out.convert('RGBA')
        writer.append_data(np.array(out))
finally:
    writer.close()
    reader.close()
print('Saved to', output_path)

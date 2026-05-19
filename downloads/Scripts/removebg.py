from PIL import Image
import numpy as np, os, colorsys, zipfile, math
in_path="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
img=Image.open(in_path).convert("RGBA")
arr=np.array(img).astype(np.uint8)
rgb=arr[:,:,:3].astype(np.float32)
# Convert to HSV-ish for mask
# tape/text are yellow high saturation or black low value. checker/white bg are low saturation high value.
r,g,b = rgb[:,:,0]/255.0, rgb[:,:,1]/255.0, rgb[:,:,2]/255.0
maxc=np.max(rgb/255.0,axis=2)
minc=np.min(rgb/255.0,axis=2)
sat=np.where(maxc==0,0,(maxc-minc)/maxc)
val=maxc
# Keep pixels that are yellow/orange (sat high, red/green high) or black/dark text/shadow or gray shadow near tape
yellow = (sat>0.22) & (r>0.45) & (g>0.35) & (b<0.35)
dark = (val<0.52)  # black text and dark shadows
# also keep dark yellow shadow (sat medium)
keep = yellow | dark
# refine: close/dilate keep to preserve antialias edges/shadows near tape
from scipy.ndimage import binary_dilation, binary_erosion, binary_fill_holes
keep_d = binary_dilation(keep, iterations=2)
# set alpha based on keep; antialias softly by distance? Use original keep for solid, nearby as semi.
alpha=np.zeros(keep.shape, dtype=np.uint8)
alpha[keep]=255
edge = keep_d & ~keep
# keep edge pixels if not near white background? Some anti-aliased yellow edges or shadows have sat/val not caught.
# Use color distance to neutral background: neutral high val not keep, set transparent. Otherwise alpha proportional saturation/darkness
edge_score=np.maximum(sat, 1-val)
alpha[edge]=(np.clip(edge_score[edge]*255*1.4,0,180)).astype(np.uint8)
out=arr.copy()
out[:,:,3]=alpha
# For pixels with alpha=0 set white rgb no matter
out[alpha==0,:3]=255
out_img=Image.fromarray(out,'RGBA')
out_path="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
out_img.save(out_path)
img.size, out_path, os.path.getsize(out_path)

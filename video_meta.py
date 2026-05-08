import imageio
input_path = r"E:\Portfolio\rea.mp4"
reader = imageio.get_reader(input_path)
meta = reader.get_meta_data()
print(meta)
reader.close()

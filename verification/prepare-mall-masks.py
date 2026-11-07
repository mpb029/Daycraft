"""Numerical surface registration for the mall shaders; not a photo edit."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
size=(1672,941)
water=Image.new('L',size);d=ImageDraw.Draw(water)
# Waterline follows the photographed inner lip, leaving the tile rim solid.
d.polygon([(610,591),(625,585),(672,579),(753,575),(870,572),(1010,570),(1175,570),(1350,572),(1500,576),(1610,582),(1672,589),(1672,609),(1585,619),(1435,625),(1250,627),(1055,625),(890,620),(755,614),(659,604),(617,597)],fill=255)
water=water.filter(ImageFilter.GaussianBlur(.65))
steps=Image.new('L',size);d=ImageDraw.Draw(steps)
d.polygon([(924,498),(1012,334),(1036,336),(966,499)],fill=255)
d.polygon([(1080,445),(1107,347),(1121,347),(1098,451)],fill=128)
steps=steps.filter(ImageFilter.GaussianBlur(1.3))
screens=Image.new('L',size);d=ImageDraw.Draw(screens)
for poly in [[(500,468),(533,469),(533,498),(500,498)],[(1575,476),(1589,476),(1588,494),(1574,494)],[(1607,486),(1621,486),(1618,500),(1605,500)],[(1645,487),(1659,485),(1655,500),(1642,501)]]:d.polygon(poly,fill=255)
screens=screens.filter(ImageFilter.GaussianBlur(.5))
out=Path('assets/mall/surfaces.png');Image.merge('RGB',(water,steps,screens)).save(out);print(out)

"""Generate numeric surface IDs for the Stormwatch shader, not scene artwork.
R = closed glass, G = moving sea, B = cloud sky, A = 128 + 127 * stove fire.
Coordinates are surveyed against the approved 1672 x 941 composition.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter

size=(1672,941)
def mask(polygons):
    im=Image.new('L',size);d=ImageDraw.Draw(im)
    for p in polygons:d.polygon(p,fill=255)
    return im

panes=[[(594,102),(814,65),(814,287),(594,300)],
       [(594,318),(814,303),(814,545),(595,537)],
       [(861,49),(1124,0),(1124,264),(861,283)],
       [(861,301),(1124,280),(1124,565),(861,549)],
       [(1165,0),(1573,0),(1573,234),(1165,265)],
       [(1165,284),(1573,253),(1573,589),(1165,572)]]
glass=mask(panes)
sea=mask([[(905,398),(1573,398),(1573,589),(1490,580),(1360,563),(1280,540),(1206,528),(1164,519),(1086,518),(1035,508),(993,495),(968,470),(947,451),(939,424),(931,411)]])
# The breakwater now has depth-tested geometry. Foreground objects stay opaque.
d=ImageDraw.Draw(sea)
d.polygon([(1377,563),(1405,562),(1404,591),(1377,591)],fill=0)
sea=ImageChops.multiply(sea,glass)
sky=mask([[(0,0),(1672,0),(1672,396),(943,396),(895,391),(858,385),(810,377),(748,372),(687,364),(617,365),(617,0)]])
sky=ImageChops.multiply(sky,glass)
fire=mask([[(119,531),(121,518),(136,505),(155,501),(175,506),(186,517),(186,528)],
           [(202,526),(203,512),(217,502),(237,502),(251,517),(253,526)],
           [(119,539),(185,535),(185,617),(119,630)],
           [(202,535),(253,532),(253,616),(202,620)]])
channels=[im.filter(ImageFilter.GaussianBlur(.65)) for im in (glass,sea,sky,fire)]
# Nonzero alpha preserves RGB data through browser image decoders.
channels[3]=channels[3].point(lambda x:128+round(x*127/255))
dest=Path('assets/stormwatch');dest.mkdir(parents=True,exist_ok=True)
Image.merge('RGBA',channels).save(dest/'surfaces.png',optimize=True)
print('Wrote surface IDs:',dest/'surfaces.png')

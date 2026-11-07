"""Register moving stair/belt surfaces. This is numeric masking, not a photo edit."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
size=(1672,941)
up=Image.new('L',size);d=ImageDraw.Draw(up)
d.polygon([(1018,334),(1040,334),(1040,349),(1031,370),(1018,399),(1005,430),(991,463),(978,488),(972,492),(969,501),(971,519),(975,531),(975,539),(938,539),(940,529),(946,510),(953,490),(961,468),(976,430),(990,398),(1004,367)],fill=255)
down=Image.new('L',size);d=ImageDraw.Draw(down)
d.polygon([(1106,352),(1121,352),(1119,372),(1116,394),(1110,425),(1104,440),(1096,439),(1094,430),(1086,428),(1092,405),(1098,379)],fill=255)
# Exclude the foreground palm leaf that crosses the lower visible down flight.
d.polygon([(1091,429),(1097,426),(1100,435),(1100,446),(1091,446)],fill=0)
rails=Image.new('L',size);d=ImageDraw.Draw(rails)
for points,width in [
 ([(901,527),(900,508),(902,497),(906,493),(918,493),(930,491),(938,484),(949,458),(962,427),(976,396),(990,364),(1003,337),(1007,332),(1011,331)],2),
 ([(979,529),(974,521),(972,508),(973,499),(976,491),(981,489),(991,489),(999,487),(1006,470),(1015,447)],2),
 ([(1011,436),(1024,404),(1037,373),(1043,357)],2),
 ([(1109,431),(1116,406),(1122,377),(1128,347)],2)
]:d.line(points,fill=255,width=width,joint='curve')
# Soft registration edges prevent a pasted-on outline without moving adjacent
# stationary chrome, glass, plant leaves, or the mall floor.
up=up.filter(ImageFilter.GaussianBlur(.4));down=down.filter(ImageFilter.GaussianBlur(.4));rails=rails.filter(ImageFilter.GaussianBlur(.35))
out=Path('assets/mall/escalators.png');Image.merge('RGB',(up,down,rails)).save(out);print(out)

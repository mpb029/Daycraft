"""Native GLES cinema geometry/render check. Supersampled geometry output. Does not run a browser or app UI."""
from pathlib import Path
import json,ctypes as C,sys
from PIL import Image

# Reuse the already verified native EGL context setup, not browser software.
setup=Path(__file__).with_name('gles-context.py').read_text()
setup=setup.replace('(C.c_int*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)','(C.c_int*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)')
exec(setup)
vertex_prefix += "attribute vec3 normal;attribute vec3 color;\n"
fragment_prefix += "#define texture2D texture\n"
root=Path('cinema-graphics-check');data=json.loads((root/'frames.json').read_text())
genbuffers=gl('glGenBuffers',None,[C.c_int,C.POINTER(C.c_uint)])
bindbuffer=gl('glBindBuffer',None,[C.c_uint,C.c_uint])
bufferdata=gl('glBufferData',None,[C.c_uint,C.c_ssize_t,C.c_void_p,C.c_uint])
use=gl('glUseProgram',None,[C.c_uint]);uniform=gl('glGetUniformLocation',C.c_int,[C.c_uint,C.c_char_p])
attribute=gl('glGetAttribLocation',C.c_int,[C.c_uint,C.c_char_p]);enableattribute=gl('glEnableVertexAttribArray',None,[C.c_uint]);disableattribute=gl('glDisableVertexAttribArray',None,[C.c_uint]);attributepointer=gl('glVertexAttribPointer',None,[C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p])
one=gl('glUniform1f',None,[C.c_int,C.c_float]);three=gl('glUniform3fv',None,[C.c_int,C.c_int,C.POINTER(C.c_float)]);matrix=gl('glUniformMatrix4fv',None,[C.c_int,C.c_int,C.c_ubyte,C.POINTER(C.c_float)])
two=gl('glUniform2fv',None,[C.c_int,C.c_int,C.POINTER(C.c_float)])
viewport=gl('glViewport',None,[C.c_int,C.c_int,C.c_int,C.c_int]);enable=gl('glEnable',None,[C.c_uint]);disable=gl('glDisable',None,[C.c_uint]);depthmask=gl('glDepthMask',None,[C.c_ubyte]);depthfunc=gl('glDepthFunc',None,[C.c_uint]);clear=gl('glClear',None,[C.c_uint]);clearcolour=gl('glClearColor',None,[C.c_float]*4)
draw=gl('glDrawElements',None,[C.c_uint,C.c_int,C.c_uint,C.c_void_p]);read=gl('glReadPixels',None,[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]);finish=gl('glFinish',None,[])
drawarrays=gl('glDrawArrays',None,[C.c_uint,C.c_int,C.c_int]);blend=gl('glBlendFuncSeparate',None,[C.c_uint]*4)
programs={};buffers=[]
textures={}
gentextures=gl('glGenTextures',None,[C.c_int,C.POINTER(C.c_uint)])
bindtexture=gl('glBindTexture',None,[C.c_uint,C.c_uint]);activetexture=gl('glActiveTexture',None,[C.c_uint])
teximage=gl('glTexImage2D',None,[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p])
texparameter=gl('glTexParameteri',None,[C.c_uint,C.c_uint,C.c_int]);integer=gl('glUniform1i',None,[C.c_int,C.c_int]);generatemipmap=gl('glGenerateMipmap',None,[C.c_uint])
def texture_for(v):
    key=str(v)
    if key in textures:return textures[key]
    file=v.get('texture')
    if not file:im=Image.new('RGBA',(1,1),(0,0,0,255))
    elif file.endswith('.bin'):im=Image.frombytes('RGBA',(v['width'],v['height']),(root/file).read_bytes())
    elif file.endswith('.svg'):
        import cairosvg,io
        im=Image.open(io.BytesIO(cairosvg.svg2png(url=str(root/file)))).convert('RGBA')
    else:im=Image.open(root/file).convert('RGBA')
    if v.get('flipY'):im=im.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    handle=C.c_uint();gentextures(1,C.byref(handle));bindtexture(0x0DE1,handle.value)
    blob=C.create_string_buffer(im.tobytes());teximage(0x0DE1,0,0x8C43 if v.get('srgb') else 0x8058,im.width,im.height,0,0x1908,0x1401,blob)
    if v.get('mipmaps'):generatemipmap(0x0DE1)
    for param,val in [(0x2801,0x2703 if v.get('mipmaps') else 0x2601),(0x2800,0x2601),(0x2802,0x2901 if v.get('repeat') else 0x812F),(0x2803,0x2901 if v.get('repeat') else 0x812F)]:texparameter(0x0DE1,param,val)
    textures[key]=handle.value;return handle.value
def upload(file,target):
    handle=C.c_uint();genbuffers(1,C.byref(handle));bindbuffer(target,handle.value);b=(root/file).read_bytes();storage=C.create_string_buffer(b);bufferdata(target,len(b),storage,0x88E4);return handle.value
for g in data['geometry']:
    buffers.append({'attributes':{name:upload(a['file'],0x8892) for name,a in g['attributes'].items()},'index':upload(g['indices'],0x8893) if g['indices'] else None})
def program_for(obj):
    key=(obj['vertex'],obj['fragment'])
    if key in programs:return programs[key]
    handles=[]
    for kind,prefix,enum in [('vertex',vertex_prefix,0x8B31),('fragment',fragment_prefix,0x8B30)]:
        shader=createshader(enum);blob=(prefix+obj[kind]).encode();ptr=C.c_char_p(blob);source(shader,1,C.byref(ptr),None);compile(shader)
        status=C.c_int();getiv(shader,0x8B81,C.byref(status));log=C.create_string_buffer(8192);getlog(shader,8192,None,log);assert status.value,(kind,log.value.decode())
        handles.append(shader)
    program=createprogram()
    for shader in handles:attach(program,shader)
    link(program);status=C.c_int();programiv(program,0x8B82,C.byref(status));log=C.create_string_buffer(8192);programlog(program,8192,None,log);assert status.value,log.value.decode()
    for shader in handles:deleteshader(shader)
    programs[key]=program;return program
for frame in data['frames']:
    if len(sys.argv)>1 and frame['name'] not in [sys.argv[1],'reflection-'+sys.argv[1]]:continue
    output_width,output_height=frame['width'],frame['height']
    width,height=output_width*2,output_height*2
    target=egl('eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,(C.c_int*5)(0x3057,width,0x3056,height,0x3038));assert target
    assert egl('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])(display,target,target,context)
    viewport(0,0,width,height);disable(0x0B44);enable(0x0B71);depthfunc(0x0203);depthmask(1);clearcolour(.4,.5,.6,1);clear(0x4000|0x0100)
    for obj in frame['objects']:
        program=program_for(obj);use(program)
        texture_unit=0
        for name,value in obj['uniforms'].items():
            loc=uniform(program,name.encode())
            if loc<0:continue
            if isinstance(value,dict) or value is None:
                activetexture(0x84C0+texture_unit);bindtexture(0x0DE1,texture_for(value or {}));integer(loc,texture_unit);texture_unit+=1
            elif isinstance(value,list):
                arr=(C.c_float*len(value))(*value)
                if len(value)==16:matrix(loc,1,0,arr)
                elif len(value)==3:three(loc,1,arr)
                elif len(value)==2:two(loc,1,arr)
                else:raise AssertionError((name,value))
            else:one(loc,value)
        geometry=data['geometry'][obj['geometry']];storage=buffers[obj['geometry']];locations=[]
        for name,buffer in storage['attributes'].items():
            loc=attribute(program,name.encode())
            if loc<0:continue
            bindbuffer(0x8892,buffer);enableattribute(loc);attributepointer(loc,geometry['attributes'][name]['size'],0x1406,0,0,None);locations.append(loc)
        depthmask(1 if obj['depthWrite'] else 0)
        if obj['transparent']:
            enable(0x0BE2)
            if obj['additive']:blend(0x0302,1,0x0302,1)
            else:blend(0x0302,0x0303,1,0x0303)
        else:disable(0x0BE2)
        if storage['index']:
            bindbuffer(0x8893,storage['index']);draw(0x0004,geometry['count'],0x1405,None)
        else:drawarrays(0x0001 if obj.get('lines') else 0 if obj['points'] else 0x0004,0,geometry['count'])
        for loc in locations:disableattribute(loc)
    finish();pixels=(C.c_ubyte*(width*height*4))();read(0,0,width,height,0x1908,0x1401,pixels)
    frame_image=Image.frombytes('RGBA',(width,height),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    frame_image=frame_image.resize((output_width,output_height),Image.Resampling.LANCZOS)
    assert frame_image.convert('L').getextrema()[1]>20,'Blank render'
    filename='cinema-elephant-view' if frame['name']=='elephant' else frame['name']
    frame_image.save(root/(filename+'.png'))
    if frame['name']=='posters':frame_image.convert('RGB').save(root/(frame['name']+'.jpg'),quality=95)
    print('Rendered',frame['name'])
    egl('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])(display,surface,surface,context)
    egl('eglDestroySurface',C.c_uint,[C.c_void_p,C.c_void_p])(display,target)
egl('eglTerminate',C.c_uint,[C.c_void_p])(display)

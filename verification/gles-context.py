"""Compile/link the five custom shader pairs in an existing native EGL context.
This validates GLSL, not browser rendering, CSS or phone performance.
"""
import ctypes as C
import ctypes.util
import json
from pathlib import Path

E=C.CDLL(ctypes.util.find_library('EGL'))
def egl(name,ret,args):
    f=getattr(E,name);f.restype=ret;f.argtypes=args;return f
getproc=egl('eglGetProcAddress',C.c_void_p,[C.c_char_p])
def gl(name,ret,args):
    address=getproc(name.encode());assert address,name
    return C.CFUNCTYPE(ret,*args)(address)
getdisplay=C.CFUNCTYPE(C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int))(getproc(b'eglGetPlatformDisplayEXT'))
display=getdisplay(0x31DD,None,None)
initialize=egl('eglInitialize',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)])
a,b=C.c_int(),C.c_int();assert initialize(display,C.byref(a),C.byref(b))
bind=egl('eglBindAPI',C.c_uint,[C.c_uint]);assert bind(0x30A0) # OpenGL ES
choose=egl('eglChooseConfig',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)])
attrs=(C.c_int*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
config=C.c_void_p();count=C.c_int();assert choose(display,attrs,C.byref(config),1,C.byref(count)) and count.value
create=egl('eglCreateContext',C.c_void_p,[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])
context=create(display,config,None,(C.c_int*3)(0x3098,2,0x3038));assert context
surface=egl('eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])(display,config,(C.c_int*5)(0x3057,16,0x3056,16,0x3038));assert surface
assert egl('eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p])(display,surface,surface,context)
getstring=gl('glGetString',C.c_char_p,[C.c_uint])
print('Native shader compiler:',getstring(0x1F02).decode())
createshader=gl('glCreateShader',C.c_uint,[C.c_uint])
source=gl('glShaderSource',None,[C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int)])
compile=gl('glCompileShader',None,[C.c_uint]);getiv=gl('glGetShaderiv',None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)])
getlog=gl('glGetShaderInfoLog',None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_void_p])
createprogram=gl('glCreateProgram',C.c_uint,[]);attach=gl('glAttachShader',None,[C.c_uint,C.c_uint]);link=gl('glLinkProgram',None,[C.c_uint]);programiv=gl('glGetProgramiv',None,[C.c_uint,C.c_uint,C.POINTER(C.c_int)]);programlog=gl('glGetProgramInfoLog',None,[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_void_p])
deleteprogram=gl('glDeleteProgram',None,[C.c_uint]);deleteshader=gl('glDeleteShader',None,[C.c_uint])
# Three's WebGLProgram upgrades ShaderMaterial to GLSL ES 3.00 in WebGL 2.
# Compiling 1.00 alone misses reserved identifiers rejected by the browser.
vertex_prefix='#version 300 es\n#define attribute in\n#define varying out\nprecision highp float;\nattribute vec3 position;attribute vec2 uv;uniform mat4 modelMatrix;uniform mat4 viewMatrix;uniform mat4 modelViewMatrix;uniform mat4 projectionMatrix;uniform vec3 cameraPosition;\n'
fragment_prefix='#version 300 es\n#define varying in\nlayout(location=0) out highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\nprecision highp float;\nuniform vec3 cameraPosition;\n'

import bpy,bmesh,math,sys,os,numpy as np
from pathlib import Path
from mathutils import Vector
root=Path(os.environ.get('DAYCRAFT_WATER_BAKE',str(Path.cwd()/'mall-water-bake')))
preview='--preview' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=96 if preview else 48;scene.cycles.use_denoising=False
scene.cycles.max_bounces=5;scene.cycles.transmission_bounces=4;scene.cycles.transparent_max_bounces=4
scene.render.resolution_x=256 if preview else 128;scene.render.resolution_y=384 if preview else 192;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25
world=bpy.data.worlds.new('Atrium daylight');world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.76,.72,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7;scene.world=world
env=world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(Path(__file__).resolve().parent.parent/'assets/mall/atrium.webp'));world.node_tree.links.new(env.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
mat=bpy.data.materials.new('Entrained air and wet water surface');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
out=nodes.new('ShaderNodeOutputMaterial');p=nodes.new('ShaderNodeBsdfPrincipled')
p.inputs['Base Color'].default_value=(.84,.91,.87,1);p.inputs['Roughness'].default_value=.055;p.inputs['IOR'].default_value=1.333;p.inputs['Transmission Weight'].default_value=.78;p.inputs['Coat Weight'].default_value=.24;p.inputs['Coat Roughness'].default_value=.08
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=90;noise.inputs['Detail'].default_value=2.5
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.3;ramp.color_ramp.elements[0].color=(.18,.28,.25,1);ramp.color_ramp.elements[1].position=.65;ramp.color_ramp.elements[1].color=(.94,.96,.90,1)
links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(p.outputs[0],out.inputs[0])
for name,loc,power,color,size in [('Skylight',(-1,-1,3),400,(1,.95,.86),2.5),('Sky fill',(1,1,2),250,(.82,.92,1),2),('Warm store fill',(-2,-1,.5),80,(1,.81,.61),2)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Fixed seated viewing angle');camera=bpy.data.objects.new('Camera',data);scene.collection.objects.link(camera);camera.location=(0,-4,.60);camera.rotation_euler=(Vector((0,0,.42))-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=.94;scene.camera=camera
frames=[36] if preview else range(144)
(root/'frames').mkdir(exist_ok=True)
for frame in frames:
 raw=np.load(root/'meshes'/f'{frame:04d}.npz')
 mesh=bpy.data.meshes.new('Water');mesh.from_pydata(raw['vertices'].tolist(),[],raw['faces'].tolist());mesh.update()
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
 obj=bpy.data.objects.new('Falling and merging water',mesh);scene.collection.objects.link(obj);obj.data.materials.append(mat)
 for poly in mesh.polygons:poly.use_smooth=True
 scene.render.filepath=str(root/('preview.png' if preview else 'frames/'+f'{frame:04d}.png'))
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
 print('FRAME_DONE',frame,flush=True)

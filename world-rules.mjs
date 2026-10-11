// World geometry and placement rules are shared by the app, renderer and server.
export const CATALOG = [
 {id:'garden',name:'Kitchen garden',cost:1,description:'A little patch of possibility.',size:[3,3]},
 {id:'cabin',name:'Your cabin',cost:2,description:'A place to come back to.',size:[4,4]},
 {id:'workshop',name:'Workshop',cost:3,description:'Make room for your next idea.',size:[4,3]},
 {id:'pond',name:'Quiet pond',cost:3,description:'Some space to slow down.',size:[4,3]},
 {id:'orchard',name:'Orchard',cost:4,description:'Good things take a little time.',size:[5,4]},
 {id:'windmill',name:'Windmill',cost:4,description:'Let a little momentum carry you.',size:[3,3]},
 {id:'bridge',name:'Footbridge',cost:3,description:'A new way across.',size:[4,2]},
 {id:'greenhouse',name:'Glasshouse',cost:4,description:'A home for things still growing.',size:[4,3]},
 {id:'observatory',name:'Observatory',cost:5,description:'Keep a little room for wonder.',size:[4,4]},
 {id:'gazebo',name:'Reading pavilion',cost:4,description:'A comfortable place to pause.',size:[3,3]},
 {id:'beacon',name:'Coastal beacon',cost:5,description:'See how far you have come.',size:[3,3]},
 {id:'flowers',name:'Wildflower meadow',cost:3,description:'Something beautiful, just because.',size:[3,3]}
].map(x=>({...x,type:x.id}));
export const DECOR = [
 {id:'pine',name:'Pine tree',cost:1,description:'A little woodland, one tree at a time.',size:[2,2]},
 {id:'bench',name:'Park bench',cost:1,description:'A good spot to take it all in.',size:[2,1]},
 {id:'path',name:'Stone path',cost:1,description:'Connect the places you love.',size:[2,2]},
 {id:'lantern',name:'Garden lantern',cost:1,description:'A warm light along the way.',size:[1,1]},
 {id:'rocks',name:'Rock garden',cost:1,description:'A little texture by the water.',size:[2,2]},
 {id:'fountain',name:'Courtyard fountain',cost:3,description:'A calm centre for a new chapter.',size:[3,3]}
].map(x=>({...x,type:x.id,decor:true}));
export const MEADOW_ITEMS=[
 {id:'elephant',type:'elephant',name:'Meadow elephant',cost:3,description:'A colourful companion for a quiet corner of the grass.',size:[4,4],thumbnail:'./assets/elephant/thumbnail.webp'},
 {id:'snail',type:'snail',name:'Mechanical snail',cost:3,description:'A spiral shell, a little brass key, and permission to take your time.',size:[4,4],thumbnail:'./assets/snail/thumbnail.webp'},
 {id:'goose',type:'goose',name:'Clockwork goose',cost:3,description:'A striped visitor with bright wheels and a curious look.',size:[4,4],thumbnail:'./assets/goose/thumbnail.webp'},
 {id:'moon-cradle',type:'moon-cradle',name:'Moon cradle',cost:3,description:'A sleepy moon, hanging stars, and a quiet place among the grass.',size:[4,4],thumbnail:'./assets/moon-cradle/thumbnail.webp'}
];
export const ITEMS=[...CATALOG,...DECOR,...MEADOW_ITEMS];
export const THEMES={meadow:{name:'Clear morning',grass:'#91ac75',edge:'#c5b493',tree:'#598369',water:'#9abdc1'},autumn:{name:'Golden afternoon',grass:'#b6a371',edge:'#c19a79',tree:'#c7834d',water:'#9aafb9'},coast:{name:'Soft haze',grass:'#c8c296',edge:'#d5c1a1',tree:'#829784',water:'#8bbec2'}};
export const ISLAND_COST=8, ISLAND_RADIUS=14, BUILD_RADIUS=13.4;
export const itemFor=id=>ITEMS.find(b=>b.id===id);
export const collectionCount=s=>CATALOG.filter(b=>s.builds.some(x=>x.id===b.id)).length;
export const collectionComplete=s=>collectionCount(s)===CATALOG.length;
export const normalRotation=r=>((Math.round((Number(r)||0)/90)*90)%360+360)%360;
export function footprint(id,rotation=0){const b=itemFor(id);if(!b)return [0,0];return normalRotation(rotation)%180===0?b.size:[b.size[1],b.size[0]];}
export function placementError(s,instanceId,p){
 const b=s.builds.find(x=>x.instanceId===instanceId);if(!b)return 'This item is no longer in your inventory.';
 if(!p||!s.islands.some(i=>i.id===p.islandId))return 'Choose a meadow you own.';
 if(!Number.isInteger(p.x)||!Number.isInteger(p.z)||![0,90,180,270].includes(p.rotation))return 'Choose a spot on the grid and a quarter-turn rotation.';
 const [w,d]=footprint(b.id,p.rotation);
 for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])if(Math.hypot(p.x+dx,p.z+dz)>BUILD_RADIUS)return 'Keep the whole item inside the central arrangement area.';
 for(const other of s.builds){if(other.instanceId===instanceId||other.placement?.islandId!==p.islandId)continue;const [ow,od]=footprint(other.id,other.placement.rotation);if(Math.abs(p.x-other.placement.x)<(w+ow)/2+.1&&Math.abs(p.z-other.placement.z)<(d+od)/2+.1)return 'That spot overlaps another item. Choose a clear space.';}
 return '';
}
export function findOpenSpot(s,instanceId,islandId,rotation=0){const spots=[];for(let z=-12;z<=12;z++)for(let x=-12;x<=12;x++)spots.push({islandId,x,z,rotation});spots.sort((a,b)=>(a.x*a.x+a.z*a.z)-(b.x*b.x+b.z*b.z)||a.z-b.z||a.x-b.x);return spots.find(p=>!placementError(s,instanceId,p))||null;}

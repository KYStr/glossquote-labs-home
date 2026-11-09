// Presentation only: coordinates and mathematical vertex identities are never changed.
export function vertexLabels(results) {
  return results.flatMap((r,panel)=>{
    const groups=[];
    r.vertices.forEach(([x,y],id)=>{
      const same=groups.find(g=>Math.abs(g.x-x)<1e-9&&Math.abs(g.y-y)<1e-9);
      if(same)same.ids.push(id);else groups.push({x,y,ids:[id]});
    });
    return groups.map(g=>({...g,panel,text:`${panel===0?'A':'B'}·${g.ids.map(id=>'P'+id).join('/')}`}));
  });
}
export function placeLabels(labels, box, scale) {
  const used=[];
  return labels.map(label=>{
    const w=(label.text.length*7.5+8)*scale,h=17*scale;
    const candidates=[];
    for(let radius=14;radius<=154;radius+=20)for(const [dx,dy]of [[1,-1],[1,1],[-1,-1],[-1,1],[0,-1],[0,1],[1,0],[-1,0]]){
      const x=Math.max(box[0]+3*scale,Math.min(label.x+dx*radius*scale-(dx<0?w:dx===0?w/2:0),box[0]+box[2]-w-3*scale));
      const y=Math.max(box[1]+h,Math.min(label.y+dy*radius*scale,box[1]+box[3]-3*scale));
      const rect={x,y:y-h,w,h};
      const overlap=used.reduce((sum,r)=>sum+Math.max(0,Math.min(x+w,r.x+r.w)-Math.max(x,r.x))*Math.max(0,Math.min(y,r.y+r.h)-Math.max(y-h,r.y)),0);
      candidates.push({x,y,rect,overlap,distance:Math.hypot(x+w/2-label.x,y-h/2-label.y)});
    }
    candidates.sort((a,b)=>a.overlap-b.overlap||a.distance-b.distance);
    const chosen=candidates[0];used.push(chosen.rect);
    return {...label,lx:chosen.x+4*scale,ly:chosen.y-4*scale,rect:chosen.rect};
  });
}

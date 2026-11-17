import sharp from "sharp";
const src="../frontend/public/categories/eggs.jpg", out="C:/Users/HP/AppData/Local/Temp/claude/5032b8cf2a4015e7/8931e6d3-b8a6-41d0-9b21-1d94567a3d1d/scratchpad";
// lighter / cream & white eggs (top-left + right)
await sharp(src).extract({left:310,top:240,width:480,height:480}).resize(800,800).jpeg({quality:90}).toFile(out+"/broiler.jpg");
// brown speckled eggs (lower-left/right)
await sharp(src).extract({left:250,top:420,width:500,height:330}).resize(800,800,{fit:"cover"}).jpeg({quality:90}).toFile(out+"/gavran.jpg");

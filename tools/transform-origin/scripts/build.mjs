import fs from 'node:fs';
fs.rmSync('dist/self-check',{recursive:true,force:true});
fs.mkdirSync('dist/en',{recursive:true});
for(const name of ['core.mjs','app.mjs','style.css'])fs.copyFileSync('src/'+name,'dist/'+name);
const html=fs.readFileSync('src/index.html','utf8');fs.writeFileSync('dist/index.html',html);fs.writeFileSync('dist/en/index.html',html.replace('lang="zh-Hant"','lang="en"').replace('data-language="zh"','data-language="en"').replaceAll('href="./','href="../').replaceAll('src="./','src="../'));
fs.writeFileSync('dist/robots.txt','User-agent: *\nDisallow: /\n');

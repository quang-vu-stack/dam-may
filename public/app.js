const $=id=>document.getElementById(id);
let current='',items=[];
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(s){$('toast').textContent=s;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3200);}
async function api(url,opts={}){const r=await fetch(url,{credentials:'same-origin',...opts});const data=await r.json();if(!r.ok)throw Error(data.error||'Có lỗi xảy ra');return data;}
const json=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
async function load(){try{items=(await api('/api/files?path='+encodeURIComponent(current))).items;render();}catch(e){notice(e.message);}}
function fmt(n){if(n<1024)return n+' B';const unit=Math.min(4,Math.floor(Math.log(n)/Math.log(1024)));return(n/1024**unit).toFixed(1)+' '+['B','KB','MB','GB','TB'][unit];}
function rel(n){return[current,n].filter(Boolean).join('/');}
function download(n){location.href='/api/files/download?path='+encodeURIComponent(rel(n));}
async function rename(n){const name=prompt('Đổi tên thành:',n);if(!name||name===n)return;try{await api('/api/files/rename',json('POST',{path:rel(n),name}));load();}catch(e){notice(e.message);}}
async function remove(n){if(!confirm('Xóa vĩnh viễn '+n+'? Nếu là thư mục, toàn bộ nội dung cũng bị xóa.'))return;try{await api('/api/files',json('DELETE',{path:rel(n)}));load();}catch(e){notice(e.message);}}
function render(){const q=$('search').value.toLocaleLowerCase('vi'),shown=items.filter(x=>x.name.toLocaleLowerCase('vi').includes(q));$('count').textContent=shown.length+' mục';$('empty').hidden=shown.length!==0;$('files').innerHTML=shown.map((x,i)=>'<article class="file"><div class="file-ico">'+(x.type==='folder'?'📁':/\.(jpg|jpeg|png|gif|webp)$/i.test(x.name)?'🖼️':/\.(mp4|mov|mkv)$/i.test(x.name)?'🎬':'📄')+'</div><div class="file-name" data-open="'+i+'">'+escapeHTML(x.name)+'</div><div class="file-meta">'+(x.type==='folder'?'Thư mục':fmt(x.size))+'</div><div class="file-actions">'+(x.type==='folder'?'<button data-open="'+i+'">Mở</button>':'<button data-download="'+i+'">↓ Tải</button>')+'<button data-rename="'+i+'">Đổi tên</button><button class="danger" data-delete="'+i+'">Xóa</button></div></article>').join('');
for(const b of $('files').querySelectorAll('[data-open]'))b.onclick=()=>{const x=shown[+b.dataset.open];if(x.type==='folder'){current=rel(x.name);$('search').value='';load();}else download(x.name);};
for(const b of $('files').querySelectorAll('[data-download]'))b.onclick=()=>download(shown[+b.dataset.download].name);
for(const b of $('files').querySelectorAll('[data-rename]'))b.onclick=()=>rename(shown[+b.dataset.rename].name);
for(const b of $('files').querySelectorAll('[data-delete]'))b.onclick=()=>remove(shown[+b.dataset.delete].name);
const parts=current?current.split('/'):[];$('crumbs').innerHTML='<button data-dir="">⌂ Tệp của tôi</button>'+parts.map((p,i)=>'<span>/</span><button data-dir="'+escapeHTML(parts.slice(0,i+1).join('/'))+'">'+escapeHTML(p)+'</button>').join('');for(const b of $('crumbs').querySelectorAll('button'))b.onclick=()=>{current=b.dataset.dir;$('search').value='';load();};
}
$('folderBtn').onclick=async()=>{const name=prompt('Tên thư mục mới:');if(!name)return;try{await api('/api/files/folder',json('POST',{path:current,name}));load();}catch(e){notice(e.message);}};
async function upload(files){const all=[...files];for(let i=0;i<all.length;i+=10){const f=new FormData();f.append('path',current);for(const item of all.slice(i,i+10))f.append('files',item);$('progress').textContent='Đang tải '+Math.min(i+10,all.length)+'/'+all.length+'...';try{await api('/api/files/upload',{method:'POST',body:f});}catch(e){notice(e.message);break;}}$('progress').textContent='';$('fileInput').value='';load();}
$('fileInput').onchange=e=>upload(e.target.files);$('search').oninput=render;
for(const e of ['dragenter','dragover'])$('drop').addEventListener(e,x=>{x.preventDefault();$('drop').classList.add('drag');});
for(const e of ['dragleave','drop'])$('drop').addEventListener(e,x=>{x.preventDefault();$('drop').classList.remove('drag');});
$('drop').addEventListener('drop',e=>upload(e.dataTransfer.files));
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginError').textContent='';try{await api('/api/login',json('POST',{username:$('username').value,password:$('password').value}));show();}catch(err){$('loginError').textContent=err.message;}};
async function logout(){try{await api('/api/logout',{method:'POST'});}catch{}$('app').hidden=true;$('login').hidden=false;}
document.querySelectorAll('.logout').forEach(b=>b.onclick=logout);
async function show(){$('login').hidden=true;$('app').hidden=false;await load();try{const d=await api('/api/storage');$('quota').textContent=fmt(d.total-d.free)+' / '+fmt(d.total)+' toàn ổ';$('fill').style.width=Math.min(100,(d.total-d.free)/d.total*100)+'%';}catch{}}
(async()=>{try{if((await api('/api/me')).authenticated)show();}catch{}})();

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import {promises as fs, createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const app=express(),port=Number(process.env.PORT)||3000;
const root=path.resolve(process.env.CLOUD_STORAGE_DIR||path.join(os.homedir(),'VU-CLOUD'));
const username=process.env.CLOUD_ADMIN_USER||'admin',hash=process.env.CLOUD_ADMIN_PASSWORD_HASH,secret=process.env.SESSION_SECRET;
if(!hash||!secret||secret.length<32){console.error('Configure CLOUD_ADMIN_PASSWORD_HASH and SESSION_SECRET in .env');process.exit(1);}
await fs.mkdir(root,{recursive:true});
app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{"default-src":["'self'"],"script-src":["'self'"],"style-src":["'self'"],"img-src":["'self'","data:"],"connect-src":["'self'"]}}}));
app.use(express.json({limit:'64kb'}));app.use(cookieParser());
app.use('/api',rateLimit({windowMs:15*60*1000,limit:250,standardHeaders:'draft-7',legacyHeaders:false}));
const secure=process.env.COOKIE_SECURE==='true';
function session(req){try{return jwt.verify(req.cookies.vucloud,secret,{algorithms:['HS256'],issuer:'vu-cloud'});}catch{return null;}}
function auth(req,res,next){if(!session(req))return res.status(401).json({error:'Vui lòng đăng nhập'});next();}
function safeName(s){return typeof s==='string'&&s.length>0&&s.length<=255&&s!=='.'&&s!=='..'&&!/[\\/\x00-\x1f]/.test(s)&&!s.endsWith('.')&&!s.endsWith(' ');}
function absolute(rel=''){if(typeof rel!=='string'||rel.startsWith('/')||rel.includes('\\'))throw Error('Đường dẫn không hợp lệ');const parts=rel.split('/').filter(Boolean);if(!parts.every(safeName))throw Error('Tên file không hợp lệ');const target=path.resolve(root,...parts);if(target!==root&&!target.startsWith(root+path.sep))throw Error('Đường dẫn bị từ chối');return target;}
async function resolveSafe(rel,missingLast=false){const dest=absolute(rel);let cur=root;const segments=path.relative(root,dest).split(path.sep).filter(Boolean);for(let i=0;i<segments.length;i++){cur=path.join(cur,segments[i]);try{const st=await fs.lstat(cur);if(st.isSymbolicLink())throw Error('Không cho phép symbolic links');}catch(e){if(e.code==='ENOENT'&&missingLast&&i===segments.length-1)break;throw e;}}return dest;}
function fail(res,e){res.status(e.code==='ENOENT'?404:e.code==='EEXIST'?409:400).json({error:e.message||'Có lỗi xảy ra'});}
const loginRate=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false});
app.post('/api/login',loginRate,async(req,res)=>{const u=String(req.body?.username||''),p=String(req.body?.password||'');if(u!==username||!await bcrypt.compare(p,hash))return res.status(401).json({error:'Sai tài khoản hoặc mật khẩu'});const t=jwt.sign({u:username},secret,{expiresIn:'7d',issuer:'vu-cloud',algorithm:'HS256'});res.cookie('vucloud',t,{httpOnly:true,secure,sameSite:'lax',maxAge:7*86400000,path:'/'});res.json({ok:true});});
app.get('/api/me',(req,res)=>res.json({authenticated:!!session(req)}));
app.post('/api/logout',auth,(req,res)=>{res.clearCookie('vucloud',{path:'/',secure,sameSite:'lax'});res.json({ok:true});});
app.use('/api/files',auth);
app.get('/api/files',async(req,res)=>{try{const rel=String(req.query.path||''),dir=await resolveSafe(rel);if(!(await fs.stat(dir)).isDirectory())throw Error('Không phải thư mục');const entries=await fs.readdir(dir,{withFileTypes:true});const out=[];for(const e of entries){if(e.isSymbolicLink()||(!e.isDirectory()&&!e.isFile()))continue;const s=await fs.stat(path.join(dir,e.name));out.push({name:e.name,type:e.isDirectory()?'folder':'file',size:s.size,modified:s.mtime.toISOString()});}out.sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name,'vi'):a.type==='folder'?-1:1);res.json({path:rel,items:out});}catch(e){fail(res,e);}});
app.post('/api/files/folder',async(req,res)=>{try{const parent=String(req.body?.path||''),name=req.body?.name;if(!safeName(name))throw Error('Tên thư mục không hợp lệ');const base=await resolveSafe(parent);if(!(await fs.stat(base)).isDirectory())throw Error('Thư mục cha không hợp lệ');const dest=await resolveSafe([parent,name].filter(Boolean).join('/'),true);await fs.mkdir(dest);res.json({ok:true});}catch(e){fail(res,e);}});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:128*1024*1024,files:10}});
app.post('/api/files/upload',upload.array('files',10),async(req,res)=>{try{const rel=String(req.body.path||''),base=await resolveSafe(rel);if(!(await fs.stat(base)).isDirectory())throw Error('Không phải thư mục');const result=[];for(const f of req.files||[]){const name=f.originalname;if(!safeName(name))throw Error('Tên file không hợp lệ');const out=await resolveSafe([rel,name].filter(Boolean).join('/'),true);await fs.writeFile(out,f.buffer,{flag:'wx'});result.push(name);}res.json({ok:true,uploaded:result});}catch(e){fail(res,e);}});
app.get('/api/files/download',async(req,res)=>{try{const file=await resolveSafe(String(req.query.path||'')),stat=await fs.stat(file);if(!stat.isFile())throw Error('Không phải file');res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(path.basename(file)));res.setHeader('Content-Length',stat.size);createReadStream(file).pipe(res);}catch(e){fail(res,e);}});
app.post('/api/files/rename',async(req,res)=>{try{const rel=String(req.body?.path||''),name=req.body?.name;if(!rel||!safeName(name))throw Error('Tên không hợp lệ');const old=await resolveSafe(rel),parent=rel.split('/').slice(0,-1).join('/'),dest=await resolveSafe([parent,name].filter(Boolean).join('/'),true);try{await fs.stat(dest);throw Error('Tên đã tồn tại');}catch(e){if(e.code!=='ENOENT')throw e;}await fs.rename(old,dest);res.json({ok:true});}catch(e){fail(res,e);}});
app.delete('/api/files',async(req,res)=>{try{const rel=String(req.body?.path||'');if(!rel)throw Error('Không được xóa thư mục gốc');const target=await resolveSafe(rel),st=await fs.stat(target);if(st.isDirectory())await fs.rm(target,{recursive:true});else await fs.unlink(target);res.json({ok:true});}catch(e){fail(res,e);}});
app.get('/api/storage',auth,async(req,res)=>{try{const st=await fs.statfs(root);res.json({total:st.blocks*st.bsize,free:st.bavail*st.bsize});}catch(e){fail(res,e);}});
app.use(express.static('public'));app.get('*',(req,res)=>res.sendFile(path.resolve('public/index.html')));
app.use((e,req,res,next)=>res.status(400).json({error:e.code==='LIMIT_FILE_SIZE'?'Tệp vượt quá 128MB':e.message||'Có lỗi xảy ra'}));
app.listen(port,'127.0.0.1',()=>console.log('VŨ CLOUD: http://localhost:'+port+' | '+root));

import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const identifier = name => { if (!/^[a-z_]+$/.test(name)) throw Error('Bad test identifier'); return `"${name}"` }
export async function database() {
  const pg = new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,invited_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;
    grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;`)
  const owner=randomUUID(), student=randomUUID()
  for(const [id,email,name] of [[owner,'14irahman@jess.sch.ae','Owner'],[student,'student@example.com','Existing Student']]) await pg.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[id,email,JSON.stringify({name})])
  await pg.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'))
  await pg.exec(await readFile(new URL('../supabase/migrations/202609220001_builders_id.sql',import.meta.url),'utf8'))
  const passwords=new Map([[owner,'existing-owner-password'],[student,'existing-student-password']]), banned=new Set(),tokens=new Map()
  async function session(id){const sid=randomUUID(),token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,session_id:sid,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url')+'.test-signature';await pg.query('insert into auth.sessions values($1,$2)',[sid,id]);tokens.set(token,{id,sid});return {access_token:token,refresh_token:'test-refresh'}}
  const ownerToken=(await session(owner)).access_token,studentToken=(await session(student)).access_token
  let failCreate=0, failPassword=false
  class Query {
    constructor(table){this.table=table;this.mode='select';this.filters=[];this.values=[];this.cols='*'}
    select(cols='*'){this.cols=cols;return this} insert(values){this.mode='insert';this.payload=values;return this} update(values){this.mode='update';this.payload=values;return this} delete(){this.mode='delete';return this}
    eq(k,v){return this.filter(k,'=',v)} neq(k,v){return this.filter(k,'<>',v)} gt(k,v){return this.filter(k,'>',v)} is(k,v){this.filters.push(`${identifier(k)} is ${v===null?'null':'not null'}`);return this}
    filter(k,op,v){this.values.push(v);this.filters.push(`${identifier(k)} ${op} $${this.values.length}`);return this} order(){return this} limit(){return this} range(){return this}
    single(){this.one=true;return this} maybeSingle(){this.one=true;return this}
    async then(resolve,reject){try{let sql,params=[...this.values];const table='public.'+identifier(this.table),where=this.filters.length?' where '+this.filters.join(' and '):'';
      if(this.mode==='select')sql=`select ${this.cols==='*'||this.cols.includes('ba_import_items(')?'*':this.cols.split(',').map(identifier).join(',')} from ${table}${where}`;
      if(this.mode==='insert'){const keys=Object.keys(this.payload);params=keys.map(k=>this.payload[k]);sql=`insert into ${table}(${keys.map(identifier)}) values(${keys.map((_,i)=>'$'+(i+1))}) returning *`}
      if(this.mode==='update'){const assignments=Object.keys(this.payload).map(k=>{params.push(this.payload[k]);return `${identifier(k)}=$${params.length}`});sql=`update ${table} set ${assignments.join(',')}${where} returning *`}
      if(this.mode==='delete')sql=`delete from ${table}${where} returning *`;
      const rows=(await pg.query(sql,params)).rows;if(this.table==='ba_imports'&&this.cols.includes('ba_import_items(')){for(const row of rows)row.ba_import_items=(await pg.query('select * from ba_import_items where batch_id=$1',[row.id])).rows;}resolve({data:this.one?rows[0]||null:rows,error:null});
    }catch(error){resolve({data:null,error:{message:error.message,code:error.code}})} }
  }
  const getUser=async token=>{const t=tokens.get(token);if(!t)return {data:{user:null},error:{message:'Invalid token'}};const u=(await pg.query('select * from auth.users where id=$1',[t.id])).rows[0];return {data:{user:u},error:null}}
  const admin={
    async createUser(attributes){if(failCreate>0){failCreate--;return {error:{message:'simulated timeout'}}}try{const id=randomUUID();await pg.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) values($1,$2,now(),$3,$4)',[id,attributes.email,attributes.user_metadata,attributes.app_metadata]);passwords.set(id,attributes.password);return {data:{user:{id,email:attributes.email}},error:null}}catch(error){return {error:{message:error.message}}}},
    async updateUserById(id,attrs){if(attrs.password && failPassword){failPassword=false;return {error:{message:'simulated password failure'}}}if(attrs.password)passwords.set(id,attrs.password);if(attrs.ban_duration==='none')banned.delete(id);else if(attrs.ban_duration)banned.add(id);return {data:{user:{id}},error:null}},
    async getUserById(id){return {data:{user:(await pg.query('select * from auth.users where id=$1',[id])).rows[0]},error:null}},
    async inviteUserByEmail(email,{data}){const id=randomUUID();await pg.query('insert into auth.users(id,email,invited_at,raw_user_meta_data) values($1,$2,now(),$3)',[id,email,data]);return {data:{user:{id}},error:null}},
  }
  const s={pepper:'unit-tests-only-very-long-random-secret',site:'http://localhost:5173',db:{from:table=>new Query(table),auth:{getUser,admin},async rpc(name,args={}){try{const keys=Object.keys(args),rows=(await pg.query(`select * from public.${identifier(name)}(${keys.map((k,i)=>identifier(k)+'=> $'+(i+1)).join(',')})`,Object.values(args))).rows;return {data:name==='ba_claim_import'?rows:rows[0]?.[name],error:null}}catch(error){return {data:null,error:{message:error.message,code:error.code}}}}},auth:()=>({auth:{async signInWithPassword({email,password}){const u=(await pg.query('select * from auth.users where email=$1',[email])).rows[0];if(!u||passwords.get(u.id)!==password||banned.has(u.id))return {error:{message:'Bad credentials'}};return {data:{session:await session(u.id)},error:null}}}}),caller:token=>({async rpc(name){const t=tokens.get(token);await pg.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[t?.id||'',JSON.stringify({session_id:t?.sid})]);return s.db.rpc(name)}})}
  return {pg,s,owner,student,ownerToken,studentToken,failNextCreate:()=>{failCreate++},failNextPassword:()=>{failPassword=true},close:()=>pg.close()}
}




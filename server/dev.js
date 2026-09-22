import { createServer } from 'node:http'
import { loadEnv } from 'vite'
import handler from '../api/builders.js'
Object.assign(process.env, loadEnv('development', process.cwd(), ''))
createServer(async (req,res)=>{
  if(req.url!=='/api/builders'){res.writeHead(404).end();return}
  res.status=n=>{res.statusCode=n;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))}
  try{let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>3000000){res.status(413).json({error:'Request too large.'});return}body+=chunk}req.body=JSON.parse(body||'{}');await handler(req,res)}catch{res.status(400).json({error:'Invalid request.'})}
}).listen(3001,'127.0.0.1',()=>console.log('Builders API on http://127.0.0.1:3001'))

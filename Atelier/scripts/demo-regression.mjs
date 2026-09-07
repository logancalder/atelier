import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { hashPassword, verifyPassword, digest, activeDemo, deviceDescription } from "../lib/demo-security.ts";
const hash = await hashPassword("test-password-only");
assert(await verifyPassword("test-password-only", hash));
assert.equal(await verifyPassword("wrong", hash), false);
assert.equal(activeDemo({enabled:true,expiresAt:new Date(1000).toISOString()},1000),false);
assert.equal(activeDemo({enabled:false,expiresAt:null}),false);
assert.equal(activeDemo({enabled:true,expiresAt:null}),true);
assert(deviceDescription("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0").includes("Chrome · Windows"));
if (!process.env.DEMO_INTEGRATION_TEST) {
  console.log("PASS: password hashing, rejection, expiry boundary, disabled access, device parsing.");
} else {
  initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n")})});
  const db=getFirestore(); const id=randomUUID(); const secret=randomBytes(32).toString("hex");
  const ref=db.collection("demoSites").doc(id);
  const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3148"],{env:process.env,stdio:"ignore"});
  try {
    await ref.create({ownerId:"integration-test",name:"Temporary integration test",url:"https://example.com",passwordHash:hash,apiKeyHash:digest(secret),version:"v1",enabled:true,expiresAt:null,createdAt:new Date().toISOString()});
    const base="http://localhost:3148";
    for(let i=0;i<60;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,250));}}
    const call=(body,key=`${id}.${secret}`)=>fetch(`${base}/api/demo-access`,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
    assert.equal((await call({action:"login",password:"wrong"})).status,401);
    assert.equal((await call({action:"login",password:"test-password-only"},`${id}.${"0".repeat(64)}`)).status,401);
    const login=await call({action:"login",password:"test-password-only",userAgent:"Mozilla/5.0 (Windows NT 10.0) Chrome/140.0"});assert.equal(login.status,200);
    const session=(await login.json()).session;
    assert.equal((await call({action:"validate",session})).status,200);
    assert.equal((await call({action:"validate",session:"0".repeat(64)})).status,401);
    const logs=await ref.collection("logins").get();assert.equal(logs.size,1);assert(logs.docs[0].get("device").includes("Windows"));assert(logs.docs[0].get("at"));
    await ref.update({expiresAt:new Date(Date.now()-1000).toISOString()});
    assert.equal((await call({action:"validate",session})).status,403);
    assert.equal((await call({action:"login",password:"test-password-only"})).status,403);
    await ref.update({expiresAt:null,version:"v2"});assert.equal((await call({action:"validate",session})).status,401);
    await ref.update({enabled:false});assert.equal((await call({action:"login",password:"test-password-only"})).status,403);
    await ref.update({enabled:true});await ref.collection("limits").doc("login").set({window:Math.floor(Date.now()/900000),count:100});
    assert.equal((await call({action:"login",password:"test-password-only"})).status,429);
    const management=await fetch(`${base}/demos`,{redirect:"manual",headers:{Cookie:"atelier_session=forged"}});const deniedHtml=await management.text(); assert([303,307].includes(management.status) || (deniedHtml.includes("/login?next=/demos") && !deniedHtml.includes("Recent successful logins")));
    console.log("PASS: real Firestore login, wrong key/password, session validation, one login record, expired login/session, revocation, disable, rate limit, management authentication.");
  } finally { server.kill(); await db.recursiveDelete(ref); }
}

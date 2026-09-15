"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { linkWithPopup, sendEmailVerification, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase-client';
import { googleProvider, githubProvider } from '@/lib/auth-providers';
import { verifiedLinkTarget } from '@/lib/identity-linking';

export function LinkSignInMethod({uid,email,providers}:{uid:string;email:string;providers:string[]}) {
  const router=useRouter(), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [password,setPassword]=useState('');
  const [existing,setExisting]=useState(providers[0] || 'google.com');
  async function link(target:'google'|'github') {
    setBusy(true);setMessage('Confirm your existing account first.');
    const auth=clientAuth();
    try {
      const signed=existing === 'password' ? await signInWithEmailAndPassword(auth,email,password) : await signInWithPopup(auth,existing === 'github.com'?githubProvider():googleProvider());
      if (!verifiedLinkTarget(uid,signed.user.uid,signed.user.emailVerified)) {
        if (signed.user.uid === uid && !signed.user.emailVerified) { await sendEmailVerification(signed.user); throw new Error('A verification email was sent. Verify it, then retry linking.'); }
        throw new Error('That is a different Atelier account. Confirm the account shown on this profile. No data was merged.');
      }
      setMessage('Now authenticate the additional sign-in method.');
      const linked=await linkWithPopup(signed.user,target === 'google'?googleProvider():githubProvider());
      if (linked.user.uid !== uid) throw new Error('Account identity changed. Please sign in again.');
      const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await linked.user.getIdToken(true)})});
      if (!response.ok) throw new Error('Method linked, but session refresh failed. Sign in again to refresh your profile.');
      setMessage('Linked. Both methods now open this same workspace.');router.refresh();
    } catch (caught) {
      const error=caught as Error & {code?:string};
      setMessage(error.code === 'auth/credential-already-in-use' ? 'This provider already belongs to another account. Both workspaces are preserved; automatic data merging is disabled.' : error.message);
    } finally { await signOut(auth);setPassword('');setBusy(false); }
  }
  return <section className="identity-linker"><h2>Link a sign-in method</h2><p>Verify your existing account, then authenticate the new provider. Your workspace and user ID stay the same.</p><label>Existing method<select value={existing} disabled={busy} onChange={e=>setExisting(e.target.value)}>{providers.map(id=><option key={id} value={id}>{id}</option>)}</select></label>{existing === 'password' ? <label>Password<input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label>:null}<div className="workflow-tabs">{!providers.includes('google.com') ? <button disabled={busy} onClick={()=>void link('google')}>Link Google</button>:null}{!providers.includes('github.com') ? <button disabled={busy} onClick={()=>void link('github')}>Link GitHub</button>:null}</div><p role="status">{message}</p></section>;
}

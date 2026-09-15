import { GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth';
export function googleProvider() { const provider=new GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'}); return provider; }
export function githubProvider() { const provider=new GithubAuthProvider(); provider.addScope('user:email'); return provider; }

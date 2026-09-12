import Link from "next/link";
import { ArrowRight, Bot, Cloud, KeyRound, ShieldCheck } from "lucide-react";

const products = [
  { icon: KeyRound, name: "Candler Vault", copy: "Secure developer secrets, credentials, authentication codes, and project environments." },
  { icon: Bot, name: "Candler Agent", copy: "Understand your stack, detect missing configuration, monitor secret health, and manage developer infrastructure." },
  { icon: Cloud, name: "Candler Cloud", copy: "Back up project folders, source code, design files, documents, and other development assets." },
];

export default function LandingPage() { return <div className="reset-marketing">
  <section className="reset-hero"><p className="eyebrow">CANDLER</p><h1>Secrets that understand<br/>your stack.</h1><p>Secure your credentials, understand your environments, and back up your development work in one place.</p><div><Link className="primary-button" href="/signup">Get Candler <ArrowRight/></Link><Link className="secondary-button" href="/login">Sign In</Link></div><span className="hero-security"><ShieldCheck/>Encrypted by default. Raw secrets stay out of AI context.</span></section>
  <section className="product-intro"><div><p className="eyebrow">One quiet home</p><h2>Your developer stack, secured and backed up.</h2></div><p>Candler connects the credentials, context, and project files developers usually scatter across too many tools.</p></section>
  <section className="product-lines">{products.map(({icon:Icon,...p},i)=><article id={p.name.split(" ")[1].toLowerCase()} key={p.name}><span>0{i+1}</span><Icon/><div><h3>{p.name}</h3><p>{p.copy}</p></div><ArrowRight/></article>)}</section>
  <section className="pro-callout"><div><p className="eyebrow">Candler Pro</p><h2>Everything you need to understand and protect your stack.</h2><p>Vault, Agent, Secret Health, Authenticator, and Recovery Vault.</p></div><div><strong>$18<small>/month</small></strong><Link className="primary-button" href="/signup">Get Candler Pro <ArrowRight/></Link></div></section>
  </div>; }

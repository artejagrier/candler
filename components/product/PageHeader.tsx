export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1><p>{description}</p></div>{actions ? <div className="page-actions">{actions}</div> : null}</header>;
}

export function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="quiet-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

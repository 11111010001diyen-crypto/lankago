export function FormSectionWrapper({ title, subtitle, children, className = '' }) {
  return <section className={`form-card ${className}`}><div className="form-card__heading"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}</section>
}
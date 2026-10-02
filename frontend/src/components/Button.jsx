export function Button({ children, variant = 'primary', type = 'button', onClick, disabled = false, className = '' }) {
  const resolvedVariant = disabled ? 'disabled' : variant
  return <button type={type} className={`button button--${resolvedVariant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
}
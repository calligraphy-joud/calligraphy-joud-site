'use client';
// Design-system primitives (ported from _ds_bundle). Styles live in globals.css.
export function Button({ children, variant = 'primary', size = 'md', block = false, leftIcon = null, rightIcon = null, as = 'button', className = '', ...rest }) {
  const Tag = as;
  const cls = ['joud-btn', `joud-btn--${variant}`, `joud-btn--${size}`, block ? 'joud-btn--block' : '', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} {...rest}>
      {leftIcon && <span className="joud-btn__icon">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="joud-btn__icon">{rightIcon}</span>}
    </Tag>
  );
}
export function Badge({ children, variant = 'neutral', size = 'sm', dot = false, className = '', ...rest }) {
  const cls = ['joud-badge', `joud-badge--${variant}`, `joud-badge--${size}`, className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{dot && <span className="joud-badge__dot" />}{children}</span>;
}
export function ImgSlot({ label }) {
  return <div className="img-slot"><span>{label || 'Photo'}</span></div>;
}

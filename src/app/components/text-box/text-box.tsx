import classes from './text-box.module.css';

export function TextBox({
  type,
  name,
  value,
  onChange,
  placeholder,
}: {
  type?: 'text' | 'password' | 'email' | 'number';
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type={type || 'text'}
      name={name}
      value={value}
      onInput={(e) => onChange?.((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      className={classes.textBox}
    />
  );
}

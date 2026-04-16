type SettingRowProps = {
  label: string;
  hint?: string;
  /** When true the row is rendered as a <label> so clicking the text toggles a child checkbox */
  asLabel?: boolean;
  children: preact.ComponentChildren;
};

export function SettingRow({
  label,
  hint,
  asLabel,
  children,
}: SettingRowProps) {
  const inner = (
    <>
      <span class='label-text text-sm opacity-80'>{label}</span>
      <div class='flex shrink-0 items-center gap-1'>{children}</div>
    </>
  );

  return (
    <div class='flex flex-col gap-0.5'>
      {hint && <p class='text-xs opacity-50'>{hint}</p>}
      {asLabel ? (
        // biome-ignore lint/a11y/noLabelWithoutControl: the control is always passed as children
        <label class='flex cursor-pointer items-center justify-between gap-2'>
          {inner}
        </label>
      ) : (
        <div class='flex items-center justify-between gap-2'>{inner}</div>
      )}
    </div>
  );
}

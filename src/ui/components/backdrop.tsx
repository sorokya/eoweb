type BackdropProps = {
  children: preact.ComponentChildren;
};

export function Backdrop({ children }: BackdropProps) {
  return (
    <div class='fixed inset-0 z-40 flex items-center justify-center backdrop-blur-[1px] transition-opacity duration-200'>
      {children}
    </div>
  );
}

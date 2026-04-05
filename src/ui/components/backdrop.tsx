type BackdropProps = {
  children: preact.ComponentChildren;
};

export function Backdrop({ children }: BackdropProps) {
  return (
    <div class='fixed flex items-center justify-center inset-0 z-40 backdrop-blur-[1px] transition-opacity duration-200'>
      {children}
    </div>
  );
}

import { type CSSProperties, type ClipboardEvent, type FormEvent, type FocusEvent, useEffect, useRef } from 'react';

interface RichTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

export const RichText = ({ value, onChange, placeholder, className = '', style }: RichTextProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const normalize = (el: HTMLDivElement) => {
    let html = el.innerHTML;
    if (html === '<br>') {
      html = '';
      el.innerHTML = '';
    }
    return html;
  };

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>';

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-empty={isEmpty}
      className={`rich-text ${className} cursor-text`}
      style={{ ...style, minHeight: '1em' }}
      {...({ placeholder } as { placeholder?: string })}
      onInput={(e: FormEvent<HTMLDivElement>) => {
        onChange(normalize(e.currentTarget));
      }}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        onChange(normalize(e.currentTarget));
      }}
      onPaste={(e: ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }}
    />
  );
};

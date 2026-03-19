import { useEffect, useRef, useState } from "react";

const FilterSelect = ({ value, onChange, options, defaultValue = "all", className = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = value !== defaultValue;
  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      className={`filter-select${isActive ? " filter-select--active" : ""}${className ? ` ${className}` : ""}`}
      ref={ref}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        className="filter-select__trigger"
        data-open={open}
        onClick={() => setOpen((p) => !p)}
      >
        <span className="filter-select__value">{selectedLabel}</span>
      </button>
      {open && (
        <div className="filter-select__menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`filter-select__option${o.value === value ? " filter-select__option--active" : ""}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterSelect;

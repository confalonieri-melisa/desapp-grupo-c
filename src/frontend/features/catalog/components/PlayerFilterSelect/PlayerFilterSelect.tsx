import type { ReactNode } from "react";
import styles from "./PlayerFilterSelect.module.scss";

interface PlayerFilterOption {
  value: string;
  label: string;
}

interface PlayerFilterSelectProps {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  options: readonly PlayerFilterOption[];
  onChange: (value: string) => void;
}

export default function PlayerFilterSelect({
  id,
  label,
  icon,
  value,
  placeholder,
  options,
  onChange,
}: PlayerFilterSelectProps) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{icon} {label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

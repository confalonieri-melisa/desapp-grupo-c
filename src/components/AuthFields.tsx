import FormInput from '@/components/FormInput';

interface AuthField<T extends object> {
  id: Extract<keyof T, string>;
  type?: 'text' | 'email' | 'password';
  label: string;
  value: string;
  error?: string;
}

interface AuthFieldsProps<T extends object> {
  fields: AuthField<T>[];
  disabled: boolean;
  onChange: (field: keyof T, value: string) => void;
}

export default function AuthFields<T extends object>({
  fields,
  disabled,
  onChange,
}: AuthFieldsProps<T>) {
  return (
    <div>
      {fields.map(({ id, type, label, value, error }) => (
        <FormInput
          key={id}
          id={id}
          name={id}
          type={type}
          label={label}
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
          error={error}
          disabled={disabled}
          required
        />
      ))}
    </div>
  );
}

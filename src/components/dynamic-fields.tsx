import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import { COUNTRIES } from "@/lib/countries";
import type { FormFieldDef } from "@/modules/registrations/defaults";

export function DynamicFields({
  fields,
  defaults = {},
}: {
  fields: FormFieldDef[];
  defaults?: Record<string, string | string[]>;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const initial = defaults[field.key];
        const textValue = Array.isArray(initial) ? initial[0] ?? "" : initial ?? "";
        const wide = field.type === "textarea";
        return (
          <div key={field.key} className={wide ? undefined : undefined}>
            <Label htmlFor={field.key}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>
            <FieldControl field={field} defaultValue={textValue} selected={initial} />
          </div>
        );
      })}
    </div>
  );
}

function FieldControl({
  field,
  defaultValue,
  selected,
}: {
  field: FormFieldDef;
  defaultValue: string;
  selected?: string | string[];
}) {
  const options = field.options?.length ? field.options : field.type === "country" ? COUNTRIES : [];
  const selectedList = Array.isArray(selected) ? selected : selected ? [selected] : [];

  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.key}
        name={field.key}
        defaultValue={defaultValue}
        required={field.required}
      />
    );
  }

  if (field.type === "select" || field.type === "country") {
    return (
      <Select
        id={field.key}
        name={field.key}
        required={field.required}
        defaultValue={defaultValue}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-body text-slate-700">
            <Radio
              name={field.key}
              value={option}
              defaultChecked={defaultValue === option}
              required={field.required}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox" || field.type === "multiselect") {
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-body text-slate-700">
            <Checkbox
              name={field.key}
              value={option}
              defaultChecked={selectedList.includes(option)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  return (
    <Input
      id={field.key}
      name={field.key}
      type={field.type === "email" || field.type === "tel" || field.type === "date" ? field.type : "text"}
      defaultValue={defaultValue}
      required={field.required}
    />
  );
}

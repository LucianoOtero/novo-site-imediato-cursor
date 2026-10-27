"use client";

import * as React from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { splitTelefone, telefoneDigits } from "@/lib/validators";

/**
 * Campo único de telefone `(11) 98765-4321` (DDD + celular). Quem usa
 * continua recebendo `ddd` e `celular` separados, então nada muda no que
 * é enviado ao servidor.
 */
export type TelefoneValue = ReturnType<typeof splitTelefone>;

export type TelefoneInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange" | "type"> & {
  value: string;
  onTelefoneChange: (value: TelefoneValue) => void;
};

const TelefoneInput = React.forwardRef<HTMLInputElement, TelefoneInputProps>(function TelefoneInput(
  { value, onTelefoneChange, ...props },
  ref
) {
  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(11) 98765-4321"
      maxLength={20}
      {...props}
      value={value}
      onChange={(event) => {
        const inputType = (event.nativeEvent as Partial<InputEvent>).inputType ?? "";
        const typing = inputType === "insertText" || inputType === "insertCompositionText";
        let digits = telefoneDigits(event.target.value, !typing);
        // Apagar um caractere da máscara ("(", ")", espaço, hífen) não
        // muda os dígitos; sem isso o campo "trava" no Backspace.
        if (inputType.startsWith("delete") && digits === telefoneDigits(value) && digits.length > 0) {
          digits = digits.slice(0, -1);
        }
        onTelefoneChange(splitTelefone(digits));
      }}
    />
  );
});

export { TelefoneInput };

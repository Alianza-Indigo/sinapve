"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Option = { value: string; label: string };

// Selector de Alcance: navega con ?scope=<organizationId>. Las opciones ya vienen
// acotadas por permiso (derivadas de los datos visibles del actor), de modo que
// nunca se puede elegir un alcance fuera de la política ABAC.
export function ScopeSelect({ currentId, options }: { currentId: string; options: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set("scope", value);
    startTransition(() => router.push(params.toString() ? `/backoffice?${params.toString()}` : "/backoffice"));
  };

  return (
    <label className="dash-scope-field">
      <span>Alcance:</span>
      <select value={currentId} onChange={(event) => onChange(event.target.value)} disabled={pending} aria-label="Alcance territorial">
        <option value="">Alcance completo</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

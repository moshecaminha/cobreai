/** Validação e máscara de CPF/CNPJ (formato atual, numérico). */

export function soDigitos(v: string) { return (v || "").replace(/\D/g, ""); }

export function validaCPF(cpf: string): boolean {
  const c = soDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d1 = 11 - (s % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== +c[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  let d2 = 11 - (s % 11); if (d2 >= 10) d2 = 0;
  return d2 === +c[10];
}

export function validaCNPJ(cnpj: string): boolean {
  const c = soDigitos(cnpj);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string, pesos: number[]) => {
    let s = 0;
    for (let i = 0; i < pesos.length; i++) s += +base[i] * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c, [5,4,3,2,9,8,7,6,5,4,3,2]);
  if (d1 !== +c[12]) return false;
  const d2 = calc(c, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d2 === +c[13];
}

export type TipoDoc = "CPF" | "CNPJ";

export function detectaTipo(doc: string): TipoDoc {
  return soDigitos(doc).length > 11 ? "CNPJ" : "CPF";
}

export function validaDocumento(doc: string): boolean {
  return detectaTipo(doc) === "CPF" ? validaCPF(doc) : validaCNPJ(doc);
}

export function mascaraDocumento(doc: string): string {
  const c = soDigitos(doc);
  if (c.length <= 11) {
    return c.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  }
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
}

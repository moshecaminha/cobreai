const PADRAO:Record<string,number>={MEI:1,ME:5,EPP:30,DEMAIS:100};
export function estimarFuncionarios(porte?:string|null,informado?:number|null):number{
  if(informado&&informado>0)return informado;const p=(porte||"").toUpperCase();
  if(p.includes("MEI"))return 1;if(p.includes("MICRO")||p==="ME")return 5;if(p.includes("PEQUEN")||p==="EPP")return 30;return 100;
}
export function calcularValor(c:{valor_base?:number|null;valor_por_funcionario?:number|null;valor_minimo?:number|null;valor_maximo?:number|null},f:number):number{
  let v=(c.valor_base??0)+f*(c.valor_por_funcionario??0);
  if(c.valor_minimo!=null&&v<c.valor_minimo)v=c.valor_minimo;if(c.valor_maximo!=null&&v>c.valor_maximo)v=c.valor_maximo;
  return Math.round(v*100)/100;
}

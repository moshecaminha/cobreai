function tlv(id:string,v:string){return `${id}${v.length.toString().padStart(2,"0")}${v}`;}
function crc16(p:string){let c=0xffff;for(let i=0;i<p.length;i++){c^=p.charCodeAt(i)<<8;for(let j=0;j<8;j++){c=c&0x8000?(c<<1)^0x1021:c<<1;c&=0xffff;}}return c.toString(16).toUpperCase().padStart(4,"0");}
function lp(s:string,m:number){return (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9 ]/g,"").toUpperCase().slice(0,m).trim();}
export function gerarPixCopiaECola(o:{chave:string;nome:string;cidade:string;valor?:number;txid?:string;descricao?:string}):string{
  const merchant=tlv("26",tlv("00","br.gov.bcb.pix")+tlv("01",o.chave)+(o.descricao?tlv("02",lp(o.descricao,40)):""));
  let p="";p+=tlv("00","01");p+=merchant;p+=tlv("52","0000");p+=tlv("53","986");
  if(o.valor&&o.valor>0)p+=tlv("54",o.valor.toFixed(2));
  p+=tlv("58","BR");p+=tlv("59",lp(o.nome,25)||"RECEBEDOR");p+=tlv("60",lp(o.cidade,15)||"BRASIL");
  p+=tlv("62",tlv("05",lp(o.txid||"***",25)||"***"));p+="6304";p+=crc16(p);return p;
}

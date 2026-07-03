export const maskPhone = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{2})(\d)/, '($1) $2') // Coloca parênteses em volta dos dois primeiros dígitos
    .replace(/(\d{5})(\d)/, '$1-$2') // Coloca hífen entre o quinto e o sexto dígitos
    .replace(/(-\d{4})\d+?$/, '$1'); // Limita a 15 caracteres
};

export const maskCPF = (value) => {
  return value
    .replace(/\D/g, '') 
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1'); // Limita a 14 caracteres
};

export const maskCEP = (value) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1'); // Limita a 9 caracteres
};

export const formatarWhatsapp = (valor) => {
  let v = valor.replace(/\D/g, ''); // Remove tudo que não é número
  if (v.length > 11) v = v.substring(0, 11); // Limita tamanho
  
  if (v.length > 6) {
    return v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (v.length > 2) {
    return v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (v.length > 0) {
    return v.replace(/^(\d*)/, '($1');
  }
  return v;
};
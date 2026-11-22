import { createContact, transact, uid } from './domain.mjs';

export const templates = {
  contacts: { headers: ['nome', 'email', 'telefone', 'empresa', 'cargo', 'origem'], example: ['Contato exemplo', 'contato@example.com', '11999990000', 'Empresa exemplo', 'Gerente', 'Indicação'] },
  products: { headers: ['nome', 'preco'], example: ['Serviço exemplo', '1500,00'] },
};

export function parseCSV(text) {
  text = String(text).replace(/^\uFEFF/, '');
  if (text.length > 2_000_000) throw new Error('O arquivo deve ter até 2 MB. Divida a planilha em arquivos menores.');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted) quoted = false;
      else if (!value) quoted = true;
      else throw new Error('Há aspas em posição inválida na planilha.');
    } else if (ch === separator && !quoted) { row.push(value); value = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(value); if (row.some(v => v.trim())) rows.push(row);
      row = []; value = '';
    } else value += ch;
  }
  if (quoted) throw new Error('Uma célula está com aspas abertas. Revise a planilha.');
  row.push(value); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

export function parseMoney(value) {
  const raw = String(value ?? '').trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!raw) throw new Error('Informe o preço.');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('O preço deve ser positivo, com no máximo duas casas decimais.');
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error('Preço inválido.');
  return number;
}

export function previewImport(db, kind, text) {
  if (!templates[kind]) throw new Error('O tipo de importação não existe.');
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error('Inclua o cabeçalho e pelo menos uma linha de dados.');
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const required = kind === 'contacts' ? ['nome'] : ['nome', 'preco'];
  if (new Set(headers).size !== headers.length) throw new Error('Há colunas repetidas no cabeçalho.');
  if (!required.every(h => headers.includes(h))) throw new Error(`Colunas obrigatórias: ${required.join(', ')}. Use o modelo desta tela.`);
  const unsupported = headers.filter(h => !templates[kind].headers.includes(h));
  if (unsupported.length) throw new Error(`Colunas não reconhecidas: ${unsupported.join(', ')}. Use o modelo desta tela.`);
  const seen = new Set(kind === 'contacts' ? db.contacts.map(c => c.email).filter(Boolean) : db.products.map(p => p.name.toLocaleLowerCase('pt-BR')));
  const result = rows.slice(1).map((values, index) => {
    const result = { line: index + 2, status: 'ready', message: '', data: null };
    try {
      if (values.length !== headers.length) throw new Error('A quantidade de células difere do cabeçalho.');
      const data = Object.fromEntries(headers.map((header, i) => [header, values[i].trim()]));
      if (!data.nome) throw new Error('O nome é obrigatório.');
      if (kind === 'contacts') {
        const email = (data.email || '').toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido.');
        result.data = { name: data.nome, email, phone: data.telefone || '', organization: data.empresa || '', role: data.cargo || '', channel: data.origem || '' };
        if (email && seen.has(email)) { result.status = 'duplicate'; result.message = 'Email já cadastrado ou repetido neste arquivo.'; }
        if (email) seen.add(email);
      } else {
        const price = parseMoney(data.preco);
        result.data = { name: data.nome, price };
        const key = data.nome.toLocaleLowerCase('pt-BR');
        if (seen.has(key)) { result.status = 'duplicate'; result.message = 'Produto com este nome já cadastrado ou repetido.'; }
        seen.add(key);
      }
    } catch (error) { result.status = 'error'; result.message = error.message; }
    return result;
  });
  return { kind, rows: result, ready: result.filter(r => r.status === 'ready').length, duplicates: result.filter(r => r.status === 'duplicate').length, errors: result.filter(r => r.status === 'error').length };
}

export function commitImport(db, preview) {
  // Revalidate against current state to prevent stale previews adding duplicates.
  return transact(db, next => {
    const added = [];
    for (const row of preview.rows.filter(r => r.status === 'ready')) {
      if (preview.kind === 'contacts') {
        if (row.data.email && next.contacts.some(c => c.email === row.data.email)) continue;
        added.push(createContact(next, row.data));
      } else {
        if (next.products.some(p => p.name.toLocaleLowerCase('pt-BR') === row.data.name.toLocaleLowerCase('pt-BR'))) continue;
        const product = { id: uid(), ...row.data }; next.products.push(product); added.push(product);
      }
    }
    return added.length;
  });
}

export function csvExport(headers, rows) {
  const escape = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(';')).join('\r\n');
}

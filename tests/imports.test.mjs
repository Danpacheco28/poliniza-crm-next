import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDatabase, createContact } from '../src/domain.mjs';
import { parseCSV, previewImport, commitImport, csvExport, parseMoney } from '../src/imports.mjs';

test('CSV handles quoted delimiter, line breaks, BOM and escaped quotes', () => {
  assert.deepEqual(parseCSV('\uFEFFnome;empresa\r\n"Ana; B";"Empresa ""X""\nBrasil"'), [['nome','empresa'], ['Ana; B','Empresa "X"\nBrasil']]);
});
test('preview validates every row and separates duplicate emails', () => {
  const db = emptyDatabase();
  const preview = previewImport(db, 'contacts', 'nome;email\nAna;ana@example.com\nAna B;ana@example.com\nErro;invalido');
  assert.equal(preview.ready, 1); assert.equal(preview.duplicates, 1); assert.equal(preview.errors, 1);
  assert.equal(db.contacts.length, 0);
});
test('commit rechecks duplicate added after preview', () => {
  const db = emptyDatabase();
  const preview = previewImport(db, 'contacts', 'nome;email\nAna;ana@example.com');
  createContact(db, { name: 'Outra Ana', email: 'ana@example.com' });
  const result = commitImport(db, preview);
  assert.equal(result.result, 0); assert.equal(result.db.contacts.length, 1);
});
test('Brazilian prices parse without silently accepting ambiguous text', () => {
  assert.equal(parseMoney('R$ 1.250,75'), 1250.75);
  assert.equal(parseMoney('1500.00'), 1500);
  assert.throws(() => parseMoney('R$abc'));
  assert.throws(() => parseMoney('-1'));
});
test('export neutralizes spreadsheet formulas', () => {
  assert.match(csvExport(['nome'], [['=1+1']]), /'=1\+1/);
});

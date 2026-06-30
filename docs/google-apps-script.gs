const COLUMNS = [
  'id',
  'category',
  'name',
  'slug',
  'description',
  'ingredients',
  'price',
  'image_url',
  'is_available',
  'is_new',
  'is_featured',
  'is_best_seller',
  'order',
  'created_at',
  'updated_at'
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('ZERO_ADMIN_SECRET') || '';
    if (expectedSecret && body.secret !== expectedSecret) {
      return reply({ ok: false, error: 'No autorizado.' });
    }

    const sheet = getSheet(body.sheetName || 'products');
    ensureHeader(sheet);

    if (body.action === 'products') {
      return reply({ ok: true, products: readProducts(sheet) });
    }

    if (body.action === 'create') {
      const product = normalizeProduct(body.product || {});
      sheet.appendRow(productToRow(product));
      return reply({ ok: true, product });
    }

    if (body.action === 'update') {
      const id = String(body.id || '');
      const rowNumber = findRowNumber(sheet, id);
      if (!rowNumber) return reply({ ok: false, error: 'Producto no encontrado.' });
      const product = normalizeProduct(Object.assign({}, body.product || {}, { id }));
      sheet.getRange(rowNumber, 1, 1, COLUMNS.length).setValues([productToRow(product)]);
      return reply({ ok: true, product });
    }

    if (body.action === 'deactivate') {
      const id = String(body.id || '');
      const rowNumber = findRowNumber(sheet, id);
      if (!rowNumber) return reply({ ok: false, error: 'Producto no encontrado.' });
      const product = rowToProduct(sheet.getRange(rowNumber, 1, 1, COLUMNS.length).getValues()[0]);
      product.is_available = false;
      product.updated_at = new Date().toISOString();
      sheet.getRange(rowNumber, 1, 1, COLUMNS.length).setValues([productToRow(product)]);
      return reply({ ok: true, product });
    }

    return reply({ ok: false, error: 'Accion no soportada.' });
  } catch (error) {
    return reply({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doGet() {
  return reply({ ok: true, message: 'Zero Burger Sheets API activa.' });
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function ensureHeader(sheet) {
  const header = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  if (header[0] !== 'id') {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  }
}

function readProducts(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues()
    .filter(function(row) { return row[0]; })
    .map(rowToProduct);
}

function findRowNumber(sheet, id) {
  const products = readProducts(sheet);
  for (let index = 0; index < products.length; index += 1) {
    if (products[index].id === id) return index + 2;
  }
  return null;
}

function normalizeProduct(input) {
  const now = new Date().toISOString();
  return {
    id: String(input.id || Utilities.getUuid()),
    category: String(input.category || 'Menu'),
    name: String(input.name || ''),
    slug: String(input.slug || slugify(input.name || 'producto')),
    description: String(input.description || ''),
    ingredients: Array.isArray(input.ingredients) ? input.ingredients.join(', ') : String(input.ingredients || ''),
    price: Number(input.price || 0),
    image_url: String(input.image_url || '/images/menu/zero-burger.svg'),
    is_available: toBool(input.is_available, true),
    is_new: toBool(input.is_new),
    is_featured: toBool(input.is_featured),
    is_best_seller: toBool(input.is_best_seller),
    order: Number(input.order || 999),
    created_at: String(input.created_at || now),
    updated_at: now
  };
}

function rowToProduct(row) {
  return {
    id: String(row[0] || ''),
    category: String(row[1] || ''),
    name: String(row[2] || ''),
    slug: String(row[3] || ''),
    description: String(row[4] || ''),
    ingredients: String(row[5] || '').split(',').map(function(item) { return item.trim(); }).filter(Boolean),
    price: Number(row[6] || 0),
    image_url: String(row[7] || ''),
    is_available: toBool(row[8], true),
    is_new: toBool(row[9]),
    is_featured: toBool(row[10]),
    is_best_seller: toBool(row[11]),
    order: Number(row[12] || 999),
    created_at: String(row[13] || ''),
    updated_at: String(row[14] || '')
  };
}

function productToRow(product) {
  return COLUMNS.map(function(column) { return product[column]; });
}

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === '' || value === null || typeof value === 'undefined') return Boolean(fallback);
  return ['true', '1', 'si', 'yes', 'x'].indexOf(String(value).toLowerCase()) !== -1;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function reply(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
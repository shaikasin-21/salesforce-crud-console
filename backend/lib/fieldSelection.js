console.log('NEW FIELD SELECTION CODE IS RUNNING');
const RENDERABLE_TYPES = new Set([
  'string', 'textarea', 'email', 'phone', 'picklist', 'double',
  'currency', 'int', 'date', 'datetime', 'boolean', 'url', 'percent',
]);

const NOISE_SUFFIXES = ['Latitude', 'Longitude', 'GeocodeAccuracy', 'StateCode', 'CountryCode'];

function isNoiseField(name) {
  return NOISE_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function selectFields(allFields) {
  const candidates = allFields.filter(
    (f) =>
      (RENDERABLE_TYPES.has(f.type) || f.name === 'Id') &&
      (f.createable || f.name === 'Id') &&
      !f.deprecatedAndHidden &&
      !isNoiseField(f.name)
  );

  // Id is pulled directly from the FULL field list (not the filtered
  // candidates) so it can never be accidentally excluded.
  const idField = allFields.find((f) => f.name === 'Id');
  const nameField = candidates.find((f) => f.nameField) || candidates.find((f) => f.name === 'Name');
  const requiredFields = candidates.filter(
    (f) => !f.nillable && f.createable && f.name !== 'Id' && f !== nameField
  );

  const remaining = candidates.filter(
    (f) => f.name !== 'Id' && f !== nameField && !requiredFields.includes(f)
  );
  const addressLike = remaining.filter((f) => /^(Billing|Shipping|Mailing|Other)(Street|City|State|PostalCode|Country)$/.test(f.name));
  const plain = remaining.filter((f) => !addressLike.includes(f));

  const ordered = [idField, nameField, ...requiredFields, ...plain, ...addressLike.slice(0, 2)].filter(Boolean);

  const seen = new Set();
  const deduped = ordered.filter((f) => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });

  return deduped.slice(0, 10);
}

module.exports = { selectFields, RENDERABLE_TYPES };
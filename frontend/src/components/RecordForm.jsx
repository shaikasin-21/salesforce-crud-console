import { useState } from 'react';

export default function RecordForm({ fields, initialValues, onSave, onCancel, saving }) {
  const [values, setValues] = useState(() => {
    const v = {};
    fields.forEach((f) => {
      if (f.name === 'Id') return; // Id is never edited directly
      v[f.name] = initialValues?.[f.name] ?? '';
    });
    return v;
  });

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Drop empty strings so we don't send blanks for untouched optional fields
    const payload = {};
    Object.entries(values).forEach(([k, v]) => {
      if (v !== '') payload[k] = v;
    });
    onSave(payload);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{initialValues ? 'Edit Record' : 'New Record'}</h3>
        <form onSubmit={handleSubmit}>
          {fields
            .filter((f) => f.name !== 'Id')
            .map((f) => (
              <div className="form-row" key={f.name}>
                <label htmlFor={f.name}>
                  {f.label}
                  {!f.nillable && <span className="required">*</span>}
                </label>
                {f.type === 'boolean' ? (
                  <input
                    id={f.name}
                    type="checkbox"
                    checked={values[f.name] === true || values[f.name] === 'true'}
                    onChange={(e) => handleChange(f.name, e.target.checked)}
                  />
                ) : f.type === 'picklist' ? (
                  <select
                    id={f.name}
                    value={values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={!f.nillable}
                  >
                    <option value="">-- select --</option>
                    {(f.picklistValues || []).map((pv) => (
                      <option key={pv} value={pv}>
                        {pv}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'date' ? (
                  <input
                    id={f.name}
                    type="date"
                    value={values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={!f.nillable}
                  />
                ) : f.type === 'datetime' ? (
                  <input
                    id={f.name}
                    type="datetime-local"
                    value={values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={!f.nillable}
                  />
                ) : ['double', 'currency', 'int', 'percent'].includes(f.type) ? (
                  <input
                    id={f.name}
                    type="number"
                    value={values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={!f.nillable}
                  />
                ) : (
                  <input
                    id={f.name}
                    type="text"
                    value={values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={!f.nillable}
                  />
                )}
              </div>
            ))}
          <div className="modal-actions">
            <button type="button" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

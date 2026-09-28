export default function ObjectSelector({ objects, selected, onChange }) {
  return (
    <div className="object-selector">
      <label htmlFor="object-select">Salesforce Object</label>
      <select
        id="object-select"
        value={selected || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          -- choose an object --
        </option>
        {objects.map((obj) => (
          <option key={obj} value={obj}>
            {obj}
          </option>
        ))}
      </select>
    </div>
  );
}

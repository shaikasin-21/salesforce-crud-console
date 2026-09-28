import { useEffect, useState, useCallback } from 'react';
import ObjectSelector from './components/ObjectSelector.jsx';
import RecordTable from './components/RecordTable.jsx';
import RecordForm from './components/RecordForm.jsx';
import {
  loginUrl,
  getAuthStatus,
  logout,
  getObjects,
  getFields,
  getRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} from './api.js';

const PAGE_SIZE = 20;

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState('');
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Surface OAuth errors passed back via ?error=... on the callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(`Login failed: ${err}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    getAuthStatus()
      .then((ok) => setIsAuthenticated(ok))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getObjects()
      .then(setObjects)
      .catch(() => setError('Failed to load Salesforce object list.'));
  }, [isAuthenticated]);

  const loadFieldsAndFirstPage = useCallback(async (object) => {
    setLoading(true);
    setError('');
    try {
      const [fieldList, page] = await Promise.all([
        getFields(object),
        getRecords(object, 0, PAGE_SIZE),
      ]);
      setFields(fieldList);
      setRecords(page.records);
      setOffset(page.records.length);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data for this object.');
      setFields([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedObject) loadFieldsAndFirstPage(selectedObject);
  }, [selectedObject, loadFieldsAndFirstPage]);

  async function handleLoadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const page = await getRecords(selectedObject, offset, PAGE_SIZE);
      setRecords((prev) => [...prev, ...page.records]);
      setOffset((prev) => prev + page.records.length);
      setHasMore(page.hasMore);
    } catch {
      setError('Failed to load more records.');
    } finally {
      setLoading(false);
    }
  }

  function refreshFromStart() {
    loadFieldsAndFirstPage(selectedObject);
  }

  async function handleSave(payload) {
    setSaving(true);
    setError('');
    try {
      if (editingRecord) {
        await updateRecord(selectedObject, editingRecord.Id, payload);
      } else {
        await createRecord(selectedObject, payload);
      }
      setShowForm(false);
      setEditingRecord(null);
      refreshFromStart();
    } catch (err) {
      setError(JSON.stringify(err.response?.data) || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(`Delete this ${selectedObject} record?`)) return;
    try {
      await deleteRecord(selectedObject, record.Id);
      refreshFromStart();
    } catch {
      setError('Delete failed.');
    }
  }

  if (!authChecked) {
    return <div className="center-screen">Checking session…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="center-screen">
        <h1>Salesforce CRUD Console</h1>
        <p>Log in with your Salesforce Developer Org to manage records.</p>
        {error && <p className="error-banner">{error}</p>}
        <a className="login-button" href={loginUrl()}>
          Log in to Salesforce
        </a>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Salesforce CRUD Console</h1>
        <button
          className="logout-button"
          onClick={async () => {
            await logout();
            setIsAuthenticated(false);
          }}
        >
          Log out
        </button>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <div className="toolbar">
        <ObjectSelector objects={objects} selected={selectedObject} onChange={setSelectedObject} />
        {selectedObject && fields.length > 0 && (
          <button onClick={() => setShowForm(true)}>+ New {selectedObject}</button>
        )}
      </div>

      {selectedObject && fields.length > 0 && (
        <RecordTable
          fields={fields}
          records={records}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onEdit={(rec) => {
            setEditingRecord(rec);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <RecordForm
          fields={fields}
          initialValues={editingRecord}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

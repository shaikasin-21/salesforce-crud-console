const express = require('express');
const { sfRequest } = require('../lib/sfClient');
const { selectFields } = require('../lib/fieldSelection');

const router = express.Router();

const SUPPORTED_OBJECTS = ['Account', 'Opportunity', 'Lead', 'Contact', 'Case'];

function requireAuth(req, res, next) {
  if (!req.session.isAuthenticated || !req.session.sf) {
    return res.status(401).json({ error: 'Not authenticated. Please log in via /auth/login.' });
  }
  next();
}

router.use(requireAuth);

router.get('/objects', function (req, res) {
  res.json(SUPPORTED_OBJECTS);
});

router.get('/objects/:object/fields', async function (req, res) {
  var object = req.params.object;
  if (SUPPORTED_OBJECTS.indexOf(object) === -1) {
    return res.status(400).json({ error: 'Unsupported object' });
  }
  try {
    var describeResp = await sfRequest(req.session, { path: '/sobjects/' + object + '/describe' });
    var fields = selectFields(describeResp.data.fields);
    res.json(
      fields.map(function (f) {
        return {
          name: f.name,
          label: f.label,
          type: f.type,
          createable: f.createable,
          updateable: f.updateable,
          nillable: f.nillable,
          picklistValues: f.type === 'picklist' ? f.picklistValues.map(function (p) { return p.value; }) : undefined,
        };
      })
    );
  } catch (err) {
    console.error('Describe error:', (err.response && err.response.data) || err.message);
    res.status((err.response && err.response.status) || 500).json({ error: 'Failed to describe object' });
  }
});

router.get('/objects/:object/records', async function (req, res) {
  var object = req.params.object;
  var offset = parseInt(req.query.offset, 10) || 0;
  var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  if (SUPPORTED_OBJECTS.indexOf(object) === -1) {
    return res.status(400).json({ error: 'Unsupported object' });
  }
  try {
    var describeResp = await sfRequest(req.session, { path: '/sobjects/' + object + '/describe' });
    var fieldNames = selectFields(describeResp.data.fields).map(function (f) { return f.name; });
    var soql = 'SELECT ' + fieldNames.join(', ') + ' FROM ' + object + ' ORDER BY Id LIMIT ' + limit + ' OFFSET ' + offset;
    var queryResp = await sfRequest(req.session, { path: '/query', params: { q: soql } });
    res.json({
      records: queryResp.data.records,
      totalSize: queryResp.data.totalSize,
      hasMore: offset + limit < queryResp.data.totalSize,
    });
  } catch (err) {
    console.error('Query error:', (err.response && err.response.data) || err.message);
    res.status((err.response && err.response.status) || 500).json({ error: 'Failed to fetch records' });
  }
});

router.post('/objects/:object/records', async function (req, res) {
  var object = req.params.object;
  if (SUPPORTED_OBJECTS.indexOf(object) === -1) {
    return res.status(400).json({ error: 'Unsupported object' });
  }
  try {
    var resp = await sfRequest(req.session, { method: 'post', path: '/sobjects/' + object, data: req.body });
    res.status(201).json(resp.data);
  } catch (err) {
    console.error('Create error:', (err.response && err.response.data) || err.message);
    res.status((err.response && err.response.status) || 500).json({ error: (err.response && err.response.data) || 'Failed to create record' });
  }
});

router.patch('/objects/:object/records/:id', async function (req, res) {
  var object = req.params.object;
  var id = req.params.id;
  if (SUPPORTED_OBJECTS.indexOf(object) === -1) {
    return res.status(400).json({ error: 'Unsupported object' });
  }
  try {
    await sfRequest(req.session, { method: 'patch', path: '/sobjects/' + object + '/' + id, data: req.body });
    res.status(204).end();
  } catch (err) {
    console.error('Update error:', (err.response && err.response.data) || err.message);
    res.status((err.response && err.response.status) || 500).json({ error: (err.response && err.response.data) || 'Failed to update record' });
  }
});

router.delete('/objects/:object/records/:id', async function (req, res) {
  var object = req.params.object;
  var id = req.params.id;
  if (SUPPORTED_OBJECTS.indexOf(object) === -1) {
    return res.status(400).json({ error: 'Unsupported object' });
  }
  try {
    await sfRequest(req.session, { method: 'delete', path: '/sobjects/' + object + '/' + id });
    res.status(204).end();
  } catch (err) {
    var sfError = err.response && err.response.data;
    var detail = (Array.isArray(sfError) && sfError[0] && sfError[0].message) ? sfError[0].message : 'Failed to delete record';
    console.error('Delete error:', sfError || err.message);
    res.status((err.response && err.response.status) || 500).json({ error: detail, salesforce: sfError });
  }
});

module.exports = router;
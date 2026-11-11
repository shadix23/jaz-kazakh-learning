// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
const { handle } = require('../server/api');

module.exports = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.searchParams.get('route') || '';
  url.searchParams.delete('route');
  req.url = '/api/' + route + (url.search ? url.search : '');
  return handle(req, res, '/api/' + route);
};

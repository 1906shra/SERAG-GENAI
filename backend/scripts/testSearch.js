require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Document = require('../models/Document');
  const indexes = await Document.collection.indexes();
  const textIdx = indexes.find(i => i.key && i.key._fts === 'text');
  console.log('Text index:', textIdx ? textIdx.name : 'NOT FOUND');

  const t = Date.now();
  const r = await Document.find({ $text: { $search: 'facebook' } }).select('title').limit(5).lean();
  console.log('$text query:', Date.now()-t, 'ms | results:', r.length);
  r.forEach(d => console.log(' -', d.title));
  await mongoose.disconnect();
}).catch(e => console.error(e.message));

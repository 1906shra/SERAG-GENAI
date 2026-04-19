require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const faissService = require('../services/faissService');
  await faissService.initialize();
  const SearchService = require('../services/searchService');
  const svc = new SearchService();
  const userId = new mongoose.Types.ObjectId('69e3ca84a0e70eae14f6fa0f');
  const opts = { userId, maxResults: 10, includePublic: true };

  const queries = ['facebook', 'machine learning', 'database', 'cloud AWS', 'python'];
  console.log('\nPerformance Test (cold)\n' + '='.repeat(45));
  for (const q of queries) {
    const r = await svc.hybridSearch(q, opts);
    console.log(q.padEnd(20), r.results.length + ' results', (r.searchTime + 'ms').padStart(8));
  }
  console.log('\nCache hits (warm)\n' + '='.repeat(45));
  for (const q of queries) {
    const r = await svc.hybridSearch(q, opts);
    console.log(q.padEnd(20), r.results.length + ' results', (r.searchTime + 'ms').padStart(8), r.fromCache ? 'CACHED' : '');
  }
  console.log('\nCache:', JSON.stringify(require('../services/cacheService').searchCache.stats()));
  await mongoose.disconnect();
}).catch(e => console.error(e.message));

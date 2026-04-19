require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Document = require('../models/Document');
  const SearchQuery = require('../models/SearchQuery');
  const total = await Document.countDocuments({ isActive: true });
  const completed = await Document.countDocuments({ isActive: true, processingStatus: 'completed' });
  const failed = await Document.countDocuments({ processingStatus: 'failed' });
  const searches = await SearchQuery.countDocuments();
  console.log('Documents - total:', total, '| completed:', completed, '| failed:', failed);
  console.log('Search queries:', searches);
  const docs = await Document.find({ processingStatus: 'completed' }).select('title chunks').lean();
  docs.forEach(d => {
    const hasEmbed = d.chunks[0]?.embedding?.length > 0;
    console.log(' -', d.title, '| chunks:', d.chunks.length, '| embeddings:', hasEmbed ? 'YES' : 'NO');
    if (d.chunks[0]) console.log('   preview:', d.chunks[0].text.substring(0, 150));
  });
  mongoose.disconnect();
}).catch(e => console.error(e.message));

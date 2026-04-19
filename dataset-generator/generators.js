const {
  AI_MODELS, AI_CONCEPTS, ML_ALGOS, DB_SYSTEMS, CLOUD_PROVIDERS,
  PROGRAMMING_LANGS, FRAMEWORKS, API_PROTOCOLS, COMPANIES_TECH,
  COMPANIES_FINANCE, COMPANIES_STARTUP, SOCIAL_PLATFORMS, OS_SYSTEMS,
  NETWORKING, SECURITY_CONCEPTS, FINANCE_CONCEPTS, BUSINESS_CONCEPTS,
  CRM_TOOLS, DATA_FORMATS, DEVOPS_TOOLS, METRICS,
  VERBS_ACTIVE, VERBS_PASSIVE, CONNECTORS, COMPARISONS,
  pick, pickN, rand, pct, yr, money
} = require('./domains');

// Each generator returns { text, topic }

const generators = {

  // ── AI & MACHINE LEARNING ──────────────────────────────────────────────────
  ai_definition() {
    const templates = [
      () => `${pick(AI_MODELS)} is a large language model that ${pick(VERBS_ACTIVE)} ${pick(['natural language understanding','code generation','multi-modal reasoning','instruction following','long-context processing'])}.`,
      () => `The ${pick(AI_CONCEPTS)} technique ${pick(VERBS_ACTIVE)} model performance by ${pick(['reducing hallucinations','improving factual accuracy','enabling domain adaptation','lowering inference costs','increasing context window size'])}.`,
      () => `${pick(COMPARISONS)}, ${pick(AI_MODELS)} achieves ${pick(METRICS)} on standard benchmarks.`,
      () => `Researchers at ${pick(COMPANIES_TECH)} demonstrated that ${pick(AI_CONCEPTS)} can reduce training time by ${rand(20,80)}% while maintaining ${pick(['accuracy','F1 score','BLEU score','perplexity'])} within ${rand(1,5)}% of the baseline.`,
      () => `${pick(AI_CONCEPTS)} works by ${pick(['encoding text into dense vector representations','attending to relevant tokens in the input sequence','iteratively refining predictions through gradient descent','sampling from a learned probability distribution','retrieving relevant context from an external knowledge base'])}, ${pick(CONNECTORS)} ${pick(['faster inference','better generalization','lower memory usage','improved robustness','higher throughput'])}.`,
      () => `The ${pick(AI_CONCEPTS)} approach was introduced in ${yr()} and has since been adopted by ${pick(COMPANIES_TECH)}, ${pick(COMPANIES_TECH)}, and ${pick(COMPANIES_TECH)} in production systems.`,
      () => `Fine-tuning ${pick(AI_MODELS)} on domain-specific data ${pick(VERBS_ACTIVE)} task performance by ${rand(15,60)}% compared to zero-shot prompting.`,
      () => `${pick(AI_MODELS)} supports a context window of up to ${pick(['4K','8K','16K','32K','128K','200K'])} tokens, ${pick(CONNECTORS)} processing entire codebases or legal documents in a single pass.`,
    ];
    return { text: pick(templates)(), topic: 'AI' };
  },

  ml_algorithm() {
    const templates = [
      () => `${pick(ML_ALGOS)} ${pick(VERBS_PASSIVE)} classification tasks where the decision boundary is ${pick(['non-linear','high-dimensional','sparse','imbalanced','noisy'])}.`,
      () => `When training ${pick(ML_ALGOS)} on tabular data, practitioners typically ${pick(['normalize features','handle missing values with imputation','apply cross-validation','tune hyperparameters with Bayesian optimization','use early stopping to prevent overfitting'])}.`,
      () => `${pick(ML_ALGOS)} outperforms ${pick(ML_ALGOS)} on ${pick(['structured data','time-series forecasting','anomaly detection','recommendation systems','fraud detection'])} tasks when the dataset contains ${rand(10,500)}K samples.`,
      () => `The key hyperparameters of ${pick(ML_ALGOS)} include ${pick(['learning rate','max depth','number of estimators','regularization strength','kernel bandwidth'])}, which must be tuned to avoid ${pick(['overfitting','underfitting','vanishing gradients','mode collapse','catastrophic forgetting'])}.`,
      () => `${pick(COMPANIES_TECH)} uses ${pick(ML_ALGOS)} in its ${pick(['recommendation engine','fraud detection pipeline','search ranking system','ad targeting platform','content moderation system'])} to process ${rand(1,500)} million requests per day.`,
    ];
    return { text: pick(templates)(), topic: 'ML' };
  },

  // ── DATABASES ─────────────────────────────────────────────────────────────
  database() {
    const templates = [
      () => `${pick(DB_SYSTEMS)} is a ${pick(['relational','document-oriented','key-value','columnar','graph','time-series','vector'])} database that ${pick(VERBS_ACTIVE)} ${pick(['horizontal scaling','ACID transactions','full-text search','geospatial queries','real-time analytics','multi-model storage'])}.`,
      () => `${pick(COMPARISONS)}, ${pick(DB_SYSTEMS)} achieves ${pick(METRICS)} for ${pick(['read-heavy workloads','write-intensive applications','analytical queries','transactional processing','hybrid OLTP/OLAP workloads'])}.`,
      () => `Migrating from ${pick(DB_SYSTEMS)} to ${pick(DB_SYSTEMS)} reduced query latency by ${rand(30,90)}% for ${pick(COMPANIES_TECH)}'s ${pick(['user profile service','payment processing system','analytics dashboard','search index','session store'])}.`,
      () => `${pick(DB_SYSTEMS)} stores data in ${pick(DATA_FORMATS)} format on disk, ${pick(CONNECTORS)} ${pick(['faster serialization','smaller storage footprint','better compression ratios','schema evolution without downtime','columnar access patterns'])}.`,
      () => `The ${pick(['B-tree','LSM-tree','hash index','inverted index','R-tree','HNSW graph'])} index structure used by ${pick(DB_SYSTEMS)} enables ${pick(['O(log n) lookups','approximate nearest-neighbor search','range queries','full-text search','geospatial indexing'])} with ${pick(METRICS)}.`,
      () => `${pick(DB_SYSTEMS)} introduced ${pick(['multi-version concurrency control','optimistic locking','write-ahead logging','snapshot isolation','serializable snapshot isolation'])} in version ${rand(5,15)}.${rand(0,9)}, ${pick(CONNECTORS)} eliminating read-write conflicts in high-concurrency environments.`,
      () => `Vector databases like ${pick(['Pinecone','Weaviate','Chroma','Qdrant','Milvus'])} store high-dimensional embeddings and support ${pick(['cosine similarity','dot product','Euclidean distance','Manhattan distance'])} search across ${rand(1,100)} million vectors in under ${rand(10,100)}ms.`,
    ];
    return { text: pick(templates)(), topic: 'Databases' };
  },

  // ── CLOUD & DEVOPS ────────────────────────────────────────────────────────
  cloud_devops() {
    const templates = [
      () => `${pick(CLOUD_PROVIDERS)} offers ${pick(['serverless functions','managed Kubernetes','auto-scaling groups','spot instances','reserved capacity','edge computing nodes'])} that ${pick(VERBS_ACTIVE)} infrastructure costs by ${rand(20,70)}%.`,
      () => `${pick(DEVOPS_TOOLS)} ${pick(VERBS_PASSIVE)} container orchestration, enabling teams to deploy ${pick(['microservices','stateful applications','batch jobs','ML inference endpoints','event-driven pipelines'])} across ${rand(3,500)} nodes with a single command.`,
      () => `Using ${pick(DEVOPS_TOOLS)} for CI/CD, ${pick(COMPANIES_TECH)} reduced deployment frequency from weekly to ${pick(['hourly','multiple times per day','every 15 minutes','on every commit'])} while maintaining ${pick(METRICS)}.`,
      () => `${pick(DEVOPS_TOOLS)} monitors ${pick(['CPU utilization','memory pressure','network I/O','disk throughput','error rates','p99 latency'])} and triggers ${pick(['auto-scaling','alerting','circuit breaking','traffic shifting','rollback'])} when thresholds are exceeded.`,
      () => `Infrastructure-as-code with ${pick(DEVOPS_TOOLS)} allows ${pick(COMPANIES_TECH)} to provision a complete ${pick(['multi-region','multi-cloud','hybrid cloud','edge-to-cloud','zero-trust'])} environment in under ${rand(5,30)} minutes.`,
      () => `${pick(CLOUD_PROVIDERS)}'s ${pick(['us-east-1','eu-west-1','ap-southeast-1','us-west-2'])} region processes over ${rand(1,50)} trillion API requests per month, backed by ${rand(3,6)} availability zones for ${pick(METRICS)}.`,
    ];
    return { text: pick(templates)(), topic: 'Cloud' };
  },

  // ── PROGRAMMING & APIs ────────────────────────────────────────────────────
  programming() {
    const templates = [
      () => `${pick(PROGRAMMING_LANGS)} ${pick(VERBS_PASSIVE)} ${pick(['backend services','data pipelines','CLI tools','embedded systems','scientific computing','web scraping','machine learning models'])} due to its ${pick(['strong type system','garbage collection','async/await support','zero-cost abstractions','rich ecosystem','readable syntax','performance characteristics'])}.`,
      () => `The ${pick(FRAMEWORKS)} framework ${pick(VERBS_ACTIVE)} ${pick(['server-side rendering','static site generation','API route handling','real-time updates','form validation','state management'])} out of the box, ${pick(CONNECTORS)} reducing boilerplate by ${rand(40,80)}%.`,
      () => `${pick(API_PROTOCOLS)} APIs ${pick(VERBS_PASSIVE)} ${pick(['mobile applications','microservices communication','IoT device management','real-time dashboards','third-party integrations'])} because they ${pick(['support bidirectional streaming','enable schema introspection','reduce over-fetching','provide strong typing','allow multiplexing requests'])}.`,
      () => `${pick(PROGRAMMING_LANGS)} ${rand(3,4)}.${rand(0,12)} introduced ${pick(['pattern matching','async generators','structural typing','compile-time macros','native WebAssembly support','improved error messages','zero-copy serialization'])}, ${pick(CONNECTORS)} ${pick(['faster startup times','smaller binary sizes','better developer experience','improved memory safety','higher throughput'])}.`,
      () => `Developers at ${pick(COMPANIES_TECH)} migrated ${rand(100,5000)} microservices from ${pick(PROGRAMMING_LANGS)} to ${pick(PROGRAMMING_LANGS)}, achieving ${pick(METRICS)} and reducing infrastructure spend by ${rand(20,60)}%.`,
      () => `The ${pick(FRAMEWORKS)} ecosystem includes over ${rand(50,500)}K packages on ${pick(['npm','PyPI','crates.io','Maven Central','RubyGems'])}, covering everything from ${pick(['HTTP clients','ORM libraries','testing frameworks','authentication middleware','data validation'])} to ${pick(['PDF generation','image processing','cryptography','WebSocket handling','job queues'])}.`,
    ];
    return { text: pick(templates)(), topic: 'Programming' };
  },

  // ── NETWORKING & OS ───────────────────────────────────────────────────────
  networking_os() {
    const templates = [
      () => `${pick(NETWORKING)} ${pick(VERBS_PASSIVE)} ${pick(['secure communication','low-latency streaming','reliable data transfer','peer-to-peer networking','content delivery'])} because it ${pick(['eliminates head-of-line blocking','provides built-in encryption','supports connection migration','reduces round-trip time','enables multiplexing'])}.`,
      () => `${pick(OS_SYSTEMS)} uses a ${pick(['monolithic','microkernel','hybrid','exokernel','unikernel'])} kernel architecture that ${pick(VERBS_ACTIVE)} ${pick(['process isolation','memory management','I/O scheduling','interrupt handling','virtual memory'])} with ${pick(METRICS)}.`,
      () => `The ${pick(NETWORKING)} protocol operates at the ${pick(['application','transport','network','data link','physical'])} layer of the OSI model, ${pick(CONNECTORS)} ${pick(['end-to-end encryption','flow control','error correction','address resolution','packet routing'])}.`,
      () => `${pick(OS_SYSTEMS)} introduced ${pick(['eBPF support','io_uring','cgroups v2','Wayland display server','unified kernel image','live kernel patching'])} in ${yr()}, ${pick(CONNECTORS)} ${pick(['faster system calls','lower I/O overhead','better container isolation','improved GPU scheduling','reduced context switching'])}.`,
      () => `A ${pick(['content delivery network','anycast network','mesh network','overlay network','software-defined network'])} built on ${pick(NETWORKING)} can serve ${rand(1,100)} million users with ${pick(METRICS)} by distributing traffic across ${rand(10,300)} points of presence worldwide.`,
    ];
    return { text: pick(templates)(), topic: 'Networking' };
  },

  // ── SECURITY ──────────────────────────────────────────────────────────────
  security() {
    const templates = [
      () => `${pick(SECURITY_CONCEPTS)} ${pick(VERBS_PASSIVE)} enterprise environments to ${pick(['prevent lateral movement','enforce least-privilege access','detect insider threats','protect sensitive data','comply with SOC 2 requirements'])}.`,
      () => `Implementing ${pick(SECURITY_CONCEPTS)} reduced the attack surface of ${pick(COMPANIES_TECH)}'s infrastructure by ${rand(40,90)}%, as measured by ${pick(['CVE exposure','mean time to detect','blast radius analysis','penetration test findings'])}.`,
      () => `${pick(SECURITY_CONCEPTS)} works by ${pick(['verifying every request regardless of network location','encrypting data at rest and in transit','rotating credentials automatically every 24 hours','scanning dependencies for known vulnerabilities','monitoring for anomalous API call patterns'])}.`,
      () => `The ${pick(['OWASP Top 10','NIST Cybersecurity Framework','CIS Controls','ISO 27001','SOC 2 Type II'])} standard recommends ${pick(SECURITY_CONCEPTS)} as a baseline control for ${pick(['web applications','cloud infrastructure','API gateways','CI/CD pipelines','database access'])}.`,
    ];
    return { text: pick(templates)(), topic: 'Security' };
  },

  // ── BUSINESS & STARTUPS ───────────────────────────────────────────────────
  business() {
    const templates = [
      () => `${pick(COMPANIES_STARTUP)} achieved ${pick(['product-market fit','Series A funding','profitability','unicorn status','IPO readiness'])} in ${yr()} by focusing on ${pick(BUSINESS_CONCEPTS)} and growing ${pick(['monthly active users','annual recurring revenue','gross merchandise volume','net revenue retention'])} by ${rand(100,500)}% year-over-year.`,
      () => `The ${pick(BUSINESS_CONCEPTS)} metric is critical for ${pick(['SaaS companies','marketplace businesses','subscription services','e-commerce platforms','fintech startups'])} because it determines ${pick(['long-term profitability','fundraising valuation','pricing strategy','sales team sizing','marketing budget allocation'])}.`,
      () => `${pick(CRM_TOOLS)} ${pick(VERBS_ACTIVE)} sales pipeline management by ${pick(['automating follow-up emails','scoring leads with AI','syncing with marketing automation','providing real-time deal insights','forecasting revenue with ML'])}, ${pick(CONNECTORS)} increasing close rates by ${rand(15,50)}%.`,
      () => `Startups that implement ${pick(BUSINESS_CONCEPTS)} early typically raise ${rand(2,5)}x more in their next funding round, according to a ${yr()} study of ${rand(500,5000)} companies by ${pick(['Y Combinator','Sequoia Capital','a16z','First Round Capital','Bessemer Venture Partners'])}.`,
      () => `${pick(COMPANIES_STARTUP)} raised ${money()} in a ${pick(['seed','Series A','Series B','Series C','growth'])} round led by ${pick(['Sequoia','a16z','Tiger Global','SoftBank','General Catalyst'])}, valuing the company at ${money()} and planning to use the funds for ${pick(['product development','international expansion','talent acquisition','sales and marketing','infrastructure scaling'])}.`,
      () => `The ${pick(BUSINESS_CONCEPTS)} framework helped ${pick(COMPANIES_STARTUP)} reduce customer churn from ${rand(5,20)}% to ${rand(1,4)}% monthly by ${pick(['improving onboarding','adding in-app guidance','launching a customer success team','building a community forum','personalizing the product experience'])}.`,
    ];
    return { text: pick(templates)(), topic: 'Business' };
  },

  // ── FINANCE ───────────────────────────────────────────────────────────────
  finance() {
    const templates = [
      () => `${pick(FINANCE_CONCEPTS)} is a fundamental principle in ${pick(['personal finance','institutional investing','corporate treasury','risk management','portfolio construction'])} that ${pick(['maximizes long-term returns','reduces volatility','protects against inflation','improves risk-adjusted performance','enables tax-efficient growth'])}.`,
      () => `${pick(COMPANIES_FINANCE)} processed ${money()} in ${pick(['payment volume','assets under management','loan originations','trading volume','insurance premiums'])} in ${yr()}, representing a ${rand(10,60)}% increase from the prior year.`,
      () => `The ${pick(FINANCE_CONCEPTS)} metric is calculated by ${pick(['dividing net income by total assets','multiplying price by shares outstanding','subtracting liabilities from assets','dividing operating income by revenue','compounding returns over the investment period'])}, and is used by ${pick(['analysts','fund managers','CFOs','retail investors','credit rating agencies'])} to ${pick(['assess profitability','compare valuations','evaluate creditworthiness','benchmark performance','make allocation decisions'])}.`,
      () => `${pick(COMPARISONS)}, ${pick(['algorithmic trading','high-frequency trading','quantitative investing','passive index investing','factor-based investing'])} uses ${pick(ML_ALGOS)} to ${pick(['identify arbitrage opportunities','predict price movements','optimize execution timing','manage portfolio risk','detect market anomalies'])} across ${rand(10,10000)} securities simultaneously.`,
      () => `Central banks use ${pick(['interest rate adjustments','quantitative easing','forward guidance','reserve requirements','open market operations'])} to ${pick(['control inflation','stimulate economic growth','stabilize currency','manage credit conditions','support employment'])}, with effects typically felt within ${rand(6,18)} months.`,
    ];
    return { text: pick(templates)(), topic: 'Finance' };
  },

  // ── SOCIAL MEDIA & INTERNET ───────────────────────────────────────────────
  social_internet() {
    const templates = [
      () => `${pick(SOCIAL_PLATFORMS)} has over ${rand(100,3000)} million ${pick(['monthly active users','daily active users','registered accounts','content creators','advertisers'])} as of ${yr()}, making it one of the ${pick(['largest','most-used','fastest-growing','most-profitable','most-influential'])} platforms in the world.`,
      () => `${pick(SOCIAL_PLATFORMS)}'s ${pick(['recommendation algorithm','content ranking system','ad targeting engine','search index','feed personalization model'])} uses ${pick(ML_ALGOS)} to ${pick(['maximize engagement','reduce misinformation','surface relevant content','optimize ad revenue','improve user retention'])}, processing ${rand(1,100)} billion signals per day.`,
      () => `${pick(COMPANIES_TECH)} generates ${pct(rand(60,95))} of its revenue from ${pick(['digital advertising','cloud services','hardware sales','subscription fees','marketplace commissions'])}, with ${pick(['search ads','social ads','display ads','video ads','sponsored content'])} accounting for the largest share.`,
      () => `The ${pick(['creator economy','influencer marketing','social commerce','live streaming','short-form video'])} trend on ${pick(SOCIAL_PLATFORMS)} generated ${money()} in ${yr()}, with top creators earning ${money()} annually through ${pick(['brand deals','platform revenue sharing','merchandise','subscriptions','virtual gifts'])}.`,
      () => `${pick(SOCIAL_PLATFORMS)} introduced ${pick(['end-to-end encryption','content moderation AI','fact-checking labels','algorithmic transparency reports','data portability tools'])} in ${yr()} following ${pick(['regulatory pressure','user backlash','congressional hearings','GDPR compliance requirements','advertiser concerns'])}.`,
      () => `${pick(COMPANIES_TECH)}'s ${pick(['search engine','maps product','email service','cloud storage','productivity suite'])} serves ${rand(500,5000)} million users in ${rand(100,195)} countries, with ${pick(['mobile','desktop','voice','API'])} access accounting for ${pct(rand(40,80))} of total usage.`,
    ];
    return { text: pick(templates)(), topic: 'Internet' };
  },

  // ── GENERAL KNOWLEDGE ─────────────────────────────────────────────────────
  general_knowledge() {
    const templates = [
      () => `${pick(COMPANIES_TECH)} was founded in ${yr()} and has grown to employ over ${rand(10,300)},000 people across ${rand(20,80)} countries, with a market capitalization of ${money()}.`,
      () => `The ${pick(['semiconductor','cloud computing','electric vehicle','renewable energy','biotechnology','quantum computing'])} industry is projected to reach ${money()} by ${rand(2025,2030)}, driven by ${pick(['AI adoption','government subsidies','consumer demand','supply chain reshoring','regulatory tailwinds'])}.`,
      () => `${pick(COMPANIES_TECH)}'s acquisition of ${pick(COMPANIES_STARTUP)} for ${money()} in ${yr()} was motivated by ${pick(['access to proprietary technology','talent acquisition','market expansion','eliminating competition','vertical integration'])}.`,
      () => `Open-source projects like ${pick(FRAMEWORKS)} have over ${rand(50,500)}K GitHub stars and ${rand(1,50)}K contributors, with ${pick(COMPANIES_TECH)}, ${pick(COMPANIES_TECH)}, and ${pick(COMPANIES_TECH)} among the top corporate sponsors.`,
      () => `The ${pick(['Internet of Things','edge computing','5G networks','quantum computing','augmented reality','blockchain'])} market is expected to connect ${rand(10,100)} billion devices by ${rand(2025,2030)}, generating ${money()} in annual economic value.`,
      () => `${pick(COMPANIES_TECH)} holds over ${rand(5,100)},000 patents in ${pick(['AI and machine learning','semiconductor design','wireless communication','cloud infrastructure','autonomous systems'])}, giving it a significant competitive advantage in ${pick(['licensing revenue','product differentiation','litigation defense','standards bodies','talent attraction'])}.`,
    ];
    return { text: pick(templates)(), topic: 'General' };
  },

  // ── RAG & SEARCH SYSTEMS ──────────────────────────────────────────────────
  rag_search() {
    const templates = [
      () => `Retrieval-augmented generation combines ${pick(['dense retrieval','sparse retrieval','hybrid search','knowledge graphs','structured databases'])} with ${pick(AI_MODELS)} to ${pick(['reduce hallucinations','improve factual accuracy','enable real-time knowledge updates','support domain-specific queries','provide source attribution'])}.`,
      () => `A ${pick(['vector store','inverted index','hybrid index','knowledge graph','document store'])} with ${rand(1,100)} million embeddings can be queried in under ${rand(10,200)}ms using ${pick(['HNSW','IVF-PQ','ScaNN','DiskANN','FAISS'])} approximate nearest-neighbor algorithms.`,
      () => `${pick(DB_SYSTEMS)} supports ${pick(['semantic search','full-text search','hybrid search','faceted search','geo-search'])} natively, ${pick(CONNECTORS)} building RAG pipelines without a separate vector database.`,
      () => `Chunking strategies for RAG systems include ${pick(['fixed-size chunking','sentence-level splitting','paragraph-based chunking','semantic chunking','recursive character splitting'])}, with chunk sizes of ${rand(256,1024)} tokens typically yielding the best retrieval precision.`,
      () => `The ${pick(['BM25','TF-IDF','DPR','ColBERT','SPLADE'])} retrieval model achieves ${pick(METRICS)} on the ${pick(['BEIR','MS MARCO','Natural Questions','TriviaQA','HotpotQA'])} benchmark, making it suitable for ${pick(['enterprise search','customer support','legal research','medical information retrieval','code search'])}.`,
    ];
    return { text: pick(templates)(), topic: 'RAG' };
  },

  // ── DATA ENGINEERING ──────────────────────────────────────────────────────
  data_engineering() {
    const templates = [
      () => `${pick(['Apache Kafka','Apache Flink','Apache Spark','dbt','Airflow','Prefect','Dagster'])} ${pick(VERBS_PASSIVE)} ${pick(['real-time data pipelines','batch ETL workflows','stream processing','data transformation','workflow orchestration'])} at ${pick(COMPANIES_TECH)}, processing ${rand(1,500)} TB of data per day.`,
      () => `Storing data in ${pick(DATA_FORMATS)} format instead of ${pick(['CSV','JSON','XML'])} reduces storage costs by ${rand(30,80)}% and improves query performance by ${rand(5,20)}x for ${pick(['analytical workloads','ML feature stores','data lake queries','BI dashboards','audit logs'])}.`,
      () => `The ${pick(['medallion architecture','lambda architecture','kappa architecture','data mesh','data fabric'])} pattern organizes data into ${pick(['bronze/silver/gold layers','raw/curated/serving zones','operational/analytical tiers','hot/warm/cold storage'])}, ${pick(CONNECTORS)} ${pick(['faster time-to-insight','better data quality','reduced duplication','clearer ownership','easier compliance'])}.`,
      () => `${pick(COMPANIES_TECH)} processes ${rand(1,100)} petabytes of data daily using a ${pick(['distributed','federated','streaming','batch','hybrid'])} pipeline built on ${pick(CLOUD_PROVIDERS)}, with ${pick(METRICS)} for data freshness.`,
    ];
    return { text: pick(templates)(), topic: 'DataEngineering' };
  },
};

// Weighted distribution: more entries for high-value domains
const DOMAIN_WEIGHTS = [
  { fn: generators.ai_definition,    weight: 14 },
  { fn: generators.ml_algorithm,     weight: 10 },
  { fn: generators.database,         weight: 10 },
  { fn: generators.cloud_devops,     weight: 9  },
  { fn: generators.programming,      weight: 9  },
  { fn: generators.networking_os,    weight: 7  },
  { fn: generators.security,         weight: 6  },
  { fn: generators.business,         weight: 9  },
  { fn: generators.finance,          weight: 7  },
  { fn: generators.social_internet,  weight: 8  },
  { fn: generators.general_knowledge,weight: 6  },
  { fn: generators.rag_search,       weight: 8  },
  { fn: generators.data_engineering, weight: 7  },
];

// Build cumulative weight table
const totalWeight = DOMAIN_WEIGHTS.reduce((s, d) => s + d.weight, 0);
const cumulative = [];
let cum = 0;
for (const d of DOMAIN_WEIGHTS) {
  cum += d.weight;
  cumulative.push({ fn: d.fn, threshold: cum / totalWeight });
}

function generateEntry() {
  const r = Math.random();
  for (const c of cumulative) {
    if (r <= c.threshold) return c.fn();
  }
  return cumulative[cumulative.length - 1].fn();
}

module.exports = { generateEntry };

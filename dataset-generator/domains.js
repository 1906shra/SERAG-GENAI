'use strict';

const { pick, pickN, rand, pct, yr, money } = require('./topics');

// ─── VOCABULARY POOLS ────────────────────────────────────────────────────────

const AI_MODELS = ['GPT-4','GPT-3.5','BERT','LLaMA 2','Claude 3','Gemini','Mistral','Falcon','PaLM 2','Stable Diffusion','DALL-E 3','Whisper','T5','RoBERTa','XLNet'];
const AI_CONCEPTS = ['transformer architecture','attention mechanism','fine-tuning','prompt engineering','retrieval-augmented generation','vector embeddings','semantic search','zero-shot learning','few-shot learning','chain-of-thought reasoning','reinforcement learning from human feedback','knowledge distillation','model quantization','neural architecture search','federated learning'];
const ML_ALGOS = ['gradient boosting','random forests','support vector machines','k-nearest neighbors','logistic regression','convolutional neural networks','recurrent neural networks','long short-term memory networks','autoencoders','generative adversarial networks','decision trees','naive Bayes classifiers','principal component analysis','k-means clustering','DBSCAN'];
const DB_SYSTEMS = ['PostgreSQL','MySQL','MongoDB','Redis','Cassandra','Elasticsearch','DynamoDB','CockroachDB','ClickHouse','Snowflake','BigQuery','Pinecone','Weaviate','Chroma','Qdrant'];
const CLOUD_PROVIDERS = ['AWS','Microsoft Azure','Google Cloud Platform','IBM Cloud','Oracle Cloud','Alibaba Cloud','DigitalOcean','Cloudflare','Vercel','Heroku'];
const PROGRAMMING_LANGS = ['Python','JavaScript','TypeScript','Rust','Go','Java','C++','Kotlin','Swift','Ruby','Scala','Elixir','Haskell','Julia','R'];
const FRAMEWORKS = ['React','Next.js','Vue.js','Angular','Django','FastAPI','Spring Boot','Express.js','Laravel','Rails','Flutter','TensorFlow','PyTorch','Keras','Hugging Face Transformers'];
const API_PROTOCOLS = ['REST','GraphQL','gRPC','WebSocket','MQTT','AMQP','OpenAPI','JSON-RPC','SOAP','Server-Sent Events'];
const COMPANIES_TECH = ['Google','Microsoft','Apple','Amazon','Meta','NVIDIA','OpenAI','Anthropic','Salesforce','Oracle','SAP','IBM','Intel','AMD','Qualcomm'];
const COMPANIES_FINANCE = ['JPMorgan Chase','Goldman Sachs','BlackRock','Visa','Mastercard','PayPal','Stripe','Square','Robinhood','Coinbase'];
const COMPANIES_STARTUP = ['Airbnb','Uber','Lyft','DoorDash','Instacart','Notion','Figma','Canva','Airtable','Linear','Vercel','Supabase','PlanetScale','Neon','Railway'];
const SOCIAL_PLATFORMS = ['Facebook','Instagram','Twitter/X','LinkedIn','TikTok','YouTube','Snapchat','Pinterest','Reddit','Discord','Telegram','WhatsApp','Slack','Twitch','Mastodon'];
const OS_SYSTEMS = ['Linux','Windows 11','macOS Ventura','Ubuntu','Debian','Fedora','Alpine Linux','FreeBSD','Android','iOS'];
const NETWORKING = ['TCP/IP','DNS','HTTP/2','HTTP/3','TLS 1.3','BGP','OSPF','VLAN','SDN','CDN','VPN','NAT','IPv6','QUIC','WebRTC'];
const SECURITY_CONCEPTS = ['zero-trust architecture','end-to-end encryption','OAuth 2.0','JWT authentication','SQL injection prevention','CSRF protection','rate limiting','DDoS mitigation','penetration testing','SIEM systems'];
const FINANCE_CONCEPTS = ['compound interest','dollar-cost averaging','portfolio diversification','market capitalization','price-to-earnings ratio','EBITDA','liquidity ratio','hedge funds','derivatives','yield curve'];
const BUSINESS_CONCEPTS = ['product-market fit','customer acquisition cost','lifetime value','churn rate','net promoter score','OKRs','agile methodology','lean startup','go-to-market strategy','unit economics'];
const CRM_TOOLS = ['Salesforce','HubSpot','Pipedrive','Zoho CRM','Microsoft Dynamics','Freshsales','Monday.com','Intercom','Zendesk','Drift'];
const DATA_FORMATS = ['JSON','Parquet','Avro','Protocol Buffers','MessagePack','CBOR','Arrow','ORC','CSV','XML'];
const DEVOPS_TOOLS = ['Docker','Kubernetes','Terraform','Ansible','Jenkins','GitHub Actions','ArgoCD','Prometheus','Grafana','Datadog'];
const METRICS = ['99.99% uptime','sub-100ms latency','10x throughput','50% cost reduction','3x faster inference','40% memory savings','2x developer productivity','90% accuracy','99.5% precision','85% recall'];

// ─── SENTENCE STRUCTURE VARIANTS ─────────────────────────────────────────────

const VERBS_ACTIVE = ['enables','supports','accelerates','reduces','improves','transforms','powers','simplifies','automates','optimizes','scales','integrates','processes','analyzes','generates'];
const VERBS_PASSIVE = ['is used to','was designed to','can be applied to','is optimized for','is widely adopted for','is known for','is built on','is deployed in','is trained on','is evaluated by'];
const CONNECTORS = ['which means','allowing developers to','making it possible to','thereby enabling','resulting in','which helps organizations','enabling teams to','so that engineers can','which reduces the need for','thus improving'];
const COMPARISONS = ['unlike traditional approaches','compared to earlier methods','in contrast to rule-based systems','whereas conventional solutions','as opposed to monolithic architectures','unlike its predecessors','compared to on-premise deployments','in contrast to batch processing'];

module.exports = {
  AI_MODELS, AI_CONCEPTS, ML_ALGOS, DB_SYSTEMS, CLOUD_PROVIDERS,
  PROGRAMMING_LANGS, FRAMEWORKS, API_PROTOCOLS, COMPANIES_TECH,
  COMPANIES_FINANCE, COMPANIES_STARTUP, SOCIAL_PLATFORMS, OS_SYSTEMS,
  NETWORKING, SECURITY_CONCEPTS, FINANCE_CONCEPTS, BUSINESS_CONCEPTS,
  CRM_TOOLS, DATA_FORMATS, DEVOPS_TOOLS, METRICS,
  VERBS_ACTIVE, VERBS_PASSIVE, CONNECTORS, COMPARISONS,
  pick, pickN, rand, pct, yr, money
};

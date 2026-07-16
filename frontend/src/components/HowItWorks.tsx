'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ExternalLink, ChevronDown, ChevronRight, Zap, Brain, Users, Sparkles, FileText, GitBranch } from 'lucide-react';
import EngineVisual from './EngineVisual';
import { getEngineStats } from '@/lib/api';
import { EngineStats } from '@/lib/types';

type Section = 'engine-1-transformer' | 'engine-2-vae' | 'engine-3-node2vec' | 'engine-4-ncf' | 'engine-5-ensemble' | 'engine-6-contrastive' | 'engine-7-qwen3' | 'engine-8-clap' | 'system-design';

interface Paper {
  title: string;
  authors: string;
  year: number;
  venue: string;
  summary: string;
  keyInsight: string;
  howWeUseIt: string;
  doi?: string;
}

const PAPERS: Record<string, Paper[]> = {
  'engine-1-transformer': [
    {
      title: 'Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks',
      authors: 'Reimers, N., Gurevych, I.',
      year: 2019,
      venue: 'EMNLP 2019',
      summary: 'Introduces Sentence-BERT, which modifies the BERT architecture with siamese and triplet networks to derive semantically meaningful sentence embeddings that can be compared using cosine similarity. Prior to S-BERT, finding similar sentences required feeding both into BERT simultaneously — computationally prohibitive for large collections. S-BERT reduces inference from 65 hours to ~5 seconds for 10,000 sentences.',
      keyInsight: 'By fine-tuning BERT with siamese networks on NLI data, we get dense embeddings where cosine similarity correlates with semantic similarity. Two sentences about heartbreak will be close in embedding space even if they share zero words.',
      howWeUseIt: 'We encode all 1,057 song lyrics (341 Taylor + 716 cross-artist) through all-MiniLM-L6-v2 into 384-dimensional vectors. Cosine similarity between vectors finds songs with similar MEANING — "All Too Well" matches Bon Iver\'s "Holocene" because both express nostalgic devastation, not because they share keywords.',
      doi: '10.18653/v1/D19-1410',
    },
  ],
  'engine-2-vae': [
    {
      title: 'Auto-Encoding Variational Bayes',
      authors: 'Kingma, D.P., Welling, M.',
      year: 2013,
      venue: 'ICLR 2014',
      summary: 'Introduces the Variational Autoencoder framework — a generative model that learns a compressed latent representation by jointly training an encoder (inference network) and decoder (generative network). The key innovation is the reparameterization trick that enables backpropagation through stochastic sampling. The loss combines reconstruction accuracy with KL divergence to regularize the latent space.',
      keyInsight: 'VAEs don\'t just compress — they learn a STRUCTURED latent space where nearby points decode to similar outputs. This means similarity in latent space captures deeper structural relationships than raw feature distance.',
      howWeUseIt: 'We train a VAE on 1,057 songs\' 384-dim lyrics embeddings (z-scored per dimension). The encoder compresses 384→128→64→16 dimensions (24:1 compression ratio), with β=0.1 and KL warm-up so the posterior does not collapse. The 16-dim latent space captures non-linear structure that cosine similarity on raw embeddings misses.',
    },
    {
      title: 'Hierarchical Variational Autoencoders for Music',
      authors: 'Roberts, A., Engel, J., Eck, D.',
      year: 2017,
      venue: 'NIPS 2017 Workshop on Machine Learning for Creativity and Design',
      summary: 'Applies hierarchical VAEs to symbolic music (note sequences), demonstrating that learned latent spaces capture musically meaningful dimensions and that latent-space interpolation produces musically coherent transitions. Extended in the ICML 2018 MusicVAE paper (Roberts, Engel, Raffel, Hawthorne, Eck).',
      keyInsight: 'Music has hierarchical structure — a VAE that respects this hierarchy learns latent dimensions that correspond to musical concepts like mood, energy, and narrative arc, not just surface features.',
      howWeUseIt: 'Inspiration only, not an implementation: unlike MusicVAE, our VAE is flat (non-hierarchical) and runs over whole-song lyric embeddings rather than note sequences. What we borrow is the idea that a VAE latent over songs is a useful similarity space for music.',
    },
  ],
  'engine-3-node2vec': [
    {
      title: 'node2vec: Scalable Feature Learning for Networks',
      authors: 'Grover, A., Leskovec, J.',
      year: 2016,
      venue: 'KDD 2016 — ACM SIGKDD International Conference on Knowledge Discovery and Data Mining',
      summary: 'Introduces node2vec, a framework for learning continuous feature representations for nodes in networks. The key innovation is biased random walks controlled by parameters p (return parameter) and q (in-out parameter) that interpolate between BFS-like (structural) and DFS-like (community) exploration. These walks are fed into a Skip-gram Word2Vec model to learn embeddings that preserve network neighborhood structure.',
      keyInsight: 'By controlling the random walk bias, you can learn embeddings that capture EITHER structural roles (songs that occupy similar positions in the graph) OR community membership (songs that belong to the same tightly-connected cluster). We use q=2 to favor structural similarity.',
      howWeUseIt: 'We build a sparse MULTI-ARTIST graph over all 1,057 songs (341 Taylor + 716 cross-artist): a lyric-similarity backbone (top-8 neighbours per song, ~7,300 edges) connects every artist, with audio-feature similarity and same-era edges among the Taylor songs and 141 hand-curated editorial-bridge edges linking Taylor directly to other artists. Node2Vec runs 15 second-order biased walks of length 40 per node with p=1, q=2, then trains skip-gram Word2Vec to learn 64-dim structural embeddings — so multi-hop paths (A→B→C) surface cross-artist neighbours, not just Taylor ones.',
      doi: '10.1145/2939672.2939754',
    },
  ],
  'engine-4-ncf': [
    {
      title: 'Neural Collaborative Filtering',
      authors: 'He, X., Liao, L., Zhang, H., Nie, L., Hu, X., Chua, T.-S.',
      year: 2017,
      venue: 'WWW 2017 — 26th International World Wide Web Conference',
      summary: 'Replaces the traditional matrix factorization inner product with a neural network that learns the interaction function between user and item embeddings. The MLP can model non-linear, complex interaction patterns that the simple dot product cannot capture. The paper demonstrates significant improvements over traditional collaborative filtering on benchmark datasets.',
      keyInsight: 'A learned neural interaction function captures complex compatibility patterns that linear methods miss. Two songs might be related through a combination of features that only a non-linear model can represent.',
      howWeUseIt: 'We adapt NCF\'s learned interaction function to song-song pairs — there are NO real users or listening histories here, so this is an adaptation of the paper\'s MLP branch, not an implementation of user-item NeuMF. 48-dim song embeddings are initialized from a PCA projection of combined features (384 lyrics + 9 z-scored audio = 393-dim). An MLP (96→48→1 with dropout) is trained on ~5,000 positive/negative pairs (1,655 pos / 3,310 neg) derived from lyrics similarity, audio feature matching, and editorial bridges.',
      doi: '10.1145/3038912.3052569',
    },
  ],
  'engine-5-ensemble': [
    {
      title: 'Hybrid Recommender Systems: Survey and Experiments',
      authors: 'Burke, R.',
      year: 2002,
      venue: 'User Modeling and User-Adapted Interaction, 12(4), pp. 331-370',
      summary: 'The definitive survey of hybrid recommendation approaches with over 4,300 citations. Burke identifies seven hybridization strategies. The paper demonstrates that hybrid systems consistently outperform any individual technique across all evaluation metrics.',
      keyInsight: 'No single recommendation technique is best for all scenarios. The art is in combining them — using each method\'s strengths to compensate for another\'s weaknesses.',
      howWeUseIt: 'The ensemble engine runs all 7 embedding engines at query time, merges results with weighted rank aggregation. Songs found by 3+ engines get a consensus boost. Enriched with editorial bridge explanations when available. Truly dynamic — every query produces fresh results.',
      doi: '10.1023/A:1021240730564',
    },
  ],
  'engine-6-contrastive': [
    {
      title: 'Contrastive Learning of Musical Representations',
      authors: 'Spijkervet, J., Burgoyne, J.A.',
      year: 2021,
      venue: 'ISMIR 2021 — International Society for Music Information Retrieval',
      summary: 'Introduces SimCLR to the music domain, operating on RAW AUDIO WAVEFORMS. Creates augmented views via a chain of polarity inversion, additive noise, gain, filtering, delay, pitch shift, and reverb, then trains a SampleCNN encoder plus projection head end-to-end with contrastive loss. Achieves competitive results on MagnaTagATune using only 1% of labeled data.',
      keyInsight: 'You don\'t need labels to learn music similarity. By teaching a model that two augmented versions of the same song should have similar representations, it learns what\'s ESSENTIAL about a song vs. what\'s surface noise.',
      howWeUseIt: 'Inspiration, not an implementation: CLMR is raw-audio contrastive learning, and this engine never touches audio. We transplant its idea — contrastive learning for music similarity — to lyrics TEXT: augmented views via 20% word dropout, line shuffle, and section-header removal, with a projection head (384→128→64) trained with NT-Xent loss (τ=0.07) on 1,057 songs\' lyric embeddings.',
    },
    {
      title: 'A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)',
      authors: 'Chen, T., Kornblith, S., Norouzi, M., Hinton, G.',
      year: 2020,
      venue: 'ICML 2020 — International Conference on Machine Learning',
      summary: 'The foundational contrastive learning framework. Shows that a simple combination of data augmentation, a learnable projection head, and the NT-Xent contrastive loss outperforms prior self-supervised methods by a large margin. Key finding: the projection head is critical — representations BEFORE the projection head transfer better than those after.',
      keyInsight: 'Contrastive learning discovers invariant features without human labels. The augmentations define what the model should be INVARIANT to — and therefore what dimensions of similarity it learns.',
      howWeUseIt: 'Our pipeline follows the SimCLR recipe with two deliberate deviations. First, the encoder (MiniLM) is FROZEN — only the projection head (Linear→BN→ReLU→Linear, the SimCLR design) is trained, with τ=0.07 and 100 epochs of NT-Xent on augmented lyric embeddings. Second, unlike SimCLR\'s transfer setup — whose key finding favors pre-projection features — we serve the POST-projection 64-dim space, because the pre-projection space is already served by Engine 1.',
    },
  ],
  'engine-7-qwen3': [
    {
      title: 'Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models',
      authors: 'Zhang, Y., Li, M., Long, D., Zhang, X., et al. (Qwen Team)',
      year: 2025,
      venue: 'arXiv:2506.05176',
      summary: 'Builds text-embedding models on the Qwen3 foundation-model family via large-scale multi-stage contrastive training with LLM-synthesized pairs, model merging, and instruction-aware inputs. The 0.6B variant tops the small-model band of the MTEB leaderboard while remaining Apache-2.0 licensed and runnable on a laptop. Uses decoder-style last-token pooling with a 32K-token context, and Matryoshka representation learning for flexible output dimensions.',
      keyInsight: 'Embedding quality did not stop at 2019: six years of encoder progress (bigger pretraining, contrastive fine-tuning at scale, long context) shows up directly as better semantic neighbors — and long context means the model reads the WHOLE song, not the first verse.',
      howWeUseIt: 'We encode the same 1,057-song corpus as Engine 1, but with full untruncated lyrics — MiniLM cuts off at 256 wordpieces (roughly the first verse and chorus), while Qwen3-Embedding-0.6B\'s 32K context reads every bridge and outro. 1024-dim vectors, plain cosine similarity at runtime. Running the 2019 and 2025 encoders side-by-side on identical data makes the encoder generation an observable variable.',
      doi: '10.48550/arXiv.2506.05176',
    },
  ],
  'engine-8-clap': [
    {
      title: 'Large-scale Contrastive Language-Audio Pretraining with Feature Fusion and Keyword-to-Caption Augmentation',
      authors: 'Wu, Y., Chen, K., Zhang, T., Hui, Y., Berg-Kirkpatrick, T., Dubnov, S.',
      year: 2023,
      venue: 'ICASSP 2023 — IEEE International Conference on Acoustics, Speech and Signal Processing',
      summary: 'CLAP trains an audio encoder (HTSAT) and a text encoder (RoBERTa) with a contrastive objective over large-scale audio-caption pairs, producing a JOINT embedding space where a sound clip and a text description of it land close together. Feature fusion lets it handle variable-length audio; keyword-to-caption augmentation expands noisy tag data into training captions.',
      keyInsight: 'Audio and language can share one geometry. In a joint audio-text space, "a melancholic acoustic ballad" is a VECTOR — and ranking songs against it is just cosine similarity, no classifier needed.',
      howWeUseIt: 'We embed each song\'s 30-second iTunes preview (48kHz mono, 10s windows, mean-pooled) with the music-specialized larger_clap_music checkpoint into 512-d unit vectors — the only engine that hears the recording instead of reading lyrics or metadata. The same joint space powers sound-mood search: each MoodRooms mood has a text prompt embedded offline, and at runtime a numpy dot product ranks every song\'s AUDIO against the mood\'s description. Songs without an available preview are skipped. Preview clips are never redistributed — only derived embeddings ship.',
      doi: '10.1109/ICASSP49357.2023.10095969',
    },
  ],
  'system-design': [
    {
      title: 'Hybrid Recommender Systems: Survey and Experiments',
      authors: 'Burke, R.',
      year: 2002,
      venue: 'User Modeling and User-Adapted Interaction, 12(4), pp. 331-370',
      summary: 'The definitive survey of hybrid recommendation approaches with over 4,300 citations. Burke identifies seven hybridization strategies. The paper demonstrates that hybrid systems consistently outperform any individual technique across all evaluation metrics.',
      keyInsight: 'No single recommendation technique is best for all scenarios. The art is in combining them — using each method\'s strengths to compensate for another\'s weaknesses.',
      howWeUseIt: 'The Shubz-Taylor engine runs all 8 engines on the same seed songs and presents results side-by-side. Users can see how different ML techniques produce different recommendations from the same input — making the system both a recommendation tool and an educational platform.',
      doi: '10.1023/A:1021240730564',
    },
    {
      title: 'Evaluating Collaborative Filtering Recommender Systems',
      authors: 'Herlocker, J.L., Konstan, J.A., Terveen, L.G., Riedl, J.T.',
      year: 2004,
      venue: 'ACM Transactions on Information Systems, 22(1)',
      summary: 'Establishes the evaluation framework for recommendation systems. Introduces accuracy metrics alongside user-centric metrics (novelty, serendipity, coverage, diversity). Argues that accuracy alone is insufficient.',
      keyInsight: 'A recommendation system that only suggests things you already know is technically accurate but practically worthless. Serendipity — the delightful surprise — is what separates good recommendations from great ones.',
      howWeUseIt: 'Our "Compare All Engines" mode lets users see which engines agree and which disagree — songs found by 5+ of the 8 engines are strong matches, while songs found by only 1 engine represent the serendipitous discoveries that single-technique systems would miss. One honest caveat: displayed lists are similarity-weighted samples (temperature 0.25) with a cross-artist quota, not raw top-K rankings, so lists vary between queries.',
      doi: '10.1145/963770.963772',
    },
  ],
};

// Mind map node component
function MindMapNode({ label, color, x, y, children, delay = 0 }: {
  label: string; color: string; x: number; y: number; children?: string[]; delay?: number;
}) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
    >
      <circle cx={x} cy={y} r={35} fill={`${color}10`} stroke={`${color}40`} strokeWidth={1.5} />
      <text x={x} y={y + 4} fill={color} fontSize={9} fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">
        {label}
      </text>
      {children?.map((child, i) => {
        const angle = ((i - (children.length - 1) / 2) * 0.6) + Math.atan2(y - 200, x - 350);
        const cx = x + Math.cos(angle) * 90;
        const cy = y + Math.sin(angle) * 90;
        return (
          <g key={child}>
            <line x1={x + Math.cos(angle) * 35} y1={y + Math.sin(angle) * 35}
              x2={cx - Math.cos(angle) * 22} y2={cy - Math.sin(angle) * 22}
              stroke={`${color}20`} strokeWidth={1} />
            <circle cx={cx} cy={cy} r={22} fill={`${color}08`} stroke={`${color}20`} strokeWidth={1} />
            <text x={cx} y={cy + 3} fill={`${color}80`} fontSize={7} fontFamily="Inter, sans-serif" textAnchor="middle">
              {child}
            </text>
          </g>
        );
      })}
    </motion.g>
  );
}

// Architecture mind map
function ArchitectureMindMap() {
  return (
    <div className="glass rounded-2xl p-6 overflow-hidden">
      <svg viewBox="0 0 700 480" className="w-full">
        {/* Center node */}
        <MindMapNode label="8-Engine System" color="#D4AF37" x={350} y={225}
          children={[]} delay={0} />

        {/* Transformer Lyrics branch — top-left */}
        <MindMapNode label="Transformer Lyrics" color="#E53E3E" x={140} y={100}
          children={['MiniLM Embeddings', '384-dim Vectors', 'Cross-Artist']} delay={0.1} />
        <line x1={315} y1={210} x2={175} y2={115} stroke="rgba(229,62,62,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Qwen3 branch — top-center */}
        <MindMapNode label="Qwen3 Embeddings" color="#38B2AC" x={350} y={60}
          children={['Full Lyrics', '1024-dim', '2025 Encoder']} delay={0.15} />
        <line x1={350} y1={190} x2={350} y2={95} stroke="rgba(56,178,172,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* VAE Latent branch — top-right */}
        <MindMapNode label="VAE Latent" color="#9F7AEA" x={560} y={100}
          children={['24:1 Compression', 'Latent Space', 'Non-linear']} delay={0.2} />
        <line x1={385} y1={210} x2={525} y2={115} stroke="rgba(159,122,234,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Graph Node2Vec branch — bottom-left */}
        <MindMapNode label="Graph Node2Vec" color="#48BB78" x={140} y={350}
          children={['p=1 q=2 Walks', 'Skip-gram', '64-dim']} delay={0.3} />
        <line x1={315} y1={240} x2={175} y2={335} stroke="rgba(72,187,120,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Contrastive branch — mid-right */}
        <MindMapNode label="Contrastive SSL" color="#F687B3" x={620} y={225}
          children={['NT-Xent', 'Augmented Views']} delay={0.35} />
        <line x1={385} y1={225} x2={585} y2={225} stroke="rgba(246,135,179,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Neural Collab branch — bottom-right */}
        <MindMapNode label="Neural Collab" color="#5B9BD5" x={560} y={350}
          children={['Multi-modal', 'MLP Training', '48-dim']} delay={0.4} />
        <line x1={385} y1={240} x2={525} y2={335} stroke="rgba(91,155,213,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* CLAP Audio branch — mid-left */}
        <MindMapNode label="CLAP Audio" color="#ECC94B" x={80} y={225}
          children={['Hears Audio', '512-dim Joint']} delay={0.45} />
        <line x1={315} y1={225} x2={115} y2={225} stroke="rgba(236,201,75,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Ensemble branch — bottom-center */}
        <MindMapNode label="Hybrid Ensemble" color="#ED8936" x={350} y={410}
          children={['All 7 Embeddings', 'Rank Fusion', 'Consensus']} delay={0.5} />
        <line x1={350} y1={260} x2={350} y2={375} stroke="rgba(237,137,54,0.15)" strokeWidth={1} strokeDasharray="4 4" />
      </svg>
    </div>
  );
}

// Paper card
function PaperCard({ paper, index }: { paper: Paper; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          <FileText size={16} className="text-[#D4AF37]/40 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white/80 leading-snug">{paper.title}</h4>
            <p className="text-xs text-white/30 mt-1">{paper.authors} ({paper.year})</p>
            <p className="text-[11px] text-white/20 italic">{paper.venue}</p>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            className="text-white/20 flex-shrink-0"
          >
            <ChevronRight size={16} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
              {/* Summary */}
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-1">Summary</p>
                <p className="text-xs text-white/50 leading-relaxed">{paper.summary}</p>
              </div>

              {/* Key insight */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37]/50 mb-1">Key Insight</p>
                <p className="text-xs text-[#D4AF37]/70 leading-relaxed italic">&ldquo;{paper.keyInsight}&rdquo;</p>
              </div>

              {/* How we use it */}
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-1">How We Use This</p>
                <p className="text-xs text-white/50 leading-relaxed">{paper.howWeUseIt}</p>
              </div>

              {/* DOI link */}
              {paper.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/40 transition-colors"
                >
                  <ExternalLink size={10} />
                  DOI: {paper.doi}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Section component
function ResearchSection({ id, title, icon, color, description, papers }: {
  id: string; title: string; icon: React.ReactNode; color: string;
  description: string; papers: Paper[];
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      className="mb-16"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <h3 className="font-display text-2xl text-white/80">{title}</h3>
      </div>
      <p className="text-sm text-white/35 leading-relaxed mb-6 max-w-2xl">{description}</p>

      <div className="space-y-3">
        {papers.map((paper, i) => (
          <PaperCard key={paper.title} paper={paper} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

// Engine stats section
function EngineStatsSection() {
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    getEngineStats().then(data => { if (data) setStats(data); });
  }, []);

  if (!stats) return null;

  const statCards = [
    { value: stats.catalog_size.toString(), label: 'Total Catalog', suffix: ' songs' },
    { value: stats.songs_with_features.toString(), label: 'With Audio Features' },
    { value: stats.songs_with_lyrics.toString(), label: 'With Lyrics' },
    { value: '1,057', label: 'Total Embeddings (Taylor + Cross-Artist)' },
    { value: stats.editorial_bridge_count.toString(), label: 'Editorial Bridges' },
    { value: stats.unique_bridge_artists.toString(), label: 'Cross-Artist Connections' },
    { value: '8', label: 'ML Engines' },
    { value: '46', label: 'Artists Scraped' },
  ];

  const featureKeys = Object.keys(stats.feature_distributions || {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55 }}
      className="mb-16"
    >
      <h2 className="font-display text-xl text-white/60 mb-4">Engine at a Glance</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="glass rounded-xl p-4 text-center">
            <p className="text-[#D4AF37] text-2xl font-display font-bold">
              {card.value}{card.suffix && <span className="text-base font-normal">{card.suffix}</span>}
            </p>
            <p className="text-white/30 text-[11px] mt-1 leading-snug">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Feature distributions */}
      {featureKeys.length > 0 && (
        <div className="glass rounded-xl p-5 mb-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-3">Feature Distributions (mean +/- std)</p>
          <div className="space-y-2">
            {featureKeys.map((key) => {
              const dist = stats.feature_distributions[key];
              const meanPct = dist.mean * 100;
              const stdPct = dist.std * 100;
              const leftPct = Math.max(0, meanPct - stdPct);
              const widthPct = Math.min(100 - leftPct, stdPct * 2);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 w-28 text-right truncate capitalize">{key}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                    {/* Std range */}
                    <div
                      className="absolute h-full bg-[#D4AF37]/15 rounded-full"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                    {/* Mean marker */}
                    <div
                      className="absolute h-full w-0.5 bg-[#D4AF37]/70 rounded-full"
                      style={{ left: `${meanPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-white/20 font-mono w-20">{dist.mean.toFixed(3)} +/- {dist.std.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Honest note */}
      <div className="glass rounded-xl p-4">
        <p className="text-[10px] text-white/25 leading-relaxed italic">
          These are descriptive statistics of our dataset, not offline evaluation metrics like precision@k. A full evaluation would require a user study with ground-truth relevance judgments.
        </p>
      </div>
    </motion.div>
  );
}

// Main component
export default function HowItWorks({ onBack }: { onBack: () => void }) {
  const [showEngine, setShowEngine] = useState(true);

  const sections: { id: Section; title: string; icon: React.ReactNode; color: string; description: string }[] = [
    {
      id: 'engine-1-transformer',
      title: 'Engine 1: Transformer Semantic Lyrics',
      icon: <Zap size={18} />,
      color: '#E53E3E',
      description: 'Encodes 1,057 song lyrics into 384-dimensional semantic vectors using Sentence-BERT (all-MiniLM-L6-v2). Finds songs with similar meaning across 81 artists — "All Too Well" matches Bon Iver\'s "Holocene" because both express nostalgic devastation, not because they share words.',
    },
    {
      id: 'engine-2-vae',
      title: 'Engine 2: Variational Autoencoder',
      icon: <Brain size={18} />,
      color: '#9F7AEA',
      description: 'Compresses 384-dim BERT embeddings into a 16-dimensional latent space (24:1 ratio) using a trained VAE with reparameterization trick. The learned latent space captures non-linear structure — songs cluster by emotional arc and narrative pattern, not just vocabulary overlap.',
    },
    {
      id: 'engine-3-node2vec',
      title: 'Engine 3: Graph Node2Vec',
      icon: <GitBranch size={18} />,
      color: '#48BB78',
      description: 'Builds a sparse MULTI-ARTIST graph over all 1,057 songs — a lyric-similarity backbone connecting every artist, plus audio, era, and 141 editorial-bridge edges. Runs second-order biased random walks (p=1, q=2) and trains skip-gram Word2Vec to learn 64-dim structural embeddings that surface cross-artist neighbours via multi-hop paths.',
    },
    {
      id: 'engine-4-ncf',
      title: 'Engine 4: Neural Collaborative Filtering',
      icon: <Users size={18} />,
      color: '#5B9BD5',
      description: 'Adapts NCF\'s MLP interaction function to song-song pairs (no real users or listening data). An MLP (96→48→1) trains on ~5,000 synthetic pairs derived from lyrics similarity + audio features + editorial bridges; 48-dim embeddings are PCA-initialized from 393-dim multi-modal features.',
    },
    {
      id: 'engine-5-ensemble',
      title: 'Engine 5: Hybrid Ensemble',
      icon: <BookOpen size={18} />,
      color: '#ED8936',
      description: 'Runs all 7 embedding engines at query time with weighted rank aggregation. Songs found by 3+ engines get a consensus boost. Enriched with editorial bridge explanations when available. Truly dynamic — every query produces fresh results.',
    },
    {
      id: 'engine-6-contrastive',
      title: 'Engine 6: Contrastive Self-Supervised Learning',
      icon: <Zap size={18} />,
      color: '#F687B3',
      description: 'Applies the SimCLR (2020) recipe to lyrics over a frozen MiniLM encoder (CLMR, 2021, is raw-audio inspiration): creates augmented views via word dropout, line shuffle, and section removal, then trains a projection head (384→128→64) with NT-Xent InfoNCE loss. Learns representations robust to word dropout and line reordering.',
    },
    {
      id: 'engine-7-qwen3',
      title: 'Engine 7: Qwen3 Modern Embeddings',
      icon: <Zap size={18} />,
      color: '#38B2AC',
      description: 'Encodes the same 1,057-song corpus as Engine 1 with a 2025-era 0.6B-parameter embedding model (Qwen3-Embedding-0.6B, Apache 2.0). Its 32K-token context reads full lyrics — MiniLM truncates at 256 wordpieces — and produces 1024-dim vectors. A six-year encoder ablation, live in the UI.',
    },
    {
      id: 'engine-8-clap',
      title: 'Engine 8: CLAP Audio',
      icon: <Zap size={18} />,
      color: '#ECC94B',
      description: 'The only engine that listens: CLAP (laion/larger_clap_music, Apache 2.0) embeds each 30-second preview into a 512-dim joint audio-text space. Song-to-song sound similarity, plus mood search where text prompts score directly against the audio. Covers songs with an available iTunes preview.',
    },
    {
      id: 'system-design',
      title: 'System Design & Evaluation',
      icon: <Sparkles size={18} />,
      color: '#D4AF37',
      description: 'The seven embedding engines pre-compute vectors offline (the ensemble aggregates them at query time). At runtime, each query costs <10ms of numpy similarity. The "Compare All Engines" mode runs every engine on the same seed and presents results side-by-side, turning the system into both a recommendation tool and an educational platform.',
    },
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto">
      <div className="min-h-screen px-6 md:px-12 pt-20 pb-24 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-4xl md:text-5xl text-white/80 mb-2">How It Works</h1>
          <p className="text-white/30 text-sm tracking-wider max-w-xl">
            The science behind the recommendations. Every technique grounded in peer-reviewed research.
          </p>
        </motion.div>

        {/* Engine visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <EngineVisual onClick={() => setShowEngine(!showEngine)} />
        </motion.div>

        {/* Architecture mind map */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="font-display text-xl text-white/60 mb-4">System Architecture</h2>
          <ArchitectureMindMap />
        </motion.div>

        {/* Pipeline explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="font-display text-xl text-white/60 mb-4">The Pipeline</h2>
          <div className="glass rounded-xl p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {[
                { step: '1', title: 'Data Collection', desc: '1,057 songs: 341 Taylor (CSV + Spotify), 716 cross-artist (Genius + tokenless iTunes/lyrics.ovh), 323 with audio features', color: '#E53E3E' },
                { step: '2', title: 'Pre-compute', desc: '7 ML models trained offline: MiniLM + Qwen3 lyric encoding, CLAP audio encoding, VAE (300 epochs), node2vec walks + Word2Vec, NCF MLP (200 epochs), contrastive head (100 epochs)', color: '#9F7AEA' },
                { step: '3', title: 'Embedding Storage', desc: 'Pre-computed vectors saved as .npy files. Total: ~5MB. No GPU needed at runtime.', color: '#48BB78' },
                { step: '4', title: 'Query Processing', desc: 'User selects seed songs → each engine computes similarity in its embedding space → results ranked and interleaved → <10ms per engine', color: '#5B9BD5' },
                { step: '5', title: 'Presentation', desc: 'Results displayed with per-engine explanations, feature breakdowns, overlap badges, and export', color: '#D4AF37' },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  className="flex-1 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold"
                    style={{ background: `${s.color}20`, color: s.color }}>
                    {s.step}
                  </div>
                  <p className="text-xs font-medium text-white/60 mb-1">{s.title}</p>
                  <p className="text-[10px] text-white/25 leading-relaxed">{s.desc}</p>
                  {i < 4 && <div className="hidden md:block text-white/10 mt-2">→</div>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* The math */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="font-display text-xl text-white/60 mb-4">The Math</h2>
          <div className="glass rounded-xl p-6 space-y-4">
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#E53E3E]/50 mb-2">Engine 1 — Cosine Similarity on BERT Embeddings</p>
              <div className="font-mono text-sm text-[#E53E3E]/60 bg-black/30 rounded-lg p-4 overflow-x-auto">
                sim(a, b) = (emb_a · emb_b) / (||emb_a|| × ||emb_b||)
              </div>
              <p className="text-xs text-white/30 mt-2 leading-relaxed">
                Where emb_a and emb_b are 384-dimensional Sentence-BERT embeddings. Cosine similarity measures semantic angle — 1.0 means identical meaning, 0 means orthogonal.
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#9F7AEA]/50 mb-2">Engine 2 — VAE Loss</p>
              <div className="font-mono text-xs text-[#9F7AEA]/60 bg-black/30 rounded-lg p-4 overflow-x-auto">
                {'L = ||x - x̂||² + β × KL(q(z|x) || p(z))'}<br />
                {'  = reconstruction_loss + β × (-0.5 × Σ(1 + log(σ²) - μ² - σ²))'}<br />
                {'β = 0.1, annealed 0 → 0.1 over the first 50 epochs (KL warm-up against posterior collapse)'}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#48BB78]/50 mb-2">Engine 3 — Node2Vec Objective</p>
              <div className="font-mono text-xs text-[#48BB78]/60 bg-black/30 rounded-lg p-4 overflow-x-auto">
                {'maximize Σ_u log P(N_S(u) | f(u))'}<br />
                {'where N_S(u) = neighborhood from biased random walks'}<br />
                {'f(u) = 64-dim embedding of node u'}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#5B9BD5]/50 mb-2">Engine 4 — NCF</p>
              <div className="font-mono text-xs text-[#5B9BD5]/60 bg-black/30 rounded-lg p-4 overflow-x-auto">
                {'ŷ_ij = σ(W₂ · ReLU(W₁ · [e_i ⊕ e_j] + b₁) + b₂)'}<br />
                {'L = -Σ(y_ij · log(ŷ_ij) + (1-y_ij) · log(1-ŷ_ij))'}<br />
                {'y_ij ∈ {0, 0.8, 1.0} — graded interaction strength (lyrics/bridges = 1.0, audio = 0.8, negatives = 0)'}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#ED8936]/50 mb-2">Engine 5 — Hybrid Ensemble Rank Aggregation</p>
              <div className="font-mono text-xs text-[#ED8936]/60 bg-black/30 rounded-lg p-4 overflow-x-auto">
                {'score(s) = Σ_e w_e × (1 − rank_e(s)/N_e);  if found by ≥3 engines: score ×= 1.3'}<br />
                {'w = [0.22 lyrics, 0.22 qwen3, 0.12 audio, 0.12 vae, 0.12 contrastive, 0.10 graph, 0.10 ncf]'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Engine stats */}
        <EngineStatsSection />

        {/* Research sections */}
        <div className="mb-8">
          <h2 className="font-display text-2xl text-white/60 mb-2">The Research</h2>
          <p className="text-sm text-white/25 mb-8">Each technique is grounded in peer-reviewed literature. Click any paper to expand.</p>
        </div>

        {sections.map(section => (
          <ResearchSection
            key={section.id}
            id={section.id}
            title={section.title}
            icon={section.icon}
            color={section.color}
            description={section.description}
            papers={PAPERS[section.id] || []}
          />
        ))}

        {/* Citation block */}
        <motion.div
          className="glass rounded-xl p-6 mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-3">Cite This Project</p>
          <div className="font-mono text-xs text-white/30 bg-black/30 rounded-lg p-4 leading-relaxed">
            The Shubz-Taylor Recommendation Engine (2026). A hybrid music recommendation system combining content-based filtering, an NCF-style neural pair model over synthetic interactions, and hand-curated editorial knowledge. Built with FastAPI, Next.js, React Three Fiber, and the Spotify Web API.
          </div>
        </motion.div>
      </div>
    </div>
  );
}

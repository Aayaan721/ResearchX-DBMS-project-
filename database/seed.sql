-- ============================================================================
-- ResearchX — Relational Seed Data
-- ============================================================================

-- 1. Roles
INSERT INTO role (role_id, role_name) VALUES
    (1, 'Admin'),
    (2, 'Student'),
    (3, 'Faculty')
ON CONFLICT (role_id) DO NOTHING;

-- 2. Users (Students, Faculty, Admin)
INSERT INTO app_user (user_id, username, password_hash, full_name, email, role_id) VALUES
    (1, 'admin_researchx', '$2a$12$e6xU.5n7u2rGzU/ResearchXAdminHashedPasswordDummy', 'Platform Administrator', 'admin@researchx.edu', 1),
    (2, 'aayaan_s', '$2a$12$k8yP.7m3v9qTaV/AayaanStudentHashedPasswordDummy', 'Aayaan S', 'aayaan@researchx.edu', 2),
    (3, 'priya_k', '$2a$12$p9wQ.8n4w0rUbW/PriyaStudentHashedPasswordDummy', 'Priya Kulkarni', 'priya@researchx.edu', 2),
    (4, 'dr_shilpa', '$2a$12$f5xR.6o2u1rTaV/DrShilpaFacultyHashedPasswordDummy', 'Dr. Shilpa S', 'shilpa.s@researchx.edu', 3),
    (5, 'prof_sandesh', '$2a$12$h7zS.4p5v3sUbW/ProfSandeshFacultyHashedPasswordDummy', 'Prof. Sandesh B J', 'sandesh.bj@researchx.edu', 3)
ON CONFLICT (user_id) DO NOTHING;

SELECT setval('app_user_user_id_seq', (SELECT MAX(user_id) FROM app_user));

-- 3. Research Domains
INSERT INTO domain (domain_id, domain_name, description) VALUES
    (1, 'Artificial Intelligence & Machine Learning', 'Core deep learning architectures, representation learning, and neural network optimization.'),
    (2, 'Natural Language Processing & LLMs', 'Text processing, sequence-to-sequence models, information extraction, and retrieval augmented generation.'),
    (3, 'Database Systems & Vector Retrieval', 'Relational database engines, nearest-neighbor indexing, query optimization, and storage management.'),
    (4, 'Computer Vision & Multimodal AI', 'Image classification, object detection, segmentation, and vision-language foundation models.'),
    (5, 'Cybersecurity & Data Privacy', 'Cryptographic protocols, differential privacy, access control mechanisms, and threat intelligence.'),
    (6, 'Cloud & Distributed Systems', 'Distributed consensus, fault tolerance, microservice architectures, and elastic resource allocation.')
ON CONFLICT (domain_id) DO NOTHING;

SELECT setval('domain_domain_id_seq', (SELECT MAX(domain_id) FROM domain));

-- 4. Projects
INSERT INTO project (project_id, student_id, title, problem_statement, description, status, approved_by) VALUES
    (1, 2, 'ResearchX: Intelligent Research Discovery & Project Similarity Platform', 
     'Students often struggle to locate related academic papers and avoid duplicate project topics. Relational keyword search fails to capture semantic meaning across varying terminologies.',
     'A unified platform combining PostgreSQL relational data integrity with pgvector semantic similarity embeddings to discover related student projects and academic literature from OpenAlex.',
     'Approved', 4),

    (2, 3, 'BioMedQA: Clinical Question Answering Using Dense Passage Retrieval',
     'Clinical clinicians require instant, evidence-backed answers from vast biomedical literature where traditional lexical search fails on synonyms and medical acronyms.',
     'Implements dense passage retrieval fine-tuned on PubMed abstracts to retrieve top medical excerpts and synthesize concise clinical recommendations.',
     'Approved', 4),

    (3, 2, 'EdgeVision: Low-Power Object Detection on Microcontrollers',
     'Deploying real-time object detection models on edge devices is severely constrained by memory, battery life, and computational capacity.',
     'Applies 8-bit post-training quantization and depthwise separable convolutions to run YOLO-style detectors on ARM Cortex-M microcontrollers with sub-50ms latency.',
     'Pending', NULL),

    (4, 3, 'PrivacyGuard: Differential Privacy in Collaborative Federated Learning',
     'Distributed model training across healthcare institutions risks leakage of sensitive patient records through gradient inversion attacks.',
     'Develops a client-side differential privacy noise injection scheme with secure gradient aggregation, proving bounded privacy budgets without degrading model accuracy.',
     'Pending', NULL),

    (5, 2, 'GraphDB-Scale: Distributed Graph Processing Engine for Citation Networks',
     'Graph traversal algorithms on billion-edge citation networks suffer from high network shuffle overhead and memory exhaustion on single-node servers.',
     'Designs a vertex-cut partitioning strategy and asynchronous message passing engine in Rust for fast PageRank and community detection on academic citation graphs.',
     'Approved', 5),

    (6, 3, 'CodeSummarizer: Neural Code Understanding and Documentation Generation',
     'Developers spend excessive time comprehending legacy codebases that lack up-to-date documentation and functional summaries.',
     'Explores lightweight sequence-to-sequence transformer models to automatically produce natural language docstrings for Python and TypeScript functions.',
     'Rejected', 5)
ON CONFLICT (project_id) DO NOTHING;

SELECT setval('project_project_id_seq', (SELECT MAX(project_id) FROM project));

-- 5. Project Domain Mappings
INSERT INTO project_domain (project_id, domain_id) VALUES
    (1, 1), (1, 3),
    (2, 1), (2, 2),
    (3, 1), (3, 4),
    (4, 1), (4, 5),
    (5, 3), (5, 6),
    (6, 1), (6, 2)
ON CONFLICT (project_id, domain_id) DO NOTHING;

-- 6. Research Papers (Academic benchmarks & external research)
INSERT INTO research_paper (paper_id, openalex_id, title, abstract, keywords, doi, file_url, published_in, year, cited_by_count) VALUES
    (1, 'W2963403868', 'Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks',
     'BERT and RoBERTa have set state-of-the-art performance on NLP tasks but require excessive inference time. We present Sentence-BERT (SBERT), a modification of the pretrained BERT network that uses siamese and triplet network structures to derive semantically meaningful sentence embeddings that can be compared using cosine similarity.',
     'sentence embeddings, siamese networks, cosine similarity, semantic search',
     '10.18653/v1/D19-1410', 'https://aclanthology.org/D19-1410.pdf', 'EMNLP 2019', 2019, 7850),

    (2, 'W3093259838', 'Dense Passage Retrieval for Open-Domain Question Answering',
     'Open-domain question answering relies on efficient passage retrieval to select candidate contexts. We show that retrieval can be practically implemented using dense representations, where embeddings are learned from a small number of passages using a simple dual-encoder framework.',
     'dense passage retrieval, question answering, dual encoder, dense representations',
     '10.18653/v1/2020.emnlp-main.550', 'https://aclanthology.org/2020.emnlp-main.550.pdf', 'EMNLP 2020', 2020, 2450),

    (3, 'W2890695027', 'Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs',
     'Approximate nearest neighbor search on high-dimensional vectors is crucial for modern similarity search. We present the Hierarchical Navigable Small World (HNSW) graph technique, which provides logarithmic scaling search complexity and high robustness across diverse distance metrics.',
     'HNSW, approximate nearest neighbor, vector index, graph traversal',
     '10.1109/TPAMI.2018.2889473', 'https://ieeexplore.ieee.org/document/8594636', 'IEEE TPAMI', 2020, 3100),

    (4, 'W3015409218', 'Federated Learning: Challenges, Methods, and Future Directions',
     'Federated learning enables distributed edge devices to collaboratively train a shared prediction model while keeping all training data local. We survey fundamental challenges, communication bottlenecks, and privacy-preserving techniques including differential privacy.',
     'federated learning, differential privacy, privacy preserving, distributed training',
     '10.1109/MSP.2020.2975749', 'https://ieeexplore.ieee.org/document/9084352', 'IEEE Signal Processing', 2020, 1890),

    (5, 'W2621742445', 'Attention Is All You Need',
     'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism to draw global dependencies between input and output.',
     'transformer, attention mechanism, deep learning, sequence modeling',
     '10.48550/arXiv.1706.03762', 'https://arxiv.org/abs/1706.03762', 'NeurIPS 2017', 2017, 112000)
ON CONFLICT (paper_id) DO NOTHING;

SELECT setval('research_paper_paper_id_seq', (SELECT MAX(paper_id) FROM research_paper));

-- 7. Authors
INSERT INTO author (author_id, name, affiliation, email) VALUES
    (1, 'Nils Reimers', 'Ubiquitous Knowledge Processing Lab, TU Darmstadt', 'reimers@ukp.informatik.tu-darmstadt.de'),
    (2, 'Iryna Gurevych', 'Ubiquitous Knowledge Processing Lab, TU Darmstadt', 'gurevych@ukp.informatik.tu-darmstadt.de'),
    (3, 'Vladimir Karpukhin', 'Facebook AI Research', 'karpukhin@meta.com'),
    (4, 'Barlas Oguz', 'Facebook AI Research', 'barlaso@meta.com'),
    (5, 'Yury Malkov', 'Institute of Applied Physics RAS', 'yury.malkov@gmail.com'),
    (6, 'Dmitry Yashunin', 'Avito Research', 'yashunin@avito.ru'),
    (7, 'Ashish Vaswani', 'Google Brain', 'avaswani@google.com'),
    (8, 'Noam Shazeer', 'Google Brain', 'noam@google.com')
ON CONFLICT (author_id) DO NOTHING;

SELECT setval('author_author_id_seq', (SELECT MAX(author_id) FROM author));

-- 8. Paper Author Mappings
INSERT INTO paper_author (paper_id, author_id, author_order) VALUES
    (1, 1, 1),
    (1, 2, 2),
    (2, 3, 1),
    (2, 4, 2),
    (3, 5, 1),
    (3, 6, 2),
    (5, 7, 1),
    (5, 8, 2)
ON CONFLICT (paper_id, author_id) DO NOTHING;

-- 9. Project Reviews
INSERT INTO project_review (review_id, project_id, faculty_id, decision, comments, review_date) VALUES
    (1, 1, 4, 'Approved', 'Strong relational schema with pgvector integration. Approved for implementation.', NOW() - INTERVAL '5 days'),
    (2, 2, 4, 'Approved', 'Clear biomedical retrieval methodology. Approved for pilot evaluation.', NOW() - INTERVAL '3 days'),
    (3, 5, 5, 'Approved', 'Partitioning scheme looks mathematically sound. Approved.', NOW() - INTERVAL '2 days'),
    (4, 6, 5, 'Rejected', 'Insufficient novelty in code docstring synthesis. Expand to multi-language translation.', NOW() - INTERVAL '1 day')
ON CONFLICT (review_id) DO NOTHING;

SELECT setval('project_review_review_id_seq', (SELECT MAX(review_id) FROM project_review));

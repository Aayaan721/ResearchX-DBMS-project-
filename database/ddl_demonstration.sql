-- Safe, executable CREATE / ALTER / DROP demonstration.
-- All demonstration objects are temporary and rolled back; user tables are untouched.
BEGIN;
CREATE TEMP TABLE ddl_parent (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE CHECK(btrim(name)<>''));
CREATE TEMP TABLE ddl_child (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES ddl_parent(id));
ALTER TABLE ddl_child ADD COLUMN explanation TEXT NOT NULL DEFAULT 'Level 3 DDL demonstration';
CREATE INDEX ddl_child_parent ON ddl_child(parent_id);
CREATE TEMP VIEW ddl_relationship AS SELECT c.id,p.name,c.explanation FROM ddl_child c JOIN ddl_parent p ON p.id=c.parent_id;
INSERT INTO ddl_parent VALUES(1,'Research domain');
INSERT INTO ddl_child(id,parent_id) VALUES(1,1);
SELECT * FROM ddl_relationship;
DROP VIEW ddl_relationship;
DROP TABLE ddl_child;
DROP TABLE ddl_parent;
ROLLBACK;
-- Useful permanent views installed by the additive migration:
SELECT * FROM v_project_overview ORDER BY project_id;
SELECT * FROM v_domain_statistics ORDER BY domain_id;

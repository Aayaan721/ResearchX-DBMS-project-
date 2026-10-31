import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statsResult = await query('SELECT * FROM fn_get_platform_stats()');
    const stats = statsResult.rows[0] || {};

    const domainsResult = await query(`
      SELECT 
        d.domain_id,
        d.domain_name,
        d.description,
        COUNT(pd.project_id) AS project_count
      FROM domain d
      LEFT JOIN project_domain pd ON d.domain_id = pd.domain_id
      GROUP BY d.domain_id, d.domain_name, d.description
      ORDER BY project_count DESC, d.domain_name ASC
    `);

    const recentAudit = await query(`
      SELECT log_id, table_name, action, record_id, old_values, new_values, changed_at
      FROM audit_log
      ORDER BY changed_at DESC
      LIMIT 5
    `);

    return NextResponse.json({
      stats: {
        total_projects: parseInt(stats.total_projects || '0', 10),
        approved_projects: parseInt(stats.approved_projects || '0', 10),
        pending_projects: parseInt(stats.pending_projects || '0', 10),
        rejected_projects: parseInt(stats.rejected_projects || '0', 10),
        total_papers: parseInt(stats.total_papers || '0', 10),
        total_authors: parseInt(stats.total_authors || '0', 10),
        total_embeddings: parseInt(stats.total_embeddings || '0', 10),
      },
      domains: domainsResult.rows.map((d) => ({
        ...d,
        project_count: parseInt(d.project_count, 10),
      })),
      recentAudit: recentAudit.rows,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch platform stats' }, { status: 500 });
  }
}

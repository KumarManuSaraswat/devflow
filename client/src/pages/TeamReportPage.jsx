import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import usePollingResource from '../hooks/usePollingResource';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PageLoader from '../components/common/PageLoader';

function DeliveryReport({ teamId, page, setPage }) {
  const load = useCallback(async signal => {
    const { data } = await api.get(`/teams/${teamId}/reports/delivery`, { signal, params: { page } });
    return data;
  }, [teamId, page]);
  const { data, error, refresh } = usePollingResource(load, { interval: 60000, cacheKey: `report:${teamId}:${page}` });
  const totals = data?.projects.reduce((sum, project) => ({
    tasks: sum.tasks + project.totalTasks, completed: sum.completed + project.completedTasks,
    blocked: sum.blocked + project.blockedTasks, unassigned: sum.unassigned + project.unassignedOpenTasks,
  }), { tasks: 0, completed: 0, blocked: 0, unassigned: 0 });
  return <div className="space-y-6">
    <header>
      <Link to={`/teams/${teamId}`} className="text-sm font-semibold text-slate-500 hover:text-brand-600">← Back to workspace</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Delivery insights</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Workspace report</h1>
          <p className="mt-2 text-sm text-slate-500">{data?.team.name || 'Project progress'}, without counting shared tasks twice.</p></div>
        <Button variant="secondary" onClick={() => void refresh()}>Refresh report</Button>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error.message} <button className="font-semibold underline" onClick={() => void refresh()}>Retry</button></div>}
    {!data && !error && <PageLoader text="Loading workspace report…" />}
    {data && <>
      <p className="text-xs text-slate-500">Page {page} · Totals below cover the projects on this page only. Last updated {new Date(data.generatedAt).toLocaleTimeString()}.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Tasks", totals.tasks], ["Completed", totals.completed], ["Blocked", totals.blocked], ["Without active assignees", totals.unassigned]].map(([label, count]) =>
          <Card key={label} className="p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{count}</p></Card>)}
      </div>
      {!data.projects.length ? <Card className="border-dashed p-8 text-center"><h2 className="font-bold text-slate-900">{page === 1 ? 'No projects yet' : 'No projects on this page'}</h2><p className="mt-2 text-sm text-slate-500">{page === 1 ? 'Create a project in this workspace to start tracking delivery.' : 'Use Previous to return to your projects.'}</p></Card>
        : <section aria-label="Project delivery progress" className="grid gap-4 lg:grid-cols-2">
          {data.projects.map(project => {
            const progress = project.totalTasks ? Math.round(project.completedTasks / project.totalTasks * 100) : 0;
            return <Card key={project.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><Link to={`/projects/${project.id}`} className="break-words text-lg font-bold text-brand-700 hover:underline">{project.name}</Link><span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{progress}%</span></div>
              <progress aria-label={`${project.name} completion`} value={project.completedTasks} max={project.totalTasks || 1} className="mt-4 h-2 w-full accent-brand-600" />
              <p className="mt-2 text-xs text-slate-500">{project.completedTasks} of {project.totalTasks} tasks completed</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {[["Blocked", project.blockedTasks], ["Without active assignees", project.unassignedOpenTasks], ["Active assignees on open work", project.activeAssignees], ["Estimated open effort", `${Math.round(project.estimatedOpenHours * 10) / 10}h`]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>)}
              </dl>
              {project.missingEstimates > 0 && <p className="mt-4 text-xs text-amber-800">{project.missingEstimates} open task(s) have no effort estimate.</p>}
            </Card>;
          })}
        </section>}
      <div className="flex items-center justify-between gap-3"><Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page}</span><Button variant="secondary" disabled={!data.hasMore} onClick={() => setPage(page + 1)}>Next</Button></div>
      <p className="text-xs leading-5 text-slate-500">Read-only report. Open work means any status except Completed. Assignee counts include only currently active workspace members. Effort is the full estimate of open tasks, not remaining time or a weekly workload. Refreshes every minute while visible.</p>
    </>}
  </div>;
}

export default function TeamReportPage() {
  const { teamId } = useParams();
  const [page, setPage] = useState(1);
  return <DeliveryReport key={`${teamId}:${page}`} teamId={teamId} page={page} setPage={setPage} />;
}

import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { EmptyState } from '../../components/design-system/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type Course = { course_id: string; course_name: string };
type Mat = { id: string; title: string; url: string; chapter_id?: string | null };
type ChapterOut = { id: string; title: string; sort_order?: number; materials: Mat[] };

export function TrainingCourseLibraryPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [uncategorized, setUncategorized] = useState<Mat[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const data = await jsonFetch<{ items: Course[] }>(`${functionsBase()}/course-library-data?resource=courses`, {
          headers: getAuthHeaders(),
        });
        if (!c) setCourses(data.items || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Failed to load courses');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, []);

  useEffect(() => {
    if (!courseId) { setChapters([]); setUncategorized([]); setCourseName(''); return; }
    let c = false;
    (async () => {
      setErr(''); setLibraryLoading(true);
      try {
        const data = await jsonFetch<{ course_name?: string; chapters: ChapterOut[]; uncategorized: Mat[] }>(
          `${functionsBase()}/course-library-data?resource=library&course_id=${encodeURIComponent(courseId)}`,
          { headers: getAuthHeaders() },
        );
        if (c) return;
        setChapters(data.chapters || []);
        setUncategorized(data.uncategorized || []);
        setCourseName(data.course_name || courseId);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load library');
      } finally {
        if (!c) setLibraryLoading(false);
      }
    })();
    return () => { c = true; };
  }, [courseId]);

  const hasMaterials = chapters.some((ch) => (ch.materials || []).length > 0) || uncategorized.length > 0;
  const totalMaterials = chapters.reduce((acc, ch) => acc + (ch.materials || []).length, 0) + uncategorized.length;

  return (
    <div className="space-y-4">
      {err && (
        <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>
      )}

      {/* Course selector toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3">
        <label className="text-xs font-medium text-[var(--brand-muted)]">Course</label>
        <select
          className="flex-1 max-w-lg rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface-2)] px-3 py-1.5 text-sm text-[var(--brand-text)]"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">Select a course…</option>
          {courses.map((x) => (
            <option key={x.course_id} value={x.course_id}>
              {x.course_name} ({x.course_id})
            </option>
          ))}
        </select>
        {loading && <span className="text-xs text-[var(--brand-muted)]">Loading courses…</span>}
        {courseId && !libraryLoading && hasMaterials && (
          <span className="ml-auto text-xs text-[var(--brand-muted)]">{totalMaterials} material{totalMaterials !== 1 ? 's' : ''} · {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {courseId && (
        <Card noPadding>
          {libraryLoading && (
            <p className="p-4 text-sm text-[var(--brand-muted)]">Loading course library…</p>
          )}
          {!libraryLoading && !hasMaterials && (
            <EmptyState
              title="No content yet"
              description="This course does not have chapters or materials available right now."
            />
          )}

          {!libraryLoading && chapters.map((ch) => (
            <div key={ch.id} className="border-b border-[var(--brand-border)] last:border-b-0">
              <div className="flex items-center gap-3 bg-[var(--brand-surface-2)]/50 px-4 py-2.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                  <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                </svg>
                <span className="text-sm font-semibold text-[var(--brand-text)]">{ch.title}</span>
                {ch.sort_order != null && (
                  <span className="ml-auto text-xs text-[var(--brand-dim)]">#{ch.sort_order}</span>
                )}
                <span className="text-xs text-[var(--brand-muted)]">{(ch.materials || []).length} item{(ch.materials || []).length !== 1 ? 's' : ''}</span>
              </div>
              {(ch.materials || []).length > 0 && (
                <Table>
                  <TableBody>
                    {ch.materials.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="py-2 font-medium text-[var(--brand-text)]">{m.title}</TableCell>
                        <TableCell className="py-2 text-right">
                          <a
                            className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] underline-offset-2 hover:underline"
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}

          {!libraryLoading && uncategorized.length > 0 && (
            <div>
              <div className="flex items-center gap-3 bg-[var(--brand-surface-2)]/50 px-4 py-2.5">
                <span className="text-sm font-semibold text-[var(--brand-muted)]">Uncategorized</span>
                <span className="ml-auto text-xs text-[var(--brand-muted)]">{uncategorized.length} item{uncategorized.length !== 1 ? 's' : ''}</span>
              </div>
              <Table>
                <TableBody>
                  {uncategorized.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="py-2 font-medium text-[var(--brand-text)]">{m.title}</TableCell>
                      <TableCell className="py-2 text-right">
                        <a
                          className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] underline-offset-2 hover:underline"
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

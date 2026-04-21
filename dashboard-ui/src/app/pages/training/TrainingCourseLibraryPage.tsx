import { useEffect, useState } from 'react';
import { Card } from '../../components/design-system/Card';
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
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    if (!courseId) {
      setChapters([]);
      setUncategorized([]);
      setCourseName('');
      return;
    }
    let c = false;
    (async () => {
      setErr('');
      try {
        const data = await jsonFetch<{
          course_name?: string;
          chapters: ChapterOut[];
          uncategorized: Mat[];
        }>(`${functionsBase()}/course-library-data?resource=library&course_id=${encodeURIComponent(courseId)}`, {
          headers: getAuthHeaders(),
        });
        if (c) return;
        setChapters(data.chapters || []);
        setUncategorized(data.uncategorized || []);
        setCourseName(data.course_name || courseId);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load library');
      }
    })();
    return () => {
      c = true;
    };
  }, [courseId]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brand-muted)]">Browse course chapters and materials for courses you can access.</p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}
      <Card className="p-4">
        <label className="mb-2 block text-sm font-medium text-[var(--brand-text)]">Course</label>
        <select
          className="w-full max-w-lg rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <option value="">Select a course</option>
          {courses.map((x) => (
            <option key={x.course_id} value={x.course_id}>
              {x.course_name} ({x.course_id})
            </option>
          ))}
        </select>
        {courseName ? <p className="mt-2 text-sm text-[var(--brand-muted)]">{courseName}</p> : null}
      </Card>
      {courseId ? (
        <Card noPadding>
          {chapters.map((ch) => (
            <div key={ch.id} className="border-b border-[var(--brand-border)] last:border-b-0">
              <div className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/50 p-4">
                <h3 className="font-semibold text-[var(--brand-text)]">{ch.title}</h3>
                {ch.sort_order != null ? (
                  <p className="text-xs text-[var(--brand-muted)]">Order: {ch.sort_order}</p>
                ) : null}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ch.materials || []).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.title}</TableCell>
                      <TableCell>
                        <a className="text-[var(--brand-primary)] underline" href={m.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
          {uncategorized.length > 0 ? (
            <div>
              <div className="border-b border-[var(--brand-border)] p-4">
                <h3 className="font-semibold text-[var(--brand-text)]">Uncategorized</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uncategorized.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.title}</TableCell>
                      <TableCell>
                        <a className="text-[var(--brand-primary)] underline" href={m.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

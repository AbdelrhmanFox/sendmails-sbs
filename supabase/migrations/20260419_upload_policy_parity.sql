-- Unify upload policy limits across resource/submission buckets.
-- Standard limit: 100 MB per file.

update storage.buckets
set file_size_limit = 104857600
where id in ('course-materials', 'classroom-material-files', 'classroom-assignment-files', 'classroom-submissions');

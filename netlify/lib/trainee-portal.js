async function getEnrolledBatchIds(supabase, traineeId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('batch_id')
    .eq('trainee_id', traineeId)
    .in('enrollment_status', ['Registered', 'Attended', 'Completed']);
  if (error) throw new Error(error.message || 'Could not load enrollments');
  return [...new Set((data || []).map((x) => x.batch_id).filter(Boolean))];
}

async function assertTraineeAssignmentAccess(supabase, traineeId, assignmentId) {
  const { data: asg, error: ae } = await supabase
    .from('classroom_assignments')
    .select('id, batch_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (ae) return { ok: false, status: 500, error: ae.message || 'Could not load assignment' };
  if (!asg) return { ok: false, status: 404, error: 'Assignment not found' };
  const batchIds = await getEnrolledBatchIds(supabase, traineeId);
  if (!batchIds.includes(asg.batch_id)) return { ok: false, status: 403, error: 'Forbidden' };
  return { ok: true, assignment: asg };
}

module.exports = {
  getEnrolledBatchIds,
  assertTraineeAssignmentAccess,
};

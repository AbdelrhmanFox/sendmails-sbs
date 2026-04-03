/**
 * Maps workbook / Excel export column headers (and snake_case) to canonical field names
 * used by operations-data ENTITY_CONFIG.normalize().
 */

function normalizeHeaderKey(h) {
  return String(h || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ /g, '_')
    .toLowerCase();
}

/** Per-entity: normalized header string -> canonical field name */
const HEADER_TO_FIELD = {
  trainees: {
    trainee_id: 'trainee_id',
    full_name: 'full_name',
    phone: 'phone',
    email: 'email',
    type: 'trainee_type',
    trainee_type: 'trainee_type',
    company_name: 'company_name',
    job_title: 'job_title',
    university: 'university',
    specialty: 'specialty',
    city: 'city',
    company_id: 'company_id',
    created_date: 'created_date',
    status: 'status',
    notes: 'notes',
  },
  courses: {
    course_id: 'course_id',
    course_name: 'course_name',
    category: 'category',
    target_audience: 'target_audience',
    duration_hours: 'duration_hours',
    delivery_type: 'delivery_type',
    price: 'price',
    description: 'description',
    status: 'status',
  },
  batches: {
    batch_id: 'batch_id',
    course_id: 'course_id',
    batch_name: 'batch_name',
    start_date: 'start_date',
    end_date: 'end_date',
    trainer: 'trainer',
    location: 'location',
    capacity: 'capacity',
  },
  enrollments: {
    enrollment_id: 'enrollment_id',
    trainee_id: 'trainee_id',
    batch_id: 'batch_id',
    enrollment_status: 'enrollment_status',
    payment_status: 'payment_status',
    amount_paid: 'amount_paid',
    certificate_issued: 'certificate_issued',
    enroll_date: 'enroll_date',
    notes: 'notes',
  },
};

const CANONICAL_FIELDS = {
  trainees: new Set(Object.values(HEADER_TO_FIELD.trainees)),
  courses: new Set(Object.values(HEADER_TO_FIELD.courses)),
  batches: new Set(Object.values(HEADER_TO_FIELD.batches)),
  enrollments: new Set(Object.values(HEADER_TO_FIELD.enrollments)),
};

/**
 * @param {string} entity - trainees | courses | batches | enrollments
 * @param {Record<string, unknown>} raw - one row object from Excel/JSON
 * @returns {Record<string, unknown>}
 */
function coerceRow(entity, raw) {
  const map = HEADER_TO_FIELD[entity];
  const canonical = CANONICAL_FIELDS[entity];
  if (!map || !raw || typeof raw !== 'object') return {};

  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeHeaderKey(k);
    let field = map[nk];
    if (!field && canonical.has(nk)) field = nk;
    if (field) out[field] = v;
  }
  if (entity === 'enrollments' && out.payment_status != null) {
    const ps = String(out.payment_status).trim().toLowerCase();
    if (ps === 'free') out.payment_status = 'Waived';
  }
  return out;
}

module.exports = {
  normalizeHeaderKey,
  coerceRow,
};

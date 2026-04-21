import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

export type OpsEntity = 'trainees' | 'courses' | 'batches' | 'enrollments';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entity: OpsEntity;
  mode: 'create' | 'edit';
  row: Record<string, unknown> | null;
  onSaved: () => void;
};

export function OperationEntityModal({ open, onOpenChange, entity, mode, row, onSaved }: Props) {
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (mode === 'edit' && row) {
      const next: Record<string, string> = {};
      const copy = (k: string) => {
        const v = row[k];
        next[k] = v == null ? '' : String(v);
      };
      if (entity === 'trainees') {
        ['id', 'trainee_id', 'full_name', 'email', 'phone', 'trainee_type', 'city', 'status', 'notes'].forEach(copy);
      }
      if (entity === 'courses') {
        ['id', 'course_id', 'course_name', 'category', 'duration_hours', 'delivery_type', 'price', 'status', 'description'].forEach(copy);
      }
      if (entity === 'batches') {
        ['id', 'batch_id', 'course_id', 'batch_name', 'trainer', 'location', 'capacity', 'start_date', 'end_date'].forEach(copy);
      }
      if (entity === 'enrollments') {
        ['id', 'enrollment_id', 'trainee_id', 'batch_id', 'enrollment_status', 'payment_status', 'amount_paid', 'enroll_date', 'notes'].forEach(copy);
      }
      setF(next);
    } else {
      setF({
        full_name: '',
        email: '',
        phone: '',
        trainee_type: '',
        city: '',
        status: 'Active',
        notes: '',
        course_name: '',
        category: '',
        duration_hours: '',
        delivery_type: '',
        price: '',
        description: '',
        course_id: '',
        batch_name: '',
        trainer: '',
        location: '',
        capacity: '',
        start_date: '',
        end_date: '',
        trainee_id: '',
        batch_id: '',
        enrollment_status: 'Registered',
        payment_status: 'Pending',
        amount_paid: '',
        enroll_date: '',
      });
    }
  }, [open, mode, row, entity]);

  const patch = (k: string, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setErr('');
    const headers = getAuthHeaders();
    const url = `${functionsBase()}/operations-data?entity=${entity}`;
    const body: Record<string, unknown> = {};
    const num = (s: string) => (s === '' ? null : Number(s));
    try {
      if (entity === 'trainees') {
        body.full_name = f.full_name?.trim();
        body.email = f.email?.trim();
        body.phone = f.phone?.trim();
        body.trainee_type = f.trainee_type?.trim() || null;
        body.city = f.city?.trim() || null;
        body.status = f.status?.trim() || 'Active';
        body.notes = f.notes?.trim() || null;
        if (mode === 'edit') body.id = f.id;
      } else if (entity === 'courses') {
        body.course_name = f.course_name?.trim();
        body.category = f.category?.trim() || null;
        body.duration_hours = num(f.duration_hours || '');
        body.delivery_type = f.delivery_type?.trim() || null;
        body.price = num(f.price || '');
        body.description = f.description?.trim() || null;
        body.status = f.status?.trim() || 'Active';
        if (mode === 'edit') body.id = f.id;
      } else if (entity === 'batches') {
        body.course_id = f.course_id?.trim();
        body.batch_name = f.batch_name?.trim() || null;
        body.trainer = f.trainer?.trim() || null;
        body.location = f.location?.trim() || null;
        body.capacity = num(f.capacity || '');
        body.start_date = f.start_date?.trim() || null;
        body.end_date = f.end_date?.trim() || null;
        if (mode === 'edit') body.id = f.id;
      } else if (entity === 'enrollments') {
        body.trainee_id = f.trainee_id?.trim();
        body.batch_id = f.batch_id?.trim();
        body.enrollment_status = f.enrollment_status?.trim() || 'Registered';
        body.payment_status = f.payment_status?.trim() || 'Pending';
        body.amount_paid = num(f.amount_paid || '');
        body.enroll_date = f.enroll_date?.trim() || null;
        body.notes = f.notes?.trim() || null;
        if (mode === 'edit') body.id = f.id;
      }

      if (mode === 'create') {
        await jsonFetch(`${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
      } else {
        await jsonFetch(`${url}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create' : 'Edit'} {entity.slice(0, -1)}
          </DialogTitle>
        </DialogHeader>
        {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}

        {entity === 'trainees' ? (
          <div className="grid gap-3">
            {mode === 'edit' ? <Input label="Trainee ID" value={f.trainee_id || ''} readOnly /> : null}
            <Input label="Full name" value={f.full_name || ''} onChange={(e) => patch('full_name', e.target.value)} required />
            <Input label="Email" type="email" value={f.email || ''} onChange={(e) => patch('email', e.target.value)} required />
            <Input label="Phone" value={f.phone || ''} onChange={(e) => patch('phone', e.target.value)} required />
            <Input label="Type" value={f.trainee_type || ''} onChange={(e) => patch('trainee_type', e.target.value)} />
            <Input label="City" value={f.city || ''} onChange={(e) => patch('city', e.target.value)} />
            <Input label="Status" value={f.status || ''} onChange={(e) => patch('status', e.target.value)} />
            <Input label="Notes" value={f.notes || ''} onChange={(e) => patch('notes', e.target.value)} />
          </div>
        ) : null}

        {entity === 'courses' ? (
          <div className="grid gap-3">
            {mode === 'edit' ? <Input label="Course ID" value={f.course_id || ''} readOnly /> : null}
            <Input label="Course name" value={f.course_name || ''} onChange={(e) => patch('course_name', e.target.value)} required />
            <Input label="Category" value={f.category || ''} onChange={(e) => patch('category', e.target.value)} />
            <Input label="Duration (hours)" value={f.duration_hours || ''} onChange={(e) => patch('duration_hours', e.target.value)} />
            <Input label="Delivery" value={f.delivery_type || ''} onChange={(e) => patch('delivery_type', e.target.value)} placeholder="online / offline / hybrid" />
            <Input label="Price" value={f.price || ''} onChange={(e) => patch('price', e.target.value)} />
            <Input label="Status" value={f.status || ''} onChange={(e) => patch('status', e.target.value)} />
            <Input label="Description" value={f.description || ''} onChange={(e) => patch('description', e.target.value)} />
          </div>
        ) : null}

        {entity === 'batches' ? (
          <div className="grid gap-3">
            {mode === 'edit' ? <Input label="Batch ID" value={f.batch_id || ''} readOnly /> : null}
            <Input label="Course ID" value={f.course_id || ''} onChange={(e) => patch('course_id', e.target.value)} required />
            <Input label="Batch name" value={f.batch_name || ''} onChange={(e) => patch('batch_name', e.target.value)} />
            <Input label="Trainer" value={f.trainer || ''} onChange={(e) => patch('trainer', e.target.value)} />
            <Input label="Location" value={f.location || ''} onChange={(e) => patch('location', e.target.value)} />
            <Input label="Capacity" value={f.capacity || ''} onChange={(e) => patch('capacity', e.target.value)} />
            <Input label="Start date" value={f.start_date || ''} onChange={(e) => patch('start_date', e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="End date" value={f.end_date || ''} onChange={(e) => patch('end_date', e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        ) : null}

        {entity === 'enrollments' ? (
          <div className="grid gap-3">
            {mode === 'edit' ? <Input label="Enrollment ID" value={f.enrollment_id || ''} readOnly /> : null}
            <Input label="Trainee ID" value={f.trainee_id || ''} onChange={(e) => patch('trainee_id', e.target.value)} required />
            <Input label="Batch ID" value={f.batch_id || ''} onChange={(e) => patch('batch_id', e.target.value)} required />
            <Input label="Enrollment status" value={f.enrollment_status || ''} onChange={(e) => patch('enrollment_status', e.target.value)} />
            <Input label="Payment status" value={f.payment_status || ''} onChange={(e) => patch('payment_status', e.target.value)} />
            <Input label="Amount paid" value={f.amount_paid || ''} onChange={(e) => patch('amount_paid', e.target.value)} />
            <Input label="Enroll date" value={f.enroll_date || ''} onChange={(e) => patch('enroll_date', e.target.value)} placeholder="YYYY-MM-DD" />
            <Input label="Notes" value={f.notes || ''} onChange={(e) => patch('notes', e.target.value)} />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={loading} onClick={() => void submit()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

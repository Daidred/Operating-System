// Seeds the database with demo data so the app can be explored immediately.
// Usage: npm run seed  (add --reset to wipe existing records first)
import crypto from 'node:crypto';
import { db } from './db.js';
import { hashPassword } from './auth.js';

const reset = process.argv.includes('--reset');
if (reset) {
  db.prepare('DELETE FROM records').run();
  console.log('Cleared existing records.');
}

const today = new Date();
const day = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

function insert(entity, data, createdBy = 'demo@thammachart.co.th') {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO records (entity, id, data, created_by, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(entity, id, JSON.stringify(data), createdBy, now, now);
  return id;
}

// Demo user (if none exists)
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  db.prepare(`INSERT INTO users (id, email, password_hash, full_name, role, department, created_date)
              VALUES (?, ?, ?, ?, 'admin', 'Purchasing', ?)`)
    .run(crypto.randomUUID(), 'demo@thammachart.co.th', hashPassword('demo12345'), 'Demo Admin', new Date().toISOString());
  console.log('Created demo user: demo@thammachart.co.th / demo12345');
}

// Suppliers
const supplier1 = insert('Supplier', {
  name: 'Andaman Marine Co.', country: 'Thailand', contact_person: 'Somchai P.',
  email: 'somchai@andamanmarine.example', phone: '+66 76 555 0101',
  product_categories: ['Shrimp', 'Squid'], certifications: 'BAP, HACCP',
  status: 'Active', approval_status: 'Approved', factory_approval_status: 'Approved',
  reliability_rating: 4, quality_rating: 5, price_competitiveness_rating: 3, communication_rating: 4,
  last_contact_date: day(-4), notes: 'Primary shrimp supplier — consistent quality.',
});
const supplier2 = insert('Supplier', {
  name: 'Norway Fjord Salmon AS', country: 'Norway', contact_person: 'Ingrid H.',
  email: 'ingrid@fjordsalmon.example', phone: '+47 55 555 0202',
  product_categories: ['Salmon'], certifications: 'ASC, GlobalG.A.P.',
  status: 'Active', approval_status: 'Approved', factory_approval_status: 'Approved',
  reliability_rating: 5, quality_rating: 5, price_competitiveness_rating: 2, communication_rating: 5,
  last_contact_date: day(-10), notes: 'Premium Atlantic salmon, weekly air freight.',
});
const supplier3 = insert('Supplier', {
  name: 'Vung Tau Seafood JSC', country: 'Vietnam', contact_person: 'Linh T.',
  email: 'linh@vtseafood.example', phone: '+84 254 555 0303',
  product_categories: ['Squid', 'Value-Added'], certifications: 'BRC',
  status: 'Active', approval_status: 'Pending Approval', factory_approval_status: 'Pending',
  reliability_rating: 3, quality_rating: 4, price_competitiveness_rating: 5, communication_rating: 3,
  last_contact_date: day(-1), next_followup_date: day(2), notes: 'Competitive pricing on frozen squid tubes.',
});

// Sourcing projects
const project1 = insert('SourcingProject', {
  name: 'Frozen Squid Tubes for Retail', product_category: 'Squid',
  product_specification: 'IQF squid tubes U10, cleaned, 1kg retail bags',
  target_origin: 'Vietnam', target_price: 4.2, target_price_currency: 'USD',
  target_volume: '2 FCL / month', required_certifications: 'BRC or IFS',
  status: 'Quotation Received', priority: 'High', archived: false,
  notes: 'Target launch in Q4 retail campaign.',
});
const project2 = insert('SourcingProject', {
  name: 'Premium Salmon Portions', product_category: 'Salmon',
  product_specification: 'Fresh Atlantic salmon portions 125g skin-on',
  target_origin: 'Norway', target_price: 9.5, target_price_currency: 'USD',
  target_volume: '500kg / week', required_certifications: 'ASC',
  status: 'Sample Testing', priority: 'Urgent', archived: false,
});
insert('SourcingProject', {
  name: 'Soft Shell Crab Exploration', product_category: 'Crab',
  product_specification: 'Frozen soft shell crab, hotel-grade',
  target_origin: 'Myanmar', status: 'Idea', priority: 'Low', archived: false,
});

// Quotations
insert('Quotation', {
  supplier_id: supplier3, supplier_name: 'Vung Tau Seafood JSC',
  project_id: project1, project_name: 'Frozen Squid Tubes for Retail',
  product: 'IQF squid tubes U10', specification: 'Cleaned, 1kg bags', origin: 'Vietnam',
  packing: '1kg x 10 / carton', moq: '1 FCL', price: 4.05, currency: 'USD', incoterm: 'CIF',
  lead_time: '30 days', validity_date: day(12), payment_terms: 'T/T 30% deposit',
  status: 'Pending Review', comments: 'Best offer so far; needs QC visit.',
});
insert('Quotation', {
  supplier_id: supplier1, supplier_name: 'Andaman Marine Co.',
  project_id: project1, project_name: 'Frozen Squid Tubes for Retail',
  product: 'IQF squid tubes U10', specification: 'Cleaned, 1kg bags', origin: 'Thailand',
  packing: '1kg x 10 / carton', moq: '500 cartons', price: 4.6, currency: 'USD', incoterm: 'EXW',
  lead_time: '21 days', validity_date: day(20), payment_terms: 'T/T on delivery',
  status: 'Pending Review',
});

// Samples
insert('Sample', {
  supplier_id: supplier2, supplier_name: 'Norway Fjord Salmon AS',
  project_id: project2, project_name: 'Premium Salmon Portions',
  product: 'Salmon portions 125g', requested_date: day(-14), shipped_date: day(-7), received_date: day(-2),
  courier_tracking: 'DHL 4402118899', evaluation_status: 'In Testing',
  taste_notes: 'Clean, buttery', appearance_notes: 'Bright color, good trim',
});

// Follow-ups
insert('FollowUp', {
  supplier_id: supplier3, supplier_name: 'Vung Tau Seafood JSC',
  project_id: project1, project_name: 'Frozen Squid Tubes for Retail',
  last_message_sent: 'Requested updated packing spec and QC report', date_contacted: day(-3),
  reply_status: 'Waiting', next_action: 'Call if no reply', next_followup_date: day(1), priority: 'High',
});

// Shipments
insert('Shipment', {
  reference: 'PO-2026-0711', mode: 'Sea', status: 'In Transit', archived: false,
  supplier: 'Vung Tau Seafood JSC', origin: 'Ho Chi Minh City', destination: 'Bangkok (Laem Chabang)',
  etd: day(-6), eta: day(8), product: 'IQF squid tubes U10', quantity: '1 FCL (24t)',
  container_no: 'TGHU 552013-1', notes: 'First trial container.',
});
insert('Shipment', {
  reference: 'PO-2026-0698', mode: 'Air', status: 'Arrived', archived: false,
  supplier: 'Norway Fjord Salmon AS', origin: 'Oslo', destination: 'Bangkok (BKK)',
  etd: day(-2), eta: day(0), product: 'Fresh salmon portions', quantity: '480 kg',
  awb: 'TG-724-55501122',
});
insert('Shipment', {
  reference: 'PO-2026-0685', mode: 'Sea', status: 'Delivered', archived: true,
  supplier: 'Andaman Marine Co.', origin: 'Phuket', destination: 'Bangkok DC 1',
  etd: day(-30), eta: day(-18), product: 'Frozen shrimp HLSO 16/20', quantity: '12t',
});

// Discrepancies
const disc1 = insert('Discrepancy', {
  title: 'Salmon order placed after cutoff', date: day(-5),
  requester: 'demo@thammachart.co.th', requester_name: 'Demo Admin',
  business_unit: 'Food Service', issue_type: 'Late Order Request',
  description: 'Weekly salmon order submitted 2 days after supplier cutoff, requiring emergency air freight.',
  impact_level: 'High', status: 'Under Review', purchasing_hours_lost: 6,
});
insert('Discrepancy', {
  title: 'Wrong SKU on retail squid order', date: day(-12),
  requester: 'demo@thammachart.co.th', requester_name: 'Demo Admin',
  business_unit: 'Retail', issue_type: 'Incorrect SKU',
  description: 'Order sheet listed 500g bags but planogram requires 1kg bags.',
  impact_level: 'Medium', status: 'Resolved', purchasing_hours_lost: 2,
});
insert('Discrepancy', {
  title: 'Forecast missed Songkran demand spike', date: day(-20),
  requester: 'demo@thammachart.co.th', requester_name: 'Demo Admin',
  business_unit: 'CTK', issue_type: 'Wrong Forecast',
  description: 'Holiday demand up 40% vs forecast; emergency local purchases at premium prices.',
  impact_level: 'Critical', status: 'Open', purchasing_hours_lost: 14,
});

// Workload entries
insert('WorkloadEntry', {
  discrepancy_id: disc1, employee_name: 'Demo Admin', date: day(-4),
  hours_spent: 4, overtime: false, activity_type: 'Supplier Coordination',
  urgency_level: 'High', estimated_cost: 1200, comments: 'Arranged emergency air freight quotes.',
});
insert('WorkloadEntry', {
  discrepancy_id: disc1, employee_name: 'Demo Admin', date: day(-3),
  hours_spent: 2, overtime: true, activity_type: 'Documentation',
  urgency_level: 'Medium', estimated_cost: 600,
});

// Daily tasks
insert('DailyTask', {
  title: 'Call Vung Tau about QC report', priority: 'High', category: 'Follow-up',
  due_date: day(0), done: false, project_id: project1, project_name: 'Frozen Squid Tubes for Retail',
});
insert('DailyTask', {
  title: 'Review salmon sample tasting notes', priority: 'Medium', category: 'Evaluation',
  due_date: day(1), done: false, project_id: project2, project_name: 'Premium Salmon Portions',
});
insert('DailyTask', { title: 'File import permits for PO-2026-0711', priority: 'Urgent', category: 'Documents', due_date: day(-1), done: true });

console.log('Seeded demo data:', db.prepare('SELECT entity, COUNT(*) AS n FROM records GROUP BY entity').all());

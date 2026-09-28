import { pgTable, serial, text, timestamp, integer, boolean, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('STAFF'), // SUPER_ADMIN, DISTRICT_ADMIN, FACILITY_ADMIN, MEDICAL_OFFICER, STAFF, VIEWER
  facilityId: integer('facility_id'),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, SUSPENDED, INACTIVE
  preferredLanguage: text('preferred_language').notNull().default('en'), // en, hi, mr
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  specialization: text('specialization'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => [
  index('users_facility_id_idx').on(table.facilityId),
  index('users_role_idx').on(table.role),
  index('users_email_idx').on(table.email),
]);

// 2. Facilities Table
export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  facilityCode: text('facility_code').notNull().unique(),
  name: text('name').notNull(),
  facilityType: text('facility_type').notNull(), // PHC, CHC, SUB_CENTER, DISTRICT_HOSPITAL
  district: text('district').notNull(),
  state: text('state').notNull().default('Maharashtra'),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 6 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 6 }).notNull(),
  contactPhone: text('contact_phone').notNull(),
  status: text('status').notNull().default('OPERATIONAL'), // OPERATIONAL, LIMITED, CLOSED, MAINTENANCE
  operatingHours: text('operating_hours').notNull().default('24/7'),
  totalBeds: integer('total_beds').notNull().default(30),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('facilities_district_idx').on(table.district),
  index('facilities_status_idx').on(table.status),
]);

// 3. Services Table
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  name: text('name').notNull(), // Emergency, Outpatient, Maternity, Immunization, Pharmacy, Laboratory, Radiology
  category: text('category').notNull(), // CLINICAL, DIAGNOSTIC, SUPPORT, PREVENTIVE
  status: text('status').notNull().default('AVAILABLE'), // AVAILABLE, LIMITED, UNAVAILABLE, EMERGENCY_ONLY
  capacity: integer('capacity').notNull().default(50),
  currentLoad: integer('current_load').notNull().default(0),
  operatingHours: text('operating_hours').notNull().default('08:00 - 20:00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('services_facility_id_idx').on(table.facilityId),
  index('services_status_idx').on(table.status),
]);

// 4. Service Requirements (Staffing thresholds)
export const serviceRequirements = pgTable('service_requirements', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull(),
  requiredStaff: integer('required_staff').notNull().default(2),
  minimumStaff: integer('minimum_staff').notNull().default(1),
  maximumCapacity: integer('maximum_capacity').notNull().default(100),
  requiredSpecialization: text('required_specialization').notNull(),
  priority: text('priority').notNull().default('HIGH'), // CRITICAL, HIGH, MEDIUM, LOW
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveTo: timestamp('effective_to'),
}, (table) => [
  index('service_requirements_service_id_idx').on(table.serviceId),
]);

// 5. Staff Schedules
export const staffSchedules = pgTable('staff_schedules', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull(),
  facilityId: integer('facility_id').notNull(),
  shiftDate: text('shift_date').notNull(), // YYYY-MM-DD
  shiftStart: text('shift_start').notNull(), // 08:00
  shiftEnd: text('shift_end').notNull(), // 16:00
  shiftType: text('shift_type').notNull(), // MORNING, EVENING, NIGHT, ROTATING
  status: text('status').notNull().default('SCHEDULED'), // SCHEDULED, COMPLETED, CANCELLED, REPLACED
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('staff_schedules_staff_date_idx').on(table.staffId, table.shiftDate),
  index('staff_schedules_facility_date_idx').on(table.facilityId, table.shiftDate),
]);

// 6. Attendance Table
export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull(),
  facilityId: integer('facility_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  checkIn: text('check_in'), // HH:MM:SS
  checkOut: text('check_out'), // HH:MM:SS
  status: text('status').notNull().default('PRESENT'), // PRESENT, ABSENT, LATE, HALF_DAY, LEAVE, OFF_DUTY
  source: text('source').notNull().default('MANUAL'), // BIOMETRIC, WEB_CONSOLE, MOBILE, MANUAL
  remarks: text('remarks'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('attendance_staff_date_idx').on(table.staffId, table.date),
  index('attendance_facility_date_idx').on(table.facilityId, table.date),
  uniqueIndex('attendance_staff_date_unique').on(table.staffId, table.date),
]);

// 7. Leave Requests
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull(),
  facilityId: integer('facility_id').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD
  endDate: text('end_date').notNull(), // YYYY-MM-DD
  leaveType: text('leave_type').notNull(), // CASUAL, SICK, EMERGENCY, ANNUAL
  reason: text('reason').notNull(),
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED, CANCELLED
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('leave_requests_staff_id_idx').on(table.staffId),
  index('leave_requests_facility_id_idx').on(table.facilityId),
  index('leave_requests_status_idx').on(table.status),
]);

// 8. Backup Assignments
export const backupAssignments = pgTable('backup_assignments', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  originalStaffId: integer('original_staff_id').notNull(),
  backupStaffId: integer('backup_staff_id').notNull(),
  serviceId: integer('service_id').notNull(),
  assignmentDate: text('assignment_date').notNull(),
  shiftStart: text('shift_start').notNull(),
  shiftEnd: text('shift_end').notNull(),
  status: text('status').notNull().default('CONFIRMED'), // PROPOSED, CONFIRMED, REJECTED, COMPLETED
  reason: text('reason').notNull(),
  recommendationExplanation: text('recommendation_explanation'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('backup_assignments_facility_date_idx').on(table.facilityId, table.assignmentDate),
]);

// 9. Service Availability
export const serviceAvailability = pgTable('service_availability', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  serviceId: integer('service_id').notNull(),
  status: text('status').notNull().default('AVAILABLE'), // AVAILABLE, LIMITED, UNAVAILABLE, EMERGENCY_ONLY
  reason: text('reason'),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  expectedRestoreAt: timestamp('expected_restore_at'),
  updatedBy: integer('updated_by'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('service_availability_facility_service_idx').on(table.facilityId, table.serviceId),
]);

// 10. Alerts Table
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  alertType: text('alert_type').notNull(), // STAFFING_SHORTAGE, SERVICE_UNAVAILABLE, EXCESSIVE_ABSENTEEISM, HIGH_WORKLOAD, DEMAND_SPIKE, SYNC_FAILURE
  severity: text('severity').notNull(), // INFO, LOW, MEDIUM, HIGH, CRITICAL
  title: text('title').notNull(),
  description: text('description').notNull(),
  source: text('source').notNull().default('SYSTEM_RULE_ENGINE'),
  status: text('status').notNull().default('OPEN'), // OPEN, ACKNOWLEDGED, RESOLVED
  assignedTo: integer('assigned_to'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('alerts_facility_id_idx').on(table.facilityId),
  index('alerts_status_idx').on(table.status),
  index('alerts_severity_idx').on(table.severity),
]);

// 11. Notifications Table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  facilityId: integer('facility_id'),
  providerMessageId: text('provider_message_id'),
  type: text('type').notNull(), // ALERT, SCHEDULE_UPDATE, LEAVE_STATUS, BACKUP_ASSIGNMENT, SYSTEM
  channel: text('channel').notNull().default('IN_APP'), // IN_APP, EMAIL, SMS
  title: text('title').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('DELIVERED'), // NOT_CONFIGURED, QUEUED, ACCEPTED, DELIVERED, FAILED
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('notifications_user_id_idx').on(table.userId),
  index('notifications_status_idx').on(table.status),
]);

// 12. Audit Logs Table (Immutable append-only)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id'),
  action: text('action').notNull(), // LOGIN_SUCCESS, LOGIN_FAILED, SERVICE_STATUS_CHANGED, ATTENDANCE_UPDATED, LEAVE_APPROVED, etc.
  entityType: text('entity_type').notNull(), // USER, FACILITY, SERVICE, ATTENDANCE, LEAVE, BACKUP, ALERT, CONFIG
  entityId: text('entity_id'),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestId: text('request_id'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('audit_logs_actor_idx').on(table.actorUserId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_timestamp_idx').on(table.timestamp),
]);

// 13. Sync Events Table (Idempotent External Integrations)
export const syncEvents = pgTable('sync_events', {
  id: serial('id').primaryKey(),
  sourceSystem: text('source_system').notNull(), // BIOMETRIC_DEVICE, STATE_HEALTH_PORTAL, EMR_GATEWAY, LAB_SYSTEM
  eventType: text('event_type').notNull(),
  externalId: text('external_id').notNull(),
  payloadHash: text('payload_hash').notNull(),
  payload: text('payload'),
  status: text('status').notNull().default('RECEIVED'), // RECEIVED, PROCESSING, PROCESSED, DUPLICATE, FAILED, RETRYING
  attempts: integer('attempts').notNull().default(1),
  errorMessage: text('error_message'),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => [
  uniqueIndex('sync_events_hash_unique').on(table.payloadHash),
  index('sync_events_source_idx').on(table.sourceSystem),
  index('sync_events_status_idx').on(table.status),
]);

// 14. Nearby Facilities
export const nearbyFacilities = pgTable('nearby_facilities', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  nearbyFacilityId: integer('nearby_facility_id').notNull(),
  distanceKm: numeric('distance_km', { precision: 6, scale: 2 }).notNull(),
  travelTimeMinutes: integer('travel_time_minutes').notNull(),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
}, (table) => [
  index('nearby_facilities_facility_idx').on(table.facilityId),
]);

// 15. Workload History (Aggregated Operational Data)
export const workloadHistory = pgTable('workload_history', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  serviceId: integer('service_id'),
  recordDate: text('record_date').notNull(), // YYYY-MM-DD
  patientVolume: integer('patient_volume').notNull().default(0),
  serviceLoad: integer('service_load').notNull().default(0),
  staffingLevel: integer('staffing_level').notNull().default(0),
  utilizationRate: numeric('utilization_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
  waitingTimeMinutes: integer('waiting_time_minutes').notNull().default(0),
  workloadScore: numeric('workload_score', { precision: 5, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('workload_facility_date_idx').on(table.facilityId, table.recordDate),
]);

// 16. Demand Predictions
export const demandPredictions = pgTable('demand_predictions', {
  id: serial('id').primaryKey(),
  facilityId: integer('facility_id').notNull(),
  serviceId: integer('service_id').notNull(),
  predictionDate: text('prediction_date').notNull(), // YYYY-MM-DD
  predictedDemand: integer('predicted_demand').notNull(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }).notNull(),
  modelVersion: text('model_version').notNull().default('v1.2-wma'),
  method: text('method').notNull().default('Weighted Moving Average + Day-of-Week Trend'),
  inputWindow: text('input_window').notNull().default('30 days operational workload history'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
}, (table) => [
  index('demand_predictions_facility_date_idx').on(table.facilityId, table.predictionDate),
]);

// 17. Operational Rules & Thresholds Configuration
export const operationalRules = pgTable('operational_rules', {
  id: serial('id').primaryKey(),
  ruleKey: text('rule_key').notNull().unique(),
  ruleName: text('rule_name').notNull(),
  thresholdValue: numeric('threshold_value', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
